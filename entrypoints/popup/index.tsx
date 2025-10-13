import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import type {
  Flow,
  FlowUpdatedMessage,
  SentOkMessage,
  Step,
  StepExecutingMessage,
  StepCompletedMessage,
  FlowFailedMessage,
  ElementScreenshotMessage,
} from "../../types";

function PopupApp() {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [endpoint, setEndpoint] = useState("https://api.example.com/flows");
  const [startUrl, setStartUrl] = useState("");
  const [pickerOn, setPickerOn] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [executingStep, setExecutingStep] = useState<{
    step: Step;
    stepIndex: number;
    totalSteps: number;
    currentUrl?: string;
  } | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [extractedData, setExtractedData] = useState<Map<number, any>>(
    new Map()
  );
  const [elementScreenshots, setElementScreenshots] = useState<
    Map<number, { screenshot: string; elementInfo: any }>
  >(new Map());
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  // 플로우 로드
  useEffect(() => {
    loadFlow();

    // 메시지 리스너
    const handleMessage = (
      msg:
        | FlowUpdatedMessage
        | SentOkMessage
        | StepExecutingMessage
        | StepCompletedMessage
        | FlowFailedMessage
        | ElementScreenshotMessage
    ) => {
      if (msg.type === "FLOW_UPDATED") {
        setFlow(msg.flow);
        setStatusMessage(`Step added! Total: ${msg.flow.steps.length}`);
        setTimeout(() => setStatusMessage(""), 3000);
      } else if (msg.type === "SENT_OK") {
        setStatusMessage("Successfully sent to backend!");
        setTimeout(() => setStatusMessage(""), 3000);
      } else if (msg.type === "STEP_EXECUTING") {
        setExecutingStep({
          step: msg.step,
          stepIndex: msg.stepIndex,
          totalSteps: msg.totalSteps,
          currentUrl: msg.currentUrl,
        });
        setStatusMessage(
          `Executing step ${msg.stepIndex + 1}/${msg.totalSteps}...`
        );
      } else if (msg.type === "STEP_COMPLETED") {
        setCompletedSteps((prev) => new Set([...prev, msg.stepIndex]));
        if (msg.success) {
          setStatusMessage(`Step ${msg.stepIndex + 1} completed successfully!`);

          // extract 데이터 저장
          if (msg.extractedData !== undefined) {
            setExtractedData((prev) =>
              new Map(prev).set(msg.stepIndex, msg.extractedData)
            );
            setStatusMessage(
              `Step ${msg.stepIndex + 1} completed! Extracted: "${
                msg.extractedData
              }"`
            );
          }
        } else {
          setStatusMessage(`Step ${msg.stepIndex + 1} failed: ${msg.error}`);
        }
        setTimeout(() => setStatusMessage(""), 2000);
      } else if (msg.type === "FLOW_FAILED") {
        setStatusMessage(
          `❌ Flow failed at step ${msg.failedStepIndex + 1}: ${msg.error}`
        );
        setExecutingStep(null);
        console.error("Flow execution failed:", msg.error);
      } else if (msg.type === "ELEMENT_SCREENSHOT") {
        setElementScreenshots((prev) =>
          new Map(prev).set(msg.stepIndex, {
            screenshot: msg.screenshot,
            elementInfo: msg.elementInfo,
          })
        );
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const loadFlow = async () => {
    const result = await browser.storage.local.get("flow");
    if (result.flow) {
      setFlow(result.flow);
      if (result.flow.startUrl) {
        setStartUrl(result.flow.startUrl);
      }
    }
  };

  const handleRun = async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab.id) return;

    const tabId = tab.id; // TypeScript를 위한 변수 저장

    // 실행 중에는 픽커 끄기
    await browser.tabs.sendMessage(tabId, { type: "TOGGLE_PICKER", on: false });

    setStatusMessage("Running flow...");

    try {
      await browser.runtime.sendMessage({ type: "RUN_FLOW" });
      setStatusMessage("Flow completed!");
    } catch (error) {
      setStatusMessage("Flow execution failed!");
      console.error(error);
    }

    // 다시 픽커 켜기
    setTimeout(async () => {
      await browser.tabs.sendMessage(tabId, {
        type: "TOGGLE_PICKER",
        on: pickerOn,
      });
      setStatusMessage("");
    }, 2000);
  };

  const handleSend = async () => {
    if (!endpoint) {
      setStatusMessage("Please enter an endpoint URL");
      return;
    }

    setStatusMessage("Sending to backend...");

    try {
      await browser.runtime.sendMessage({ type: "SEND_TO_BACKEND", endpoint });
    } catch (error) {
      setStatusMessage("Failed to send!");
      console.error(error);
    }
  };

  const handleTogglePicker = async () => {
    const newPickerState = !pickerOn;
    setPickerOn(newPickerState);

    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      await browser.tabs.sendMessage(tab.id, {
        type: "TOGGLE_PICKER",
        on: newPickerState,
      });
    }

    setStatusMessage(newPickerState ? "Picker enabled" : "Picker disabled");
    setTimeout(() => setStatusMessage(""), 2000);
  };

  const handleReset = async () => {
    if (!confirm("정말로 모든 레코드를 초기화하시겠습니까?")) return;

    const freshFlow: Flow = {
      id: crypto.randomUUID(),
      title: "Automation PoC Flow",
      steps: [],
      createdAt: Date.now(),
      startUrl: startUrl || undefined,
    };

    await browser.storage.local.set({ flow: freshFlow });
    setFlow(freshFlow);
    setStatusMessage("Flow reset!");
    setTimeout(() => setStatusMessage(""), 2000);
  };

  const handleDeleteStep = async (stepIndex: number) => {
    if (!flow) return;

    if (!confirm(`Step ${stepIndex + 1}을 삭제하시겠습니까?`)) return;

    const updatedFlow: Flow = {
      ...flow,
      steps: flow.steps.filter((_, index) => index !== stepIndex),
    };

    await browser.storage.local.set({ flow: updatedFlow });
    setFlow(updatedFlow);
    setStatusMessage(`Step ${stepIndex + 1} deleted!`);
    setTimeout(() => setStatusMessage(""), 2000);

    // extractedData와 elementScreenshots에서도 해당 스텝 제거
    const newExtractedData = new Map(extractedData);
    newExtractedData.delete(stepIndex);
    setExtractedData(newExtractedData);

    const newElementScreenshots = new Map(elementScreenshots);
    newElementScreenshots.delete(stepIndex);
    setElementScreenshots(newElementScreenshots);

    // completedSteps에서도 제거
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.delete(stepIndex);
    setCompletedSteps(newCompletedSteps);
  };

  const handleUpdateStartUrl = async () => {
    if (!flow) return;

    const updatedFlow: Flow = {
      ...flow,
      startUrl: startUrl || undefined,
    };

    await browser.storage.local.set({ flow: updatedFlow });
    setFlow(updatedFlow);
    setStatusMessage("Start URL updated!");
    setTimeout(() => setStatusMessage(""), 2000);
  };

  const handleToggleSidePanel = async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    try {
      if (sidePanelOpen) {
        // 사이드패널 닫기 (실제로는 숨기기만 가능)
        setSidePanelOpen(false);
        setStatusMessage("Side panel closed");
      } else {
        // 사이드패널 열기
        await browser.sidePanel.open({ tabId: tab.id });
        setSidePanelOpen(true);
        setStatusMessage("Side panel opened");
      }
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (error) {
      console.error("Failed to toggle side panel:", error);
      setStatusMessage("Failed to toggle side panel");
      setTimeout(() => setStatusMessage(""), 2000);
    }
  };

  const handleToggleMousePointer = async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    try {
      await browser.tabs.sendMessage(tab.id, {
        type: "TOGGLE_PICKER",
        on: !pickerOn,
      });
      setPickerOn(!pickerOn);
      setStatusMessage(`Mouse pointer ${!pickerOn ? "enabled" : "disabled"}`);
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (error) {
      console.error("Failed to toggle mouse pointer:", error);
      setStatusMessage("Failed to toggle mouse pointer");
      setTimeout(() => setStatusMessage(""), 2000);
    }
  };

  const getStepDescription = (step: Step, index: number): string => {
    switch (step.type) {
      case "click":
        return `${index + 1}. Click on ${step.selector}`;
      case "type":
        return `${index + 1}. Type "${(step as any).text}" into ${
          step.selector
        }`;
      case "select":
        return `${index + 1}. Select "${(step as any).value}" in ${
          step.selector
        }`;
      case "extract":
        return `${index + 1}. Extract ${
          (step as any).prop || "innerText"
        } from ${step.selector}`;
      case "waitFor":
        return `${index + 1}. Wait for ${step.selector} (${
          (step as any).timeoutMs || 5000
        }ms)`;
      default:
        return `${index + 1}. Unknown action`;
    }
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "16px",
        minHeight: "100vh",
        background: "#f9fafb",
      }}
    >
      <h2
        style={{
          fontSize: "20px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: "#111827",
        }}
      >
        🧙‍♂️ Automation Wizard
      </h2>

      {/* 상태 메시지 */}
      {statusMessage && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "12px",
            background: "#dbeafe",
            border: "1px solid #3b82f6",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#1e40af",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* 시작 URL 입력 */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "500",
            marginBottom: "4px",
            color: "#374151",
          }}
        >
          Start URL (Optional)
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={startUrl}
            onChange={(e) => setStartUrl(e.target.value)}
            placeholder="https://example.com (opens in new tab)"
            style={{
              flex: 1,
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleUpdateStartUrl}
            style={{
              padding: "8px 12px",
              background: "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            Save
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
          If set, Run will open a new tab with this URL first
        </p>
      </div>

      {/* 엔드포인트 입력 */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "500",
            marginBottom: "4px",
            color: "#374151",
          }}
        >
          Backend Endpoint
        </label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://api.example.com/flows"
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "13px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* 컨트롤 버튼들 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <button
          onClick={handleToggleSidePanel}
          style={{
            padding: "8px 12px",
            background: sidePanelOpen ? "#10b981" : "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {sidePanelOpen ? "📱 Side Panel ON" : "📱 Open Side Panel"}
        </button>
        <button
          onClick={handleToggleMousePointer}
          style={{
            padding: "8px 12px",
            background: pickerOn ? "#f59e0b" : "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {pickerOn ? "🖱️ Mouse ON" : "🖱️ Mouse OFF"}
        </button>
      </div>

      {/* 액션 버튼들 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={handleRun}
          disabled={!flow || flow.steps.length === 0}
          style={{
            padding: "10px 16px",
            background: flow && flow.steps.length > 0 ? "#3b82f6" : "#9ca3af",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: flow && flow.steps.length > 0 ? "pointer" : "not-allowed",
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          ▶ Run
        </button>

        <button
          onClick={handleSend}
          disabled={!flow || flow.steps.length === 0}
          style={{
            padding: "10px 16px",
            background: flow && flow.steps.length > 0 ? "#10b981" : "#9ca3af",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: flow && flow.steps.length > 0 ? "pointer" : "not-allowed",
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          📤 Send
        </button>

        <button
          onClick={handleTogglePicker}
          style={{
            padding: "10px 16px",
            background: pickerOn ? "#f59e0b" : "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          {pickerOn ? "⏸ Pause" : "▶ Resume"}
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: "10px 16px",
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          🗑 Reset
        </button>
      </div>

      {/* 사용법 안내 */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "12px",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "8px",
            color: "#374151",
          }}
        >
          💡 How to Use
        </h3>
        <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.4" }}>
          <p>1. Move mouse over elements to highlight</p>
          <p>
            2. Press <strong>Alt + Shift</strong> to lock
          </p>
          <p>3. Click action buttons (Click/Type/Extract/Wait)</p>
          <p>4. Use Run to execute or Send to backend</p>
        </div>
      </div>

      {/* 레코드된 스텝 리스트 */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "12px",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "12px",
            color: "#374151",
          }}
        >
          Recorded Steps ({flow?.steps.length || 0})
        </h3>

        {!flow || flow.steps.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: "#6b7280",
              fontStyle: "italic",
            }}
          >
            Move mouse over elements and press Alt + Shift to record actions.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {flow.steps.map((step, index) => (
              <div
                key={index}
                style={{
                  padding: "8px 10px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#374151",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div style={{ flex: 1 }}>{getStepDescription(step, index)}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStep(index);
                  }}
                  title="Delete this step"
                  style={{
                    padding: "4px 8px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "500",
                    flexShrink: 0,
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extracted Data 섹션 */}
      {extractedData.size > 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "12px",
            marginTop: "16px",
          }}
        >
          <h3
            style={{
              fontSize: "14px",
              fontWeight: "600",
              marginBottom: "12px",
              color: "#374151",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📋 Extracted Data ({extractedData.size})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from(extractedData.entries()).map(([stepIndex, data]) => {
              const step = flow?.steps[stepIndex];
              if (!step) return null;

              return (
                <div
                  key={stepIndex}
                  style={{
                    padding: "8px 10px",
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "500",
                      color: "#0369a1",
                      marginBottom: "4px",
                    }}
                  >
                    Step {stepIndex + 1}: {getStepDescription(step, stepIndex)}
                  </div>
                  <div
                    style={{
                      color: "#1e40af",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {String(data)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* JSON 뷰 (디버깅용) */}
      {flow && flow.steps.length > 0 && (
        <details style={{ marginTop: "16px" }}>
          <summary
            style={{
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            View JSON
          </summary>
          <pre
            style={{
              marginTop: "8px",
              padding: "12px",
              background: "#1f2937",
              color: "#f3f4f6",
              borderRadius: "6px",
              fontSize: "11px",
              overflow: "auto",
              maxHeight: "200px",
            }}
          >
            {JSON.stringify(flow, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// DOM이 로드된 후 실행
function init() {
  const root = document.getElementById("root");
  if (root) {
    console.log("Mounting React app to popup");
    const reactRoot = ReactDOM.createRoot(root);
    reactRoot.render(<PopupApp />);
  } else {
    console.error("Root element not found");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
