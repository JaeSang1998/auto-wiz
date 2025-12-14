# 테스트 플랜

## 테스트 전략 개요

리팩터링 전 전체 비즈니스 로직에 대한 테스트 커버리지를 확보하여 안정적인 리팩터링을 가능하게 합니다.

## 테스트 커버리지 목표

- **전체 커버리지**: 80% 이상
- **핵심 비즈니스 로직**: 90% 이상
- **UI 컴포넌트**: 70% 이상

## 테스트 분류

### 1. 유틸리티 함수 테스트 (tests/utils/)

#### 1.1 선택자 생성 테스트 (`selectorGeneration.test.ts`)
- [ ] ID 기반 선택자 생성
- [ ] data-testid 기반 선택자 생성
- [ ] aria-label 기반 선택자 생성
- [ ] 구조 기반(nth-of-type) 선택자 생성
- [ ] 복잡한 중첩 구조 선택자 생성
- [ ] CSS.escape 처리
- [ ] 깊이 제한 (최대 5단계)

#### 1.2 URL 처리 테스트 (`urlUtils.test.ts`)
- [ ] URL 비교 로직
- [ ] origin + pathname 비교
- [ ] query parameter 무시
- [ ] 네비게이션 필요 여부 판단
- [ ] 유효하지 않은 URL 처리

#### 1.3 텍스트 마스킹 테스트 (`textMasking.test.ts`)
- [ ] 텍스트를 별표로 마스킹
- [ ] 원본 텍스트 보존
- [ ] 빈 문자열 처리
- [ ] 특수문자 포함 텍스트 처리

### 2. 백그라운드 로직 테스트 (tests/background/)

#### 2.1 스토리지 관리 (`storage.test.ts`) ✅
- [x] Flow 저장/불러오기
- [x] Flow 삭제
- [x] Flow 업데이트
- [x] 초기 Flow 생성

#### 2.2 메시지 핸들링 (`messages.test.ts`) ✅
- [x] START_RECORD 메시지
- [x] STOP_RECORD 메시지
- [x] RUN_FLOW 메시지
- [x] REC_STEP 메시지
- [x] GET_RECORD_STATE 메시지

#### 2.3 Flow 실행 엔진 (`flowExecution.test.ts`)
- [ ] 순차적 Step 실행
- [ ] Step 실행 중 에러 처리
- [ ] Step 실행 중단 (STOP_RUN)
- [ ] navigate Step 실행
- [ ] waitForNavigation Step 실행
- [ ] click Step 실행 (executeScript)
- [ ] type Step 실행 (한 글자씩 타이핑)
- [ ] select Step 실행
- [ ] extract Step 실행 및 데이터 반환
- [ ] waitFor Step 실행 (타임아웃 포함)
- [ ] screenshot Step 실행
- [ ] Step 간 딜레이
- [ ] URL 자동 네비게이션

#### 2.4 탭 관리 (`tabManagement.test.ts`)
- [ ] 탭 로드 완료 대기
- [ ] 탭 포커스
- [ ] 탭 업데이트
- [ ] 타임아웃 처리

### 3. Step 관련 테스트 (tests/steps/)

#### 3.1 Step 생성 (`stepCreation.test.ts`)
- [ ] click Step 생성
- [ ] type Step 생성 (마스킹 포함)
- [ ] select Step 생성
- [ ] extract Step 생성
- [ ] waitFor Step 생성
- [ ] navigate Step 생성
- [ ] screenshot Step 생성
- [ ] 프레임 메타데이터 포함

#### 3.2 Step 검증 (`stepValidation.test.ts`) ✅
- [x] 각 Step 타입 검증
- [x] 필수 필드 검증
- [x] 선택적 필드 검증

#### 3.3 Step 실행 로직 (`stepExecution.test.ts`)
- [ ] querySelector 실행
- [ ] scrollIntoView 실행
- [ ] 클릭 이벤트 발생
- [ ] 키보드 이벤트 시퀀스
- [ ] select 옵션 선택
- [ ] 데이터 추출
- [ ] 타임아웃 처리

### 4. Flow 관련 테스트 (tests/flow/)

#### 4.1 Flow 헬퍼 (`flowHelpers.test.ts`) ✅
- [x] Flow 생성
- [x] Step 추가
- [x] Step 삭제
- [x] Step 순서 변경

#### 4.2 Flow 검증 (`flowValidation.test.ts`)
- [ ] Flow 구조 검증
- [ ] Step 배열 검증
- [ ] 필수 필드 검증
- [ ] startUrl 검증

