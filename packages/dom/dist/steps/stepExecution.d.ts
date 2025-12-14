import type { Step } from "@automation-wizard/core";
/**
 * Step execution 유틸리티
 * 각 Step 타입별 실행 로직
 *
 * 새로운 locator 시스템 지원:
 * - step.locator가 있으면 다중 selector fallback 사용
 * - 없으면 기존 step.selector 사용 (하위 호환성)
 */
export interface ExecutionResult {
    success: boolean;
    error?: string;
    extractedData?: any;
    usedSelector?: string;
}
/**
 * Click step 실행
 */
export declare function executeClickStep(step: Step): Promise<ExecutionResult>;
/**
 * Type step 실행
 */
export declare function executeTypeStep(step: Step): Promise<ExecutionResult>;
/**
 * Select step 실행
 */
export declare function executeSelectStep(step: Step): Promise<ExecutionResult>;
/**
 * Extract step 실행
 */
export declare function executeExtractStep(step: Step): Promise<ExecutionResult>;
/**
 * WaitFor step 실행
 */
export declare function executeWaitForStep(step: Step): Promise<ExecutionResult>;
/**
 * Step 실행 (타입에 따라 자동 분기)
 */
export declare function executeStep(step: Step): Promise<ExecutionResult>;
