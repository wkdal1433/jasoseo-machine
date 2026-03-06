# jasoseo - AI Cover Letter Machine

> S급 합격 자소서 패턴을 기반으로 서류 합격률을 최적화하는 데스크탑 앱

---

## Overview

**자소서 머신(jasoseo-machine)**은 실제 경험 데이터(Episode)를 기반으로 채용공고를 분석하고, 9-Step Workflow를 통해 검증된 자기소개서를 생성하는 Electron 데스크탑 앱입니다.

Claude Code CLI를 활용하여 AI가 기업의 HR 의도를 파악하고, 사용자의 실제 경험만으로 합격 가능성이 높은 자소서를 작성합니다. 모든 생성 결과는 3중 검증(할루시네이션 방지, 탈락 패턴 제거, 이중 코딩)을 거쳐 품질을 보장합니다.

### Key Features

- **9-Step 자동화 워크플로우**: 기업 분석부터 최종 검증까지 단계별 가이드
- **Episode 기반 Fact-Only 원칙**: 경험에 없는 내용은 절대 생성하지 않음
- **실시간 스트리밍 생성**: AI가 자소서를 작성하는 과정을 실시간으로 확인
- **멀티 문항 지원**: 하나의 지원서에 여러 문항을 등록하고 탭으로 관리
- **3중 검증 시스템**: 할루시네이션 방지 / 탈락 패턴 제거 / 이중 코딩 검증
- **Episode 중복 추적**: 같은 지원서 내 Episode 사용 횟수를 자동 관리
- **자동 저장 & 이력 관리**: 30초마다 드래프트 자동 저장, 지원서별 이력 추적
- **다크/라이트 모드**: 사용 환경에 맞는 테마 지원

---

## Tech Stack

| 구분 | 기술 |
|------|------|
| **Framework** | Electron + electron-vite |
| **Frontend** | React 19 + TypeScript |
| **상태관리** | Zustand |
| **스타일링** | Tailwind CSS |
| **UI 컴포넌트** | Radix UI |
| **마크다운** | react-markdown + remark-gfm |
| **데이터 저장** | JSON (로컬 파일) |
| **파일 감시** | chokidar |
| **AI 엔진** | Claude Code CLI (subprocess) |

---

## Prerequisites

- **Node.js** 18 이상
- **Claude Code CLI** 설치 및 인증

```bash
# Claude Code CLI 설치
npm install -g @anthropic-ai/claude-code

# 로그인 (Pro 구독 필요)
claude auth
```

---

## Installation

```bash
# 저장소 클론
git clone https://github.com/wkdal1433/jasoseo.git
cd jasoseo/jasoseo-machine

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 프로덕션 빌드
npm run build
```

---

## Project Structure