#### 4.3 Flow 변환 (`flowTransform.test.ts`)
- [ ] Flow를 JSON으로 변환
- [ ] JSON에서 Flow로 변환
- [ ] 백엔드 API 형식으로 변환

### 5. 레코딩 로직 테스트 (tests/recording/)

#### 5.1 이벤트 캡처 (`eventCapture.test.ts`)
- [ ] 클릭 이벤트 캡처
- [ ] 입력 이벤트 캡처 (debounce)
- [ ] select 변경 이벤트 캡처
- [ ] Enter 키 제출 캡처
- [ ] Shift+Tab 추출 캡처
- [ ] 새 탭 방지 (target="_blank")
- [ ] window.open 오버라이드

#### 5.2 자동 레코딩 (`autoRecording.test.ts`)
- [ ] autoCapture 토글
- [ ] 타이핑 debounce 처리
- [ ] Enter 제출 감지
- [ ] select 중복 방지

### 6. 컴포넌트 테스트 (tests/components/)

#### 6.1 HoverToolbar (`HoverToolbar.test.tsx`)
- [ ] 툴바 렌더링
- [ ] 액션 버튼 클릭
- [ ] 선택자 생성
- [ ] 스크린샷 캡처
- [ ] 부모/자식 탐색
- [ ] 드래그 앤 드롭
- [ ] 화면 경계 체크

#### 6.2 ContentApp (`ContentApp.test.tsx`)
- [ ] 픽커 토글
- [ ] 호버 하이라이트
- [ ] Alt+Shift 잠금
- [ ] ESC 해제
- [ ] 화살표 키 탐색
- [ ] 레코딩 HUD 표시

#### 6.3 SidePanelApp (`SidePanelApp.test.tsx`)
- [ ] Step 리스트 렌더링
- [ ] Run 버튼 클릭
- [ ] Stop 버튼 클릭
- [ ] Reset 버튼 클릭
- [ ] Step 삭제
- [ ] Step 순서 변경
- [ ] Start URL 업데이트
- [ ] Extracted Data 표시

### 7. 통합 테스트 (tests/integration/)

#### 7.1 전체 플로우 (`fullFlow.test.ts`)
- [ ] 레코딩 시작 → Step 추가 → 레코딩 중지
- [ ] Flow 실행 → 모든 Step 완료
- [ ] 백엔드 전송

#### 7.2 에러 시나리오 (`errorScenarios.test.ts`)
- [ ] 선택자를 찾을 수 없음
- [ ] 타임아웃 초과
- [ ] 네비게이션 실패
- [ ] 스토리지 에러

## 테스트 우선순위

### P0 (Critical - 반드시 필요)
1. ✅ Storage 관리
2. ✅ Message 핸들링
3. ✅ Step 검증
4. Flow 실행 엔진
5. 선택자 생성

### P1 (High - 매우 중요)
6. Step 실행 로직
7. URL 처리
8. 이벤트 캡처
9. Flow 헬퍼

### P2 (Medium - 중요)
10. 탭 관리
11. Step 생성
12. Flow 검증
13. 텍스트 마스킹

### P3 (Low - 추가적)
14. 컴포넌트 테스트
15. 통합 테스트
16. 에러 시나리오

## 테스트 실행 계획

### Phase 1: 핵심 로직 (P0)
- 기간: 1일
- 목표: Storage, Message, Step 검증

### Phase 2: 실행 엔진 (P1)
- 기간: 2일
- 목표: Flow 실행, Step 실행, URL 처리

### Phase 3: 레코딩 로직 (P2)
- 기간: 1일
- 목표: 이벤트 캡처, 자동 레코딩

### Phase 4: UI 및 통합 (P3)
- 기간: 2일
- 목표: 컴포넌트 테스트, 통합 테스트

## 성공 기준

- [ ] 모든 P0 테스트 완료 및 통과
- [ ] 80% 이상의 P1 테스트 완료
- [ ] 전체 코드 커버리지 80% 이상
- [ ] 핵심 비즈니스 로직 커버리지 90% 이상
- [ ] CI/CD 파이프라인에 통합
- [ ] 모든 테스트가 5초 이내 완료

## 현재 진행 상황

### 완료된 테스트 ✅
- [x] tests/utils/flowHelpers.test.ts (9 tests)
- [x] tests/utils/stepValidation.test.ts (19 tests)
- [x] tests/background/storage.test.ts (9 tests)
- [x] tests/background/messages.test.ts (12 tests)
- [x] tests/components/example.test.tsx (4 tests)

**총 53개 테스트 통과**

### 다음 작업
1. 선택자 생성 테스트
2. URL 처리 테스트
3. Flow 실행 엔진 테스트
4. Step 실행 로직 테스트

