import { useEffect, useState, useCallback, useRef } from "react";
import type { Step } from "@auto-wiz/core";
import {
  getSimpleSelector,
  generateRobustLocator,
} from "@auto-wiz/dom";

interface UseRecordingOptions {
  autoCapture?: boolean;
}

interface UseRecordingReturn {
  recording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

/**
 * 녹화 로직을 처리하는 커스텀 훅
 *
 * 기능:
 * - 클릭, 타이핑, 선택(select) 이벤트 자동 캡처
 * - 타이핑 디바운스 (500ms)
 * - Enter 키로 즉시 플러시 및 submit
 * - Shift+Tab으로 extract
 * - 링크 클릭 시 새 탭 강제 방지
 */
export function useRecording({
  autoCapture = true,
}: UseRecordingOptions = {}): UseRecordingReturn {
  const [recording, setRecording] = useState(false);

  // 타이핑 상태 관리 (ref로 최신 값 유지)
  const typingTimerRef = useRef<number | null>(null);
  const typingSelectorRef = useRef<string | null>(null);
  const typingValueRef = useRef<string>("");
  const typingSubmitRef = useRef<boolean>(false);
  const lastSelectValueRef = useRef<Record<string, string>>({});
  const recordingRef = useRef<boolean>(false);

  const isSubmittingRef = useRef<boolean>(false);
  const submissionTimeRef = useRef<number>(0);

  // ✅ Phase 1: 플러시 상태 추적 (중복 방지)
  const flushStateRef = useRef<{
    lastFlushedSelector: string | null;
    lastFlushedTime: number;
    lastFlushedWithSubmit: boolean;
    lastFlushedValue: string; // 마지막 저장된 값
  }>({
    lastFlushedSelector: null,
    lastFlushedTime: 0,
    lastFlushedWithSubmit: false,
    lastFlushedValue: "",
  });

  // recordingRef 동기화
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  /**
   * 타이핑 플러시 (Step 기록)
   */
  const flushTyping = useCallback(() => {
    if (!recordingRef.current || !autoCapture) return;
    if (!typingSelectorRef.current) return;

    // 타이머 정리
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    // ✅ Phase 2: 중복 플러시 방지
    const now = Date.now();
    const currentValue = typingValueRef.current ?? "";

    const isDuplicate =
      flushStateRef.current.lastFlushedSelector === typingSelectorRef.current &&
      now - flushStateRef.current.lastFlushedTime < 150 &&
      flushStateRef.current.lastFlushedWithSubmit === typingSubmitRef.current;

    // ✅ blur 시 값이 이전과 같으면 저장하지 않음
    const isSameValue =
      flushStateRef.current.lastFlushedSelector === typingSelectorRef.current &&
      flushStateRef.current.lastFlushedValue === currentValue;

    if (isDuplicate || isSameValue) {
      console.log("⚠️ Duplicate flush prevented (same time or same value)");
      return;
    }

    const value = typingValueRef.current ?? "";
    const masked = value ? "*".repeat(value.length) : "";

    // 요소를 찾아서 locator 생성
    let locator;
    try {
      const element = document.querySelector(
        typingSelectorRef.current
      ) as HTMLElement;
      if (element) {
        locator = generateRobustLocator(element);
      }
    } catch {}

    const step: Step = {
      type: "type",
      selector: typingSelectorRef.current, // 하위 호환성
      locator, // 새로운 다중 selector 시스템
      text: masked,
      originalText: value,
      submit: typingSubmitRef.current || undefined,
      url: window.location.href,
    };

    console.log("✅ Flushing type step:", {
      selector: step.selector,
      submit: step.submit,
      value: step.originalText,
    });

    browser.runtime.sendMessage({ type: "REC_STEP", step }).catch(() => {});

    // ✅ Phase 2: 플러시 상태 업데이트
    flushStateRef.current = {
      lastFlushedSelector: typingSelectorRef.current,
      lastFlushedTime: now,
      lastFlushedWithSubmit: typingSubmitRef.current,
      lastFlushedValue: value,
    };

    // 상태 초기화
    typingSelectorRef.current = null;
    typingValueRef.current = "";
    typingSubmitRef.current = false;
  }, [autoCapture]);

  /**
   * 클릭 이벤트 핸들러
   */
  const handleClick = useCallback((e: MouseEvent) => {
    if (!recordingRef.current) return;

    const el = e.target as HTMLElement | null;
    if (!el) return;

    // 우리 툴바나 루트 클릭은 무시
    if (el.closest("#automation-wizard-root")) return;

    // 링크 클릭 - 새 탭 열림을 same-tab 네비로 강제
    const linkEl = (el.closest &&
      el.closest("a[href]")) as HTMLAnchorElement | null;

    if (linkEl && linkEl.href) {
      const isMiddleClick = e.button === 1;
      const isModifierOpen = e.metaKey === true || e.ctrlKey === true;
      const opensNewTab =
        linkEl.target === "_blank" || isMiddleClick || isModifierOpen;

      if (opensNewTab) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {}

        try {
          window.location.href = linkEl.href;
        } catch {}

        const navStep: Step = { type: "navigate", url: linkEl.href };
        browser.runtime
          .sendMessage({ type: "REC_STEP", step: navStep })
          .catch(() => {});
        return;
      }
    }

    // select 요소나 그 option 클릭은 무시 (change/input 이벤트에서 처리)
    const tag = el.tagName?.toLowerCase();
    if (tag === "select" || tag === "option") return;
    if (el.closest("select")) return;

    const selector = getSimpleSelector(el);
    const locator = generateRobustLocator(el);

    const step: Step = {
      type: "click",
      selector, // 하위 호환성
      locator, // 새로운 다중 selector 시스템
      url: window.location.href,
    };

    browser.runtime.sendMessage({ type: "REC_STEP", step }).catch(() => {});
  }, []);

