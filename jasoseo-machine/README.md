<div align="center">

# 자소서 머신 (Jasoseo Machine)

**AI 기반 자기소개서 자동 생성 데스크탑 앱**

*당신의 실제 경험을 기반으로, S급 합격 자소서를 자동으로 작성합니다.*

[![License](https://img.shields.io/badge/license-Proprietary%20Non--Commercial-red)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-blue)](package.json)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

<br/>

<!-- HERO IMAGE: 앱 메인 대시보드 스크린샷 -->
<!-- 권장 해상도: 1280×800, 앱 실행 직후 대시보드 전체 화면 캡처 -->
<!-- <img src="docs/images/hero.png" alt="자소서 머신 메인 화면" width="800"/> -->

</div>

---

## 핵심 기능

### 1. 매직 온보딩 — PDF 한 장으로 에피소드 자동 추출

이력서 / 자소서 PDF를 업로드하면, AI가 면접관 시각으로 경험을 분석해 **S-P-A-A-R-L 구조의 에피소드**로 자동 변환합니다.

<!-- GIF: PDF 드래그 드롭 → 로딩 → 에피소드 카드 생성 (10~15초 분량) -->
<!-- <img src="docs/images/onboarding.gif" alt="매직 온보딩" width="700"/> -->

### 2. 스마트 URL 모드 — 채용공고 자동 수집

지원사이트 URL만 붙여넣으면 AI가 **채용공고·자소서 문항·인재상**을 자동으로 파악합니다.

<!-- GIF: URL 입력 → 공고 자동 분석 → 문항 목록 표시 -->
<!-- <img src="docs/images/smart-mode.gif" alt="스마트 URL 모드" width="700"/> -->

### 3. 9단계 AI 파이프라인 — 실시간 스트리밍 자소서 생성

기업 전략 해석 → 질문 재해석 → 에피소드 매칭 → S-P-A-A-R-L 구조 작성 → **3중 검증** (할루시네이션/탈락패턴/이중코딩)

<!-- GIF: Step 3-5 스트리밍 생성 화면 (재밌는 멘트 로테이션 + 진행 바 포함) -->
<!-- <img src="docs/images/generation.gif" alt="AI 생성 파이프라인" width="700"/> -->

### 4. Chrome 확장 자동 입력 — 채용 사이트 원클릭 제출

완성된 자소서를 Chrome 확장 프로그램이 채용 사이트 텍스트박스에 **자동으로 채워줍니다**.

<!-- GIF: 앱에서 전송 → Chrome 확장이 폼 자동 채움 -->
<!-- <img src="docs/images/extension.gif" alt="Chrome 확장 자동 입력" width="700"/> -->

---

## 전체 워크플로우

```
[1단계] 프로필 설정 (최초 1회)
  PDF/DOCX 업로드 → AI 에피소드 자동 추출
  에피소드 발굴 마법사: AI 인터뷰 → S-P-A-A-R-L 구조로 완성

       ↓

[2단계] 지원서 작성
  회사명 + 직무 + 자소서 URL 입력 (스마트 모드)
  Step 0: 기업 리서치 → HR 의도 분석 + 전략 수립
  Step 1~2: 질문 재해석 + 에피소드 매칭
  Step 3~5: AI 실시간 스트리밍 생성 (S-P-A-A-R-L)
  Step 6~8: 3중 검증 (할루시네이션/탈락패턴/이중코딩)
  → 완성된 자소서 → 인라인 편집 / Surgical Edit

       ↓

[3단계] 자동 제출
  Chrome 확장 → 채용 사이트 자소서 폼 자동 입력
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Desktop | Electron 34 |
| Frontend | React 19 + TypeScript 5.7 + Tailwind CSS |
| State | Zustand |
| AI Engine | Gemini CLI (기본값) / Claude CLI (고부하 단계) |
| Storage | JSON 파일 기반 DB |
| Build | electron-vite v3 + Vite v6 |
| Extension | Chrome Extension (Manifest V3) |

> **API 키 불필요** — Gemini Advanced / Claude Pro 구독 토큰을 CLI subprocess로 활용합니다.

---

## 시작하기

### 사전 요구사항

- Node.js 18+
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) 글로벌 설치 + Gemini Advanced 구독

```bash
# Gemini CLI 설치
npm install -g @google/gemini-cli
gemini auth login
```

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/wkdal1433/jasoseo-machine.git
cd jasoseo-machine

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 프로덕션 빌드 (Windows)
npm run dist:win
```

### Chrome 확장 설치 (자동 입력 기능)

1. Chrome 주소창에 `chrome://extensions/` 입력
2. 우측 상단 **개발자 모드** 활성화
3. **압축해제된 확장 프로그램 로드** → `extension/` 폴더 선택

---

## 프로젝트 구조

```
jasoseo-machine/
├── src/
│   ├── main/                    # Electron 메인 프로세스
│   │   ├── index.ts             # 앱 진입점
│   │   ├── claude-bridge.ts     # AI CLI subprocess
│   │   ├── ipc-handlers.ts      # IPC 핸들러
│   │   ├── db.ts                # JSON 파일 저장소
│   │   └── automation/
│   │       ├── bridge-server.ts # Chrome 확장 연동 서버
│   │       └── form-analyzer.ts # 폼 필드 AI 분석
│   ├── renderer/src/
│   │   ├── components/
│   │   │   ├── wizard/          # 9단계 자소서 생성 위자드
│   │   │   ├── dashboard/       # 대시보드 + 매직 온보딩
│   │   │   ├── episodes/        # 에피소드 관리
│   │   │   ├── history/         # 작성 이력
│   │   │   ├── library/         # 라이브러리 (프로필/에피소드/패턴)
│   │   │   └── patterns/        # 합격 패턴 강화
│   │   └── stores/              # Zustand 상태 관리
│   └── preload/                 # Electron preload
├── extension/                   # Chrome 확장 프로그램
│   ├── content.js               # 폼 자동 입력 스크립트
│   ├── popup.html               # 확장 팝업 UI
│   └── popup.js
├── CLAUDE.md                    # AI 헌법 (9단계 프로토콜)
└── package.json
```

---

## 핵심 설계 원칙

### 절대 원칙: 에피소드 기반 작성

> 사용자의 **실제 경험(에피소드)**에 존재하지 않는 내용은 절대 사용하지 않습니다.

| 원칙 | 설명 |
|------|------|
| **Zero-Assumption** | 추론, 유추, 맥락 보완 전면 금지 |
| **Quote-Level Fidelity** | 고유명사·수치·기간은 원문 그대로 사용 |
| **S-P-A-A-R-L 구조** | Situation → Problem → Action → Achievement → Reflection → Learning |

### 이중 코딩 (Dual Coding)

모든 핵심 문장은 **내 이야기 (Code 1)** + **기업 가치 (Code 2)** 를 동시에 전달합니다.

---

## 라이센스

Copyright (c) 2026 장준수 (wkdal1433@gmail.com)

본 소프트웨어는 독점 비상업 라이센스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

- 허용: 개인 비상업적 사용
- 금지: 상업적 이용, 재배포, 역공학

---

## 문의

- **이메일**: wkdal1433@gmail.com
- **GitHub Issues**: [이슈 등록](https://github.com/wkdal1433/jasoseo-machine/issues)
