/**
 * ElementLocator: 다중 selector 전략 (Playwright/Maestro 스타일)
 * 우선순위 기반으로 여러 selector를 시도하여 안정성 향상
 */
export interface ElementLocator {
  /** Primary selector (가장 신뢰할 수 있는) */
  primary: string;

  /** Fallback selectors (우선순위 순서대로) */
  fallbacks: string[];

  /** 요소 메타데이터 (fuzzy matching용) */
  metadata?: {
    text?: string; // 요소의 텍스트 내용
    role?: string; // ARIA role
    tagName?: string; // HTML 태그명
    testId?: string; // data-testid
    ariaLabel?: string; // aria-label
    placeholder?: string; // placeholder 속성
    title?: string; // title 속성
  };
}

// 레코드 가능한 액션 타입
type CoreStep =
  | {
      type: "click";
      locator: ElementLocator;
      url?: string;
      screenshot?: string;
      timeoutMs?: number;
    }
  | {
      type: "type";
      locator: ElementLocator;
      text: string;
      originalText?: string; // 보안을 위해 마스킹된 원본 텍스트
      submit?: boolean; // 입력 후 Enter 제출 여부
      url?: string;
      screenshot?: string;
      timeoutMs?: number;
    }
  | {
      type: "select";
      locator: ElementLocator;
      value: string; // 선택할 옵션의 value 또는 text
      url?: string;
      screenshot?: string;
      timeoutMs?: number;
    }
  | {
      type: "extract";
      locator: ElementLocator;
      prop?: "innerText" | "value" | "outerHTML" | "structure" | "simplified";
      url?: string;
      screenshot?: string;
      timeoutMs?: number;
    }
  | {
      type: "waitFor";
      locator?: ElementLocator; // locator 또는 timeoutMs 중 하나 필요
      timeoutMs?: number;
      url?: string;
      screenshot?: string;
    }
  | {
      type: "screenshot";
      locator: ElementLocator;
      url?: string;
      screenshot: string;
      timeoutMs?: number;
    }
  | { type: "navigate"; url: string }
  | { type: "waitForNavigation"; timeoutMs?: number };

// 각 스텝에 프레임 메타데이터를 선택적으로 포함
export type Step = CoreStep & {
  _frameId?: number; // 기록된 프레임 ID (브라우저 frameId)
  _frameUrl?: string; // 기록 당시 프레임 URL
};

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
    locator: string; // primary selector
    text?: string;
  };
};

// 레코딩 관련 메시지
export type StartRecordMessage = { type: "START_RECORD" };
export type StopRecordMessage = { type: "STOP_RECORD" };
export type StopRunMessage = { type: "STOP_RUN" };
export type PlayEventsToContentMessage = {
  type: "PLAY_EVENTS";
  events: any[]; // deprecated: Step 기반 재생을 권장
};
export type RecordStateUpdatedMessage = {
  type: "RECORD_STATE";
  recording: boolean;
};
export type GetRecordStateMessage = { type: "GET_RECORD_STATE" };
export type UndoLastStepMessage = { type: "UNDO_LAST_STEP" };

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
  | ElementScreenshotMessage
  | StartRecordMessage
  | StopRecordMessage
  | StopRunMessage
  | PlayEventsToContentMessage
  | RecordStateUpdatedMessage
  | GetRecordStateMessage
  | UndoLastStepMessage;
