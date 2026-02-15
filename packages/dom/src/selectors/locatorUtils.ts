/**
 * Locator 유틸리티 - 고급 요소 검색 기능
 * Playwright/Maestro 스타일의 텍스트 기반, role 기반 매칭
 */

import type { ElementLocator } from "@auto-wiz/core";

/**
 * 텍스트 정규화 (공백, 대소문자 무시)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 요소의 접근 가능한 이름(accessible name) 계산
 * ARIA 명세에 따른 우선순위
 */
function getAccessibleName(element: HTMLElement): string {
  // 1. aria-label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // 2. aria-labelledby
  const labelledby = element.getAttribute("aria-labelledby");
  if (labelledby) {
    const labelEl = document.getElementById(labelledby);
    if (labelEl) return labelEl.textContent?.trim() || "";
  }

  // 3. label 요소 (form controls)
  if (element instanceof HTMLInputElement || 
      element instanceof HTMLTextAreaElement || 
      element instanceof HTMLSelectElement) {
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent?.trim() || "";
    }
    
    // 부모 label
    const parentLabel = element.closest("label");
    if (parentLabel) return parentLabel.textContent?.trim() || "";
  }

  // 4. alt (이미지)
  if (element instanceof HTMLImageElement) {
    return element.alt;
  }

  // 5. placeholder
  const placeholder = element.getAttribute("placeholder");
  if (placeholder) return placeholder;

  // 6. title
  const title = element.getAttribute("title");
  if (title) return title;

  // 7. 텍스트 내용
  return element.textContent?.trim() || "";
}

/**
 * Role로 요소 찾기 (ARIA role)
 */
export function findByRole(
  role: string,
  options?: {
    name?: string;        // accessible name
    exact?: boolean;      // 정확히 일치
    level?: number;       // heading level (h1=1, h2=2, ...)
  }
): HTMLElement[] {
  const allElements = Array.from(document.querySelectorAll("*"));
  const results: HTMLElement[] = [];

  for (const el of allElements) {
    if (!(el instanceof HTMLElement)) continue;

    // Role 확인
    const explicitRole = el.getAttribute("role");
    const implicitRole = getImplicitRole(el);
    const elementRole = explicitRole || implicitRole;

    if (elementRole !== role) continue;

    // Level 확인 (heading용)
    if (options?.level !== undefined) {
      const tagName = el.tagName.toLowerCase();
      const headingLevel = parseInt(tagName.charAt(1), 10);
      if (headingLevel !== options.level) continue;
    }

    // Name 확인
    if (options?.name !== undefined) {
      const accessibleName = getAccessibleName(el);
      if (options.exact) {
        if (accessibleName !== options.name) continue;
      } else {
        if (!accessibleName.includes(options.name)) continue;
      }
    }

    results.push(el);
  }

  return results;
}

/**
 * 텍스트로 찾기 (공백/대소문자 무시)
 */
export function findByCleanText(text: string): HTMLElement[] {
  return findByText(text, { normalize: true });
}

/**
 * 텍스트로 찾기 (부분 일치)
 */
export function findByFuzzyText(text: string): HTMLElement[] {
  return findByText(text, { exact: false });
}

/**
 * 암시적 ARIA role 추론
 */
function getImplicitRole(element: HTMLElement): string | null {
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute("type");

  const roleMap: Record<string, string> = {
    a: element.hasAttribute("href") ? "link" : "",
    button: "button",
    input: type === "text" || !type ? "textbox" : 
           type === "checkbox" ? "checkbox" :
           type === "radio" ? "radio" :
           type === "button" || type === "submit" ? "button" : "",
    textarea: "textbox",
    select: "combobox",
    img: "img",
    h1: "heading",
    h2: "heading",
    h3: "heading",
    h4: "heading",
    h5: "heading",
    h6: "heading",
    nav: "navigation",
    main: "main",
    aside: "complementary",
    header: "banner",
    footer: "contentinfo",
    section: "region",
    article: "article",
    form: "form",
    table: "table",
    ul: "list",
    ol: "list",
    li: "listitem",
  };

  return roleMap[tagName] || null;
}

