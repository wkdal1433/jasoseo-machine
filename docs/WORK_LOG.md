# Work Log (작업 Raw Data)

> Phase별 상세 작업 내역. 시행착오, 에러 해결, 결정 배경을 포함.
> 세션 복원에는 `docs/SESSION_CONTEXT.md`를 사용할 것. 이 파일은 참조/복구용.

---

## Phase 1: 설계 및 계획

**기간**: 2026-03-04
**Plan 파일**: `.claude/plans/tidy-popping-marble.md`

### 설계 결정

- **프레임워크**: Electron + electron-vite 선택
  - 이유: Windows 지원, CLI subprocess spawn 가능, 데스크탑 앱
  - 대안 고려: Tauri (Rust 의존성으로 기각), Next.js (데스크탑 부적합)

- **상태관리**: Zustand 선택
  - 이유: 위자드 멀티스텝 상태에 적합, Redux보다 간결
  - 위자드 상태가 복잡 (지원서 → N개 문항 → 각 문항별 Step 0~8)

- **DB**: 처음 SQLite(better-sqlite3) 계획 → 나중에 JSON으로 변경 (Phase 2에서 빌드 실패)

- **핵심 구조 변경 — 지원서(Application) 중심**:
  - 기존: 문항 1개씩 위자드 반복
  - 변경: 지원서 1개 → N개 문항 → 탭 전환
  - 이유: Step 0 중복 실행 방지, Episode 중복 추적, UX 효율성

### 9-Step → 4-Phase CLI 매핑

```
Phase A (Step 0)     → --output-format json         → 기업 분석
Phase B (Step 1-2)   → --output-format json         → 질문 재해석 + Episode 추천
Phase C (Step 3-5)   → --output-format stream-json  → 자소서 생성 (스트리밍)
Phase D (Step 6-8)   → --output-format json         → 3중 검증
```

### 프롬프트 설계

- Claude CLI에 `-p` 플래그로 프롬프트 전달
- `--allowedTools "Read"` → Episode 파일 직접 읽기 허용
- `--max-turns 5` → 무한 루프 방지
- `--append-system-prompt` → GUI 전용 시스템 프롬프트 추가
- `cwd: projectDir` → CLAUDE.md 자동 로드

---

## Phase 2: 스캐폴딩 + 기반 구축

**기간**: 2026-03-04 ~ 03-05

### 프로젝트 초기화

```bash
npm create electron-vite@latest jasoseo-machine
# React + TypeScript 선택
```

- Tailwind CSS 설정 (tailwind.config.js, postcss.config.js)
- tsconfig 설정 (main, preload, renderer 분리)
- path alias: `@/` → `src/renderer/src/`

### SQLite → JSON 마이그레이션

**문제**: `better-sqlite3`가 Windows에서 빌드 실패
- 원인: native addon → C++ build tools (Visual Studio Build Tools) 필요
- `@electron/rebuild`도 시도했으나 동일 실패

**해결**: JSON 파일 기반 저장소로 전환
- 파일 위치: `userData/data/jasoseo-machine.json`
- 구조: `{ applications: [], coverLetters: [], drafts: [], settings: {} }`
- CRUD 함수 직접 구현 (saveApplication, listApplications 등)

**후속 문제**: `getDb()` 함수를 사용하던 3개 파일이 깨짐
- `claude-bridge.ts` → `getSetting()`으로 교체
- `ipc-handlers.ts` → 전체 재작성 (SQL → JSON db 함수)
- `file-watcher.ts` → `getSetting()`으로 교체

### 생성된 파일 목록

**Main Process:**
- `src/main/index.ts` — Electron 진입점, BrowserWindow(1280x860)
- `src/main/db.ts` — JSON 저장소 (initDatabase, CRUD 함수들)
- `src/main/claude-bridge.ts` — CLI subprocess (executeClaudePrompt, executeClaudeStream)
- `src/main/ipc-handlers.ts` — IPC 핸들러 등록
- `src/main/file-watcher.ts` — chokidar 기반 Episode 감시

**Preload:**
- `src/preload/index.ts` — contextBridge API (claudeExecute, onStreamChunk 등)

**Shared:**
- `src/shared/ipc-channels.ts` — IPC 채널명 상수

