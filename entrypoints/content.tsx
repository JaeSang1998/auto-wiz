import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import HoverToolbar from "./content/HoverToolbar";
import type { Step, TogglePickerMessage } from "../types";

function ContentApp() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [pickerOn, setPickerOn] = useState(true);
  const [locked, setLocked] = useState(false); // Alt + Shift로 잠금
  const [lockedTarget, setLockedTarget] = useState<HTMLElement | null>(null);
  const [lockedCoords, setLockedCoords] = useState({ x: 0, y: 0 });
  const [inspectedElement, setInspectedElement] = useState<HTMLElement | null>(
    null
  );
  const [hoverBox, setHoverBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  // 텍스트 입력 모달 상태
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState("");
  const [textInputCallback, setTextInputCallback] = useState<
    ((text: string | null) => void) | null
  >(null);

  // select 옵션 모달 상태
  const [showSelectOption, setShowSelectOption] = useState(false);
  const [selectOptions, setSelectOptions] = useState<
    Array<{ index: number; value: string; text: string }>
  >([]);
  const [selectOptionCallback, setSelectOptionCallback] = useState<
    ((value: string | null) => void) | null
  >(null);

  // Alt + Shift (또는 Option + Shift) 키로 툴바 고정/해제
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + Shift (Windows) 또는 Option + Shift (Mac)
      if (e.altKey && e.shiftKey && !e.key.startsWith("Arrow")) {
        e.preventDefault();

        if (locked) {
          // 이미 잠금 상태면 해제
          setLocked(false);
          setLockedTarget(null);
          setInspectedElement(null);
        } else if (target) {
          // 현재 호버 중인 엘리먼트 잠금
          setLocked(true);
          setLockedTarget(target);
          setLockedCoords(coords);
          setInspectedElement(target);
        }
      }

      // ESC로 잠금 해제
      if (e.key === "Escape" && locked) {
        setLocked(false);
        setLockedTarget(null);
        setInspectedElement(null);
      }

      // 화살표 키로 요소 탐색 (잠금 상태일 때만)
      if (locked && inspectedElement) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          navigateToParent();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          navigateToChild();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [locked, target, coords, inspectedElement]);

  // 성능 최적화: throttle 적용
  useEffect(() => {
    let rafId: number | null = null;
    let lastUpdate = 0;
    const throttleMs = 50; // 50ms throttle

    const handleMouseMove = (e: MouseEvent) => {
      if (!pickerOn || locked) return; // 잠금 상태면 마우스 무시

      const now = Date.now();
      if (now - lastUpdate < throttleMs) {
        return; // throttle
      }

      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        lastUpdate = now;

        const el = document.elementFromPoint(
          e.clientX,
          e.clientY
        ) as HTMLElement | null;

        if (!el || el === document.body || el === document.documentElement) {
          setTarget(null);
          setHoverBox(null);
          return;
        }

        // 우리가 만든 툴바/하이라이트 요소는 제외
        if (el.closest("#automation-wizard-root")) {
          return;
        }

        setTarget(el);
        setCoords({ x: e.clientX, y: e.clientY });

        const rect = el.getBoundingClientRect();
        setHoverBox({
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        });
      });
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [pickerOn, locked]);

  useEffect(() => {
    const handleMessage = (msg: TogglePickerMessage) => {
      if (msg.type === "TOGGLE_PICKER") {
        setPickerOn(msg.on);
        if (!msg.on) {
          setTarget(null);
          setHoverBox(null);
        }
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleRecord = (step: Step) => {
    // 현재 URL을 스텝에 추가
    const stepWithUrl = { ...step, url: window.location.href };

    browser.runtime.sendMessage({ type: "REC_STEP", step: stepWithUrl });
    console.log("Recorded step:", stepWithUrl);

    // 액션 선택 후 자동으로 잠금 해제
    setLocked(false);
    setLockedTarget(null);
    setInspectedElement(null);
  };

  const navigateToParent = () => {
    if (!inspectedElement) return;
    const parent = inspectedElement.parentElement;
    if (
      parent &&
      parent !== document.body &&
      parent !== document.documentElement
    ) {
      setInspectedElement(parent);
      setLockedTarget(parent);

      // 하이라이트 업데이트
      const rect = parent.getBoundingClientRect();
      setHoverBox({
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  const navigateToChild = () => {
    if (!inspectedElement) return;
    const firstChild = inspectedElement.children[0] as HTMLElement;
    if (firstChild) {
      setInspectedElement(firstChild);
      setLockedTarget(firstChild);

      // 하이라이트 업데이트
      const rect = firstChild.getBoundingClientRect();
      setHoverBox({
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  // 텍스트 입력 모달 표시
  const handleShowTextInput = (callback: (text: string | null) => void) => {
    setTextInputValue("");
    setTextInputCallback(() => callback);
    setShowTextInput(true);
  };

  // 텍스트 입력 확인
  const handleTextInputSubmit = () => {
    if (textInputCallback) {
      textInputCallback(textInputValue);
    }
    setShowTextInput(false);
    setTextInputValue("");
    setTextInputCallback(null);
  };

  // 텍스트 입력 취소
  const handleTextInputCancel = () => {
    if (textInputCallback) {
      textInputCallback(null);
    }
    setShowTextInput(false);
    setTextInputValue("");
    setTextInputCallback(null);
  };

  // select 옵션 모달 표시
  const handleShowSelectOption = (
    options: Array<{ index: number; value: string; text: string }>,
    callback: (value: string | null) => void
  ) => {
    setSelectOptions(options);
    setSelectOptionCallback(() => callback);
    setShowSelectOption(true);
  };

  // select 옵션 선택
  const handleSelectOption = (value: string) => {
    if (selectOptionCallback) {
      selectOptionCallback(value);
    }
    setShowSelectOption(false);
    setSelectOptions([]);
    setSelectOptionCallback(null);
  };

  // select 옵션 취소
  const handleSelectOptionCancel = () => {
    if (selectOptionCallback) {
      selectOptionCallback(null);
    }
    setShowSelectOption(false);
    setSelectOptions([]);
    setSelectOptionCallback(null);
  };

  return (
    <>
      {/* 하이라이트 박스 */}
      {pickerOn && hoverBox && (
        <div
          style={{
            position: "absolute",
            left: `${hoverBox.left}px`,
            top: `${hoverBox.top}px`,
            width: `${hoverBox.width}px`,
            height: `${hoverBox.height}px`,
            border: locked ? "3px solid #f59e0b" : "2px solid #5b9",
            pointerEvents: "none",
            zIndex: 2147483646,
            boxSizing: "border-box",
            transition: "border 0.2s",
          }}
        />
      )}

      {/* 잠금 상태 표시 */}
      {locked && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            background: "#f59e0b",
            color: "white",
            padding: "8px 16px",
            borderRadius: "8px",
            fontFamily: "system-ui",
            fontSize: "13px",
            fontWeight: "600",
            zIndex: 2147483647,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            animation: "fadeIn 0.2s",
          }}
        >
          🔒 Locked
          <span style={{ fontSize: "11px", opacity: 0.9 }}>
            (ESC or Alt+Shift)
          </span>
        </div>
      )}

      {/* 안내 메시지 - 잠금 상태가 아닐 때만 */}
      {pickerOn && !locked && target && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.75)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "8px",
            fontFamily: "system-ui",
            fontSize: "12px",
            zIndex: 2147483647,
            pointerEvents: "none",
          }}
        >
          Press <strong>Alt + Shift</strong> (or <strong>Option + Shift</strong>
          ) to lock and select action
        </div>
      )}

      {/* 잠금 상태일 때 키보드 안내 */}
      {locked && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.75)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "8px",
            fontFamily: "system-ui",
            fontSize: "12px",
            zIndex: 2147483647,
            pointerEvents: "none",
          }}
        >
          Use <strong>↑/↓</strong> arrows or buttons to navigate elements
        </div>
      )}

      {/* 툴바 - 잠금 상태일 때만 표시 */}
      {pickerOn && locked && inspectedElement && (
        <HoverToolbar
          x={lockedCoords.x}
          y={lockedCoords.y}
          target={inspectedElement}
          locked={locked}
          onRecord={handleRecord}
          onNavigateParent={navigateToParent}
          onNavigateChild={navigateToChild}
          onShowTextInput={handleShowTextInput}
        />
      )}

      {/* 마스킹된 텍스트 입력 모달 */}
      {showTextInput && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2147483647,
          }}
          onClick={handleTextInputCancel}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              minWidth: "400px",
              maxWidth: "500px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "18px",
                fontWeight: "600",
                color: "#1e293b",
                fontFamily: "system-ui",
              }}
            >
              🔒 Enter Text (Secured)
            </h3>
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "13px",
                color: "#64748b",
                fontFamily: "system-ui",
              }}
            >
              Your input will be masked for security. Type your text below:
            </p>
            <input
              type="password"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTextInputSubmit();
                } else if (e.key === "Escape") {
                  handleTextInputCancel();
                }
              }}
              autoFocus
              placeholder="Type text here..."
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "2px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "14px",
                fontFamily: "system-ui",
                boxSizing: "border-box",
                marginBottom: "16px",
                outline: "none",
              }}
            />
            <div
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                marginBottom: "16px",
                fontFamily: "system-ui",
              }}
            >
              💡 Tip: Your text appears as "••••" for privacy
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleTextInputCancel}
                style={{
                  padding: "8px 16px",
                  background: "#e2e8f0",
                  color: "#475569",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  fontFamily: "system-ui",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleTextInputSubmit}
                style={{
                  padding: "8px 16px",
                  background: "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  fontFamily: "system-ui",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const root = document.createElement("div");
    root.id = "automation-wizard-root";
    document.documentElement.appendChild(root);

    const reactRoot = ReactDOM.createRoot(root);
    reactRoot.render(<ContentApp />);
  },
});