/**
 * 텍스트로 요소 찾기 (Playwright 스타일)
 */
export function findByText(
  text: string,
  options?: {
    exact?: boolean;      // 정확히 일치
    normalize?: boolean;  // 공백/대소문자 무시
    selector?: string;    // 특정 selector 내에서만 찾기
    role?: string;        // 특정 role만
  }
): HTMLElement[] {
  const container = options?.selector 
    ? document.querySelector(options.selector) 
    : document.body;

  if (!container) return [];

  const allElements = Array.from(container.querySelectorAll("*"));
  const results: HTMLElement[] = [];

  for (const el of allElements) {
    if (!(el instanceof HTMLElement)) continue;

    // Role 필터
    if (options?.role) {
      const elementRole = el.getAttribute("role") || getImplicitRole(el);
      if (elementRole !== options.role) continue;
    }

    // 텍스트 내용 가져오기
    let elementText = getAccessibleName(el);
    if (!elementText) {
      elementText = el.textContent || "";
    }

    // 자식 요소의 텍스트는 제외 (직접 텍스트만)
    if (el.children.length > 0) {
      let directText = "";
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          directText += node.textContent || "";
        }
      }
      if (directText.trim()) {
        elementText = directText;
      }
    }

    // 매칭
    if (options?.normalize) {
      if (normalizeText(elementText) === normalizeText(text)) {
        results.push(el);
      }
    } else if (options?.exact) {
      if (elementText.trim() === text) {
        results.push(el);
      }
    } else {
      if (elementText.includes(text)) {
        results.push(el);
      }
    }
  }

  return results;
}

/**
 * Placeholder로 요소 찾기
 */
export function findByPlaceholder(
  text: string,
  options?: { exact?: boolean }
): HTMLElement[] {
  const selector = options?.exact
    ? `[placeholder="${text}"]`
    : `[placeholder*="${text}"]`;

  return Array.from(document.querySelectorAll(selector)).filter(
    (el): el is HTMLElement => el instanceof HTMLElement
  );
}

/**
 * Label로 요소 찾기 (form inputs)
 */
export function findByLabelText(
  text: string,
  options?: { exact?: boolean }
): HTMLElement[] {
  const labels = Array.from(document.querySelectorAll("label"));
  const results: HTMLElement[] = [];

  for (const label of labels) {
    const labelText = label.textContent?.trim() || "";
    const matches = options?.exact
      ? labelText === text
      : labelText.includes(text);

    if (!matches) continue;

    // label[for] 참조
    const forAttr = label.getAttribute("for");
    if (forAttr) {
      const input = document.getElementById(forAttr);
      if (input instanceof HTMLElement) {
        results.push(input);
      }
    } else {
      // label 내부의 input
      const input = label.querySelector("input, textarea, select");
      if (input instanceof HTMLElement) {
        results.push(input);
      }
    }
  }

  return results;
}

/**
 * TestID로 요소 찾기
 */
export function findByTestId(testId: string): HTMLElement | null {
  const selectors = [
    `[data-testid="${testId}"]`,
    `[data-test="${testId}"]`,
    `[data-cy="${testId}"]`,
    `[data-test-id="${testId}"]`,
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) return el;
  }

  return null;
}

/**
 * Input 요소와 연결된 label 텍스트 가져오기 (재생 시 검증용)
 */
function getAssociatedLabelTextForElement(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string | null {
  // 1. label[for="id"] 방식
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) return label.textContent?.trim() || null;
  }

  // 2. 부모 label 방식
  const parentLabel = element.closest("label");
  if (parentLabel) {
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

  // 4. 이전 형제 label 탐지
  const prevSibling = element.previousElementSibling;
  if (prevSibling && prevSibling.tagName.toLowerCase() === "label") {
    return prevSibling.textContent?.trim() || null;
  }

  // 5. 같은 컨테이너 내 첫 번째 label
  const parent = element.parentElement;
  if (parent) {
    const labelInParent = parent.querySelector("label");
    if (labelInParent) {
      const forAttr = labelInParent.getAttribute("for");
      if (!forAttr || forAttr === element.id) {
        return labelInParent.textContent?.trim() || null;
      }
    }
  }

  return null;
}

