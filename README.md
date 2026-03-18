<p align="center">
  <img src="https://via.placeholder.com/150x150.png?text=Jasoseo+Machine+Logo" width="120" alt="Jasoseo Machine Logo" />
</p>

<h1 align="center">자소서 머신 (Jasoseo Machine)</h1>

<p align="center">
  <strong>"당신의 경험은 데이터가 되고, 데이터는 합격이 됩니다."</strong><br>
  S급 합격 자소서 패턴과 AI 엔진을 결합한 지능형 자기소개서 생성 및 자동 제출 솔루션
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI--Engine-Gemini%20%26%20Claude-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Platform-Electron-lightgrey?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-Non--Commercial-red?style=for-the-badge" />
</p>

---

## 📺 Demo Showcase
> **[여기에 앱의 핵심 작동 GIF 또는 메인 대시보드 고화질 스크린샷을 삽입하세요]**
> *추천: 앱이 실행되고 자소서가 실시간으로 스트리밍되며 생성되는 800px 너비의 GIF*

---

## ⚠️ Prerequisites & Disclaimers
본 프로젝트를 사용하기 전에 아래 사항을 반드시 확인해 주세요.

1. **AI 서비스 구독 필수**: 자소서 머신은 외부 AI 엔진을 호출하여 작동합니다. 유저는 **Gemini CLI** 및 **Claude Code CLI**를 사용할 수 있는 유효한 API 키 또는 구독 권한을 보유해야 합니다.
2. **GPT 모델 미지원**: 현재 개발자 환경(GPT 미구독) 문제로 GPT 엔진은 테스트 및 지원이 불가능한 상태입니다.
3. **로컬 환경 의존성**: 본 툴은 유저의 로컬 환경에서 직접 AI를 호출합니다. Node.js 버전, CLI 설치 상태, MCP 설정 등 개별 로컬 환경에 따라 작동이 원활하지 않을 수 있습니다.
4. **1인 개발 프로젝트**: 본 툴은 1인 개발로 진행되는 오픈소스 프로젝트입니다. 예기치 못한 버그가 발생할 수 있으며, 상업적 이용 및 소스 도용은 엄격히 금지됩니다.

---

## ✨ Key Features

### 🤖 Dual AI Engine Support
구글의 **Gemini 2.0/3.0**과 앤스로픽의 **Claude Code**를 모두 지원합니다. 각 문항의 성격에 따라 최적의 AI 모델을 스위칭하며 답변의 품질을 극대화할 수 있습니다.

### 💎 S-Tier Paragraph Patterns
단순한 문장 생성이 아닙니다. 85% 이상의 서류 합격률을 기록한 S급 자소서의 **이중 코딩(Double Coding)** 기법과 **S-P-A-A-R-L 구조**를 AI가 엄격히 준수하여 작성합니다.

### 🎙️ Intelligent Onboarding
내 이력서를 업로드하기만 하세요. AI가 당신의 모든 프로젝트를 분석하고, 부족한 부분은 **대화형 인터뷰**를 통해 끄집어내어 완벽한 에피소드 라이브러리를 구축합니다.

### 🔌 Chrome Automation Integration
작성된 자소서를 복사-붙여넣기 할 필요가 없습니다. 내장된 **브릿지 서버와 크롬 확장 프로그램**이 채용 사이트의 입력 폼을 자동으로 감지하고 클릭 한 번으로 내용을 채워 넣습니다.

---

## 🛠 User Guide Index
처음 방문하셨나요? 아래 가이드를 순서대로 따라오시면 단 10분 만에 첫 자소서를 완성할 수 있습니다.

| 단계 | 가이드 제목 | 주요 내용 |
| :--- | :--- | :--- |
| **Step 1** | [🚀 환경 설정 및 설치](./docs/USER_GUIDE_PART1_2.md) | CLI 설치 및 앱-AI 연결 |
| **Step 2** | [🛡️ 나의 무기 만들기](./docs/USER_GUIDE_PART3.md) | 이력서 기반 경험 데이터화 |
| **Step 3** | [🧙‍♂️ 자소서 생성 및 자동 제출](./docs/USER_GUIDE_PART4_5.md) | 위저드 활용 및 크롬 연동 |

---

## 🏗 Tech Stack
- **Frontend**: React 19, Tailwind CSS, Zustand, Lucide Icons
- **Backend**: Electron, Node.js (Main Process), Express (Bridge Server)
- **AI Core**: Gemini CLI (Google), Claude Code CLI (Anthropic)
- **Automation**: WebSocket Bridge, Chrome Extension (Manifest v3)

---

## 📜 License
본 프로젝트는 **비영리 목적(Non-Commercial)**의 개인적 사용 및 학습용으로만 배포됩니다. 저작권자의 서면 동의 없는 상업적 이용, 유료 서비스화, 코드 도용 및 재배포를 엄격히 금지합니다. 상세 내용은 [LICENSE](./LICENSE) 파일을 확인해 주세요.

---

## 🤝 How to Contribute
여러분의 기여는 환영하지만, 본 프로젝트의 라이선스 정책을 준수해야 합니다. 자세한 절차는 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참조해 주세요.

---

<p align="center">
  Developed with ❤️ for all job seekers in the AI Era.
</p>
