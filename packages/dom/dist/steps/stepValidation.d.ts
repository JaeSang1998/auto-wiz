import type { Step } from "../types";
/**
 * Step validation 유틸리티
 * Step의 유효성 검증 및 오류 메시지 생성
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}
/**
 * Step의 기본 구조 검증
 */
export declare function validateStep(step: Step): ValidationResult;
/**
 * Step 배열의 모든 Step 검증
 */
export declare function validateSteps(steps: Step[]): ValidationResult;
/**
 * Step이 실행 가능한지 확인
 */
export declare function isExecutableStep(step: Step): boolean;
/**
 * Step 타입별 필수 필드 확인
 */
export declare function hasRequiredFields(step: Step): boolean;
