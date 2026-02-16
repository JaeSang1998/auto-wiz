import {
  type FlowRunner,
  type RunResult,
  type ExecutionResult,
  type RunnerOptions,
  type Flow,
  type Step,
  type ElementLocator,
} from "@auto-wiz/core";
import { Page, Locator } from "playwright";

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

export class PlaywrightFlowRunner implements FlowRunner<Page> {
  async run(
    flow: Flow,
    page: Page,
    options: RunnerOptions = {}
  ): Promise<RunResult> {
    const extractedData: Record<string, any> = {};

    // Implicit Navigation:
    // If we are on a blank page and the first step has a URL but is NOT a 'navigate' step,
    // we should navigate to that URL to start the flow.
    if (page.url() === "about:blank" && flow.steps.length > 0) {
      const firstStep = flow.steps[0];
      // Check if the step has a url property (it might not be in the Step type definition for all types)
      if (
        firstStep.type !== "navigate" &&
        "url" in firstStep &&
        (firstStep as any).url
      ) {
        try {
          // Use the provided timeout or default 5s
          await page.goto((firstStep as any).url, {
            timeout: options.timeout || 5000,
            waitUntil: "domcontentloaded",
          });
        } catch (error) {
          // If navigation fails, we return early as the flow cannot proceed
          return {
            success: false,
            error: `Implicit navigation failed: ${(error as Error).message}`,
            failedStepIndex: 0,
            extractedData,
          };
        }
      }
    }

    for (const [index, step] of flow.steps.entries()) {
      try {
        // Step delay for debugging
        if (options.stepDelay && index > 0) {
          await page.waitForTimeout(options.stepDelay);
        }

        const result = await this.runStep(step, page, options);

        if (!result.success) {
          // Playwright usually throws, but if we catch it:
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
          const locator = await this.resolveLocator(page, step, timeout);
          await locator.click({ timeout });
          break;
        }

        case "type": {
          const locator = await this.resolveLocator(page, step, timeout);
          // originalText가 실제 값, text는 마스킹된 값
          const rawText = (step as any).originalText || step.text || "";
          const text = this.resolveText(rawText, options.variables);
          await locator.fill(text, { timeout });
          if (step.submit) {
            await locator.press("Enter");
          }
          break;
        }

        case "select": {
          const locator = await this.resolveLocator(page, step, timeout);
          if (step.value) {
            await locator.selectOption(step.value, { timeout });
          }
          break;
        }

        case "extract": {
          const locator = await this.resolveLocator(page, step, timeout);
          let text: string | null = null;

          if (step.prop === "value") {
            text = await locator.inputValue();
          } else if (step.prop === "innerText") {
            text = await locator.innerText({ timeout });
          } else if (step.prop === "outerHTML") {
            // Explicit 'outerHTML' requests full HTML (with SVGs stripped per existing logic)
            text = await locator.evaluate((el) => {
              const clone = el.cloneNode(true) as Element;
              const svgs = clone.querySelectorAll("svg");
              svgs.forEach((svg) => svg.remove());
              return clone.outerHTML;
            });
          } else if (step.prop === "simplified") {
            // Simplified: Canonical transformation, lighter but preserves hierarchy
            text = await locator.evaluate((el) => {
              const clone = el.cloneNode(true) as Element;

              const blockListTags = [
                "SCRIPT",
                "STYLE",
                "SVG",
                "NOSCRIPT",
                "IFRAME",
                "OBJECT",
                "EMBED",
                "PARAM",
                "SOURCE",
                "TRACK",
                "AREA",
                "MAP",
                "META",
                "LINK",
                "HEAD",
              ];
              const allowedAttributes = [
                "id",
                "name",
                "href",
                "src",
                "alt",
                "value",
                "type",
                "placeholder",
                "title",
                "colspan",
                "rowspan",
                "target",
              ];
              const isGenericContainer = (tagName: string) =>
                ["DIV", "SPAN"].includes(tagName);

              function clean(node: Element) {
                if (blockListTags.includes(node.tagName)) {
                  node.remove();
                  return;
                }

                const children = Array.from(node.children);
                for (const child of children) {
                  clean(child);
                }

                const attrs = Array.from(node.attributes || []);
                for (const attr of attrs) {
                  if (!allowedAttributes.includes(attr.name)) {
                    node.removeAttribute(attr.name);
                  }
                }

                if (isGenericContainer(node.tagName)) {
                  const hasIdOrName =
                    node.hasAttribute("id") || node.hasAttribute("name");

                  if (hasIdOrName) {
                    const hasChildNodes = node.childNodes.length > 0;
                    if (!hasChildNodes) {
                      node.remove();
                    }
                    return;
                  }

                  const childElements = node.children;
                  let hasText = false;
                  for (const childNode of Array.from(node.childNodes)) {
                    if (
                      childNode.nodeType === 3 &&
                      (childNode.textContent || "").trim() !== ""
                    ) {
                      hasText = true;
                      break;
                    }
                  }

                  if (node.tagName === "SPAN") {
                    const parent = node.parentNode;
                    if (parent) {
                      while (node.firstChild) {
                        parent.insertBefore(node.firstChild, node);
                      }
                      parent.removeChild(node);
                    }
                    return;
                  }

                  if (childElements.length === 1 && !hasText) {
                    const singleChild = childElements[0];
                    const parent = node.parentNode;
                    if (parent) {
                      node.replaceWith(singleChild);
                    }
                    return;
                  }

                  if (childElements.length === 0 && !hasText) {
                    node.remove();
                    return;
                  }
                }
              }

              clean(clone);
              return clone.outerHTML;
            });
          } else {
            // Default "structure": clean HTML, keep only id, name, text
            text = await locator.evaluate(function (el) {
              const clone = el.cloneNode(true) as Element;

              const svgs = clone.querySelectorAll("svg");
              for (const svg of Array.from(svgs)) {
                svg.remove();
              }

              const descendants = clone.querySelectorAll("*");
              for (const child of Array.from(descendants)) {
                const attrs = Array.from(child.attributes);
                for (const attr of attrs) {
                  if (attr.name !== "id" && attr.name !== "name") {
                    child.removeAttribute(attr.name);
                  }
                }
              }

              const rootAttrs = Array.from(clone.attributes);
              for (const attr of rootAttrs) {
                if (attr.name !== "id" && attr.name !== "name") {
                  clone.removeAttribute(attr.name);
                }
              }

              return clone.outerHTML;
            });
          }

          return { success: true, extractedData: text?.trim() };
        }

        case "waitFor": {
          if (step.locator) {
            // resolveLocator internally waits for visibility, so this is implicitly handled,
            // but we call it to ensure we find the valid element.
            await this.resolveLocator(page, step, step.timeoutMs || timeout);
          } else if (step.timeoutMs) {
            await page.waitForTimeout(step.timeoutMs);
          }
          break;
        }

        case "keyboard": {
          const key = step.key;
          if (!key) {
            return { success: false, error: "Keyboard step requires key" };
          }
          if (step.locator) {
            const locator = await this.resolveLocator(page, step, timeout);
            await locator.focus({ timeout });
          }
          await page.keyboard.press(key);
          break;
        }

        case "waitForNavigation": {
          const navTimeout = step.timeoutMs || timeout;
          await page.waitForLoadState("domcontentloaded", {
            timeout: navTimeout,
          });
          break;
        }

        case "screenshot": {
          if (step.locator) {
            const locator = await this.resolveLocator(page, step, timeout);
            const buffer = await locator.screenshot({ type: "png" });
            const base64 = buffer.toString("base64");
            return { success: true, extractedData: base64 };
          }
          const buffer = await page.screenshot({ type: "png" });
          const base64 = buffer.toString("base64");
          return { success: true, extractedData: base64 };
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

  private async resolveLocator(
    page: Page,
    step: Step,
    timeout: number
  ): Promise<Locator> {
    if (!("locator" in step) || !step.locator) {
      throw new Error(`Step ${step.type} requires a locator`);
    }

    const { primary, fallbacks = [], metadata } = step.locator as ElementLocator;
    const candidates = [primary, ...fallbacks];

    if (candidates.length === 0) {
      throw new Error(`Step ${step.type} has no valid selectors`);
    }

    const startedAt = Date.now();
    let lastError = "No candidates found";

    while (Date.now() - startedAt < timeout) {
      const resolved = await this.pickBestCandidate(
        page,
        candidates,
        metadata
      );

      if (resolved) {
        if (resolved.totalCandidates === 1) {
          return page.locator(resolved.candidate.selector).nth(
            resolved.candidate.elementIndex
          );
        }

        if (resolved.candidate.score >= MIN_CONFIDENCE_SCORE) {
          return page.locator(resolved.candidate.selector).nth(
            resolved.candidate.elementIndex
          );
        }

        lastError = `AMBIGUOUS_LOCATOR: ${resolved.totalCandidates} candidates found, best score=${resolved.candidate.score}, selector=${resolved.candidate.selector}`;
      }

      await page.waitForTimeout(LOCATOR_POLL_INTERVAL_MS);
    }

    throw new Error(
      `Failed to resolve locator. Tried selectors=${JSON.stringify(
        candidates
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
      const locator = page.locator(selector);
      let count = 0;

      try {
        count = await locator.count();
      } catch {
        continue;
      }

      if (count === 0) continue;

      const evaluated = await locator.evaluateAll(
        (
          elements,
          payload: { metadata?: CandidateMetadata; selector: string; selectorOrder: number }
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

            if (candidateMetadata.tagName && elementTag === candidateMetadata.tagName) {
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

      rawCandidates.push(...evaluated);
    }

    const filtered = rawCandidates.filter((item) => item.visible && item.interactable);
    if (filtered.length === 0) {
      return null;
    }

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