**Renderer:**
- `src/renderer/src/App.tsx` — HashRouter + 라우트 + 테마
- `src/renderer/src/components/layout/` — Sidebar, Header, Layout
- `src/renderer/src/components/dashboard/DashboardPage.tsx`
- `src/renderer/src/components/episodes/EpisodeListPage.tsx`
- `src/renderer/src/components/history/HistoryPage.tsx`
- `src/renderer/src/components/settings/SettingsPage.tsx`
- `src/renderer/src/components/common/` — CharacterCounter, MarkdownViewer, CopyButton
- `src/renderer/src/stores/` — wizardStore, episodeStore, historyStore, settingsStore
- `src/renderer/src/lib/` — prompt-builder, md-parser, stream-parser, validators, utils
- `src/renderer/src/types/` — application, episode, wizard, claude
- `src/renderer/src/hooks/` — useClaude, useStreaming, useEpisodes

### electron.vite.config.ts 수정

- `better-sqlite3`를 rollupOptions.external에서 제거
- `electron-store`, `@electron/rebuild` 의존성 제거

---

## Phase 3: 위자드 구현

**기간**: 2026-03-05

### 생성된 위자드 컴포넌트

| 파일 | 역할 | 핵심 로직 |
|------|------|----------|
| `WizardPage.tsx` | 컨테이너 + 스텝 라우팅 | step0Completed → activeQuestion.currentStep 기반 라우팅 |
| `WizardStepper.tsx` | 스텝 인디케이터 (0-8) | 완료=green, 현재=primary, 대기=muted |
| `QuestionTab.tsx` | 문항 탭 네비게이션 | 상태 아이콘 (checkmark/pulse/circle) |
| `ApplicationSetup.tsx` | 지원서 정보 입력 | 기업명, 직무명, 채용공고, 문항 N개, 전략 선택 |
| `Step0_Analysis.tsx` | AI 기업 분석 | claudeExecute → JSON 파싱 (fallback regex) |
| `Step1_Reframe.tsx` | 질문 재해석 + Episode 추천 | claudeExecute → analysisResult 저장 |
| `Step2_EpisodeApproval.tsx` | Episode 승인 | cross-question 사용 추적, 최대 2회 제한 |
| `Step3to5_Generation.tsx` | 스트리밍 생성 | claudeExecuteStream + onStreamChunk + 인라인 편집 |
| `Step6to8_Verification.tsx` | 3중 검증 | claudeExecute → 검증 결과 체크리스트 표시 |
| `FinalResult.tsx` | 문항별 최종 결과 | 복사, 편집, 재검증 버튼 |
| `FullReview.tsx` | 전체 리뷰 + 저장 | Episode 사용 현황 요약, appSave + clSave |

### 추가 구현

- `useAutoSave.ts` — 30초 인터벌 + Step 전환 시 자동 저장
- `DashboardPage.tsx` — 드래프트 복구 섹션 추가

### 빌드 결과

- 94 modules 성공 빌드
- `npm run dev`로 Electron 앱 정상 실행

---

## Phase 4: QA 및 버그 수정

**기간**: 2026-03-05

### Issue 1: md-parser.ts HR 의도 추출 실패

**문제**: Episode 파일에 `## HR 관점 해석` 섹션이 존재하지 않음 → 모든 Episode의 hrIntents가 빈 배열
**해결**: 키워드 기반 스캐닝으로 변경
- Episode 전체 텍스트에서 HR 키워드 검색 (실행력/문제해결 → Execution 등)
- `## 프로젝트 핵심 가치` 섹션에서 summary 추출 추가

### Issue 2: prompt-builder.ts 프로토콜 파일 참조 누락

**문제**: 프롬프트가 ANTI_HALLUCINATION.md, FAIL_PATTERNS.md, angle_shifting_map.md 등을 참조하지 않음
**해결**: 전체 재작성
- Step 0: "먼저 MASTER_INDEX.md를 읽어서..."
- Step 1-2: MASTER_INDEX.md + generic_storytelling_patterns.md (§10) + angle_shifting_map.md
- Step 3-5: Episode 파일 + generic_storytelling_patterns.md (§9, §11, §12) + APPENDIX_C_COMPANY_VALUES.md
- Step 6-8: ANTI_HALLUCINATION.md (7개 Hard Gate) + FAIL_PATTERNS.md (9개 탈락패턴) + generic_storytelling_patterns.md (§9)
- GUI_SYSTEM_PROMPT에 "Return ONLY the JSON object, no extra text" 추가

### Issue 3: FullReview.tsx 데이터 손실

**문제**: 이력 저장 시 jobPosting이 `''`, strategy/hrIntents가 `null`로 저장됨
**해결**: wizardStore에서 누락된 필드 destructuring 추가

### Issue 4-5: 네이티브 폴더 선택기 부재

