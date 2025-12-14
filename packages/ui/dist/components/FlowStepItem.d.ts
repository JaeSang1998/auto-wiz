import type { Step } from "@automation-wizard/core";
interface FlowStepItemProps {
    step: Step;
    index: number;
    isExecuting: boolean;
    isCompleted: boolean;
    extractedData?: any;
    screenshot?: {
        screenshot: string;
        elementInfo: any;
    };
    onRemove: (index: number) => void;
    onMoveUp?: (index: number) => void;
    onMoveDown?: (index: number) => void;
    totalSteps?: number;
}
/**
 * Flow의 개별 Step을 표시하는 컴포넌트
 */
export declare function FlowStepItem({ step, index, isExecuting, isCompleted, extractedData, screenshot, onRemove, onMoveUp, onMoveDown, totalSteps, }: FlowStepItemProps): import("react/jsx-runtime").JSX.Element;
export {};
