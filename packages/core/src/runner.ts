import type { Flow, Step } from "./types";

export interface ExecutionResult {
  success: boolean;
  error?: string;
  extractedData?: any;
  usedSelector?: string;
}

export interface RunResult {
  success: boolean;
  error?: string;
  failedStepIndex?: number;
  extractedData?: Record<string, any>;
}

export interface RunnerOptions {
  timeout?: number;
  stopOnError?: boolean;
  /** Variables for placeholder substitution (e.g., {{username}} → variables.username) */
  variables?: Record<string, string>;
}

/**
 * Abstract Flow Runner Interface
 *
 * TContext: The environment-specific context required to run the flow.
 * - DOM: void (runs in global window)
 * - Playwright: Page (runs on a specific page instance)
 */
export interface FlowRunner<TContext = any> {
  run(
    flow: Flow,
    context: TContext,
    options?: RunnerOptions
  ): Promise<RunResult>;
  runStep(
    step: Step,
    context: TContext,
    options?: RunnerOptions
  ): Promise<ExecutionResult>;
}