```
jasoseo/
│
├── CLAUDE.md                    # AI 작성 규칙 (9-Step 헌법)
├── MASTER_INDEX.md              # Episode 선택 가이드
├── raw_experience.md            # 원자적 경험 데이터
│
├── episodes/                    # S-P-A-A-R-L 구조 경험 파일
│   ├── ep01_gaussian_splatting.md
│   ├── ep02_dayscript.md
│   ├── ep03_data_quality.md
│   ├── ep04_mediapolytech.md
│   ├── ep05_umc_leadership.md
│   ├── ep06_nuzzle.md
│   ├── ep07_media_interactive.md
│   └── ep08_ai_club.md
│
├── protocols/                   # 검증 프로토콜
│   ├── ANTI_HALLUCINATION.md    # 할루시네이션 방지 (7개 Hard Gate)
│   └── FAIL_PATTERNS.md         # 탈락 패턴 체크리스트 (9개 패턴)
│
├── analysis/                    # 분석 자료
│   ├── generic_storytelling_patterns.md  # 서사 패턴 (이중코딩, 질문재해석 등)
│   ├── angle_shifting_map.md            # 앵글 전환 매핑
│   └── company_story_fit.md             # 기업-스토리 적합도
│
├── appendix/                    # 부록
│   └── APPENDIX_C_COMPANY_VALUES.md     # 기업별 가치 오버레이
│
└── jasoseo-machine/             # Electron 데스크탑 앱
    ├── package.json
    ├── electron.vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.*.json
    └── src/
        ├── main/                # Electron Main Process
        │   ├── index.ts         # 앱 진입점
        │   ├── claude-bridge.ts # Claude CLI subprocess 관리
        │   ├── ipc-handlers.ts  # IPC 채널 핸들러
        │   ├── db.ts            # JSON 파일 기반 데이터 저장
        │   └── file-watcher.ts  # Episode 파일 변경 감시
        │
        ├── preload/
        │   └── index.ts         # contextBridge API
        │
        ├── shared/
        │   └── ipc-channels.ts  # IPC 채널 상수
        │
        └── renderer/            # React Frontend
            └── src/
                ├── App.tsx
                ├── components/
                │   ├── layout/      # Sidebar, Header, Layout
                │   ├── dashboard/   # 대시보드 (홈)
                │   ├── wizard/      # 9-Step 위자드 (핵심)
                │   ├── episodes/    # 에피소드 목록
                │   ├── history/     # 작성 이력
                │   ├── settings/    # 설정
                │   ├── guide/       # 사용 가이드
                │   └── common/      # 공용 컴포넌트
                ├── stores/          # Zustand 상태 관리
                ├── hooks/           # 커스텀 훅
                ├── lib/             # 유틸리티
                └── types/           # TypeScript 타입
```

---

## 9-Step Workflow

자소서 머신의 핵심 워크플로우입니다.

### Step 0: 기업 전략 해석
채용공고를 분석하여 HR이 진짜 원하는 인재상을 파악합니다.
- HR 의도 2개 도출 (Execution / Growth / Stability / Communication)
- 지원서당 1회 실행

### Step 1: 질문 재해석
채용담당자의 진짜 의도를 파악하여 자소서 문항을 재정의합니다.

### Step 2: Episode + 앵글 승인
AI가 추천한 Episode와 서술 앵글을 사용자가 확인하고 승인합니다.
- **승인 없이는 작성이 시작되지 않습니다**
- 다른 문항과의 Episode 중복 사용을 실시간 추적

### Step 3-5: 자소서 생성
승인된 Episode를 기반으로 자소서를 실시간 스트리밍으로 생성합니다.
- Step 3: 두괄식 도입부 + 소제목
- Step 4: 본문 전개 (S-P-A-A-R-L 구조)
- Step 5: 마무리 문단 (역량 재확인 + 기업 가치 연결)

### Step 6: 할루시네이션 검증
Episode에 없는 정보가 포함되지 않았는지 7개 항목을 검증합니다.

### Step 7: 탈락 패턴 검증
S급 합격 자소서에서 도출된 9개 탈락 패턴을 검증합니다.

### Step 8: 이중 코딩 검증
소제목부터 마무리까지 '내 행동 + 회사 가치'가 이중 코딩되어 있는지 확인합니다.

---

## Core Principles

### Episode = Single Source of Truth

```
Episode에 존재하지 않는 경험 = 사용 불가
```

- Episode 파일에 명시된 내용만 자소서에 사용
- 추론, 유추, 맥락 보완 전면 금지
- 고유명사, 수치, 기간은 원본과 글자 단위로 일치

### S-P-A-A-R-L 구조

모든 Episode는 다음 구조로 정리됩니다:

| 구분 | 내용 |
|------|------|
| **S** - Situation | 프로젝트/활동의 배경과 맥락 |
| **P** - Problem | 직면한 핵심 문제나 과제 |
| **A** - Analysis | 문제 분석 과정과 판단 근거 |
| **A** - Action | 구체적으로 수행한 행동과 노력 |
| **R** - Result | 정량적/정성적 성과 |
| **L** - Learning | 경험에서 얻은 교훈과 성장 |

### Strict Prohibitions

