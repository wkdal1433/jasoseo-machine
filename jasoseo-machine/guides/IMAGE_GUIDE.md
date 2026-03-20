# <img src="https://unpkg.com/lucide-static@latest/icons/image.svg" width="32" height="32" valign="bottom" /> 자소서 머신 이미지 제작 가이드

README 및 가이드 문서에 삽입할 이미지와 GIF의 제작 명세서입니다.

---

## 우선순위 순서

| 순서 | 파일 | 종류 | 이유 |
|------|------|------|------|
| **1** | `logo.png` | AI 생성 | 모든 곳에 사용됨 |
| **2** | `hero-concept.png` | AI 생성 | README 첫인상 결정 |
| **3** | `hero.gif` | 앱 캡처 | 가장 임팩트 있는 데모 |
| **4** | `pipeline-diagram.png` | AI 생성 | 기술 이해도 상승 |
| **5~** | 나머지 GIF/스크린샷 | 앱 캡처 | 기능별 상세 설명 |

| 파일 용도 | 저장 위치 | 이유 |
|----------|-----------|------|
| README/가이드 이미지 (GIF, PNG, 스크린샷) | `jasoseo-machine/assets/images/` | tracked → GitHub에 표시됨 |
| 앱 아이콘 (Electron 빌드용) | `jasoseo-machine/build/icon.ico` | electron-builder 표준 경로 (package.json 설정) |

> `jasoseo-machine/docs/`는 gitignore 대상이므로 이미지를 절대 그 경로에 저장하지 마세요.

---

## Part 1. 나노바나나 AI 생성 이미지 (3종)

### 1-1. `logo.png` — 앱 아이콘

| 항목 | 내용 |
|------|------|
| **나노바나나 스타일** | **에나멜 핀 (Enamel Pin)** |
| **선택 이유** | 굵은 검정 외곽선 + 솔리드 플랫 컬러 → 작은 크기에서도 선명. 앱 아이콘에 최적 |
| **출력 크기** | 512×512 → README에 120px로 표시 |
| **생성 권장 수** | 5~6장 생성 후 가장 잘 나온 것 선택 |
| **README 저장 경로** | `jasoseo-machine/assets/images/logo.png` |
| **앱 아이콘 저장 경로** | `jasoseo-machine/build/icon.ico` (electron-builder가 이 경로에서 읽음) |

