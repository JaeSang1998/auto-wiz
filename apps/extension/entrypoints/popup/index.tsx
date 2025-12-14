import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Wand2, PanelRightOpen } from "lucide-react";

function PopupApp() {
  const [statusMessage, setStatusMessage] = useState("");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  const handleToggleSidePanel = async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    try {
      await browser.sidePanel.open({ tabId: tab.id });
      setSidePanelOpen(true);
      setStatusMessage("Side panel opened");
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (error) {
      console.error("Failed to open side panel:", error);
      setStatusMessage("Failed to open side panel");
      setTimeout(() => setStatusMessage(""), 2000);
    }
  };

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
        padding: "16px",
        minHeight: "auto",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "300px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
        <Wand2 size={18} strokeWidth={2} />
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            margin: 0,
            color: "#1a1a1a",
            letterSpacing: "-0.01em",
          }}
        >
          Automation Wizard
        </h2>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fafafa",
            border: "1px solid #e5e5e5",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#404040",
          }}
        >
          {statusMessage}
        </div>
      )}

      <button
        onClick={handleToggleSidePanel}
        style={{
          padding: "11px 16px",
          background: sidePanelOpen ? "#1a1a1a" : "#f5f5f5",
          color: sidePanelOpen ? "#ffffff" : "#404040",
          border: "1px solid #e5e5e5",
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
        <PanelRightOpen size={16} strokeWidth={2} />
        {sidePanelOpen ? "Side Panel Active" : "Open Side Panel"}
      </button>
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
