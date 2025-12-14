import { Page } from "playwright";
import { type Flow, type Step } from "@automation-wizard/core";
/**
 * Runner options
 */
export interface RunnerOptions {
    timeout?: number;
}
/**
 * Execute a complete flow
 */
export declare function runFlow(page: Page, flow: Flow, options?: RunnerOptions): Promise<void>;
/**
 * Execute a single step
 */
export declare function executeStep(page: Page, step: Step, options?: RunnerOptions): Promise<string | undefined>;
