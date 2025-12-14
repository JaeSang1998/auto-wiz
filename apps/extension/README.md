# Automation Wizard 🧙‍♂️

WXT 기반으로 만든 **웹 자동화 레코더 & 실행기 PoC**입니다. 노션처럼 호버 툴바를 사용해 엘리먼트를 선택하고, 액션을 레코드한 후 실행하거나 백엔드로 전송할 수 있습니다.

## ✨ 주요 기능

### 1. Alt + Shift 호버 툴바
- 마우스를 움직이면 엘리먼트가 **하이라이트**됩니다
- **Alt + Shift (또는 Option + Shift)를 누르면 툴바 잠금** 🔒 (버튼 클릭 가능!)
- ESC 또는 액션 선택 시 자동 해제
- 컬러풀한 버튼으로 다양한 액션 레코드:
  - 👆 **Click** (파랑): 클릭 이벤트
  - ⌨️ **Type** (초록): 텍스트 입력
  - 📄 **Extract** (주황): 텍스트 추출
  - ⏱️ **Wait** (보라): 엘리먼트 대기

### 2. 자동으로 열리는 사이드패널
- 확장 프로그램 설치 시 **자동으로 사이드패널 열림**
- 레코드된 스텝을 리스트로 확인
- **▶ Run**: 현재 탭에서 플로우 실행
- **📤 Send**: 백엔드 API로 전송
- **⏸ Pause / ▶ Resume**: 픽커 토글
- **🗑 Reset**: 모든 레코드 초기화

### 3. 안정적인 선택자 생성
우선순위에 따라 선택자를 생성합니다:
1. `id` 속성
2. `data-testid` 속성
3. `aria-label` 속성
4. 구조 기반 (`nth-of-type`)

## 🚀 시작하기

### 설치
```bash
npm install
# 또는
pnpm install
```

### 개발 (핫리로드)
```bash
npm run dev
```

### 빌드
```bash
npm run build
```

### 테스트 ✅
```bash
# 테스트 실행 (watch 모드)
pnpm test

# 테스트 1회 실행
pnpm test:run

# 인터랙티브 UI로 테스트
pnpm test:ui

# 코드 커버리지 포함
pnpm test:coverage
```

**현재 테스트 현황: 11개 파일 / 219개 테스트 - 모두 통과 ✨**

자세한 내용:
- [TESTING.md](./TESTING.md) - 테스트 작성 가이드
- [TEST_PLAN.md](./TEST_PLAN.md) - 테스트 플랜
- [TEST_SUMMARY.md](./TEST_SUMMARY.md) - 테스트 구현 완료 요약

### Chrome에 로드
1. Chrome에서 `chrome://extensions` 열기
2. **개발자 모드** 활성화
3. **압축해제된 확장 프로그램 로드** 클릭
4. `.output/chrome-mv3` 폴더 선택

## 📖 사용 방법

### 1. 액션 레코드 (Alt + Shift)
1. 원하는 웹페이지 열기
2. 마우스를 움직여서 엘리먼트 선택
3. **Alt + Shift (또는 Option + Shift)를 누르면 툴바 잠금** 🔒
4. 컬러풀한 버튼 클릭:
   - 👆 **Click** (파랑): 클릭 이벤트
   - ⌨️ **Type** (초록): 텍스트 입력
   - 📄 **Extract** (주황): 텍스트 추출
   - ⏱️ **Wait** (보라): 엘리먼트 대기
5. 레코드된 스텝이 사이드패널에 자동 표시됨
6. 액션 선택하면 자동 해제 (또는 ESC/Alt+Shift)

### 2. 플로우 실행
1. 사이드패널 열기 (Chrome 우측 사이드패널 아이콘)
2. **Run** 버튼 클릭
3. 레코드된 액션들이 순차적으로 실행됨

### 3. 백엔드 전송
1. Backend Endpoint에 API URL 입력
2. **Send** 버튼 클릭
3. 플로우가 JSON으로 POST됨

## 🏗 프로젝트 구조

```
automation-wizard/
├── entrypoints/
│   ├── background.ts       # 메시징/스토리지/실행 로직
│   ├── content.tsx         # React 기반 호버 UI
│   ├── sidepanel.html      # 사이드패널 HTML
│   ├── sidepanel.tsx       # React 기반 사이드패널
│   └── content/
│       └── HoverToolbar.tsx # 호버 툴바 컴포넌트
├── types.ts                # TypeScript 타입 정의
└── wxt.config.ts          # WXT 설정
```

## 📦 백엔드 API 스펙

### POST /flows (예시)
```json
{
  "id": "uuid-here",
  "title": "Automation PoC Flow",
  "steps": [
    {
      "type": "click",
      "selector": "button#submit"
    },
    {
      "type": "type",
      "selector": "input[name='email']",
      "text": "test@example.com"
    },
    {
      "type": "extract",
      "selector": ".result",
      "prop": "innerText"
    },
    {
      "type": "waitFor",
      "selector": ".loading",
      "timeoutMs": 5000
    }
  ],
  "createdAt": 1234567890
}
```

## 🔧 기술 스택

### 프로덕션
- **WXT**: Chrome Extension 프레임워크
- **React 19**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Chrome Extensions API**: Manifest V3
- **Vite**: 번들러 (WXT 내장)

### 개발/테스트
- **Vitest**: 테스트 프레임워크
- **Testing Library**: React 컴포넌트 테스트
- **Happy-DOM**: 브라우저 환경 시뮬레이션

## 🎯 다음 단계

- [ ] 선택자 테스터 (매칭 수, 강건성 점수)
- [ ] 에러 로그 & 스텝별 결과 스트리밍
- [ ] 조건 분기 & 루프 지원
- [ ] XState로 상태 머신 구현
- [ ] 인증 토큰 & 워크스페이스 관리
- [ ] 오프스크린 문서 (고급 오버레이 처리)

## 📝 라이센스

MIT

## 🤝 기여

이슈와 PR을 환영합니다!
