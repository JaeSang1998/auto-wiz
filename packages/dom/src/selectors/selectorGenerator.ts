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

import type { ElementLocator } from "@auto-wiz/core";

/**
 * CSS-in-JS 클래스 간단 체크 (getSimpleSelector용)
 */
function isUnstableClass(className: string): boolean {
  // CSS-in-JS 패턴들
  if (/^css-[a-z0-9]+$/i.test(className)) return true;
  if (/^sc-[a-zA-Z0-9]+$/.test(className)) return true;
  if (/^_[a-zA-Z0-9_]+$/.test(className)) return true;
  if (/[0-9a-f]{8,}/i.test(className)) return true;
  if (/^chakra-/.test(className)) return true;
  return false;
}

/**
 * 단순 selector 생성 (빠른 선택용)
 * ID가 있으면 ID만 사용, 없으면 전체 경로 생성
 */
export function getSimpleSelector(el: Element): string {
  if (!(el instanceof Element)) return "";
  if (el.id && !el.id.match(/[0-9a-f]{8,}/i)) return `#${CSS.escape(el.id)}`;

  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node.nodeType === 1 && parts.length < 5) {
    let part = node.tagName.toLowerCase();

    if ((node as HTMLElement).classList.length > 0) {
      // CSS-in-JS 클래스 제외
      const stableClasses = Array.from((node as HTMLElement).classList)
        .filter((c) => !isUnstableClass(c))
        .slice(0, 2);

      if (stableClasses.length > 0) {
        const cls = stableClasses.map((c) => `.${CSS.escape(c)}`).join("");
        part += cls;
      }
    }

    // nth-child
    let idx = 1;
    let sib: Element | null = node;
    while ((sib = sib.previousElementSibling as Element | null)) {
      if (sib && sib.tagName === node.tagName) idx++;
    }
    part += `:nth-of-type(${idx})`;

    parts.unshift(part);
    node = node.parentElement;
  }

  return parts.join(" > ");
}

/**
 * 상세한 selector 생성 (안정성 우선)
 * data-testid, aria-label 등 안정적인 속성 우선 사용
 */
export function makeSelector(el: HTMLElement): string {
  const segs: string[] = [];
  let cur: HTMLElement | null = el;

  for (let depth = 0; cur && depth < 5; depth++) {
    let s = cur.nodeName.toLowerCase();
    const id = cur.id;

    if (id) {
      segs.unshift(`${s}#${CSS.escape(id)}`);
      break;
    }

    const testid = cur.getAttribute("data-testid");
    const aria = cur.getAttribute("aria-label");

    if (testid) {
      s += `[data-testid="${testid}"]`;
    } else if (aria) {
      s += `[aria-label="${aria}"]`;
    } else {
      const parent = cur.parentElement;
      if (parent && cur) {
        const currentNode = cur;
        const same = Array.from(parent.children).filter(
          (c) => c.nodeName === currentNode.nodeName
        );
        if (same.length > 1) {
          s += `:nth-of-type(${same.indexOf(currentNode) + 1})`;
        }
      }
    }

    segs.unshift(s);
    cur = cur.parentElement;
  }

  return segs.join(">");
}

/**
 * Selector가 유효한지 검증
 */
export function isValidSelector(selector: string): boolean {
  try {
    document.querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

/**
 * Selector로 단일 요소 찾기 (안전) - HTMLElement와 SVGElement 모두 지원
 */
export function querySelector(selector: string): HTMLElement | SVGElement | null {
  try {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement || el instanceof SVGElement) {
      return el;
    }
    return null;
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Selector로 여러 요소 찾기 (안전) - HTMLElement와 SVGElement 모두 지원
 */
export function querySelectorAll(selector: string): (HTMLElement | SVGElement)[] {
  try {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).filter(
      (el): el is HTMLElement | SVGElement =>
        el instanceof HTMLElement || el instanceof SVGElement
    );
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return [];
  }
}

/**
 * ARIA role을 추론
 */
function inferRole(element: HTMLElement): string | null {
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute("type");

  // 명시적 role이 있으면 사용
  const explicitRole = element.getAttribute("role");
  if (explicitRole) return explicitRole;

  // 암시적 role 추론
  const roleMap: Record<string, string> = {
    button: "button",
    a: "link",
    input: type === "text" ? "textbox" : type || "textbox",
    textarea: "textbox",
    select: "combobox",
    img: "img",
    h1: "heading",
    h2: "heading",
    h3: "heading",
    h4: "heading",
    h5: "heading",
    h6: "heading",
  };

  return roleMap[tagName] || null;
}

/**
 * 요소의 가시 텍스트 추출 (trimmed)
 */
function getVisibleText(element: HTMLElement): string {
  // input/textarea의 경우 value 또는 placeholder
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value || element.placeholder || "";
  }

  // 이미지의 경우 alt
  if (element instanceof HTMLImageElement) {
    return element.alt || "";
  }

  // 일반 텍스트 내용 (자식 요소는 제외하고 직접 텍스트만)
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
    }
  }
  
  // 텍스트가 너무 길면 앞부분만 (50자)
  text = text.trim();
  if (text.length > 50) {
    text = text.substring(0, 50);
  }

  return text;
}