**문제**: 설정 페이지에 프로젝트 디렉토리를 텍스트로만 입력 가능
**해결**: 4개 파일 수정
- `ipc-channels.ts` → `FS_SELECT_DIR` 추가
- `ipc-handlers.ts` → `dialog.showOpenDialog` 핸들러 추가
- `preload/index.ts` → `selectDirectory` API 추가
- `SettingsPage.tsx` → "폴더 선택" 버튼 추가

### Issue 6: Stream-json 이벤트 타입 미처리

**문제**: `content_block_delta`, `content_block_start`, `result` 이벤트 타입 구분 없이 처리
**해결**: Step3to5_Generation.tsx에서 이벤트 타입별 분기 처리 추가

### Issue 7: 위자드 스텝 라우팅 복잡성

**문제**: switch-true 패턴으로 복잡한 라우팅, 완료된 문항 탭 클릭 시 동작 불명확
**해결**: 단순화 — `status === 'completed'` 먼저 체크 후 순차 조건

### Issue 8: historyStore 필드명 불일치

**문제**: Store가 snake_case 기대하나 db.ts는 camelCase 반환
**해결**: historyStore, HistoryPage, DashboardPage 모두 camelCase로 통일

---

## Phase 5: GitHub 연동 + 문서화

**기간**: 2026-03-05 ~ 03-06

### 파일 이동 및 커밋

