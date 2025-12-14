
import { Page, Locator } from "playwright";
import { type Flow, type Step, type ElementLocator } from "@automation-wizard/core";

/**
 * Runner options
 */
export interface RunnerOptions {
  timeout?: number;
}

/**
 * Execute a complete flow
 */
export async function runFlow(page: Page, flow: Flow, options: RunnerOptions = {}) {
  // console.log(`Running flow: ${flow.title} (${flow.steps.length} steps)`);

  for (const [index, step] of flow.steps.entries()) {
    try {
      await executeStep(page, step, options);
    } catch (error) {
      throw new Error(`Step ${index + 1} (${step.type}) failed: ${(error as Error).message}`);
    }
  }

  // console.log("Flow completed successfully");
}

/**
 * Helper to get a playwright locator from Step locator or selector
 */
function getLocator(page: Page, step: Step): Locator {
  // 1. Use robust locator if available
  if ('locator' in step && step.locator) {
    const { primary } = step.locator as ElementLocator;
    
    // Try primary first
    let loc = page.locator(primary).first();
    
    // Playwright handles waiting, but we might want to try fallbacks if primary fails?
    // For now, let's just return the primary locator or a composite 'or' locator if we want robustness
    // But 'or' is for elements that might be anyone of them.
    // If primary selector is bad, we want fallback.
    // Playwright doesn't have "try this selector, then that" easily without try-catch blocks or 'or'.
    
    // Simple approach: Use primary. 
    // TODO: Implement robust fallback logic if needed (e.g. check count > 0)
    return loc;
  }

  // 2. Legacy selector
  if ('selector' in step && step.selector) {
    return page.locator(step.selector).first();
  }

  throw new Error(`Step ${step.type} requires a selector or locator`);
}

/**
 * Execute a single step
 */
export async function executeStep(page: Page, step: Step, options: RunnerOptions = {}) {
  const timeout = options.timeout || 5000;

  switch (step.type) {
    case "navigate":
        if (step.url) {
            await page.goto(step.url, { timeout });
        }
        break;

    case "click": {
        const locator = getLocator(page, step);
        await locator.click({ timeout });
        break;
    }

    case "type": {
        const locator = getLocator(page, step);
        const text = step.text || (step as any).originalText || "";
        await locator.fill(text, { timeout });
        if (step.submit) {
            await locator.press("Enter");
        }
        break;
    }

    case "select": {
        const locator = getLocator(page, step);
        if (step.value) {
            await locator.selectOption(step.value, { timeout });
        }
        break;
    }

    case "extract": {
        const locator = getLocator(page, step);
        const text = await locator.textContent({ timeout });
        return text?.trim();
    }

    case "waitFor": {
        if (step.selector || step.locator) {
             const locator = getLocator(page, step);
             await locator.waitFor({ state: "visible", timeout: step.timeoutMs || timeout });
        } else if (step.timeoutMs) {
             await page.waitForTimeout(step.timeoutMs);
        }
        break;
    }
    
    // TODO: Handle 'hover', 'scroll' etc if added to types
    default:
        // console.warn(`Unsupported step type: ${step.type}`);
        break;
  }
}
