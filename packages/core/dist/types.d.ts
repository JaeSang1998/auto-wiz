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
        text?: string;
        role?: string;
        tagName?: string;
        testId?: string;
        ariaLabel?: string;
        placeholder?: string;
        title?: string;
    };
}
type CoreStep = {
    type: "click";
    selector: string;
    locator?: ElementLocator;
    url?: string;
    screenshot?: string;
    timeoutMs?: number;
} | {
    type: "type";
    selector: string;
    locator?: ElementLocator;
    text: string;
    originalText?: string;
    submit?: boolean;
    url?: string;
    screenshot?: string;
    timeoutMs?: number;
} | {
    type: "select";
    selector: string;
    locator?: ElementLocator;
    value: string;
    url?: string;
    screenshot?: string;
    timeoutMs?: number;
} | {
    type: "extract";
    selector: string;
    locator?: ElementLocator;
    prop?: "innerText" | "value";
    url?: string;
    screenshot?: string;
    timeoutMs?: number;
} | {
    type: "waitFor";
    selector?: string;
    locator?: ElementLocator;
    timeoutMs?: number;
    url?: string;
    screenshot?: string;
} | {
    type: "screenshot";
    selector: string;
    locator?: ElementLocator;
    url?: string;
    screenshot: string;
    timeoutMs?: number;
} | {
    type: "navigate";
    url: string;
} | {
    type: "waitForNavigation";
    timeoutMs?: number;
};
export type Step = CoreStep & {
    _frameId?: number;
    _frameUrl?: string;
};
export interface Flow {
    id: string;
    title: string;
    steps: Step[];
    createdAt: number;
    startUrl?: string;
}
export type RecordStepMessage = {
    type: "REC_STEP";
    step: Step;
};
export type TogglePickerMessage = {
    type: "TOGGLE_PICKER";
    on: boolean;
};
export type RunFlowMessage = {
    type: "RUN_FLOW";
};
export type SendToBackendMessage = {
    type: "SEND_TO_BACKEND";
    endpoint: string;
};
export type FlowUpdatedMessage = {
    type: "FLOW_UPDATED";
    flow: Flow;
};
export type SentOkMessage = {
    type: "SENT_OK";
};
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
    extractedData?: any;
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
    screenshot: string;
    elementInfo: {
        tagName: string;
        selector: string;
        text?: string;
    };
};
export type StartRecordMessage = {
    type: "START_RECORD";
};
export type StopRecordMessage = {
    type: "STOP_RECORD";
};
export type StopRunMessage = {
    type: "STOP_RUN";
};
export type PlayEventsToContentMessage = {
    type: "PLAY_EVENTS";
    events: any[];
};
export type RecordStateUpdatedMessage = {
    type: "RECORD_STATE";
    recording: boolean;
};
export type GetRecordStateMessage = {
    type: "GET_RECORD_STATE";
};
export type UndoLastStepMessage = {
    type: "UNDO_LAST_STEP";
};
export type Message = RecordStepMessage | TogglePickerMessage | RunFlowMessage | SendToBackendMessage | FlowUpdatedMessage | SentOkMessage | StepExecutingMessage | StepCompletedMessage | FlowFailedMessage | ElementScreenshotMessage | StartRecordMessage | StopRecordMessage | StopRunMessage | PlayEventsToContentMessage | RecordStateUpdatedMessage | GetRecordStateMessage | UndoLastStepMessage;
export {};
