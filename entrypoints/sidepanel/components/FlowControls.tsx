import React from "react";
import { Target, Circle, Square, Play, Pause, Undo, Trash2, Send } from "lucide-react";

interface FlowControlsProps {
  recording: boolean;
  pickerOn: boolean;
  isRunning: boolean;
  hasSteps: boolean;
  onTogglePicker: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRun: () => void;
  onStop: () => void;
  onClear: () => void;
  onUndo: () => void;
  onSendToBackend: () => void;
}

/**
 * Flow 제어 버튼들을 표시하는 컴포넌트
 */
export function FlowControls({
  recording,
  pickerOn,
  isRunning,
  hasSteps,
  onTogglePicker,
  onStartRecording,
  onStopRecording,
  onRun,
  onStop,
  onClear,
  onUndo,
  onSendToBackend,
}: FlowControlsProps) {
  return (
    <div
      style={{
        padding: "20px",
        background: "#ffffff",
        borderBottom: "1px solid #e5e5e5",
      }}
    >
      {/* Main Action Buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <button
          onClick={onTogglePicker}
          style={{
            flex: 1,
            padding: "11px 16px",
            background: pickerOn ? "#1a1a1a" : "#f5f5f5",
            color: pickerOn ? "#ffffff" : "#404040",
            border: "1px solid #e5e5e5",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "none",
            letterSpacing: "-0.01em",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Target size={16} strokeWidth={2} />
          {pickerOn ? "Picker Active" : "Enable Picker"}
        </button>

        {recording ? (
          <button
            onClick={onStopRecording}
            style={{
              flex: 1,
              padding: "11px 16px",
              background: "#1a1a1a",
              color: "#ffffff",
              border: "1px solid #1a1a1a",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              boxShadow: "none",
              letterSpacing: "-0.01em",
              animation: "pulse 1.5s ease-in-out infinite",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Square size={16} strokeWidth={2} fill="currentColor" />
            Stop Recording
          </button>
        ) : (
          <button
            onClick={onStartRecording}
            style={{
              flex: 1,
              padding: "11px 16px",
              background: "#1a1a1a",
              color: "#ffffff",
              border: "1px solid #1a1a1a",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              boxShadow: "none",
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Circle size={16} strokeWidth={2} fill="currentColor" />
            Start Recording
          </button>
        )}
      </div>

      {/* Flow Action Buttons - 일렬 레이아웃 */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={onUndo}
          disabled={!hasSteps || isRunning}
          style={{
            flex: 1,
            padding: "11px 16px",
            background: !hasSteps || isRunning ? "#fafafa" : "#f5f5f5",
            color: !hasSteps || isRunning ? "#a3a3a3" : "#404040",
            border: "1px solid #e5e5e5",
            borderRadius: "8px",
            cursor: !hasSteps || isRunning ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "none",
            letterSpacing: "-0.01em",
            opacity: !hasSteps || isRunning ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Undo size={16} strokeWidth={2} />
          Undo
        </button>

        <button
          onClick={onClear}
          disabled={!hasSteps || recording || isRunning}
          style={{
            flex: 1,
            padding: "11px 16px",
            background: !hasSteps || recording || isRunning ? "#fafafa" : "#ffffff",
            color: !hasSteps || recording || isRunning ? "#a3a3a3" : "#dc2626",
            border: "1px solid #e5e5e5",
            borderRadius: "8px",
            cursor: !hasSteps || recording || isRunning ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "none",
            letterSpacing: "-0.01em",
            opacity: !hasSteps || recording || isRunning ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Trash2 size={16} strokeWidth={2} />
          Clear
        </button>

        <button
          onClick={onSendToBackend}
          disabled={!hasSteps || isRunning}
          style={{
            flex: 2,
            padding: "11px 16px",
            background: !hasSteps || isRunning ? "#fafafa" : "#f5f5f5",
            color: !hasSteps || isRunning ? "#a3a3a3" : "#404040",
            border: "1px solid #e5e5e5",
            borderRadius: "8px",
            cursor: !hasSteps || isRunning ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "none",
            letterSpacing: "-0.01em",
            opacity: !hasSteps || isRunning ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Send size={16} strokeWidth={2} />
          Send
        </button>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `}
      </style>
    </div>
  );
}