  /**
   * Input 이벤트 핸들러 (타이핑, Select)
   */
  const handleInput = useCallback(
    (e: Event) => {
      if (!recordingRef.current || !autoCapture) return;

      const el = e.target as any;
      if (!el) return;
      if (el.closest && el.closest("#automation-wizard-root")) return;

      const tag = el.tagName?.toLowerCase?.() || "";

      // select 요소 처리
      if (tag === "select") {
        const selector = getSimpleSelector(el);
        const locator = generateRobustLocator(el);
        const value: string = el.value ?? "";

        // 중복 방지
        if (lastSelectValueRef.current[selector] === value) return;
        lastSelectValueRef.current[selector] = value;

        const step: Step = {
          type: "select",
          selector, // 하위 호환성
          locator, // 새로운 다중 selector 시스템
          value,
          url: window.location.href,
        };

        browser.runtime.sendMessage({ type: "REC_STEP", step }).catch(() => {});
        return;
      }

      // text input/textarea 처리
      const isTextField = tag === "input" || tag === "textarea";
      if (!isTextField) return;

      // ✅ Phase 3: 제출 진행 중이면 input 이벤트 무시 (Naver 중복 방지)
      if (
        isSubmittingRef.current &&
        Date.now() - submissionTimeRef.current < 200
      ) {
        console.log("⚠️ Input event ignored (submitting)");
        return;
      }

      const selector = getSimpleSelector(el);
      const value: string = el.value ?? "";

      // ✅ selector와 value 업데이트
      typingSelectorRef.current = selector;
      typingValueRef.current = value;

      // ✅ 디바운스 타이머로 자동 저장 (500ms)
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }

      typingTimerRef.current = window.setTimeout(() => {
        flushTyping();
      }, 500);

      console.log(
        "📝 Typing updated (auto-save in 500ms or on blur):",
        selector,
        value.substring(0, 10)
      );
    },
    [autoCapture, flushTyping]
  );

  /**
   * Enter 키 - 즉시 플러시 및 submit
   */
  const handleKeydownGlobal = useCallback(
    (e: KeyboardEvent) => {
      if (!recordingRef.current || !autoCapture) return;

      if (e.key === "Enter") {
        const active = document.activeElement as any;
        const tag = active?.tagName?.toLowerCase();
        const isTextField = active && (tag === "input" || tag === "textarea");

        // 입력 필드에서 Enter
        if (isTextField) {
          console.log(`✅ Enter key detected in ${tag} field`);

          // 1. 타이핑 중이던 내용 즉시 플러시 (submit: false)
          if (typingSelectorRef.current) {
            typingSubmitRef.current = false;
            flushTyping();
          }

          // 2. 독립적인 keyboard Step 생성
          try {
            const selector = getSimpleSelector(active);
            const locator = generateRobustLocator(active);

            const step: Step = {
              type: "keyboard",
              key: "Enter",
              selector, // 하위 호환성
              locator, // 새로운 다중 selector 시스템
              url: window.location.href,
            } as any;

            console.log(
              `✅ Recording keyboard step (Enter in ${tag}):`,
              step
            );
            browser.runtime
              .sendMessage({ type: "REC_STEP", step })
              .catch(() => {});
          } catch (err) {
            console.error("Failed to record keyboard step:", err);
          }

          // 3. 폼 제출 실행 (기존 로직 유지)
          setTimeout(() => {
            try {
              const form = active.form;
              if (form) {
                if (typeof form.requestSubmit === "function") {
                  console.log("✅ Calling form.requestSubmit()");
                  form.requestSubmit();
                } else {
                  console.log("✅ Calling form.submit()");
                  form.submit();
                }
              } else {
                console.log(
                  "⚠️ No form found, Enter key will propagate naturally"
                );
              }
            } catch (err) {
              console.error("❌ Form submit error:", err);
            }
          }, 50);

          // preventDefault (폼이 있는 경우만)
          if (active.form) {
            try {
              e.preventDefault();
              e.stopPropagation();
            } catch {}
          }
          return;
        }

        // 입력 필드 외부에서 Enter (버튼, 링크 등)
        try {
          let selector = null;
          let locator = null;

          if (
            active &&
            active instanceof HTMLElement &&
            !active.closest("#automation-wizard-root")
          ) {
            selector = getSimpleSelector(active);
            locator = generateRobustLocator(active);
          }

          const step: Step = {
            type: "keyboard",
            key: "Enter",
            selector: selector || undefined, // 하위 호환성
            locator: locator || undefined, // 새로운 다중 selector 시스템
            url: window.location.href,
          } as any;

          console.log(
            "✅ Recording keyboard step (Enter on element):",
            step
          );
          browser.runtime
            .sendMessage({ type: "REC_STEP", step })
            .catch(() => {});
        } catch (err) {
          console.error("Failed to record keyboard step:", err);
        }
      }
    },
    [autoCapture, flushTyping]
  );

  /**
   * Blur 이벤트 - 타이핑 플러시
   */
  const handleBlur = useCallback(() => {
    if (recordingRef.current && autoCapture) {
      flushTyping();
    }
  }, [autoCapture, flushTyping]);

  /**
   * Change 이벤트 - Select 처리
   */
  const handleChange = useCallback(
    (e: Event) => {
      if (!recordingRef.current || !autoCapture) return;

      const el = e.target as any;
      if (!el) return;
      if (el.closest && el.closest("#automation-wizard-root")) return;

      const tag = el.tagName?.toLowerCase?.() || "";
      if (tag !== "select") return;

      const selector = getSimpleSelector(el);
      const locator = generateRobustLocator(el);
      const value: string = el.value ?? "";

      // 중복 방지
      if (lastSelectValueRef.current[selector] === value) return;
      lastSelectValueRef.current[selector] = value;

      const step: Step = {
        type: "select",
        selector, // 하위 호환성
        locator, // 새로운 다중 selector 시스템
        value,
        url: window.location.href,
      };

      browser.runtime.sendMessage({ type: "REC_STEP", step }).catch(() => {});
    },
    [autoCapture]
  );

  /**
   * 녹화 시작
   */
  const startRecording = useCallback(async () => {
    await browser.runtime.sendMessage({ type: "START_RECORD" });
    setRecording(true);
  }, []);

  /**
   * 녹화 중지
   */
  const stopRecording = useCallback(async () => {
    // 마지막 타이핑 플러시
    flushTyping();

    await browser.runtime.sendMessage({ type: "STOP_RECORD" });
    setRecording(false);
  }, [flushTyping]);

  /**
   * 이벤트 리스너 등록
   */
  useEffect(() => {
    if (!recording) return;

    document.addEventListener("click", handleClick, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("keydown", handleKeydownGlobal, true);
    window.addEventListener("blur", handleBlur, true);
    document.addEventListener("change", handleChange, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("keydown", handleKeydownGlobal, true);
      window.removeEventListener("blur", handleBlur, true);
      document.removeEventListener("change", handleChange, true);
    };
  }, [
    recording,
    handleClick,
    handleInput,
    handleKeydownGlobal,
    handleBlur,
    handleChange,
  ]);

  /**
   * 초기 녹화 상태 가져오기
   */
  useEffect(() => {
    (async () => {
      try {
        const resp = await browser.runtime.sendMessage({
          type: "GET_RECORD_STATE",
        });

        if (resp && resp.type === "RECORD_STATE") {
          setRecording(resp.recording);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  /**
   * 녹화 상태 변경 메시지 수신
   */
  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === "RECORD_STATE") {
        setRecording(msg.recording);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  return {
    recording,
    startRecording,
    stopRecording,
  };
}
