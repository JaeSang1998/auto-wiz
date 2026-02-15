import { useEffect, useState, useCallback, useRef } from "react";
import type { ElementLocator, Step } from "@auto-wiz/core";
import { getSimpleSelector, generateRobustLocator } from "@auto-wiz/dom";

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
export function useRecording({ autoCapture = true }: UseRecordingOptions = {}): UseRecordingReturn {
  const [recording, setRecording] = useState(false);

  // 타이핑 상태 관리 (ref로 최신 값 유지)
  const typingTimerRef = useRef<number | null>(null);
  const typingSelectorRef = useRef<string | null>(null);
  const typingValueRef = useRef<string>("");
  const typingSubmitRef = useRef<boolean>(false);
  const lastSelectValueRef = useRef<Record<string, string>>({});
  const recordingRef = useRef<boolean>(false);

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

    // 타이머 즉시 정리 (중복 flush 방지)
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const value = typingValueRef.current ?? "";
    const masked = value ? "*".repeat(value.length) : "";

    // 요소를 찾아서 locator 생성
    let locator: ElementLocator | undefined;
    try {
      const element = document.querySelector(typingSelectorRef.current) as HTMLElement;
      if (element) {
        locator = generateRobustLocator(element);
      }
    } catch {}

    // locator가 없으면 selector 기반으로 기본 locator 생성
    if (!locator) {
      locator = {
        primary: typingSelectorRef.current,
        fallbacks: [],
      };
    }

    const step: Step = {
      type: "type",
      locator,
      text: masked,
      originalText: value,
      submit: typingSubmitRef.current || undefined,
      url: window.location.href,
    };

    browser.runtime.sendMessage({ type: "REC_STEP", step }).catch(() => {});

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

    // ✅ 클릭 전에 대기 중인 타이핑 먼저 플러시 (debounce 타이머 만료 전 입력 손실 방지)
    flushTyping();

    const el = e.target as HTMLElement | null;
    if (!el) return;

    // 우리 툴바나 루트 클릭은 무시
    if (el.closest("#automation-wizard-root")) return;

    // 링크 클릭 - 새 탭 열림을 same-tab 네비로 강제
    const linkEl = (el.closest && el.closest("a[href]")) as HTMLAnchorElement | null;

    if (linkEl && linkEl.href) {
      const isMiddleClick = e.button === 1;
      const isModifierOpen = e.metaKey === true || e.ctrlKey === true;
      const opensNewTab = linkEl.target === "_blank" || isMiddleClick || isModifierOpen;

      if (opensNewTab) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {}

        try {
          window.location.href = linkEl.href;
        } catch {}

        const navStep: Step = { type: "navigate", url: linkEl.href };
        browser.runtime.sendMessage({ type: "REC_STEP", step: navStep }).catch(() => {});
        return;
      }
    }

    // select 요소나 그 option 클릭은 무시 (change/input 이벤트에서 처리)
    const tag = el.tagName?.toLowerCase();
    if (tag === "select" || tag === "option") return;
    if (el.closest("select")) return;

    const locator = generateRobustLocator(el);

    const step: Step = {
      type: "click",
      locator,
      url: window.location.href,
    };

    browser.runtime.sendMessage({ type: "REC_STEP", step }).catch(() => {});
  }, [flushTyping]);

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
        const locator = generateRobustLocator(el);
        const value: string = el.value ?? "";

        // 중복 방지 (primary selector 기준)
        if (lastSelectValueRef.current[locator.primary] === value) return;
        lastSelectValueRef.current[locator.primary] = value;

        const step: Step = {
          type: "select",
          locator,
          value,
          url: window.location.href,
        };

        browser.runtime.sendMessage({ type: "REC_STEP", step }).catch(() => {});
        return;
      }

      // text input/textarea 처리
      const isTextField = tag === "input" || tag === "textarea";
      if (!isTextField) return;

      const selector = getSimpleSelector(el);
      const value: string = el.value ?? "";

      console.log(`📝 handleInput: tag=${tag}, value.length=${value.length}, selector=${selector}`);

      typingSelectorRef.current = selector;
      typingValueRef.current = value;

      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }

      typingTimerRef.current = window.setTimeout(() => {
        flushTyping();
      }, 500);
    },
    [autoCapture, flushTyping],
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

        // ✅ textarea 결과 관찰 방식: Enter 후 줄바꿈인지 제출인지 판단
        if (tag === "textarea") {
          const beforeValue = active.value || "";
          const beforeLength = beforeValue.length;

          // 1. 현재 활성 요소의 값을 직접 가져와서 type step 기록
          const currentTextareaValue = active.value ?? "";
          if (currentTextareaValue) {
            // 타이머 정리
            if (typingTimerRef.current) {
              window.clearTimeout(typingTimerRef.current);
              typingTimerRef.current = null;
            }

            const textareaSelector = getSimpleSelector(active);
            const textareaLocator = generateRobustLocator(active);
            const textareaMasked = "*".repeat(currentTextareaValue.length);

            const typeStep: Step = {
              type: "type",
              locator: textareaLocator,
              text: textareaMasked,
              originalText: currentTextareaValue,
              url: window.location.href,
            };

            console.log("✅ Recording type step before Enter in textarea:", typeStep);
            browser.runtime
              .sendMessage({ type: "REC_STEP", step: typeStep })
              .catch(() => {});
          }

          // 기존 타이핑 ref 초기화 (중복 방지)
          typingSelectorRef.current = null;
          typingValueRef.current = "";

          // 2. Enter 키 이벤트는 그대로 전파 (preventDefault 안 함)

          // 3. 50ms 후 결과 관찰
          setTimeout(() => {
            try {
              const afterValue = active.value || "";

              // 줄바꿈 판정: value에 \n이 새로 추가됨
              const hasNewNewline =
                afterValue.length > beforeLength &&
                afterValue.includes("\n") &&
                !beforeValue.endsWith("\n");

              if (hasNewNewline) {
                console.log(
                  "⏭️ Enter caused newline in textarea, skipping keyboard step"
                );
                return; // 줄바꿈이면 기록 안 함
              }

              // 제출 판정: value가 비워졌거나 변화 없음
              console.log(
                "✅ Enter caused submit in textarea, recording keyboard step"
              );

              const textareaKeySelector = getSimpleSelector(active);
              const textareaKeyLocator = generateRobustLocator(active);

              const step: Step = {
                type: "keyboard",
                key: "Enter",
                selector: textareaKeySelector,
                locator: textareaKeyLocator,
                url: window.location.href,
              } as any;

              browser.runtime
                .sendMessage({ type: "REC_STEP", step })
                .catch(() => {});
            } catch (err) {
              console.error("Failed to record keyboard step:", err);
            }
          }, 50);

          return; // Enter 이벤트는 계속 전파
        }

        // ✅ input 필드에서 Enter 처리 (기존 로직)
        if (tag === "input" && isTextField) {
          console.log(`✅ Enter key detected in ${tag} field`);

          // typingValueRef가 비어있어도 active.value로 fallback
          const pendingValue = typingValueRef.current;
          const elementValue = active.value ?? "";
          const valueToRecord = pendingValue || elementValue;
          
          console.log(`🔍 Enter handler: pendingValue="${pendingValue}", elementValue="${elementValue}", valueToRecord="${valueToRecord}"`);
          
          // 타이머 및 refs 먼저 정리 (focusout 중복 방지)
          if (typingTimerRef.current) {
            window.clearTimeout(typingTimerRef.current);
            typingTimerRef.current = null;
          }
          typingSelectorRef.current = null;
          typingValueRef.current = "";

          // type step 기록 (값이 있는 경우)
          if (valueToRecord) {
            const currentSelector = getSimpleSelector(active);
            const locator = generateRobustLocator(active);
            const masked = "*".repeat(valueToRecord.length);

            const typeStep: Step = {
              type: "type",
              locator,
              text: masked,
              originalText: valueToRecord,
              url: window.location.href,
            };

            console.log("✅ Recording type step before Enter:", typeStep);
            browser.runtime
              .sendMessage({ type: "REC_STEP", step: typeStep })
              .catch(() => {});
          }

          // keyboard step 기록
          const keyboardSelector = getSimpleSelector(active);
          const keyboardLocator = generateRobustLocator(active);

          const keyboardStep: Step = {
            type: "keyboard",
            key: "Enter",
            selector: keyboardSelector,
            locator: keyboardLocator,
            url: window.location.href,
          } as any;

          console.log(`✅ Recording keyboard step (Enter in ${tag}):`, keyboardStep);
          browser.runtime
            .sendMessage({ type: "REC_STEP", step: keyboardStep })
            .catch(() => {});

          // 3. 폼 제출 실행
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

        // ✅ 입력 필드 외부에서 Enter (버튼, 링크 등)
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
            selector: selector || undefined,
            locator: locator || undefined,
            url: window.location.href,
          } as any;

          console.log("✅ Recording keyboard step (Enter on element):", step);
          browser.runtime
            .sendMessage({ type: "REC_STEP", step })
            .catch(() => {});
        } catch (err) {
          console.error("Failed to record keyboard step:", err);
        }
      }
    },
    [autoCapture, flushTyping],
  );

  /**
   * FocusOut 이벤트 - 입력 필드에서 포커스 이탈 시 타이핑 플러시
   * (window.blur는 탭 이탈에만 동작하므로, document.focusout으로 변경)
   */
  const handleFocusOut = useCallback((e: FocusEvent) => {
    if (!recordingRef.current || !autoCapture) return;

    const el = e.target as HTMLElement;
    if (!el) return;

    const tag = el.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") {
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

      const locator = generateRobustLocator(el);
      const value: string = el.value ?? "";

      // 중복 방지 (primary selector 기준)
      if (lastSelectValueRef.current[locator.primary] === value) return;
      lastSelectValueRef.current[locator.primary] = value;

      const step: Step = {
        type: "select",
        locator,
        value,
        url: window.location.href,
      };

      browser.runtime.sendMessage({ type: "REC_STEP", step }).catch(() => {});
    },
    [autoCapture],
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
    document.addEventListener("focusout", handleFocusOut, true);
    document.addEventListener("change", handleChange, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("keydown", handleKeydownGlobal, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      document.removeEventListener("change", handleChange, true);
    };
  }, [
    recording,
    handleClick,
    handleInput,
    handleKeydownGlobal,
    handleFocusOut,
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
