import React, { useState } from "react";
import { MousePointer2, Keyboard, ListChecks, Download, Globe, Clock, GripVertical, X } from "lucide-react";
import type { Step } from "../../../types";

interface FlowStepItemProps {
  step: Step;
  index: number;
  isExecuting: boolean;
  isCompleted: boolean;
  extractedData?: any;
  screenshot?: { screenshot: string; elementInfo: any };
  onRemove: (index: number) => void;
  onEdit?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

/**
 * Flow의 개별 Step을 표시하는 컴포넌트
 */
export function FlowStepItem({
  step,
  index,
  isExecuting,
  isCompleted,
  extractedData,
  screenshot,
  onRemove,
  onEdit,
  onReorder,
}: FlowStepItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
    const toIndex = index;

    if (onReorder && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
  };

  const getStepIcon = (type: Step["type"]) => {
    const iconProps = { size: 14, strokeWidth: 2 };
    switch (type) {
      case "click":
        return <MousePointer2 {...iconProps} />;
      case "type":
        return <Keyboard {...iconProps} />;
      case "select":
        return <ListChecks {...iconProps} />;
      case "extract":
        return <Download {...iconProps} />;
      case "navigate":
        return <Globe {...iconProps} />;
      case "waitFor":
        return <Clock {...iconProps} />;
      default:
        return null;
    }
  };

  const getStepLabel = (type: Step["type"]) => {
    switch (type) {
      case "click":
        return "Click";
      case "type":
        return "Type";
      case "select":
        return "Select";
      case "extract":
        return "Extract";
      case "navigate":
        return "Navigate";
      case "waitFor":
        return "Wait";
      default:
        return "Action";
    }
  };

  const getStepDescription = (step: Step) => {
    switch (step.type) {
      case "click":
        return `Click ${step.selector}`;
      case "type":
        return `Type "${step.text || step.originalText}" into ${step.selector}${
          step.submit ? " (Submit)" : ""
        }`;
      case "select":
        return `Select "${step.value}" in ${step.selector}`;
      case "extract":
        return `Extract from ${step.selector}`;
      case "navigate":
        return `Navigate to ${step.url}`;
      case "waitFor":
        return `Wait for ${step.selector || `${step.timeoutMs}ms`}`;
      default:
        return JSON.stringify(step);
    }
  };

  return (
    <div
      draggable={onReorder !== undefined}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        padding: "16px",
        background: isDragging
          ? "#fafafa"
          : isDragOver
          ? "#f5f5f5"
          : isExecuting
          ? "#fafafa"
          : isCompleted
          ? "#f5f5f5"
          : "#ffffff",
        border: "1px solid #e5e5e5",
        borderLeft: isDragOver
          ? "3px solid #1a1a1a"
          : isExecuting
          ? "3px solid #737373"
          : isCompleted
          ? "3px solid #404040"
          : "1px solid #e5e5e5",
        borderRadius: "8px",
        marginBottom: "10px",
        transition: "all 0.2s ease",
        cursor: onReorder ? "move" : "default",
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Step Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onReorder && (
            <span
              style={{
                cursor: "grab",
                color: "#d4d4d4",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
              }}
              title="Drag to reorder"
            >
              <GripVertical size={16} strokeWidth={2} />
            </span>
          )}
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#a3a3a3",
              letterSpacing: "-0.01em",
            }}
          >
            {index + 1}
          </span>
          <span
            style={{
              fontSize: "12px",
              padding: "4px 10px",
              background: "#fafafa",
              border: "1px solid #e5e5e5",
              borderRadius: "6px",
              fontWeight: 500,
              color: "#404040",
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {getStepIcon(step.type)}
            {getStepLabel(step.type)}
          </span>
          {isExecuting && (
            <span
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                background: "#1a1a1a",
                color: "#ffffff",
                borderRadius: "6px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Running
            </span>
          )}
          {isCompleted && (
            <span
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                background: "#404040",
                color: "#ffffff",
                borderRadius: "6px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Done
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "6px" }}>
          {onEdit && (
            <button
              onClick={() => onEdit(index)}
              style={{
                padding: "6px 12px",
                background: "#f5f5f5",
                color: "#404040",
                border: "1px solid #e5e5e5",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Edit
            </button>
          )}
          <button
            onClick={() => onRemove(index)}
            style={{
              padding: "6px 12px",
              background: "#ffffff",
              color: "#dc2626",
              border: "1px solid #e5e5e5",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <X size={14} strokeWidth={2} />
            Remove
          </button>
        </div>
      </div>

      {/* Step Description */}
      <div
        style={{
          fontSize: "13px",
          color: "#404040",
          marginBottom: extractedData || screenshot ? "12px" : "0",
          wordBreak: "break-word",
          lineHeight: "1.5",
        }}
      >
        {getStepDescription(step)}
      </div>

      {/* Extracted Data */}
      {extractedData !== undefined && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            background: "#fafafa",
            border: "1px solid #e5e5e5",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#404040",
            fontFamily: "'SF Mono', 'Monaco', 'Menlo', monospace",
            lineHeight: "1.6",
          }}
        >
          <strong style={{ fontWeight: 500 }}>Extracted:</strong> {JSON.stringify(extractedData)}
        </div>
      )}

      {/* Screenshot */}
      {screenshot && (
        <div style={{ marginTop: "12px" }}>
          <img
            src={screenshot.screenshot}
            alt="Element screenshot"
            style={{
              maxWidth: "100%",
              borderRadius: "6px",
              border: "1px solid #e5e5e5",
            }}
          />
        </div>
      )}
    </div>
  );
}

