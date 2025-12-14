import type { Flow, Step } from "../types";
export interface StorageAdapter {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
}
declare class ExtensionStorageAdapter implements StorageAdapter {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
}
declare class MemoryStorageAdapter implements StorageAdapter {
    private storage;
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
}
/**
 * 스토리지 어댑터 설정 (라이브러리 사용 시 필수)
 */
export declare function setStorageAdapter(adapter: StorageAdapter): void;
/**
 * Flow 가져오기
 */
export declare function getFlow(): Promise<Flow | null>;
/**
 * Flow 저장하기
 */
export declare function saveFlow(flow: Flow): Promise<void>;
/**
 * Flow 초기화 (비우기)
 */
export declare function clearFlow(): Promise<void>;
/**
 * Flow에 Step 추가
 */
export declare function addStep(step: Step): Promise<Flow>;
/**
 * Flow에서 마지막 Step 제거
 */
export declare function removeLastStep(): Promise<Flow>;
/**
 * Flow에서 특정 Step 제거
 */
export declare function removeStep(index: number): Promise<Flow>;
/**
 * Flow의 특정 Step 업데이트
 */
export declare function updateStep(index: number, step: Step): Promise<Flow>;
/**
 * Flow 업데이트 (전체 교체)
 */
export declare function updateFlow(updates: Partial<Flow>): Promise<Flow>;
export { ExtensionStorageAdapter, MemoryStorageAdapter };