/**
 * Form 내에서의 위치 정보 가져오기 (재생 시 검증용)
 */
function getFormContextForElement(
  element: HTMLElement
): { formSelector: string; fieldIndex: number } | null {
  const form = element.closest("form");
  if (!form) return null;

  let formSelector = "";
  if (form.id && !form.id.match(/[0-9a-f]{8,}/i)) {
    formSelector = `#${CSS.escape(form.id)}`;
  } else if (form.getAttribute("name")) {
    formSelector = `form[name="${form.getAttribute("name")}"]`;
  } else {
    // 클래스 기반
    const classes = Array.from(form.classList).filter(
      (c) => !c.match(/[0-9a-f]{8,}/i) && !c.startsWith("_")
    );
    if (classes.length > 0) {
      formSelector = "form." + classes.slice(0, 2).map((c) => CSS.escape(c)).join(".");
    } else {
      const forms = document.querySelectorAll("form");
      const index = Array.from(forms).indexOf(form);
      formSelector = `form:nth-of-type(${index + 1})`;
    }
  }

  const allFormFields = form.querySelectorAll("input, textarea, select");
  const fieldIndex = Array.from(allFormFields).indexOf(element) + 1;

  return { formSelector, fieldIndex };
}

/**
 * Metadata로 후보 요소들 중 정확한 요소 찾기 (다중 매칭 시 검증)
 */
