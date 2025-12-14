import type { Flow, Step } from "../../types";

/**
 * Flow storage 유틸리티
 * Storage Adapter Pattern을 사용하여 확장성과 테스트 용이성 확보
 */

const FLOW_STORAGE_KEY = "flow";

export interface StorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

// 기본 브라우저 확장 프로그램 스토리지 어댑터
class ExtensionStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<any> {
    if (typeof browser !== "undefined" && browser.storage) {
      const result = await browser.storage.local.get(key);
      return result[key];
    }
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    if (typeof browser !== "undefined" && browser.storage) {
      await browser.storage.local.set({ [key]: value });
    }
  }
}

// 메모리 스토리지 어댑터 (테스트 또는 비-확장 프로그램 환경용)
class MemoryStorageAdapter implements StorageAdapter {
  private storage: Record<string, any> = {};

  async get(key: string): Promise<any> {
    return this.storage[key] || null;
  }

  async set(key: string, value: any): Promise<void> {
    this.storage[key] = value;
  }
}

let storageAdapter: StorageAdapter = new ExtensionStorageAdapter();

/**
 * 스토리지 어댑터 설정 (라이브러리 사용 시 필수)
 */
export function setStorageAdapter(adapter: StorageAdapter) {
  storageAdapter = adapter;
}

/**
 * Flow 가져오기
 */
export async function getFlow(): Promise<Flow | null> {
  try {
    const flow = await storageAdapter.get(FLOW_STORAGE_KEY);
    return flow || null;
  } catch (error) {
    console.error("Failed to get flow from storage:", error);
    return null;
  }
}

/**
 * Flow 저장하기
 */
export async function saveFlow(flow: Flow): Promise<void> {
  try {
    await storageAdapter.set(FLOW_STORAGE_KEY, flow);
  } catch (error) {
    console.error("Failed to save flow to storage:", error);
    throw error;
  }
}

/**
 * Flow 초기화 (비우기)
 */
export async function clearFlow(): Promise<void> {
  try {
    const emptyFlow: Flow = {
      id: crypto.randomUUID(),
      title: "New Flow",
      steps: [],
      createdAt: Date.now(),
    };
    await saveFlow(emptyFlow);
  } catch (error) {
    console.error("Failed to clear flow:", error);
    throw error;
  }
}

/**
 * Flow에 Step 추가
 */
export async function addStep(step: Step): Promise<Flow> {
  const flow = (await getFlow()) || {
    id: crypto.randomUUID(),
    title: "New Flow",
    steps: [],
    createdAt: Date.now(),
  };
  flow.steps.push(step);

  if (!flow.startUrl && (step as any).url) {
    flow.startUrl = (step as any).url;
  }

  await saveFlow(flow);
  return flow;
}

/**
 * Flow에서 마지막 Step 제거
 */
export async function removeLastStep(): Promise<Flow> {
  const flow = await getFlow();
  if (!flow || flow.steps.length === 0) {
    return {
      id: crypto.randomUUID(),
      title: "New Flow",
      steps: [],
      createdAt: Date.now(),
    };
  }

  flow.steps.pop();
  await saveFlow(flow);
  return flow;
}

/**
 * Flow에서 특정 Step 제거
 */
export async function removeStep(index: number): Promise<Flow> {
  const flow = await getFlow();
  if (!flow || index < 0 || index >= flow.steps.length) {
    throw new Error(`Invalid step index: ${index}`);
  }

  flow.steps.splice(index, 1);
  await saveFlow(flow);
  return flow;
}

/**
 * Flow의 특정 Step 업데이트
 */
export async function updateStep(index: number, step: Step): Promise<Flow> {
  const flow = await getFlow();
  if (!flow || index < 0 || index >= flow.steps.length) {
    throw new Error(`Invalid step index: ${index}`);
  }

  flow.steps[index] = step;
  await saveFlow(flow);
  return flow;
}

/**
 * Flow 업데이트 (전체 교체)
 */
export async function updateFlow(updates: Partial<Flow>): Promise<Flow> {
  const flow = (await getFlow()) || {
    id: crypto.randomUUID(),
    title: "New Flow",
    steps: [],
    createdAt: Date.now(),
  };
  const updatedFlow = { ...flow, ...updates };
  await saveFlow(updatedFlow);
  return updatedFlow;
}

// Export adapters for external use/testing
export { ExtensionStorageAdapter, MemoryStorageAdapter };
