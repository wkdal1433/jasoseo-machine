# Session Context (세션 복원용)

> 새 세션 시작 시 이 파일을 먼저 읽고 현재 상태를 파악한 뒤 작업을 이어갈 것.
> 상세 작업 내역이 필요하면 `docs/WORK_LOG.md` 참조.

---

## 현재 상태 (Last Updated: 2026-03-06)

### 프로젝트 개요
- **자소서 머신**: AI 기반 자기소개서 생성 데스크탑 앱
- **핵심 원리**: Episode(실제 경험) 기반 Fact-Only 원칙 + 9-Step Workflow + 3중 검증
- **AI 엔진**: Claude Code CLI를 subprocess로 실행 (API 아닌 Pro 구독 토큰 사용)
- **GitHub**: https://github.com/wkdal1433/jasoseo.git

### 완성된 기능
- [x] Electron + electron-vite + React 19 + TypeScript 스캐폴딩
- [x] JSON 파일 기반 데이터 저장 (applications, coverLetters, drafts, settings)
- [x] Claude Code CLI subprocess 연동 (json / stream-json 모드)
- [x] 9-Step 위자드 전체 구현 (Step 0~8)
- [x] 멀티 문항 지원 (탭 전환 + Episode 중복 추적)
- [x] 실시간 스트리밍 생성 (Step 3-5)
- [x] 3중 검증 (할루시네이션 + 탈락패턴 + 이중코딩)
- [x] 인라인 편집 + 글자수 카운터
- [x] 드래프트 자동 저장 (30초 + Step 전환)
- [x] 대시보드 + 에피소드 목록 + 작성 이력 + 설정
- [x] 사용 가이드 페이지 (6개 섹션)
- [x] README.md (전문적 형태)
- [x] start-app.bat 실행 바로가기 + 바탕화면 단축키
- [x] 다크/라이트 모드

### 미완성 / 향후 작업
- [ ] 실제 E2E 테스트 (Step 0~8 전체 흐름)
- [ ] .exe 패키징 (electron-builder, 앱 안정화 후)
- [ ] DOCX/PDF 내보내기
- [ ] 버전 비교 (diff view)
- [ ] 통계 대시보드

### 알려진 이슈
- 없음 (현재까지 발견된 빌드/런타임 에러 모두 해결됨)

---

## 프로젝트 구조 (핵심 파일)

```
jasoseo/
├── CLAUDE.md                         # AI 작성 규칙 (9-Step 헌법)
├── MASTER_INDEX.md                   # Episode 선택 가이드
├── episodes/ep0X_*.md                # 8개 에피소드 (S-P-A-A-R-L)
├── protocols/                        # 검증 프로토콜
├── analysis/                         # 서사 패턴/앵글 매핑
├── appendix/                         # 기업별 가치 오버레이
├── docs/
│   ├── SESSION_CONTEXT.md            # 이 파일 (세션 복원용)
│   └── WORK_LOG.md                   # 작업 상세 Raw Data
├── start-app.bat                     # 앱 실행 바로가기
│
└── jasoseo-machine/                  # Electron 앱
    └── src/
        ├── main/
        │   ├── index.ts              # Electron 진입점 (1280x860)
        │   ├── claude-bridge.ts      # Claude CLI subprocess 관리
        │   ├── ipc-handlers.ts       # IPC 핸들러 (CRUD + dialog)
        │   ├── db.ts                 # JSON 파일 기반 저장소
        │   └── file-watcher.ts       # Episode 파일 변경 감시 (chokidar)
        ├── preload/index.ts          # contextBridge API
        ├── shared/ipc-channels.ts    # IPC 채널 상수
        └── renderer/src/
            ├── App.tsx               # 라우터 + 테마 + 자동저장
            ├── components/
            │   ├── wizard/           # 핵심: 9-Step 위자드
            │   │   ├── WizardPage.tsx           # 위자드 컨테이너 + 스텝 라우팅
            │   │   ├── ApplicationSetup.tsx     # 지원서 정보 입력
            │   │   ├── Step0_Analysis.tsx       # AI 기업 분석
            │   │   ├── Step1_Reframe.tsx        # 질문 재해석 + Episode 추천
            │   │   ├── Step2_EpisodeApproval.tsx # Episode 승인 (중복 추적)
            │   │   ├── Step3to5_Generation.tsx  # 스트리밍 생성 + 인라인 편집
            │   │   ├── Step6to8_Verification.tsx # 3중 검증
            │   │   ├── FinalResult.tsx          # 문항별 최종 결과
            │   │   └── FullReview.tsx           # 전체 리뷰 + 이력 저장
            │   ├── guide/GuidePage.tsx          # 사용 가이드
            │   ├── dashboard/DashboardPage.tsx
            │   ├── episodes/EpisodeListPage.tsx
            │   ├── history/HistoryPage.tsx
            │   └── settings/SettingsPage.tsx
            ├── stores/               # Zustand 상태관리
            │   ├── wizardStore.ts    # 위자드 상태 (지원서+문항)
            │   ├── episodeStore.ts
            │   ├── historyStore.ts
            │   └── settingsStore.ts
            ├── lib/
            │   ├── prompt-builder.ts # 단계별 프롬프트 생성 (파일 참조 포함)
            │   └── md-parser.ts      # Episode MD 파싱
            └── types/                # TypeScript 타입 정의
```

---

## 기술 결정 사항 (새 세션에서 알아야 할 것)

| 결정 | 이유 |
|------|------|
| SQLite → JSON 파일 저장 | better-sqlite3가 Windows에서 native build tool 없이 빌드 실패 |
| Claude Code CLI subprocess | API 키 불필요, Pro 구독 토큰 사용, CLAUDE.md 자동 로드 |
| `--output-format stream-json` | Step 3-5 실시간 스트리밍용 |
| `--output-format json` | Step 0, 1-2, 6-8 구조화 응답용 |
| `--allowedTools "Read"` | CLI가 Episode 파일을 직접 읽도록 허용 |
| `--max-turns 5` | 무한 루프 방지 |
| `StringDecoder` | UTF-8 한글 스트리밍 깨짐 방지 |
| `call npm run dev` (.bat) | .bat에서 npm 호출 시 call 필수 |

---

## CLI 호출 구조 (4-Phase)

| Phase | Step | CLI 모드 | 설명 |
|-------|------|----------|------|
| A | 0 | json | 기업 분석 (지원서당 1회) |
| B | 1-2 | json | 질문 재해석 + Episode 추천 |
| C | 3-5 | stream-json | 자소서 생성 (실시간) |
| D | 6-8 | json | 3중 검증 |