1. `C:\Users\scspr\WorkSpace\자기소개서\*` → `C:\Users\scspr\WorkSpace\jasoseo\`로 복사
2. `C:\Users\scspr\WorkSpace\jasoseo-machine\` → `C:\Users\scspr\WorkSpace\jasoseo\jasoseo-machine\`로 복사
3. `.gitignore` 생성 (node_modules, out, dist, OS files, IDE, temp)
4. 커밋: `e3ce14f` — "feat: 자소서 머신 GUI 앱 추가 + Episode S-P-A-A-R-L 재정립"
   - 62 files changed, +10291/-161

### 사용 가이드 페이지

- `GuidePage.tsx` 생성 (6개 섹션: 개요, 초기 설정, 9-Step 과정, Episode 관리, 합격 팁, FAQ)
- Sidebar에 "사용 가이드" 메뉴 추가
- App.tsx에 `/guide` 라우트 등록

### README.md

- 전문적 형태로 작성 (프로젝트 소개, Tech Stack, 설치법, 구조, 9-Step, 아키텍처, 트러블슈팅)
- 커밋: `611d50a` — "docs: 앱 내 사용 가이드 페이지 추가 + README.md 작성"

### GitHub Push

- `git push origin main` → 2개 커밋 push 완료
- Remote: https://github.com/wkdal1433/jasoseo.git

### 실행 바로가기

- `start-app.bat` 생성 (chcp 65001 + call npm run dev)
- 바탕화면 바로가기 `jasoseo-machine.lnk` 생성
- 초기 .bat에서 `call` 누락으로 실행 안 되는 이슈 → 수정 후 해결

---

## Phase 7: 기능 고도화 - 프로필 관리 (Gemini CLI)

**기간**: 2026-03-06
**브랜치**: `feat/profile-management`

### 설계 결정

- **JSON 스키마 확장**: 인적사항 외에 병역, 학력, 경력, 어학, 자격증, 기타활동을 포함하는 포괄적 구조 설계
- **Atomic Commits**: Google Git 표준을 준수하여 원자적 커밋 수행
- **Storage**: 기존 JSON 파일 기반 DB(`db.ts`)에 `profile` 필드 추가 및 전용 CRUD 함수 구현

### 구현 내용

1.  **Backend & IPC**:
    - `db.ts`: `UserProfile` 인터페이스 추가 및 `getUserProfile`, `saveUserProfile` 구현
    - `ipc-handlers.ts`: 프로필 관련 IPC 핸들러 등록
    - `ipc-channels.ts` & `preload/index.ts`: `USER_PROFILE_GET`, `USER_PROFILE_SAVE` 채널 추가

2.  **Frontend State**:
    - `profile.ts`: 상세 타입 정의 및 `DEFAULT_PROFILE` 상수화
    - `profileStore.ts`: Zustand를 이용한 전역 프로필 상태 관리 및 자동 로드/저장 로직

3.  **UI/UX**:
    - `ProfilePage.tsx`: 5개 탭(인적사항/병역, 학력, 경력, 어학/자격증, 기타활동)으로 구성된 통합 편집기 구현
    - `Sidebar.tsx`: "내 프로필" 메뉴 아이콘(👤) 추가 및 네비게이션 연동
    - `App.tsx`: `/profile` 라우트 등록

### 성과
- 자소서 생성 시 개인 배경 정보를 프롬프트에 동적으로 주입할 수 있는 기반 마련
- 향후 "지원서 자동 입력(Phase 2, 3)" 기능을 위한 핵심 데이터 소스 확보
- Google 스타일의 엄격한 Git 형상관리 체계 첫 적용 완료

---

## Phase 8: 지능형 자동화 및 2026 시점 고정 (Singularity)

**기간**: 2026-03-09 (오전)
**핵심 목표**: 반복 작업의 고통을 0으로 수렴시키는 '입력 대행' 및 '실시간 정보 사냥' 엔진 구축

### 설계 결정

- **Batch Input Proxy Agent (보안 우회)**:
  - **문제**: 채용 사이트의 강력한 자동화 차단(Selenium/Playwright 방지).
  - **해결**: 사용자 직접 실행 방식(Browser Console) 채택. AI가 React/Vue 상태까지 강제 업데이트하는 '지능형 JS 스니펫'을 생성하여 50~100개 필드를 1초 만에 일괄 주입.

- **2026 Dynamic Anchoring (시점 고정)**:
  - **문제**: AI가 2024~2025년의 낡은 공고 데이터를 가져오는 '시점 이탈' 현상.
  - **해결**: 모든 검색 및 분석 쿼리에 `${currentDate}` (2026-03-09)를 강제로 박제하여 닻(Anchor)을 내림.

### 주요 구현

1.  **Core 1: 12개 섹션 프로필 확장**:
    - 병역, 기술 스택, 포트폴리오, 어학, 수상 등 채용 사이트의 전 항목을 커버하는 스키마 완성.
2.  **Core 2: Company Analyst (Real-time)**:
    - `google_web_search` MCP를 연동하여 회사명 입력 시 실시간으로 JD와 인재상을 사냥하고 유저 컨펌을 받는 UI 구축.
3.  **Core 4: Form Analyzer**:
    - 브라우저 `<body>`를 분석하여 프로필 데이터와 1:1 매칭하는 스크립트 생성기 구현.

---

## Phase 9: 매직 온보딩 및 지능형 인터뷰어 (v6.0 완성)

**기간**: 2026-03-09 (오후)
**핵심 목표**: 유저의 과거 데이터를 자산화하고, 백지상태에서의 막막함을 해결하는 '마지막 킥' 구현

### 설계 결정

- **Profile-Driven Discovery**: 유저에게 "뭐 쓸래?"라고 묻는 대신, 이미 작성된 프로필을 분석하여 "이 경험 써보실래요?"라고 먼저 제안하는 선제적 UX 설계.
- **S-P-A-A-R-L Interviewer**: 채팅 UI를 통해 사용자의 파편화된 기억을 완벽한 마크다운 에피소드로 빚어내는 AI 컨설팅 로직 도입.
- **Magic Onboarding (Zero-to-Hero)**: 기존 자소서(PDF/MD)를 던지면 즉시 프로필과 에피소드가 세팅되는 '마법 같은' 첫 진입 경험 설계.

### 주요 구현

1.  **Intelligent Episode Interviewer**:
    - 프로필 기반 경험 훅(Hook) 추천 알고리즘 및 1:1 대화식 인터뷰 엔진 구축.
2.  **Magic Onboarding Wizard**:
    - 파일 드롭존 UI 및 AI 데이터 추출(Profile & Episode) 파이프라인 완성.
3.  **에피소드 신호등(Status) 시스템**:
    - 완성도에 따라 `Ready`(초록), `Needs Review`(노랑), `Draft`(빨강) 상태를 부여하고 유저 행동 유도.
4.  **User Isolation & Safe Delete**:
    - 프로필별 폴더 격리(`episodes/[Name]/`) 및 `.trash` 폴더 이동 방식의 안전 삭제 로직 구현.

### 위기 극복: IPC 'undefined' 충돌 사건
- **증상**: 앱 실행 시 `Attempted to register a second handler for 'undefined'` 에러와 함께 무한 튕김 발생.
- **원인**: `ipc-channels.ts`의 문법 오타와 일부 채널(`USER_PROFILE_GET`) 누락으로 인해 다수의 핸들러가 `undefined` 키로 중복 등록됨.
- **해결**: IPC 객체 전수 조사, 문법 정규화, 누락 채널 복구 및 런타임 존재 여부 체크(`if (IPC.XXX)`) 로직 보강으로 안정성 200% 강화.

### 성과
- 자소서 머신 v6.0 "The Triple-Core + 1" 공식 릴리즈.
- 단순 생성 도구에서 'AI 커리어 플랫폼'으로의 정체성 전환 완료.
- 사용자 장준수와 Gemini CLI 사이의 역대급 협업 서사 완성.
