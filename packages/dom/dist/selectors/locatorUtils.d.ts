/**
 * Locator 유틸리티 - 고급 요소 검색 기능
 * Playwright/Maestro 스타일의 텍스트 기반, role 기반 매칭
 */
import type { ElementLocator } from "@automation-wizard/core";
/**
 * Role로 요소 찾기 (ARIA role)
 */
export declare function findByRole(role: string, options?: {
    name?: string;
    exact?: boolean;
    level?: number;
}): HTMLElement[];
/**
 * 텍스트로 찾기 (공백/대소문자 무시)
 */
export declare function findByCleanText(text: string): HTMLElement[];
/**
 * 텍스트로 찾기 (부분 일치)
 */
export declare function findByFuzzyText(text: string): HTMLElement[];
/**
 * 텍스트로 요소 찾기 (Playwright 스타일)
 */
export declare function findByText(text: string, options?: {
    exact?: boolean;
    normalize?: boolean;
    selector?: string;
    role?: string;
}): HTMLElement[];
/**
 * Placeholder로 요소 찾기
 */
export declare function findByPlaceholder(text: string, options?: {
    exact?: boolean;
}): HTMLElement[];
/**
 * Label로 요소 찾기 (form inputs)
 */
export declare function findByLabelText(text: string, options?: {
    exact?: boolean;
}): HTMLElement[];
/**
 * TestID로 요소 찾기
 */
export declare function findByTestId(testId: string): HTMLElement | null;
/**
 * ElementLocator로 요소 찾기 (fallback 지원)
 *
 * Primary selector부터 시도하고, 실패하면 fallback들을 순차적으로 시도
 */
export declare function findByLocator(locator: ElementLocator): HTMLElement | null;
/**
 * 요소가 상호작용 가능한지 확인 (enabled + visible)
 */
export declare function isInteractable(element: HTMLElement): boolean;
/**
 * Smart waiting: 요소가 나타날 때까지 대기
 */
export declare function waitForLocator(locator: ElementLocator, options?: {
    timeout?: number;
    visible?: boolean;
    interactable?: boolean;
}): Promise<HTMLElement>;
