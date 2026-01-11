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
          const text = step.text || (step as any).originalText || "";
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
          } else {
            // Default "structure": clean HTML, keep only id, name, text
            text = await locator.evaluate((el) => {
              const clone = el.cloneNode(true) as Element;

              function cleanElement(element: Element) {
                // Remove all attributes except id and name
                const attributes = Array.from(element.attributes);
                for (const attr of attributes) {
                  if (!["id", "name"].includes(attr.name)) {
                    element.removeAttribute(attr.name);
                  }
                }

                // DFS for children
                for (const child of Array.from(element.children)) {
                  // Remove SVGs entirely
                  if (child.tagName.toLowerCase() === "svg") {
                    child.remove();
                  } else {
                    cleanElement(child);
                  }
                }
              }

              cleanElement(clone);
              return clone.outerHTML;
            });
          }

          return { success: true, extractedData: text?.trim() };
        }

        case "waitFor": {
          if (step.selector || step.locator) {
            // resolveLocator internally waits for visibility, so this is implicitly handled,
            // but we call it to ensure we find the valid element.
            await this.resolveLocator(page, step, step.timeoutMs || timeout);
          } else if (step.timeoutMs) {
            await page.waitForTimeout(step.timeoutMs);
          }
          break;
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async resolveLocator(
    page: Page,
    step: Step,
    timeout: number
  ): Promise<Locator> {
    const candidates: string[] = [];

    // 1. Gather all candidate selectors
    if ("locator" in step && step.locator) {
      const { primary, fallbacks = [] } = step.locator as ElementLocator;
      candidates.push(primary, ...fallbacks);
    } else if ("selector" in step && step.selector) {
      candidates.push(step.selector);
    } else {
      throw new Error(`Step ${step.type} requires a selector or locator`);
    }

    if (candidates.length === 0) {
      throw new Error(`Step ${step.type} has no valid selectors`);
    }

    // 2. If only one candidate, just return it (Playwright's default behavior)
    if (candidates.length === 1) {
      return page.locator(candidates[0]).first();
    }

    // 3. Parallel Race: Check all candidates for visibility
    // We create a promise for each candidate that resolves if the element becomes visible
    // and returns the corresponding Locator.
    const promises = candidates.map(async (selector) => {
      const loc = page.locator(selector).first();
      try {
        // Wait for it to be visible.
        // We use the full timeout for each parallel check.
        // The first one to succeed wins.
        await loc.waitFor({ state: "visible", timeout });
        return loc;
      } catch (err) {
        // If this specific selector fails, we throw so Promise.any ignores it
        // (unless all fail)
        throw err;
      }
    });

    try {
      // Promise.any resolves with the first fulfilled promise.
      // If all reject, it throws an AggregateError.
      const winner = await Promise.any(promises);
      return winner;
    } catch (error) {
      // If all failed, throw a descriptive error
      throw new Error(
        `Failed to resolve locator. Tried candidates: ${JSON.stringify(
          candidates
        )}. Error: ${(error as Error).message}`
      );
    }
  }
}
