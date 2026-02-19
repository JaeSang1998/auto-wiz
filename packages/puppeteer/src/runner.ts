import {
  type FlowRunner,
  type RunResult,
  type ExecutionResult,
  type RunnerOptions,
  type Flow,
  type Step,
  type ElementLocator,
} from "@auto-wiz/core";
import { Page, ElementHandle, KeyInput } from "puppeteer";

const MIN_CONFIDENCE_SCORE = 80;
const LOCATOR_POLL_INTERVAL_MS = 100;

type CandidateMetadata = ElementLocator["metadata"];

type CandidateInfo = {
  selector: string;
  selectorOrder: number;
  elementIndex: number;
  score: number;
  visible: boolean;
  interactable: boolean;
  domPath: string;
};

export class PuppeteerFlowRunner implements FlowRunner<Page> {
  async run(
    flow: Flow,
    page: Page,
    options: RunnerOptions = {}
  ): Promise<RunResult> {
    const extractedData: Record<string, any> = {};

    for (const [index, step] of flow.steps.entries()) {
      try {
        // Step delay for debugging
        if (options.stepDelay && index > 0) {
          await new Promise((r) => setTimeout(r, options.stepDelay));
        }

        const result = await this.runStep(step, page, options);

        if (!result.success) {
          if (options.stopOnError !== false) {
            return {
              success: false,
              error: result.error,
              failedStepIndex: index,
              extractedData,
            };
          }
        }

        if (result.extractedData) {
          extractedData[`step_${index}`] = result.extractedData;
        }
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          failedStepIndex: index,
          extractedData,
        };
      }
    }

