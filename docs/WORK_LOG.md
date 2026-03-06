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

## Phase 6: 작업 기록 체계 구축

**기간**: 2026-03-06

### 3-Tier 문서 구조 수립

```
CLAUDE.md → docs/SESSION_CONTEXT.md → docs/WORK_LOG.md
(포인터)     (세션 복원용 요약)          (상세 Raw Data)
```

- `SESSION_CONTEXT.md`: 현재 상태, 완성 기능, 프로젝트 구조, 기술 결정 사항
- `WORK_LOG.md`: Phase별 상세 작업, 시행착오, 에러 해결 과정 (이 파일)
- `CLAUDE.md`: 세션 시작 시 SESSION_CONTEXT.md를 읽으라는 지시 추가