/**
 * Test ID 속성 찾기 (다양한 형태 지원)
 */
function getTestId(element: HTMLElement): string | null {
  return (
    element.getAttribute("data-testid") ||
    element.getAttribute("data-test") ||
    element.getAttribute("data-cy") ||
    element.getAttribute("data-test-id") ||
    null
  );
}

/**
 * CSS-in-JS 라이브러리가 생성한 클래스인지 확인
 */
function isCssInJsClass(className: string): boolean {
  // Emotion: css-xxxx, css-1abc2de
  if (/^css-[a-z0-9]+$/i.test(className)) return true;
  // Styled-components: sc-xxx, StyledXxx
  if (/^sc-[a-zA-Z0-9]+$/.test(className)) return true;
  // CSS Modules: _xxx_hash, Component_class__hash
  if (/^_[a-zA-Z0-9_]+$/.test(className)) return true;
  if (/^[A-Z][a-zA-Z]+_[a-zA-Z]+__[a-zA-Z0-9]+$/.test(className)) return true;
  // Random hashes (8+ hex chars)
  if (/[0-9a-f]{8,}/i.test(className)) return true;
  // Chakra UI: chakra-xxx
  if (/^chakra-/.test(className)) return true;

  return false;
}

/**
 * CSS 클래스 기반 selector 생성 (고유한 클래스 우선)
 */
function generateClassSelector(element: HTMLElement): string | null {
  const classes = Array.from(element.classList);
  if (classes.length === 0) return null;

  // CSS-in-JS 클래스 제외, 안정적인 클래스만 사용
  const stableClasses = classes.filter((c) => !isCssInJsClass(c));

  if (stableClasses.length > 0) {
    // 최대 2개 클래스 사용
    const selectedClasses = stableClasses.slice(0, 2);
    return element.tagName.toLowerCase() + selectedClasses.map((c) => `.${CSS.escape(c)}`).join("");
  }

  return null;
}

/**
 * Input 요소와 연결된 label 텍스트 가져오기
 * 다양한 label 연결 방식 지원:
 * 1. label[for="id"] - 명시적 연결
 * 2. 부모 label - 암시적 연결
 * 3. aria-labelledby - ARIA 연결
 * 4. 이전 형제 label - div > label + input 구조
 * 5. 같은 컨테이너 내 label - div 내 첫 번째 label
 */
function getAssociatedLabelText(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string | null {
  // 1. label[for="id"] 방식 (명시적 연결)
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) return label.textContent?.trim() || null;
  }

  // 2. 부모 label 방식 (암시적 연결)
  const parentLabel = element.closest("label");
  if (parentLabel) {
    // input 자체의 텍스트는 제외하고 label 텍스트만 추출
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const input = clone.querySelector("input, textarea, select");
    if (input) input.remove();
    const text = clone.textContent?.trim();
    if (text) return text;
  }

  // 3. aria-labelledby 방식
  const labelledby = element.getAttribute("aria-labelledby");
  if (labelledby) {
    const labelEl = document.getElementById(labelledby);
    if (labelEl) return labelEl.textContent?.trim() || null;
  }

  // 4. 이전 형제 label 탐지 (div > label + input 구조)
  const prevSibling = element.previousElementSibling;
  if (prevSibling && prevSibling.tagName.toLowerCase() === "label") {
    return prevSibling.textContent?.trim() || null;
  }

  // 5. 같은 컨테이너(div) 내 첫 번째 label
  const parent = element.parentElement;
  if (parent) {
    const labelInParent = parent.querySelector("label");
    if (labelInParent) {
      // 해당 label이 다른 input과 연결되어 있지 않은지 확인
      const forAttr = labelInParent.getAttribute("for");
      if (!forAttr || forAttr === element.id) {
        return labelInParent.textContent?.trim() || null;
      }
    }
  }

  return null;
}

/**
 * Form 내에서의 위치 정보 가져오기
 */
