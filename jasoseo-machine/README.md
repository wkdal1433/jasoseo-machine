# 자소서 머신 (Jasoseo Machine)

AI 기반 자기소개서 자동 생성 데스크탑 앱

---

## 사전 요구사항

앱을 사용하기 전에 아래 AI CLI 중 하나 이상을 설치해야 합니다.

### Gemini CLI (권장)

```bash
npm install -g @google/generative-ai-sdk
# 또는 공식 배포 바이너리 설치 후 PATH 등록
```

> Gemini Advanced 구독 필요 (API 키 불필요, Google 계정 인증)

### Claude CLI

```bash
npm install -g @anthropic-ai/claude-code
# 또는 공식 배포 바이너리 설치 후 PATH 등록
```

> Claude Pro 구독 필요 (API 키 불필요, Anthropic 계정 인증)

---

## 설치

1. 최신 릴리즈에서 `자소서 머신 Setup x.x.x.exe` 다운로드
2. 설치 실행 (UAC 경고 시 "예" 클릭)
3. 앱 실행

---

## 초기 설정

1. **설정** 탭 → Claude / Gemini CLI 경로 확인
   - 기본값: `claude`, `gemini` (PATH에 등록된 경우 그대로 사용)
   - 경로 오류 시: 전체 경로 입력 (예: `C:\Users\me\bin\claude.exe`)
2. **프로필** 탭 → 이력서/자소서 PDF 업로드 → AI 자동 추출
3. **에피소드** 탭 → 추출된 경험 확인 및 편집

---

## 사용 방법

1. **새 지원서** 버튼 클릭
2. 회사명 / 직무 / 공고 내용 / 자소서 문항 입력
3. **기업 전략 분석** → HR 의도 파악 자동화
4. 문항별 AI 생성 → 에피소드 선택 → 자소서 완성
5. **Chrome 확장** 연동 시 채용 사이트 자동 입력 가능

---

## 개발 환경 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 설치파일 생성 (Windows)
npm run dist:win
```

> **주의**: `npm run dist:win` 전에 `build/icon.ico` 파일을 준비해야 합니다.

---

## 기술 스택

- Electron 34 + React 19 + TypeScript
- Tailwind CSS + Zustand
- AI: Gemini CLI / Claude CLI (subprocess 방식, API 키 불필요)
- 저장소: JSON 파일 기반

---

## 라이선스

Private — 무단 배포 금지