function verifyWithMetadata(
  candidates: (HTMLElement | SVGElement)[],
  metadata?: ElementLocator["metadata"]
): HTMLElement | SVGElement | null {
  if (!metadata) return candidates[0]; // metadata 없으면 첫 번째 반환

  let bestMatch: HTMLElement | SVGElement | null = null;
  let bestScore = -1;

  for (const el of candidates) {
    if (!isVisible(el)) continue;

    let score = 0;

    // labelText 매칭 (가장 높은 우선순위)
    if (
      metadata.labelText &&
      (el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement)
    ) {
      const labelText = getAssociatedLabelTextForElement(el);
      if (labelText === metadata.labelText) {
        score += 100;
      } else if (labelText && labelText.includes(metadata.labelText)) {
        score += 50;
      }
    }

    // formContext 매칭
    if (metadata.formContext && el instanceof HTMLElement) {
      const context = getFormContextForElement(el);
      if (context) {
        // formSelector가 일치하고 fieldIndex도 일치하면 높은 점수
        if (context.fieldIndex === metadata.formContext.fieldIndex) {
          score += 80;
        }
      }
    }

    // placeholder 매칭
    if (metadata.placeholder) {
      if (el.getAttribute("placeholder") === metadata.placeholder) {
        score += 60;
      }
    }

    // tagName 매칭
    if (metadata.tagName) {
      if (el.tagName.toLowerCase() === metadata.tagName) {
        score += 10;
      }
    }

    // role 매칭
    if (metadata.role) {
      const elementRole =
        el.getAttribute("role") ||
        (el instanceof HTMLElement ? getImplicitRoleForElement(el) : null);
      if (elementRole === metadata.role) {
        score += 10;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = el;
    }
  }

  // 최소 점수 기준 (labelText나 formContext가 매칭되어야 신뢰)
  if (bestScore >= 50) {
    return bestMatch;
  }

  // 점수가 낮으면 첫 번째 visible 요소 반환 (기존 동작 유지)
  return candidates.find((el) => isVisible(el)) || null;
}

/**
 * 암시적 ARIA role 추론 (verifyWithMetadata용)
 */
function getImplicitRoleForElement(element: HTMLElement): string | null {
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute("type");

  const roleMap: Record<string, string> = {
    button: "button",
    input:
      type === "text" || !type
        ? "textbox"
        : type === "checkbox"
          ? "checkbox"
          : type === "radio"
            ? "radio"
            : type === "button" || type === "submit"
              ? "button"
              : "",
    textarea: "textbox",
    select: "combobox",
  };

  return roleMap[tagName] || null;
}

/**
 * ElementLocator로 요소 찾기 (fallback 지원 + 다중 매칭 검증)
 *
 * Primary selector부터 시도하고, 실패하면 fallback들을 순차적으로 시도
 * 여러 요소가 매칭되면 metadata로 정확한 요소 선별
 */
export function findByLocator(locator: ElementLocator): HTMLElement | SVGElement | null {
  // 1. Primary selector로 모든 요소 찾기
  try {
    const elements = document.querySelectorAll(locator.primary);
    const candidates = Array.from(elements).filter(
      (el): el is HTMLElement | SVGElement =>
        (el instanceof HTMLElement || el instanceof SVGElement) && isVisible(el)
    );

    if (candidates.length === 1) {
      // 하나만 매칭되면 그것 사용
      return candidates[0];
    } else if (candidates.length > 1) {
      // 여러 개 매칭되면 metadata로 검증
      const verified = verifyWithMetadata(candidates, locator.metadata);
      if (verified) return verified;
    }
  } catch (error) {
    console.warn(`Primary selector failed: ${locator.primary}`, error);
  }

  // 2. Fallback selectors 순차 시도 (동일 로직)
  for (const selector of locator.fallbacks) {
    try {
      const elements = document.querySelectorAll(selector);
      const candidates = Array.from(elements).filter(
        (el): el is HTMLElement | SVGElement =>
          (el instanceof HTMLElement || el instanceof SVGElement) && isVisible(el)
      );

      if (candidates.length === 1) {
        return candidates[0];
      } else if (candidates.length > 1) {
        const verified = verifyWithMetadata(candidates, locator.metadata);
        if (verified) return verified;
      }
    } catch (error) {
      console.warn(`Fallback selector failed: ${selector}`, error);
    }
  }

  // 3. Metadata 기반 fuzzy matching
  if (!locator.metadata) return null;

  // labelText로 시도 (form input 특화)
  if (locator.metadata.labelText) {
    const elements = findByLabelTextExtended(locator.metadata.labelText, {
      exact: true,
    });
    if (elements.length > 0) {
      // tagName도 일치하는 것 우선
      if (locator.metadata.tagName) {
        const matchingTag = elements.find(
          (el) => el.tagName.toLowerCase() === locator.metadata!.tagName
        );
        if (matchingTag && isVisible(matchingTag)) return matchingTag;
      }
      if (isVisible(elements[0])) return elements[0];
    }
  }

  // TestID로 시도
  if (locator.metadata.testId) {
    const el = findByTestId(locator.metadata.testId);
    if (el && isVisible(el)) return el;
  }

  // 텍스트로 시도 (role 필터링)
  if (locator.metadata.text) {
    const elements = findByText(locator.metadata.text, {
      normalize: true,
      role: locator.metadata.role,
    });

    // tagName도 일치하는 것 우선
    if (locator.metadata.tagName) {
      const matchingTag = elements.find(
        (el) => el.tagName.toLowerCase() === locator.metadata!.tagName
      );
      if (matchingTag) return matchingTag;
    }

    if (elements.length > 0 && isVisible(elements[0])) {
      return elements[0];
    }
  }

  // Placeholder로 시도
  if (locator.metadata.placeholder) {
    const elements = findByPlaceholder(locator.metadata.placeholder, {
      exact: true,
    });
    if (elements.length > 0 && isVisible(elements[0])) {
      return elements[0];
    }
  }

  // Label로 시도
  if (locator.metadata.ariaLabel) {
    const elements = findByLabelText(locator.metadata.ariaLabel, {
      exact: true,
    });
    if (elements.length > 0 && isVisible(elements[0])) {
      return elements[0];
    }
  }

  return null;
}

/**
 * Label로 요소 찾기 (확장 버전 - 이전 형제 label도 지원)
 */
function findByLabelTextExtended(
  text: string,
  options?: { exact?: boolean }
): HTMLElement[] {
  const results: HTMLElement[] = [];

  // 1. 기존 label[for] 및 부모 label 방식
  const labels = Array.from(document.querySelectorAll("label"));
  for (const label of labels) {
    const labelText = label.textContent?.trim() || "";
    const matches = options?.exact ? labelText === text : labelText.includes(text);

    if (!matches) continue;

    // label[for] 참조
    const forAttr = label.getAttribute("for");
    if (forAttr) {
      const input = document.getElementById(forAttr);
      if (input instanceof HTMLElement) {
        results.push(input);
      }
    } else {
      // label 내부의 input
      const input = label.querySelector("input, textarea, select");
      if (input instanceof HTMLElement) {
        results.push(input);
      }
    }
  }

  // 2. 이전 형제 label 방식 (div > label + input 구조)
  const allInputs = document.querySelectorAll("input, textarea, select");
  for (const input of allInputs) {
    if (!(input instanceof HTMLElement)) continue;
    if (results.includes(input)) continue; // 이미 찾은 요소는 제외

    const prevSibling = input.previousElementSibling;
    if (prevSibling && prevSibling.tagName.toLowerCase() === "label") {
      const labelText = prevSibling.textContent?.trim() || "";
      const matches = options?.exact ? labelText === text : labelText.includes(text);
      if (matches) {
        results.push(input);
      }
    }

    // 같은 컨테이너 내 label
    const parent = input.parentElement;
    if (parent && !results.includes(input)) {
      const labelInParent = parent.querySelector("label");
      if (labelInParent && labelInParent !== prevSibling) {
        const labelText = labelInParent.textContent?.trim() || "";
        const matches = options?.exact ? labelText === text : labelText.includes(text);
        if (matches) {
          results.push(input);
        }
      }
    }
  }

  return results;
}

/**
 * 요소가 화면에 보이는지 확인 - HTMLElement와 SVGElement 모두 지원
 */
function isVisible(element: HTMLElement | SVGElement): boolean {
  // BODY와 HTML은 항상 visible로 간주
  if (element.tagName === "BODY" || element.tagName === "HTML") {
    return true;
  }

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }

  // offsetParent는 happy-dom에서 제대로 동작하지 않을 수 있음
  // 위의 스타일 체크만으로 충분
  return true;
}

