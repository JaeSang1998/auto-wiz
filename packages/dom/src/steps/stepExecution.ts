import type { Step, RunnerOptions } from "@auto-wiz/core";
import { waitForLocator, isInteractable } from "../selectors/locatorUtils";

/**
 * Step execution 유틸리티
 * 각 Step 타입별 실행 로직
 *
 * locator 시스템 사용:
 * - step.locator의 다중 selector fallback 사용
 */

export interface ExecutionResult {
  success: boolean;
  error?: string;
  extractedData?: any;
  usedSelector?: string; // 실제로 사용된 selector (디버깅용)
}

/**
 * Step에서 요소 찾기 (locator 시스템 사용)
 */
async function findElement(step: Step): Promise<{
  element: HTMLElement | null;
  usedSelector: string;
}> {
  if (!("locator" in step) || !step.locator) {
    return { element: null, usedSelector: "none" };
  }

  try {
    const element = await waitForLocator(step.locator, {
      timeout: (step as any).timeoutMs || 5000,
      visible: true,
      interactable: true,
    });
    return { element, usedSelector: step.locator.primary };
  } catch (error) {
    console.warn("Locator failed:", error);
    return { element: null, usedSelector: step.locator.primary };
  }
}

/**
 * Click step 실행
 */
export async function executeClickStep(step: Step): Promise<ExecutionResult> {
  if (step.type !== "click") {
    return { success: false, error: "Invalid click step" };
  }

  const { element, usedSelector } = await findElement(step);
  if (!element) {
    return {
      success: false,
      error: `Element not found with selector: ${usedSelector}`,
    };
  }

  // 상호작용 가능 여부 확인
  if (!isInteractable(element)) {
    return {
      success: false,
      error: `Element is not interactable: ${usedSelector}`,
    };
  }

  try {
    element.click();
    return { success: true, usedSelector };
  } catch (error) {
    return {
      success: false,
      error: `Failed to click element: ${(error as Error).message}`,
      usedSelector,
    };
  }
}

/**
 * Resolve placeholders in text (e.g., {{username}} → variables.username)
 */
function resolveText(
  text: string,
  variables?: Record<string, string>
): string {
  if (!variables || !text) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}

/**
 * Type step 실행
 */
export async function executeTypeStep(
  step: Step,
  options: RunnerOptions = {}
): Promise<ExecutionResult> {
  if (step.type !== "type") {
    return { success: false, error: "Invalid type step" };
  }

  const { element, usedSelector } = await findElement(step);
  if (!element) {
    return {
      success: false,
      error: `Element not found with selector: ${usedSelector}`,
    };
  }

  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement)
  ) {
    return {
      success: false,
      error: "Element is not a text input",
      usedSelector,
    };
  }

  if (!isInteractable(element)) {
    return {
      success: false,
      error: `Element is not interactable: ${usedSelector}`,
    };
  }

  try {
    const rawText = step.originalText || step.text || "";
    const text = resolveText(rawText, options.variables);
    element.value = text;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));

    // Submit 플래그가 있으면 Enter 키 입력
    if (step.submit) {
      const form = element.form;
      if (form) {
        // 폼이 있으면 submit
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.submit();
        }
      } else {
        // 폼이 없으면 Enter 키 이벤트 발생
        element.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          })
        );
      }
    }

    return { success: true, usedSelector };
  } catch (error) {
    return {
      success: false,
      error: `Failed to type into element: ${(error as Error).message}`,
      usedSelector,
    };
  }
}

/**
 * Select step 실행
 */
export async function executeSelectStep(step: Step): Promise<ExecutionResult> {
  if (step.type !== "select" || step.value === undefined) {
    return { success: false, error: "Invalid select step" };
  }

  const { element, usedSelector } = await findElement(step);
  if (!element) {
    return {
      success: false,
      error: `Element not found with selector: ${usedSelector}`,
    };
  }

  if (!(element instanceof HTMLSelectElement)) {
    return {
      success: false,
      error: "Element is not a select element",
      usedSelector,
    };
  }

  if (!isInteractable(element)) {
    return {
      success: false,
      error: `Element is not interactable: ${usedSelector}`,
    };
  }

  try {
    element.value = step.value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return { success: true, usedSelector };
  } catch (error) {
    return {
      success: false,
      error: `Failed to select option: ${(error as Error).message}`,
      usedSelector,
    };
  }
}

/**
 * Extract step 실행
 */
