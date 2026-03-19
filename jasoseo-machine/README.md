<div align="center">

<img src="docs/images/logo.png" alt="자소서 머신" width="120"/>

# 자소서 머신

### AI가 당신의 실제 경험으로 자소서를 씁니다

자소서 머신은 이력서 PDF 한 장을 업로드하면 AI가 경험을 분석하고,<br/>
채용 공고를 자동 수집해 S급 자소서를 실시간으로 완성하는 **데스크탑 앱**입니다.

<br/>

[![License](https://img.shields.io/badge/license-Non--Commercial-orange?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-blue?style=flat-square)](package.json)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini_CLI-Advanced-8E75B2?style=flat-square&logo=google&logoColor=white)](https://github.com/google-gemini/gemini-cli)

<br/>

<!-- ============================================================ -->
<!-- HERO GIF: 앱 전체 워크플로우 30초 요약                         -->
<!-- 촬영: URL 입력 → 공고 분석 → 자소서 스트리밍 생성까지 한 번에  -->
<!-- 해상도: 1280×800, FPS: 24, 길이: 25~35초                      -->
<!-- 파일 위치: docs/images/hero.gif                               -->
<!-- ============================================================ -->
<img src="docs/images/hero.gif" alt="자소서 머신 데모" width="860"/>

<br/>
<br/>

[**다운로드**](https://github.com/wkdal1433/jasoseo-machine/releases) · [**사용 가이드**](#시작하기) · [**이슈 제보**](https://github.com/wkdal1433/jasoseo-machine/issues)

</div>

---

## 왜 자소서 머신인가?

> *"같은 경험인데 왜 어떤 자소서는 붙고 어떤 자소서는 떨어지는가?"*

합격 자소서와 탈락 자소서의 차이는 경험의 질이 아닙니다.<br/>
**기업의 언어로 번역되었는가**의 차이입니다.

자소서 머신은 당신의 실제 경험 그대로, HR이 원하는 구조와 언어로 변환합니다.

---

## 데모

### 1. 매직 온보딩 — PDF 한 장, 에피소드 자동 추출

이력서 PDF를 드래그하면 AI가 면접관 시각으로 경험을 분석해<br/>
**S-P-A-A-R-L 구조의 에피소드**로 자동 변환합니다. 추가 입력 불필요.

<!-- ============================================================ -->
<!-- GIF 1: 매직 온보딩                                            -->
<!-- 촬영: 대시보드 → "매직 온보딩" 클릭 → PDF 드래그 드롭          -->
<!--        → AI 처리 로딩 → 에피소드 카드 생성 화면               -->
<!-- 강조 포인트: PDF가 카드로 변환되는 순간                         -->
<!-- 해상도: 1280×800, 길이: 15~20초                               -->
<!-- 파일 위치: docs/images/onboarding.gif                        -->
<!-- ============================================================ -->
<img src="docs/images/onboarding.gif" alt="매직 온보딩 데모" width="860"/>

---

### 2. 스마트 URL 모드 — URL 하나로 채용공고 완전 분석

지원 사이트 URL만 붙여넣으면 AI가<br/>
**채용공고 · 자소서 문항 · 인재상**을 자동으로 수집합니다.

<!-- ============================================================ -->
<!-- GIF 2: 스마트 URL 모드                                        -->
<!-- 촬영: "새 지원서" → URL 입력 → "공고 자동 분석" 클릭           -->
<!--        → 로딩 → 문항 목록 자동 생성 확인                       -->
<!-- 강조 포인트: URL 하나에서 문항이 뚝딱 나오는 순간               -->
<!-- 해상도: 1280×800, 길이: 10~15초                               -->
<!-- 파일 위치: docs/images/smart-mode.gif                        -->
<!-- ============================================================ -->
<img src="docs/images/smart-mode.gif" alt="스마트 URL 모드 데모" width="860"/>

---

### 3. 실시간 스트리밍 생성 — 9단계 AI 파이프라인

기업 전략 해석 → 질문 재해석 → 에피소드 매칭 → 실시간 작성 → 3중 검증.<br/>
생성되는 글자 하나하나가 실시간으로 나타납니다.

<!-- ============================================================ -->
<!-- GIF 3: 자소서 실시간 생성                                      -->
<!-- 촬영: Step 1~2 에피소드 매칭 확인 → Step 3 생성 시작           -->
<!--        → 재밌는 멘트 로테이션 → 글자 스트리밍 → 완성            -->
<!-- 강조 포인트: 진행 바 + 글자수 카운터 + 스트리밍되는 자소서        -->
<!-- 해상도: 1280×800, 길이: 20~30초 (생성 후반부 중심)             -->
<!-- 파일 위치: docs/images/generation.gif                        -->
<!-- ============================================================ -->
<img src="docs/images/generation.gif" alt="AI 생성 파이프라인 데모" width="860"/>

---

### 4. Chrome 확장 자동 입력 — 복사 붙여넣기도 필요 없다

완성된 자소서를 Chrome 확장이 채용 사이트 텍스트박스에<br/>
**원클릭으로 자동 입력**합니다.

<!-- ============================================================ -->
<!-- GIF 4: Chrome 확장 자동 입력                                   -->
<!-- 촬영: Full Review 화면 → "확장으로 전송" 클릭                  -->
<!--        → Chrome 채용사이트 → 확장 팝업 → "자동 입력" 클릭       -->
<!--        → 텍스트박스가 순식간에 채워지는 모습                    -->
<!-- 강조 포인트: 여러 문항이 한 번에 채워지는 클라이맥스 순간         -->
<!-- 해상도: 1280×800, 길이: 10~15초                               -->
<!-- 파일 위치: docs/images/extension.gif                         -->
<!-- ============================================================ -->
<img src="docs/images/extension.gif" alt="Chrome 확장 자동 입력 데모" width="860"/>

---

## 전체 플로우

```
① PDF 업로드
   └─ AI 자동 추출 → 에피소드 라이브러리 구축 (최초 1회)

② 채용 URL 입력
   └─ 공고 · 문항 · 인재상 자동 수집 (스마트 모드)
      또는 직접 붙여넣기 (오프라인 / 비공개 공고)

③ 9단계 AI 파이프라인 실행
   Step 0  기업 리서치 → HR 의도 분석 + 전략 수립
   Step 1  질문 재해석 → 기업 가치에 유리하게 재정의
   Step 2  에피소드 매칭 → 최적 경험 선택 + 각도 결정
   Step 3  두괄식 도입부 → 소제목 + 핵심 메시지
   Step 4  본문 전개 → S-P-A-A-R-L 구조
   Step 5  마무리 → 역량 재확인 + 기업 가치 연결
   Step 6  할루시네이션 검증
   Step 7  탈락 패턴 제거
   Step 8  이중 코딩 최종 검증

④ 완성 → 인라인 편집 or Surgical Edit
   └─ Chrome 확장으로 채용 사이트 자동 입력
```

---

## 시작하기

### 사전 요구사항

- **Node.js** 18+
- **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** — Gemini Advanced 구독 필요

```bash
# Gemini CLI 설치
npm install -g @google/gemini-cli
gemini auth login
```

> Claude CLI도 지원합니다 (`npm install -g @anthropic-ai/claude-code`, Claude Pro 구독)

### 설치

```bash
git clone https://github.com/wkdal1433/jasoseo-machine.git
cd jasoseo-machine
npm install
npm run dev
```

### Chrome 확장 설치

```
chrome://extensions/ → 개발자 모드 ON → 압축해제된 확장 프로그램 로드 → extension/ 폴더 선택
```

---

## 기술 스택

| | 기술 |
|--|------|
| **Runtime** | Electron 34 |
| **UI** | React 19 · TypeScript 5.7 · Tailwind CSS |
| **State** | Zustand |
| **AI** | Gemini CLI / Claude CLI (subprocess, API 키 불필요) |
| **Storage** | JSON 파일 기반 |
| **Build** | electron-vite v3 · Vite v6 |
| **Extension** | Chrome Manifest V3 |

---

## 핵심 원칙

> **Episode = 유일한 사실 원천**
>
> 에피소드에 없는 경험은 단 한 줄도 쓰지 않습니다.
> 추론, 유추, 맥락 보완 전면 금지. 고유명사·수치·기간은 원문 그대로.

---

## 라이센스

Copyright (c) 2026 장준수 — [LICENSE](LICENSE) 참조

개인 비상업적 사용만 허용. 상업적 이용, 재배포, 역공학 금지.

---

<div align="center">

문의: wkdal1433@gmail.com · [이슈 등록](https://github.com/wkdal1433/jasoseo-machine/issues)

</div>

---

<details>
<summary>📸 GIF 촬영 가이드 (기여자용)</summary>

### 준비사항
- 해상도: **1280 × 800** (앱 윈도우 크기 고정)
- 프레임: 24fps
- 형식: GIF (LossyGIF 권장, 4MB 이하)
- 저장 위치: `docs/images/`

### hero.gif (25~35초)
> 앱의 핵심 가치를 한 번에 보여주는 하이라이트 릴
1. 대시보드 화면에서 시작
2. "새 지원서" 클릭 → URL 입력 → 분석 로딩
3. Step 1~2 에피소드 매칭 확인
4. Step 3 생성 시작 → 스트리밍 (10초 분량)
5. 완성된 자소서 Full Review 화면으로 마무리

### onboarding.gif (15~20초)
> 매직 온보딩: PDF → 에피소드 카드
1. 대시보드 → "매직 온보딩" 버튼 클릭
2. PDF 파일 드래그 드롭
3. AI 처리 로딩 애니메이션
4. 에피소드 카드 목록 등장

### smart-mode.gif (10~15초)
> 스마트 URL: URL 1개 → 문항 자동 수집
1. ApplicationSetup → URL 입력 탭 선택
2. 채용 URL 붙여넣기
3. "공고 자동 분석" 클릭 → 로딩
4. 문항 목록 자동 생성 확인

### generation.gif (20~30초)
> 자소서 실시간 스트리밍 생성
1. Step 1~2: 에피소드 매칭 화면
2. "생성 시작" 클릭 → 재밌는 멘트 + shimmer
3. 첫 토큰 등장 → 글자 스트리밍
4. 상단 진행 바 + 글자수 카운터 포함

### extension.gif (10~15초)
> Chrome 확장 자동 입력
1. Full Review 화면 → "확장으로 전송" 클릭
2. Chrome으로 전환 → 채용사이트 열림
3. 확장 팝업 → "자동 입력" 클릭
4. 여러 텍스트박스가 순차적으로 채워짐

</details>