/**
 * 요소가 상호작용 가능한지 확인 (enabled + visible) - HTMLElement와 SVGElement 모두 지원
 */
export function isInteractable(element: HTMLElement | SVGElement): boolean {
  if (!isVisible(element)) return false;

  // HTMLElement의 disabled 체크
  if (element instanceof HTMLInputElement || 
      element instanceof HTMLTextAreaElement || 
      element instanceof HTMLSelectElement || 
      element instanceof HTMLButtonElement) {
    if (element.disabled) return false;
  }

  const style = window.getComputedStyle(element);
  if (style.pointerEvents === "none") return false;

  return true;
}

/**
 * Smart waiting: 요소가 나타날 때까지 대기 - HTMLElement와 SVGElement 모두 지원
 */
export async function waitForLocator(
  locator: ElementLocator,
  options?: {
    timeout?: number;       // 기본 5000ms
    visible?: boolean;      // 보이는 요소만
    interactable?: boolean; // 상호작용 가능한 요소만
  }
): Promise<HTMLElement | SVGElement> {
  const timeout = options?.timeout || 5000;
  const startTime = Date.now();
  const pollInterval = 100;

  while (Date.now() - startTime < timeout) {
    const element = findByLocator(locator);

    if (element) {
      // visible 체크
      if (options?.visible && !isVisible(element)) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      // interactable 체크
      if (options?.interactable && !isInteractable(element)) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      return element;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(
    `Timeout waiting for element. Primary selector: ${locator.primary}`
  );
}

