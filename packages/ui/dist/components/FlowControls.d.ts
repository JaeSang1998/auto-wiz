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
export declare function FlowControls({ recording, pickerOn, isRunning, hasSteps, onTogglePicker, onStartRecording, onStopRecording, onRun, onStop, onClear, onUndo, onSendToBackend, }: FlowControlsProps): import("react/jsx-runtime").JSX.Element;
export {};
