<div align="center">

<!--
  [이미지 1] logo.png
  종류: AI 생성 (나노바나나)
  크기: 512×512 → 표시 96px
  내용: 기어 안에 문서 아이콘 + 상단 별 반짝임, 네이비-퍼플 그라데이션, 플랫 디자인
  나노바나나 프롬프트:
    "미니멀 플랫 앱 아이콘, 기어 안에 문서 아이콘, 상단에 작은 별 반짝임,
     네이비 투 퍼플 그라데이션, 흰 배경, 클린 테크 스타트업 스타일, 512×512"
  저장: jasoseo-machine/assets/images/logo.png
-->
<img src="assets/images/logo.png" alt="자소서 머신 로고" width="96"/>

# 자소서 머신

### 경험을 넣으면 합격 자소서가 나옵니다

자소서 머신은 당신의 경험 데이터를 원자재 삼아<br/>
채용 공고 수집 → AI 9단계 정제 → 채용 사이트 자동 제출까지<br/>
**완전 자동화된 자소서 생산 파이프라인**입니다.

<br/>

[![License](https://img.shields.io/badge/license-Non--Commercial-orange?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-blue?style=flat-square)](package.json)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini_CLI-Advanced-8E75B2?style=flat-square&logo=google&logoColor=white)](https://github.com/google-gemini/gemini-cli)

<br/>

<!--
  [이미지 2] hero-concept.png  ★ 가장 중요
  종류: AI 생성 (나노바나나)
  크기: 1280×540 → 표시 860px
  내용: 자소서 공장 이소메트릭 단면도
    - 왼쪽: 이력서 PDF/문서 스택이 컨베이어 벨트에 올라감
    - 중앙: 9개의 AI 처리 스테이션 (파란 홀로그램 패널들, 로봇 팔)
    - 오른쪽: 완성된 자소서 문서가 깔끔하게 출력됨
    - 오른쪽 구석: 작은 사람 실루엣이 팔짱 끼고 모니터 앞에 서있음
    - 분위기: 다크 (#0d1117), 네온 블루-퍼플 조명, 미래적이고 정밀한 공장
  나노바나나 프롬프트:
    "isometric automated factory interior cross-section illustration,
     left side: stack of PDF resume documents on conveyor belt,
     center: 9 AI processing stations with holographic blue panels and robotic arms,
     right side: finished polished documents coming out neatly,
     small human silhouette standing at monitor on the right watching,
     dark background #0d1117, neon blue purple lighting, clean tech minimal art style,
     no text, wide format 2:1 ratio"
  저장: jasoseo-machine/assets/images/hero-concept.png
-->
<img src="assets/images/hero-concept.png" alt="자소서 공장 — 자동화 파이프라인 개념도" width="860"/>

<br/>
<br/>

[**시작하기 →**](#시작하기) &nbsp;·&nbsp; [**사용 가이드**](guides/GUIDE_01_SETUP.md) &nbsp;·&nbsp; [**이슈 제보**](https://github.com/wkdal1433/jasoseo-machine/issues)

</div>

---

## 전체 파이프라인

<!--
  [이미지 3] pipeline-diagram.png
  종류: AI 생성 (나노바나나) 또는 Figma/Canva로 직접 제작
  크기: 1280×220 → 표시 860px
  내용: 수평 파이프라인 흐름도
    - 9개 원형 노드 (0~8번), 화살표로 연결
    - Step 0: 돋보기 아이콘 (기업 분석)
    - Step 1~2: 퍼즐 아이콘 (재해석/매칭)
    - Step 3~5: 연필 아이콘 (생성)
    - Step 6~8: 체크 아이콘 (검증)
    - 색상: 왼쪽 파랑 → 중앙 보라 → 오른쪽 초록으로 그라데이션
    - 다크 배경, 플랫 인포그래픽 스타일
  나노바나나 프롬프트:
    "horizontal pipeline infographic, 10 connected circular nodes numbered 0 to 8,
     arrows between nodes, left nodes blue, middle nodes purple, right nodes green,
     icons inside nodes (magnifier, puzzle, pencil, checkmark),
     dark background, flat modern infographic style, wide format, no text"
  저장: jasoseo-machine/assets/images/pipeline-diagram.png
-->
<img src="assets/images/pipeline-diagram.png" alt="9단계 AI 파이프라인" width="860"/>

```
원자재 투입                  AI 9단계 정제 공정                완성품 출하
────────────────────────────────────────────────────────────────────────
이력서/경험   →  [0]기업분석 → [1]질문재해석 → [2]에피소드매칭
              →  [3]도입부   → [4]본문S-P-A-A-R-L → [5]마무리
              →  [6]할루시네이션검증 → [7]탈락패턴제거 → [8]이중코딩검증
              →  완성된 자소서 → Chrome 확장 → 채용사이트 자동 입력
```

---

## 실제 동작 데모

<!--
  [이미지 4] hero.gif  ★ 두 번째로 중요
  종류: 앱 실제 화면 녹화
  크기: 표시 860px, 24fps, 25~35초
  촬영 순서:
    1. 대시보드 화면 (2초)
    2. "새 지원서" 클릭 → URL 입력창 (3초)
    3. 채용 URL 붙여넣기 → "공고 분석" 클릭 (3초)
    4. Step 0 기업 분석 결과 확인 (3초)
    5. Step 2 에피소드 매칭 카드 (3초)
    6. Step 3 생성 시작 → 재밌는 멘트 + shimmer (3초)
    7. 스트리밍 글자 (8~10초 — 핵심 장면)
    8. 완성된 Full Review 화면 (3초)
  저장: jasoseo-machine/assets/images/hero.gif
-->
<div align="center">
<img src="assets/images/hero.gif" alt="자소서 머신 전체 워크플로우 데모" width="860"/>
</div>

---

## 핵심 기능

<table>
<tr>
<td width="50%" valign="top">

### 매직 온보딩
이력서 PDF를 드래그하면 AI가 면접관 시각으로 경험을 분석해<br/>
**S-P-A-A-R-L 구조의 에피소드**로 자동 변환합니다.

**입력**: PDF / DOCX 파일 1개<br/>
**출력**: 구조화된 에피소드 카드 (즉시)

</td>
<td width="50%">

<!--
  [이미지 5] onboarding.gif
  종류: 앱 실제 화면 녹화
  크기: 표시 430px, 15~20초
  촬영 순서:
    1. 대시보드 → "매직 온보딩" 클릭
    2. 파일 드래그 드롭 (드래그 제스처 천천히)
    3. AI 처리 로딩 애니메이션 (3~5초)
    4. 에피소드 카드들 순차적으로 등장
  강조: PDF → 카드 변환되는 순간
  저장: jasoseo-machine/assets/images/onboarding.gif
-->
<img src="assets/images/onboarding.gif" alt="매직 온보딩 데모" width="430"/>

</td>
</tr>

<tr>
<td width="50%">

<!--
  [이미지 6] smart-mode.gif
  종류: 앱 실제 화면 녹화
  크기: 표시 430px, 10~15초
  촬영 순서:
    1. "새 지원서" → URL 탭 선택
    2. 채용 사이트 URL 붙여넣기 (천천히)
    3. "공고 자동 분석" 클릭
    4. 로딩 → 문항 목록 자동 생성
  강조: URL 1개에서 문항이 나타나는 순간
  저장: jasoseo-machine/assets/images/smart-mode.gif
-->
<img src="assets/images/smart-mode.gif" alt="스마트 URL 모드 데모" width="430"/>

</td>
<td width="50%" valign="top">

### 스마트 URL 모드
채용 사이트 URL 하나로<br/>
**공고 · 자소서 문항 · 인재상**을 자동 수집합니다.

복사 붙여넣기도 없습니다. URL만 넣으세요.

</td>
</tr>

<tr>
<td width="50%" valign="top">

### 실시간 스트리밍 생성
9단계 파이프라인이 돌아가는 동안<br/>
진행 상황을 실시간으로 확인할 수 있습니다.

생성 중에도 글자수·진행률·경과시간이 표시됩니다.

</td>
<td width="50%">

<!--
  [이미지 7] generation.gif
  종류: 앱 실제 화면 녹화
  크기: 표시 430px, 20~25초
  촬영 순서:
    1. Step 2 에피소드 매칭 확인 화면 (2초)
    2. "생성 시작" 클릭
    3. 재밌는 멘트 로테이션 + shimmer 바 (4초)
    4. 첫 글자 등장 → 스트리밍 (12~15초 핵심)
    5. 상단 진행 바 + 글자수 카운터 포함되도록
  강조: 글자가 촤르륵 채워지는 스트리밍 장면
  저장: jasoseo-machine/assets/images/generation.gif
-->
<img src="assets/images/generation.gif" alt="실시간 스트리밍 생성 데모" width="430"/>

</td>
</tr>

<tr>
<td width="50%">

<!--
  [이미지 8] extension.gif
  종류: 앱 실제 화면 녹화 (앱 + Chrome 분할 또는 Chrome만)
  크기: 표시 430px, 10~15초
  촬영 순서:
    1. Full Review 화면 → "확장으로 전송" 클릭 (2초)
    2. Chrome 채용 사이트 (빈 텍스트박스들)로 전환
    3. 확장 팝업 → "자동 입력" 클릭
    4. 텍스트박스들이 순차적으로 채워지는 클라이맥스 (6~8초)
  강조: 여러 빈칸이 한번에 채워지는 마지막 장면
  저장: jasoseo-machine/assets/images/extension.gif
-->
<img src="assets/images/extension.gif" alt="Chrome 확장 자동 입력 데모" width="430"/>

</td>
<td width="50%" valign="top">

### Chrome 확장 자동 입력
완성된 자소서를 복사도 없이<br/>
채용 사이트 폼에 **원클릭으로 자동 입력**합니다.

아이프레임·섀도우DOM 영역까지 침투합니다.

</td>
</tr>
</table>

---

## 스크린샷

<!--
  [이미지 9~12] 스크린샷 갤러리 (2×2 그리드)
  종류: 앱 실제 화면 캡처 (정적 PNG)
  크기: 각 430px

  dashboard.png
    화면: 앱 첫 실행 대시보드
    강조: 전체 레이아웃 (사이드바 4+2구조 + 대시보드 카드들)

  episodes.png
    화면: 에피소드 라이브러리 그리드
    강조: 에피소드 카드들 + HR 의도 태그 (Execution/Growth 등)

  step0.png
    화면: Step 0 기업 리서치 결과
    강조: 인재상 분석 + 에피소드 매칭도 패널

  result.png
    화면: Full Review 완성된 자소서
    강조: 완성된 문항들이 나열된 최종 결과물
-->

<table>
<tr>
<td width="50%" align="center">
<img src="assets/images/dashboard.png" alt="대시보드" width="430"/>
<br/><sub>대시보드</sub>
</td>
<td width="50%" align="center">
<img src="assets/images/episodes.png" alt="에피소드 라이브러리" width="430"/>
<br/><sub>에피소드 라이브러리</sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="assets/images/step0.png" alt="기업 리서치 (Step 0)" width="430"/>
<br/><sub>기업 리서치 분석</sub>
</td>
<td width="50%" align="center">
<img src="assets/images/result.png" alt="완성된 자소서 (Full Review)" width="430"/>
<br/><sub>완성된 자소서</sub>
</td>
</tr>
</table>

---

## 시작하기

### 사전 요구사항

- **Node.js** 18+
- **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** — Gemini Advanced 구독 필요

```bash
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

📖 [상세 설치 가이드](guides/GUIDE_01_SETUP.md)

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
> 추론·유추·맥락 보완 전면 금지. 고유명사·수치·기간은 원문 그대로.

---

## 라이센스

Copyright (c) 2026 장준수 — [LICENSE](LICENSE) 참조

개인 비상업적 사용만 허용. 상업적 이용, 재배포, 역공학 금지.

---

<div align="center">

문의: wkdal1433@gmail.com &nbsp;·&nbsp; [이슈 등록](https://github.com/wkdal1433/jasoseo-machine/issues)

</div>

---

<details>
<summary>📸 이미지 제작 가이드 (기여자 / 본인용)</summary>

### AI 생성 이미지 (나노바나나)

| 파일 | 크기 | 나노바나나 프롬프트 요약 |
|------|------|------------------------|
| `logo.png` | 512×512 | 기어+문서+별 아이콘, 네이비-퍼플 그라데이션, 플랫 |
| `hero-concept.png` | 1280×540 | 자소서 공장 이소메트릭, 컨베이어벨트, 9개 AI 스테이션, 다크 |
| `pipeline-diagram.png` | 1280×220 | 수평 파이프라인 노드 0~8, 파랑→보라→초록 색상 흐름 |

### 앱 실제 화면 캡처

| 파일 | 종류 | 길이 | 핵심 장면 |
|------|------|------|----------|
| `hero.gif` | GIF | 30초 | 대시보드→URL입력→분석→스트리밍→완성 |
| `onboarding.gif` | GIF | 15초 | PDF드래그→AI처리→에피소드카드 생성 |
| `smart-mode.gif` | GIF | 12초 | URL입력→공고분석→문항목록 자동생성 |
| `generation.gif` | GIF | 25초 | 멘트로테이션→첫토큰→스트리밍→완성 |
| `extension.gif` | GIF | 12초 | 전송버튼→Chrome→빈칸 자동채움 |
| `dashboard.png` | PNG | - | 앱 첫 화면, 사이드바+대시보드 전체 |
| `episodes.png` | PNG | - | 에피소드 카드 그리드, HR태그 강조 |
| `step0.png` | PNG | - | 기업 리서치 결과 + 에피소드 매칭도 |
| `result.png` | PNG | - | Full Review 완성된 자소서 전체 |

**공통 설정**: 앱 윈도우 1280×800 고정, GIF 24fps, LossyGIF로 4MB 이하 압축
**저장 위치**: 모두 `jasoseo-machine/assets/images/`

</details>
