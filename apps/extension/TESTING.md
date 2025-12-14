# 테스트 가이드

이 문서는 Automation Wizard 프로젝트의 테스트 환경 설정과 사용법을 설명합니다.

## 테스트 환경 구성

### 설치된 도구

- **Vitest**: 빠르고 현대적인 테스트 프레임워크
- **@testing-library/react**: React 컴포넌트 테스트
- **@testing-library/jest-dom**: DOM 매처 확장
- **happy-dom**: 경량 브라우저 환경 시뮬레이션
- **@vitest/ui**: 인터랙티브 테스트 UI
- **@vitest/coverage-v8**: 코드 커버리지 측정

## 테스트 실행 명령어

```bash
# 테스트 watch 모드 (개발 중 사용)
pnpm test

# 테스트 1회 실행
pnpm test:run

# 인터랙티브 UI로 테스트 실행
pnpm test:ui

# 코드 커버리지 포함하여 테스트 실행
pnpm test:coverage
```

## 프로젝트 구조

```
automation-wizard/
├── tests/
│   ├── setup.ts                    # 테스트 환경 설정 및 브라우저 API Mock
│   ├── background/
│   │   ├── storage.test.ts         # 스토리지 관련 테스트
│   │   └── messages.test.ts        # 메시지 핸들링 테스트
│   └── utils/
│       ├── flowHelpers.test.ts     # Flow 헬퍼 함수 테스트
│       └── stepValidation.test.ts  # Step 유효성 검증 테스트
├── vitest.config.ts                # Vitest 설정 파일
└── package.json
```

## 테스트 작성 가이드

### 기본 테스트 구조

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetAllMocks } from "../setup";

describe("Feature Name", () => {
  beforeEach(() => {
    resetAllMocks(); // 각 테스트 전에 mock 초기화
  });

  it("should do something", () => {
    // Arrange (준비)
    const input = "test";

    // Act (실행)
    const result = someFunction(input);

    // Assert (검증)
    expect(result).toBe("expected");
  });
});
```

### 브라우저 API Mock 사용

테스트 환경에서는 브라우저 확장 API를 사용할 수 없으므로 Mock을 사용합니다.

```typescript
import { mockStorageGet, mockStorageSet, mockRuntimeSendMessage } from "../setup";

// Storage Mock
it("should get data from storage", async () => {
  const mockData = { flow: { id: "test", steps: [] } };
  mockStorageGet(mockData);

  const result = await browser.storage.local.get("flow");
  expect(result.flow.id).toBe("test");
});

// Runtime Message Mock
it("should send message", async () => {
  mockRuntimeSendMessage({ success: true });

  const response = await browser.runtime.sendMessage({ type: "START_RECORD" });
  expect(response.success).toBe(true);
});
```

### Mock 헬퍼 함수

`tests/setup.ts`에서 제공하는 헬퍼 함수들:

- `mockStorageGet(data)`: Storage get 메서드를 mock
- `mockStorageSet()`: Storage set 메서드의 호출 여부 확인용
- `mockRuntimeSendMessage(response)`: Runtime sendMessage를 mock
- `mockTabsQuery(tabs)`: Tabs query를 mock
- `resetAllMocks()`: 모든 mock 초기화

## 테스트 커버리지

```bash
pnpm test:coverage
```

커버리지 리포트는 `coverage/` 디렉토리에 생성됩니다:
- `coverage/index.html`: 브라우저에서 볼 수 있는 상세 리포트
- `coverage/coverage-final.json`: JSON 형식 리포트

## 주요 테스트 카테고리

### 1. Flow 관리 테스트
- Flow 생성, 수정, 삭제
- Step 추가, 제거, 순서 변경
- Flow 유효성 검증

### 2. Storage 테스트
- 데이터 저장 및 불러오기
- Storage 동기화
- 에러 핸들링

### 3. 메시지 핸들링 테스트
- 레코딩 시작/중지
- 플로우 실행
- 백엔드 통신

### 4. Step 검증 테스트
- 각 Step 타입별 유효성 검증
- 선택자 검증
- 프레임 메타데이터 검증

## 베스트 프랙티스

### 1. 테스트 독립성 유지
각 테스트는 다른 테스트에 영향을 주지 않아야 합니다.

```typescript
beforeEach(() => {
  resetAllMocks();
  // 테스트 환경 초기화
});
```

### 2. 의미 있는 테스트 이름 사용
```typescript
// ❌ 나쁜 예
it("test 1", () => { ... });

// ✅ 좋은 예
it("should save flow to storage when saveFlow is called", () => { ... });
```

### 3. AAA 패턴 사용
- **Arrange**: 테스트 데이터 준비
- **Act**: 테스트할 동작 실행
- **Assert**: 결과 검증

```typescript
it("should add step to flow", () => {
  // Arrange
  const flow: Flow = { id: "test", title: "Test", steps: [], createdAt: Date.now() };
  const step: Step = { type: "click", selector: "#btn" };

  // Act
  flow.steps.push(step);

  // Assert
  expect(flow.steps).toHaveLength(1);
  expect(flow.steps[0].type).toBe("click");
});
```

### 4. Edge Case 테스트
```typescript
it("should handle empty selector gracefully", () => {
  const step: Step = { type: "click", selector: "" };
  expect(step.selector).toBe("");
});

it("should handle complex CSS selectors", () => {
  const step: Step = {
    type: "click",
    selector: "div.container > ul.list > li:nth-child(2)"
  };
  expect(step.selector).toContain("nth-child");
});
```

## 트러블슈팅

### Mock이 작동하지 않을 때
```typescript
// Mock을 초기화했는지 확인
beforeEach(() => {
  resetAllMocks();
});

// Mock 호출 확인
expect(browser.storage.local.set).toHaveBeenCalledTimes(1);
```

### 비동기 테스트 에러
```typescript
// async/await 사용
it("should handle async operation", async () => {
  await someAsyncFunction();
  expect(result).toBe(expected);
});
```

### TypeScript 타입 에러
```typescript
// Mock 타입 캐스팅
const call = vi.mocked(browser.storage.local.set).mock.calls[0][0] as { flow: Flow };
```

## 참고 자료

- [Vitest 공식 문서](https://vitest.dev/)
- [Testing Library 가이드](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 기여하기

새로운 기능을 추가할 때는 반드시 테스트도 함께 작성해주세요:

1. 기능 구현
2. 테스트 작성
3. `pnpm test:run`으로 모든 테스트 통과 확인
4. `pnpm test:coverage`로 커버리지 확인
5. Pull Request 제출

테스트 커버리지 목표: **80% 이상**

