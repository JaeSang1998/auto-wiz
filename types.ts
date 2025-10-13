// 레코드 가능한 액션 타입
export type Step =
  | { type: "click"; selector: string; url?: string; screenshot?: string }
  | {
      type: "type";
      selector: string;
      text: string;
      originalText?: string; // 보안을 위해 마스킹된 원본 텍스트
      url?: string;
      screenshot?: string;
    }
  | {
      type: "select";
      selector: string;
      value: string; // 선택할 옵션의 value 또는 text
      url?: string;
      screenshot?: string;
    }
  | {
      type: "extract";
      selector: string;
      prop?: "innerText" | "value";
      url?: string;
      screenshot?: string;
    }
  | {
      type: "waitFor";
      selector: string;
      timeoutMs?: number;
      url?: string;
      screenshot?: string;
    }
  | { type: "navigate"; url: string }
  | { type: "waitForNavigation"; timeoutMs?: number };

// 플로우 전체 구조
export interface Flow {
  id: string;
  title: string;
  steps: Step[];
  createdAt: number;
  startUrl?: string; // 시작 URL (선택사항)
}

// 메시지 타입
export type RecordStepMessage = { type: "REC_STEP"; step: Step };
export type TogglePickerMessage = { type: "TOGGLE_PICKER"; on: boolean };
export type RunFlowMessage = { type: "RUN_FLOW" };
export type SendToBackendMessage = {
  type: "SEND_TO_BACKEND";
  endpoint: string;
};
export type FlowUpdatedMessage = { type: "FLOW_UPDATED"; flow: Flow };
export type SentOkMessage = { type: "SENT_OK" };
export type StepExecutingMessage = {
  type: "STEP_EXECUTING";
  step: Step;
  stepIndex: number;
  totalSteps: number;
  currentUrl?: string;
};
export type StepCompletedMessage = {
  type: "STEP_COMPLETED";
  step: Step;
  stepIndex: number;
  success: boolean;
  error?: string;
  extractedData?: any; // extract 액션에서 추출된 데이터
};

export type FlowFailedMessage = {
  type: "FLOW_FAILED";
  error: string;
  failedStepIndex: number;
  failedStep: Step;
};

export type ElementScreenshotMessage = {
  type: "ELEMENT_SCREENSHOT";
  stepIndex: number;
  screenshot: string; // base64 이미지 데이터
  elementInfo: {
    tagName: string;
    selector: string;
    text?: string;
  };
};

export type Message =
  | RecordStepMessage
  | TogglePickerMessage
  | RunFlowMessage
  | SendToBackendMessage
  | FlowUpdatedMessage
  | SentOkMessage
  | StepExecutingMessage
  | StepCompletedMessage
  | FlowFailedMessage
  | ElementScreenshotMessage;