    return { success: true, extractedData };
  }

  async runStep(
    step: Step,
    page: Page,
    options: RunnerOptions = {}
  ): Promise<ExecutionResult> {
    const timeout = options.timeout || 5000;

    try {
      switch (step.type) {
        case "navigate":
          if (step.url) {
            await page.goto(step.url, { timeout });
          }
          break;

        case "click": {
          const el = await this.getElement(page, step, timeout);
          await el.click();
          break;
        }

        case "type": {
          const el = await this.getElement(page, step, timeout);
          // originalText가 실제 값, text는 마스킹된 값
          const rawText = (step as any).originalText || step.text || "";
          const text = this.resolveText(rawText, options.variables);
          await el.type(text);
          if (step.submit) {
            await page.keyboard.press("Enter");
          }
          break;
        }

        case "select": {
          const el = await this.getElement(page, step, timeout);
          if (step.value) {
            await el.evaluate(
              (node, value) => {
                if (!(node instanceof HTMLSelectElement)) {
                  throw new Error("Element is not a select element");
                }
                node.value = value;
                node.dispatchEvent(new Event("input", { bubbles: true }));
                node.dispatchEvent(new Event("change", { bubbles: true }));
              },
              step.value
            );
          }
          break;
        }

        case "extract": {
          const el = await this.getElement(page, step, timeout);
          const text = await el.evaluate((node) => node.textContent);
          return { success: true, extractedData: text?.trim() };
        }

        case "waitFor": {
          if (step.locator) {
            const handle = await this.getElement(
              page,
              step,
              step.timeoutMs || timeout
            );
            await handle.dispose();
          } else if (step.timeoutMs) {
            await new Promise((r) => setTimeout(r, step.timeoutMs));
          }
          break;
        }

        case "keyboard": {
          const key = step.key;
          if (!key) {
            return { success: false, error: "Keyboard step requires key" };
          }
          if (step.locator) {
            const el = await this.getElement(page, step, timeout);
            await el.focus();
          }
          await page.keyboard.press(key as KeyInput);
          break;
        }

        case "waitForNavigation": {
          const navTimeout = step.timeoutMs || timeout;
          await page.waitForNavigation({
            waitUntil: "domcontentloaded",
            timeout: navTimeout,
          });
          break;
        }

        case "screenshot": {
          if (step.locator) {
            const el = await this.getElement(page, step, timeout);
            const base64 = await el.screenshot({ encoding: "base64" });
            return { success: true, extractedData: base64 as string };
          }
          const base64 = await page.screenshot({ encoding: "base64" });
          return { success: true, extractedData: base64 as string };
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Resolve placeholders in text (e.g., {{username}} → variables.username)
   */
  private resolveText(
    text: string,
    variables?: Record<string, string>
  ): string {
    if (!variables || !text) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
  }

  private async getElement(
    page: Page,
    step: Step,
    timeout: number
  ): Promise<ElementHandle> {
    if (!("locator" in step) || !step.locator) {
      throw new Error(`Step ${step.type} requires a locator`);
    }

    const { primary, fallbacks = [], metadata } = step.locator as ElementLocator;
    const selectors = [primary, ...fallbacks];
    if (selectors.length === 0) {
      throw new Error(`Step ${step.type} has no valid selectors`);
    }

    const startedAt = Date.now();
    let lastError = "No candidates found";

    while (Date.now() - startedAt < timeout) {
      const resolved = await this.pickBestCandidate(page, selectors, metadata);
      if (resolved) {
        if (
          resolved.totalCandidates === 1 ||
          resolved.candidate.score >= MIN_CONFIDENCE_SCORE
        ) {
          const handles = await page.$$(resolved.candidate.selector);
          const element = handles[resolved.candidate.elementIndex];
          if (element) return element;
        } else {
          lastError = `AMBIGUOUS_LOCATOR: ${resolved.totalCandidates} candidates found, best score=${resolved.candidate.score}, selector=${resolved.candidate.selector}`;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, LOCATOR_POLL_INTERVAL_MS));
    }

    throw new Error(
      `Failed to resolve locator. Tried selectors=${JSON.stringify(
        selectors
      )}, metadata=${JSON.stringify(metadata || {})}, reason=${lastError}`
    );
  }

  private async pickBestCandidate(
    page: Page,
    selectors: string[],
    metadata?: CandidateMetadata
  ): Promise<{ candidate: CandidateInfo; totalCandidates: number } | null> {
    const rawCandidates: CandidateInfo[] = [];

    for (const [selectorOrder, selector] of selectors.entries()) {
      let evaluated: CandidateInfo[] = [];
      try {
        evaluated = await page.$$eval(
          selector,
          (
            elements,
            payload: {
              metadata?: CandidateMetadata;
              selector: string;
              selectorOrder: number;
            }
          ) => {
            const getImplicitRoleForElement = (element: Element): string | null => {
              const tagName = element.tagName.toLowerCase();
              const type =
                element instanceof HTMLInputElement
                  ? element.getAttribute("type")
                  : null;

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
            };

            const getAssociatedLabelText = (element: Element): string | null => {
              if (
                !(element instanceof HTMLInputElement) &&
                !(element instanceof HTMLTextAreaElement) &&
                !(element instanceof HTMLSelectElement)
              ) {
                return null;
              }

              if (element.id) {
                const label = document.querySelector(
                  `label[for="${CSS.escape(element.id)}"]`
                );
                if (label) return label.textContent?.trim() || null;
              }

              const parentLabel = element.closest("label");
              if (parentLabel) {
                const clone = parentLabel.cloneNode(true) as HTMLElement;
                const input = clone.querySelector("input, textarea, select");
                if (input) input.remove();
                const text = clone.textContent?.trim();
                if (text) return text;
              }

              const labelledBy = element.getAttribute("aria-labelledby");
              if (labelledBy) {
                const labelEl = document.getElementById(labelledBy);
                if (labelEl) return labelEl.textContent?.trim() || null;
              }

              const prevSibling = element.previousElementSibling;
              if (prevSibling && prevSibling.tagName.toLowerCase() === "label") {
                return prevSibling.textContent?.trim() || null;
              }

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
            };

            const getFormFieldIndex = (element: Element): number | null => {
              if (!(element instanceof HTMLElement)) return null;
              const form = element.closest("form");
              if (!form) return null;
              const fields = Array.from(
                form.querySelectorAll("input, textarea, select")
              );
              const index = fields.indexOf(element);
              return index >= 0 ? index + 1 : null;
            };

            const isVisible = (element: Element): boolean => {
              if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
                return false;
              }
              const style = window.getComputedStyle(element);
              if (
                style.display === "none" ||
                style.visibility === "hidden" ||
                style.opacity === "0"
              ) {
                return false;
              }
              if (element.getClientRects().length === 0) {
                return false;
              }
              return true;
            };

            const isInteractable = (element: Element): boolean => {
              if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
                return false;
              }
              if (!isVisible(element)) return false;

              if (
                element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement ||
                element instanceof HTMLButtonElement
              ) {
                if (element.disabled) return false;
              }

              const style = window.getComputedStyle(element);
              return style.pointerEvents !== "none";
            };

            const getDomPath = (element: Element): string => {
              const parts: string[] = [];
              let current: Element | null = element;
              while (current && current !== document.body) {
                const tag = current.tagName.toLowerCase();
                let siblingIndex = 1;
                let sibling = current.previousElementSibling;
                while (sibling) {
                  if (sibling.tagName === current.tagName) siblingIndex += 1;
                  sibling = sibling.previousElementSibling;
                }
                parts.unshift(`${tag}:nth-of-type(${siblingIndex})`);
                current = current.parentElement;
              }
              return parts.join(">");
            };

            const calculateScore = (
              element: Element,
              candidateMetadata?: CandidateMetadata
            ): number => {
              if (!candidateMetadata) return 0;
              let score = 0;
              const elementTag = element.tagName.toLowerCase();

              if (
                candidateMetadata.testId &&
                element instanceof HTMLElement &&
                (element.getAttribute("data-testid") === candidateMetadata.testId ||
                  element.getAttribute("data-test") === candidateMetadata.testId ||
                  element.getAttribute("data-cy") === candidateMetadata.testId ||
                  element.getAttribute("data-test-id") === candidateMetadata.testId)
              ) {
                score += 120;
              }

              if (candidateMetadata.labelText) {
                const labelText = getAssociatedLabelText(element);
                if (labelText === candidateMetadata.labelText) {
                  score += 100;
                } else if (
                  labelText &&
                  labelText.includes(candidateMetadata.labelText)
                ) {
                  score += 50;
                }
              }

              if (candidateMetadata.formContext?.fieldIndex) {
                const index = getFormFieldIndex(element);
                if (index === candidateMetadata.formContext.fieldIndex) {
                  score += 90;
                }
              }

              if (
                candidateMetadata.placeholder &&
                element instanceof HTMLElement &&
                element.getAttribute("placeholder") === candidateMetadata.placeholder
              ) {
                score += 70;
              }

              if (
                candidateMetadata.ariaLabel &&
                element instanceof HTMLElement &&
                element.getAttribute("aria-label") === candidateMetadata.ariaLabel
              ) {
                score += 60;
              }

              if (
                candidateMetadata.tagName &&
                elementTag === candidateMetadata.tagName
              ) {
                score += 20;
              }

              if (candidateMetadata.role) {
                const elementRole =
                  element instanceof HTMLElement
                    ? element.getAttribute("role") || getImplicitRoleForElement(element)
                    : null;
                if (elementRole === candidateMetadata.role) {
                  score += 10;
                }
              }

              return score;
            };

            return elements.map((element, elementIndex) => ({
              selector: payload.selector,
              selectorOrder: payload.selectorOrder,
              elementIndex,
              score: calculateScore(element, payload.metadata),
              visible: isVisible(element),
              interactable: isInteractable(element),
              domPath: getDomPath(element),
            }));
          },
          { metadata, selector, selectorOrder }
        );
      } catch {
        continue;
      }

      rawCandidates.push(...evaluated);
    }

    const filtered = rawCandidates.filter((item) => item.visible && item.interactable);
    if (filtered.length === 0) return null;

    const deduped = new Map<string, CandidateInfo>();
    for (const item of filtered) {
      const prev = deduped.get(item.domPath);
      if (!prev) {
        deduped.set(item.domPath, item);
        continue;
      }
      if (
        item.score > prev.score ||
        (item.score === prev.score && item.selectorOrder < prev.selectorOrder)
      ) {
        deduped.set(item.domPath, item);
      }
    }

    const resolved = Array.from(deduped.values());
    resolved.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.selectorOrder !== b.selectorOrder) return a.selectorOrder - b.selectorOrder;
      return a.elementIndex - b.elementIndex;
    });

    return {
      candidate: resolved[0],
      totalCandidates: resolved.length,
    };
  }
}
