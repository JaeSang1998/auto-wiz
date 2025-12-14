/**
 * CSS Selector 생성 유틸리티
 *
 * Playwright/Maestro 스타일의 다중 selector 전략:
 *
 * Tier 1 (가장 안정적):
 * - data-testid, data-test, data-cy
 * - id 속성
 * - name 속성
 * - ARIA labels
 *
 * Tier 2 (의미론적):
 * - role + 텍스트
 * - placeholder, title, alt
 *
 * Tier 3 (구조적):
 * - CSS selector (class + structure)
 * - nth-of-type
 *
 * Tier 4 (텍스트 기반):
 * - 텍스트 내용 검색
 */
import type { ElementLocator } from "../types";
/**
 * 단순 selector 생성 (빠른 선택용)
 * ID가 있으면 ID만 사용, 없으면 전체 경로 생성
 */
export declare function getSimpleSelector(el: Element): string;
/**
 * 상세한 selector 생성 (안정성 우선)
 * data-testid, aria-label 등 안정적인 속성 우선 사용
 */
export declare function makeSelector(el: HTMLElement): string;
/**
 * Selector가 유효한지 검증
 */
export declare function isValidSelector(selector: string): boolean;
/**
 * Selector로 단일 요소 찾기 (안전)
 */
export declare function querySelector(selector: string): HTMLElement | null;
/**
 * Selector로 여러 요소 찾기 (안전)
 */
export declare function querySelectorAll(selector: string): HTMLElement[];
/**
 * Robust한 다중 selector 생성 (Playwright/Maestro 스타일)
 */
export declare function generateRobustLocator(element: HTMLElement): ElementLocator;
/**
 * 단순 selector 생성 래퍼 (하위 호환성)
 * @deprecated generateRobustLocator 사용 권장
 */
export declare function generateSelector(element: HTMLElement): string;