function getFormContext(
  element: HTMLElement
): { formSelector: string; fieldIndex: number } | null {
  const form = element.closest("form");
  if (!form) return null;

  // Form의 selector 생성 (id, name, 또는 구조적)
  let formSelector = "";
  if (form.id && !form.id.match(/[0-9a-f]{8,}/i)) {
    formSelector = `#${CSS.escape(form.id)}`;
  } else if (form.getAttribute("name")) {
    formSelector = `form[name="${form.getAttribute("name")}"]`;
  } else {
    // form의 클래스 기반 selector 시도
    const formClassSelector = generateClassSelector(form);
    if (formClassSelector) {
      formSelector = formClassSelector;
    } else {
      // 여러 form이 있을 경우 구조적 selector
      const forms = document.querySelectorAll("form");
      const index = Array.from(forms).indexOf(form);
      formSelector = `form:nth-of-type(${index + 1})`;
    }
  }

  // Form 내에서 모든 input/textarea/select 요소 중 순서 계산
  const allFormFields = form.querySelectorAll("input, textarea, select");
  const fieldIndex = Array.from(allFormFields).indexOf(element) + 1;

  return { formSelector, fieldIndex };
}

/**
 * Robust한 다중 selector 생성 (Playwright/Maestro 스타일)
 */
export function generateRobustLocator(element: HTMLElement): ElementLocator {
  const selectors: string[] = [];
  const metadata: ElementLocator["metadata"] = {
    tagName: element.tagName.toLowerCase(),
  };

  // === Tier 1: 가장 안정적인 속성들 ===

  // Test ID (최우선)
  const testId = getTestId(element);
  if (testId) {
    selectors.push(`[data-testid="${testId}"]`);
    metadata.testId = testId;
  }

  // ID 속성
  if (element.id && !element.id.match(/[0-9a-f]{8,}/)) {
    // 랜덤 해시가 아닌 의미있는 ID만
    selectors.push(`#${CSS.escape(element.id)}`);
  }

  // Name 속성 (forms)
  const name = element.getAttribute("name");
  if (name) {
    selectors.push(`${element.tagName.toLowerCase()}[name="${name}"]`);
  }

  // ARIA label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    selectors.push(`[aria-label="${ariaLabel}"]`);
    metadata.ariaLabel = ariaLabel;
  }

  // === Tier 2: 의미론적 속성들 ===

  const role = inferRole(element);
  const text = getVisibleText(element);

  if (role) {
    metadata.role = role;
  }

  if (text) {
    metadata.text = text;
  }

  // Placeholder (input/textarea)
  const placeholder = element.getAttribute("placeholder");
  if (placeholder) {
    const tagName = element.tagName.toLowerCase();
    selectors.push(`${tagName}[placeholder="${placeholder}"]`);
    metadata.placeholder = placeholder;
  }

  // Title
  const title = element.getAttribute("title");
  if (title) {
    const tagName = element.tagName.toLowerCase();
    selectors.push(`${tagName}[title="${title}"]`);
    metadata.title = title;
  }

  // Alt (이미지)
  if (element instanceof HTMLImageElement && element.alt) {
    selectors.push(`img[alt="${element.alt}"]`);
  }

  // === Form Input 특화: Label 텍스트 및 Form Context ===
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    // Label 텍스트 추출
    const labelText = getAssociatedLabelText(element);
    if (labelText) {
      metadata.labelText = labelText;
    }

    // Form 내 위치 정보
    const formContext = getFormContext(element);
    if (formContext) {
      metadata.formContext = formContext;
      // Form context 기반 selector 추가 (fallback용)
      selectors.push(
        `${formContext.formSelector} input, ` +
          `${formContext.formSelector} textarea, ` +
          `${formContext.formSelector} select`
      );
    }
  }

  // === Tier 3: 구조적 selector ===

  // 클래스 기반
  const classSelector = generateClassSelector(element);
  if (classSelector) {
    selectors.push(classSelector);
  }

  // 기존 makeSelector 함수 사용 (구조 기반)
  const structuralSelector = makeSelector(element);
  if (structuralSelector) {
    selectors.push(structuralSelector);
  }

  // === Tier 4: 폴백 - XPath (가장 정확하지만 취약) ===
  // XPath는 마지막 수단으로만 사용
  // (기존 XPath 생성 로직이 필요하다면 여기 추가)

  // Primary는 첫 번째, 나머지는 fallback
  const [primary, ...fallbacks] = selectors;

  // 중복 제거
  const uniqueFallbacks = Array.from(new Set(fallbacks));

  return {
    primary: primary || structuralSelector, // 최소한 구조 기반이라도
    fallbacks: uniqueFallbacks,
    metadata,
  };
}

/**
 * 단순 selector 생성 래퍼 (하위 호환성)
 * @deprecated generateRobustLocator 사용 권장
 */
export function generateSelector(element: HTMLElement): string {
  const locator = generateRobustLocator(element);
  return locator.primary;
}