> **앱 아이콘 변환**: 나노바나나에서 PNG로 받은 후 → [CloudConvert](https://cloudconvert.com/png-to-ico) 등으로 ICO 변환 → `build/icon.ico`로 저장. PNG 원본은 `assets/images/logo.png`에도 보관.

**한국어 프롬프트:**
```
미니멀 플랫 로고 디자인, 기어 안에 문서 아이콘,
상단에 별 반짝임 이펙트, 네이비-퍼플 그라데이션,
클린한 테크 스타트업 느낌, 흰 배경, 아이콘만
```

**영문 프롬프트 (권장):**
```
minimal flat enamel pin app icon design,
gear shape containing document icon,
small sparkle star effect on top,
navy to purple gradient fill, clean white background,
tech startup style, icon only, no text, 512x512
```

---

### 1-2. `hero-concept.png` — README 최상단 컨셉 아트

| 항목 | 내용 |
|------|------|
| **나노바나나 스타일** | **사이보그 (Cyborg)** |
| **선택 이유** | 다크 배경 + 네온 블루-퍼플 조명 + 미래 기계 공장 분위기와 100% 일치 |
| **출력 크기** | 1280×640 (2:1 비율) → README에 860px로 표시 |
| **생성 권장 수** | 3~4장 생성 후 선택 |

**한국어 프롬프트:**
```
미래적 자동화 공장 내부 단면도, 이소메트릭(등각투영) 뷰,
왼쪽: 이력서 PDF 스택이 컨베이어 벨트에 올라감,
중간: 9개의 AI 처리 스테이션 (파란 홀로그램 화면들),
오른쪽: 완성된 자기소개서가 깔끔하게 출력됨,
작은 사람이 오른쪽 끝 모니터 앞에서 팔짱 끼고 바라봄,
다크 배경 (#0d1117), 네온 블루-퍼플 조명,
미니멀 테크 일러스트레이션 스타일, 텍스트 없음
```

**영문 프롬프트 (권장):**
```
isometric automated factory interior cross-section illustration,
left: stack of PDF resume documents on conveyor belt entering,
center: 9 AI processing stations with holographic blue panels and robotic arms,
right: finished polished cover letter documents coming out neatly,
small human silhouette with arms crossed standing at monitor on far right watching,
dark background #0d1117, neon blue and purple lighting accents,
clean minimal tech illustration style, no text labels, wide 2:1 ratio
```

---

### 1-3. `pipeline-diagram.png` — 9단계 파이프라인 시각화

| 항목 | 내용 |
|------|------|
| **나노바나나 스타일** | **색상 블록 (Color Block)** |
| **선택 이유** | 기하학적 플랫 블록 → 인포그래픽 노드 표현에 최적. 파랑→보라→초록 색상 진행 표현 적합 |
| **출력 크기** | 1280×220 (수평 와이드) → README에 860px로 표시 |
| **생성 권장 수** | 3~4장. 노드 번호(0~8)가 잘 안 나오면 Canva 후편집 활용 |

**한국어 프롬프트:**
```
수평 파이프라인 인포그래픽, 9개 원형 노드가 화살표로 연결됨,
각 노드에 번호(0~8)와 아이콘 (돋보기/화살표/스파크/문서/체크),
진행될수록 색상이 연파랑 → 진파랑 → 보라 → 초록으로 변화,
다크 배경, 플랫 디자인, 고급스러운 기업 프레젠테이션 수준
```

**영문 프롬프트 (권장):**
```
horizontal pipeline infographic, 9 circular nodes connected by arrows,
numbered 0 through 8 with small icons (magnifier, arrow, sparkle, document, checkmark),
color progression from light blue → deep blue → purple → green left to right,
dark background, flat minimal design, enterprise presentation quality,
ultra wide horizontal format 6:1 ratio
```

> **후편집 팁**: 노드 번호가 정확하지 않으면 나노바나나 이미지를 배경으로만 사용하고, Canva 또는 Figma에서 텍스트·아이콘을 올려 완성하세요.

---

## Part 2. 앱 실제 캡처 (GIF 5종 + 스크린샷 3종)

### 공통 촬영 환경

```
창 크기: 1280×800 (앱 창 고정)
GIF 설정: 24fps / LossyGIF 85% / 4MB 이하
추천 도구: ScreenToGif (Windows) / Gifox (Mac)
저장 위치: jasoseo-machine/assets/images/
```

---

### 2-1. `hero.gif` — 전체 워크플로우 데모 (**최우선 촬영**)

| 항목 | 내용 |
|------|------|
| **길이** | 30~35초 |
| **핵심 강조** | URL 입력부터 자소서 완성까지 한 번에 보여주는 풀 플로우 |

**촬영 순서:**
1. 대시보드 화면 전체 (2초 — 첫인상)
2. [새 지원서] 클릭 → URL 입력창 열림 (2초)
3. 채용 URL 붙여넣기 → [공고 분석] 클릭 (3초)
4. Step 0 기업 분석 결과 카드 등장 (3초)
5. Step 2 에피소드 매칭 카드 선택 → [승인] 클릭 (3초)
6. 스트리밍 시작 멘트 + shimmer 바 (3초)
7. **글자가 촤르륵 채워지는 스트리밍 장면 (10~12초 — 이 장면이 핵심)**
8. Full Review 완성 화면 (3초)

---

### 2-2. `onboarding.gif` — 매직 온보딩

| 항목 | 내용 |
|------|------|
| **길이** | 15~20초 |
| **핵심 강조** | PDF 한 장 → 에피소드 카드 여러 개로 변환되는 "마법 순간" |

**촬영 순서:**
1. 대시보드 → [✨ 매직 온보딩] 버튼 클릭 (2초)
2. PDF 파일 드래그 드롭 (천천히, 파일이 날아가는 궤적 보이게) (3초)
3. AI 분석 로딩 스피너 (3~5초)
4. 에피소드 카드들이 순차적으로 하나씩 나타남 (5~7초)

---

### 2-3. `smart-mode.gif` — 스마트 URL 모드

| 항목 | 내용 |
|------|------|
| **길이** | 10~15초 |
| **핵심 강조** | URL 1개 입력 → 자소서 문항 목록이 뚝딱 생성 |

**촬영 순서:**
1. [새 지원서] → URL 모드 탭 선택 (2초)
2. 채용 URL 붙여넣기 (천천히) (2초)
3. [공고 자동 분석] 클릭 → 로딩 (3초)
4. 문항 목록 자동 생성 완료 화면 (3초)

---

### 2-4. `generation.gif` — 실시간 스트리밍 생성

| 항목 | 내용 |
|------|------|
| **길이** | 20~25초 |
| **핵심 강조** | 자소서 글자가 촤르륵 채워지는 스트리밍 + 상단 진행 바 |

**촬영 순서:**
1. Step 2 에피소드 매칭 화면 (2초)
2. [생성 시작] 클릭 → 재밌는 멘트 로테이션 + shimmer 바 (4초)
3. 첫 글자 등장 → **스트리밍 타이핑 (12~15초 — 핵심 장면)**
   - 상단 진행 바 + 글자수 카운터 구도에 포함할 것
4. 생성 완료 (2초)

---

### 2-5. `extension.gif` — Chrome 확장 자동 입력

| 항목 | 내용 |
|------|------|
| **길이** | 10~15초 |
| **핵심 강조** | 빈 폼 → 순식간에 채워지는 클라이맥스 |

**촬영 순서:**
1. Full Review 화면 → [확장으로 전송] 버튼 클릭 (2초)
2. Chrome 채용 사이트 폼 화면으로 전환 (빈 textarea들 보이는 상태) (2초)
3. 확장 팝업 아이콘 클릭 → [자동 입력] (1초)
4. **textarea들이 순차적으로 빠르게 채워지는 장면 (6~8초 — 클라이맥스)**

---

### 2-6. 스크린샷 3종

| 파일명 | 화면 | 강조 포인트 | 권장 크기 |
|--------|------|-------------|-----------|
| `dashboard.png` | 대시보드 (지원서 카드 2~3개 있는 상태) | 전체 UI 레이아웃, 사이드바 | 1280×800 |
| `episodes.png` | 에피소드 탭 (카드 3~4개) | HR 의도 태그(실행력/성장성), 역량 뱃지 | 1280×800 |
| `step0.png` | Step 0 기업 리서치 결과 | 인재상 분석 카드, HR 의도 분류, 작성 전략 | 1280×800 |

---

## Part 3. 나노바나나 사용 팁

1. **영문 프롬프트가 더 정확합니다.** 한국어보다 영문 입력 시 원하는 구도가 훨씬 잘 나옵니다.
2. **여러 장 생성해서 고르세요.** 같은 프롬프트로 5~6장 뽑아서 가장 잘 나온 것을 선택합니다.
3. **스타일 고정**: logo는 에나멜 핀, hero-concept은 사이보그, pipeline은 색상 블록으로 고정. 일관성이 중요합니다.
4. **pipeline-diagram 후편집**: 노드 번호·아이콘이 부정확하면 나노바나나 이미지를 배경으로 사용하고 Canva에서 텍스트를 올리세요.

---

← [README](../README.md) | [설치 가이드](./GUIDE_01_SETUP.md) | [라이브러리 가이드](./GUIDE_02_LIBRARY.md) | [생성 가이드](./GUIDE_03_GENERATE.md)