| 금지 항목 | 이유 |
|----------|------|
| Episode 합쳐서 쓰기 | 경험 진정성 훼손 |
| 없는 성과 만들기 | 면접에서 검증 불가 |
| 기술 스택 나열 | HR이 원하는 건 행동 |
| 승인 없이 바로 작성 | 방향 오류 시 재작성 비용 |
| 동일 Episode 2회 초과 사용 | 경험 다양성 부족 |

---

## Usage

### 1. 초기 설정

1. 앱 실행 후 좌측 메뉴에서 **설정** 클릭
2. **Claude Code CLI 경로** 확인 (기본: `claude`)
3. **프로젝트 디렉토리** 설정 (이 저장소의 루트 경로)
4. **연결 테스트** 버튼으로 CLI 정상 작동 확인

### 2. 새 지원서 작성

1. 좌측 메뉴에서 **새 지원서** 클릭
2. 기업명, 직무명, 채용공고 전문 입력
3. 자소서 문항 등록 (1~N개, 각 문항별 글자수 제한 설정)
4. 작성 전략 선택 (Conservative / Balanced / Aggressive)
5. **AI 분석 시작** 클릭

### 3. 단계별 진행

- Step 0 완료 후 각 문항별로 Step 1~8 진행
- 상단 탭으로 문항 간 전환
- 생성 중 실시간 미리보기 + 인라인 편집
- 검증 실패 시 편집 후 재검증

### 4. 결과 저장

- 모든 문항 완료 후 전체 리뷰 화면에서 확인
- 클립보드 복사 (문항별 / 전체)
- 이력에 저장하여 추후 참조

---

## Architecture

### Claude Code CLI Integration

자소서 머신은 API가 아닌 **Claude Code CLI를 subprocess로 실행**합니다.

```
Electron Main Process
  └─ spawn("claude", ["-p", prompt, "--output-format", mode])
       └─ stdout → stream parsing → IPC → React UI
```

| Phase | Step | CLI 모드 | 설명 |
|-------|------|----------|------|
| A | 0 | json | 기업 분석 (지원서당 1회) |
| B | 1-2 | json | 질문 재해석 + Episode 추천 |
| C | 3-5 | stream-json | 자소서 생성 (실시간 스트리밍) |
| D | 6-8 | json | 3중 검증 |

### Data Flow

```
episodes/*.md → chokidar 감시 → IPC → React 에피소드 목록
     │
     └─ Claude CLI가 직접 읽음 (--allowedTools "Read")
           │
           └─ 생성 결과 → 3중 검증 → 저장 (JSON)
```

### Local Storage

모든 데이터는 Electron의 userData 디렉토리에 JSON 파일로 저장됩니다:
- 지원서 (applications)
- 자소서 (cover letters)
- 드래프트 (auto-save)
- 설정 (settings)

---

## Episode 추가 방법

새로운 경험을 Episode로 추가하려면:

1. `episodes/` 폴더에 새 `.md` 파일 생성
2. 기존 Episode 파일의 형식을 참고하여 작성
3. S-P-A-A-R-L 구조를 반드시 포함
4. 앱이 자동으로 변경을 감지하여 목록 갱신

```markdown
# Episode 09. [프로젝트명]

| 항목 | 내용 |
|------|------|
| **프로젝트명** | ... |
| **기간** | YYYY.MM ~ YYYY.MM |
| **역할** | ... |
| **기술 스택** | ... |

## S - Situation
...

## P - Problem
...

## A - Analysis
...

## A - Action
...

## R - Result
...

## L - Learning
...
```

---

## Scripts

```bash
# 개발 모드 (Hot Reload)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

---

## Troubleshooting

| 증상 | 해결 방법 |
|------|----------|
| 연결 테스트 실패 | CLI 경로 확인, `claude auth` 재로그인 |
| 생성 중 오류 | Pro 구독 토큰 한도 확인, 채용공고 길이 축소 |
| Episode 목록 빈 화면 | 프로젝트 디렉토리 설정 확인 |
| 한글 깨짐 | StringDecoder로 UTF-8 처리 (내장) |
| 빌드 실패 | `node_modules` 삭제 후 `npm install` 재시도 |

---

## License

Private repository. All rights reserved.

---

## Author

wkdal1433