export async function executeExtractStep(step: Step): Promise<ExecutionResult> {
  if (step.type !== "extract") {
    return { success: false, error: "Invalid extract step" };
  }

  const { element, usedSelector } = await findElement(step);
  if (!element) {
    return {
      success: false,
      error: `Element not found with selector: ${usedSelector}`,
    };
  }

  try {
    let extractedData: any;

    // prop에 따라 다른 데이터 추출 (기본값: innerText)
    const prop = step.prop || "innerText";

    if (prop === "value" && "value" in element) {
      extractedData = (element as HTMLInputElement).value;
    } else if (prop === "innerText") {
      extractedData = element.textContent?.trim() || "";
    } else if (prop === "outerHTML") {
      // XML 구조를 보기 좋게 포맷팅하기 전에 base64 이미지 제거
      const cloned = element.cloneNode(true) as HTMLElement;

      const processImage = (img: HTMLImageElement) => {
        const src = img.getAttribute("src");
        if (src && src.startsWith("data:image")) {
          img.removeAttribute("src");
          img.setAttribute("data-image-removed", "true");
        }
      };

      if (cloned.tagName.toLowerCase() === "img") {
        processImage(cloned as HTMLImageElement);
      } else {
        const images = cloned.querySelectorAll("img");
        images.forEach((img) => processImage(img as HTMLImageElement));
      }

      const rawHtml = cloned.outerHTML;
      extractedData = formatXml(rawHtml);
    } else {
      extractedData = element.textContent?.trim() || "";
    }

    return { success: true, extractedData, usedSelector };
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract data: ${(error as Error).message}`,
      usedSelector,
    };
  }
}

/**
 * WaitFor step 실행
 */
export async function executeWaitForStep(step: Step): Promise<ExecutionResult> {
  if (step.type !== "waitFor") {
    return { success: false, error: "Invalid waitFor step" };
  }

  // 단순 timeout인 경우
  if (!("locator" in step) && step.timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, step.timeoutMs));
    return { success: true };
  }

  const timeout = step.timeoutMs || 5000; // 기본 5초

  try {
    // locator가 있으면 waitForLocator 사용 (자동 대기 기능)
    if ("locator" in step && step.locator) {
      await waitForLocator(step.locator, {
        timeout,
        visible: true,
      });
      return { success: true, usedSelector: step.locator.primary };
    }

    return {
      success: false,
      error: "WaitFor step requires locator or timeoutMs",
    };
  } catch (error) {
    return {
      success: false,
      error: `WaitFor failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Step 실행 (타입에 따라 자동 분기)
 */
export async function executeStep(
  step: Step,
  options: RunnerOptions = {}
): Promise<ExecutionResult> {
  try {
    switch (step.type) {
      case "click":
        return await executeClickStep(step);
      case "type":
        return await executeTypeStep(step, options);
      case "select":
        return await executeSelectStep(step);
      case "extract":
        return await executeExtractStep(step);
      case "waitFor":
        return await executeWaitForStep(step);
      case "navigate":
        // navigate는 background에서 처리
        return { success: true };
      default:
        return { success: false, error: `Unknown step type: ${step.type}` };
    }
  } catch (error) {
    return {
      success: false,
      error: `Step execution failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Simple XML formatter for pretty printing
 */
function formatXml(xml: string): string {
  let formatted = "";
  let indent = 0;
  const tab = "  ";

  // 태그 사이의 공백 제거 및 줄바꿈 정규화
  // 주석이나 CDATA 등은 고려하지 않은 단순 구현
  xml = xml.replace(/>\s+</g, "><").trim();

  // 태그 단위로 분리 - <tag>, </tag>, <tag ... />, text content
  // 정규식 개선: 태그와 텍스트를 더 정확하게 분리
  // <[^>]+> : 태그
  // [^<]+ : 텍스트
  const tags = xml.match(/<[^>]+>|[^<]+/g) || [];

  tags.forEach((tag) => {
    // 닫는 태그 </... >
    if (tag.match(/^<\//)) {
      indent = Math.max(0, indent - 1);
      formatted += "\n" + tab.repeat(indent) + tag;
    }
    // Self-closing 태그 <... /> 또는 <! ... > (Example: <!DOCTYPE>)
    else if (tag.match(/^<.*\/>$/) || tag.match(/^<!/)) {
      if (formatted.length > 0) formatted += "\n";
      formatted += tab.repeat(indent) + tag;
    }
    // 여는 태그 <... >
    else if (tag.match(/^<.*>$/)) {
      if (formatted.length > 0) formatted += "\n";
      formatted += tab.repeat(indent) + tag;
      indent++;
    }
    // 텍스트 컨텐츠
    else {
      // 텍스트는 줄바꿈 없이 이어붙이되, 내용이 있는 경우만
      const text = tag.trim();
      if (text.length > 0) {
        formatted += text;
      }
    }
  });

  return formatted.trim();
}
