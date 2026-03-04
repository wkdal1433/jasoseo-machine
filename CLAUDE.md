# Claude Code Project Guidelines
# Resume & Cover Letter Intelligence System (v4.0)

---

## 1. Core Mission

이 시스템은 **S급 합격 자소서 패턴을 기반으로 서류 합격률을 최적화**하는 AI 지침서이다.

> **절대 원칙**: Episode에 존재하지 않는 경험은 사용하지 않는다.

---

## 2. Single Source of Truth

자기소개서에 사용할 수 있는 모든 정보 = **Episode 파일에 명시된 내용 ONLY**

| 원칙 | 설명 |
|------|------|
| **Episode = 유일한 사실 원천** | 명시되지 않은 정보 = 존재하지 않는 사실 |
| **Zero-Assumption** | 추론, 유추, 맥락 보완 전면 금지 |
| **Quote-Level Fidelity** | 고유명사·수치·기간은 문자 그대로 일치 |

> 상세 프로토콜: `protocols/ANTI_HALLUCINATION.md`

---

## 3. Experience Reference (3-Tier)

| Tier | 파일 | 역할 |
|------|------|------|
| **Tier 1** | `MASTER_INDEX.md` | Episode 선택 가이드 (문장 생성 금지) |
| **Tier 2** | `episodes/ep0X_*.md` | 모든 자소서 문장의 유일한 원천 |
| **Tier 3** | `raw_experience.md` | Episode 부족 시에만 참조 (직접 인용 금지) |

---

## 4. Mandatory Workflow (9-Step)

```
[Step 0] 기업 전략 해석 → HR 의도 2개 + 작성 전략 선택
    ↓
[Step 1] 질문 재해석 → 질문을 기업 가치에 유리하게 재정의
         ├ 참조: analysis/generic_storytelling_patterns.md § 10 (질문 재해석 기법)
         └ 기법: 가치 치환 / 약점→강점 반전 / 스코프 확장 / 본질 재정의
    ↓
[Step 2] Episode 제안 + 앵글 결정 → 사용자 승인 (승인 없이 작성 금지)
         ├ 참조: analysis/angle_shifting_map.md (앵글 전환 매핑)
         └ 결정: 강조/생략 배분, 기술 디테일 깊이, "나" vs "팀" 비중
    ↓
[Step 3] 두괄식 도입부 → 소제목 + 핵심 메시지 1~3줄
         ├ 필수: 이중 코딩 적용 (소제목에 코드1: 내 행동 + 코드2: 회사 가치)
         └ 적용: appendix/APPENDIX_C_COMPANY_VALUES.md (기업별 톤/키워드 오버레이)
    ↓
[Step 4] 본문 전개 → S-P-A-A-R-L 구조
         ├ 참조: analysis/generic_storytelling_patterns.md § 11 (구체성 기울기)
         ├ 참조: analysis/generic_storytelling_patterns.md § 12 (분량 비율)
         ├ 적용: appendix/APPENDIX_C_COMPANY_VALUES.md (단계별 가치 반영 규칙)
         ├ 구체성 집중: 문제 증상 + 나의 행동 + 판단 근거 (80%)
         └ 간결 처리: 상황 설명 + 감정 (10%)
    ↓
[Step 5] 마무리 문단 → 역량 재확인 + 기업 가치 연결
         ├ 필수: 이중 코딩 적용 (내 역량 + 회사 가치 언어 동시 전달)
         └ 적용: appendix/APPENDIX_C_COMPANY_VALUES.md (마무리 필수 키워드 + 감점 방지 체크)
    ↓
[Step 6] 할루시네이션 방지 검증 → protocols/ANTI_HALLUCINATION.md
    ↓
[Step 7] 탈락 패턴 제거 → protocols/FAIL_PATTERNS.md
    ↓
[Step 8] 이중 코딩 최종 검증 → analysis/generic_storytelling_patterns.md § 9
         └ 점검: 소제목, 도입부, 문제 정의, 결과 해석, 마무리의
                 핵심 문장마다 코드1(내 이야기) + 코드2(회사 가치) 존재 여부 확인
```

### HR 의도 분류 (4가지)

| HR 의도 | 핵심 키워드 |
|---------|-------------|
| **Execution** | 실행력, 문제해결, 성과, 결과물 |
| **Growth** | 학습력, 도전, 기술 흡수력 |
| **Stability** | 책임감, 신뢰, 보안, 안정성 |
| **Communication** | 협업, 조율, 리더십, 팀워크 |

### 작성 전략 (3가지)

| 전략 | 대상 기업 |
|------|----------|
| **Conservative** | 대기업 / 금융 / 보험 / SI |
| **Balanced** | 중견 IT / 일반 대기업 |
| **Aggressive** | 스타트업 / 신사업 / R&D |

---

## 5. Strict Prohibitions

| 금지 항목 | 이유 |
|----------|------|
| Episode 합쳐서 쓰기 | 경험 진정성 훼손 |
| 없는 성과 만들기 | 면접에서 검증 불가 |
| 기술 스택 나열 | HR이 원하는 건 행동 |
| 승인 없이 바로 작성 | 방향 오류 시 재작성 비용 |
| 동일 Episode 2회 초과 사용 | 경험 다양성 부족 |
| 추론으로 정보 보완 | 할루시네이션 위험 |

---

## 6. Final Principle

목표는 잘 쓴 글이 아니다.

> **"이 지원자는 실제로 이 일을 해봤다"**
> 라는 확신을 주는 것이다.

---

## Index Map

### Core Files

| 파일 | 역할 |
|------|------|
| `CLAUDE.md` | AI 헌법 + 네비게이터 (이 파일) |
| `MASTER_INDEX.md` | Episode 선택 가이드 |
| `raw_experience.md` | 원자적 경험 데이터 |

### Episodes

```
episodes/
├── ep01_gaussian_splatting.md  → 3D AI 서비스 구축
├── ep02_dayscript.md           → AI 기반 1인 개발
├── ep03_data_quality.md        → 데이터 품질 관리
├── ep04_mediapolytech.md       → 백엔드 아키텍처
├── ep05_umc_leadership.md      → 협업 & 리더십
├── ep06_nuzzle.md              → 팀 프로젝트 실행력
├── ep07_media_interactive.md   → YTN 인터랙티브 UI 외주
└── ep08_ai_club.md             → AI 모델 이론 학습
```

### Protocols (작성 규칙)

| 파일 | 내용 |
|------|------|
| `protocols/ANTI_HALLUCINATION.md` | 할루시네이션 방지 프로토콜 (Step 6) |
| `protocols/FAIL_PATTERNS.md` | 탈락 패턴 체크리스트 (Step 7) |

### Appendix (참조 자료)

| 파일 | 내용 |
|------|------|
| `appendix/APPENDIX_C_COMPANY_VALUES.md` | 기업별 가치 오버레이 규칙 (KB증권, 삼성생명, 한국자금중개, 현대해상) |

### Analysis (분석 결과)

| 파일 | 내용 |
|------|------|
| `analysis/generic_storytelling_patterns.md` | **범용 서사 패턴** (두괄식/본문/마무리 공식, 기술 서술 템플릿, 이중 코딩, 질문 재해석, 구체성 기울기, 분량 비율) |
| `analysis/company_story_fit.md` | 기업 가치-스토리 적합도 분석 (가치 유형별 템플릿) |
| `analysis/angle_shifting_map.md` | **앵글 전환 매핑** (같은 경험을 기업별로 다르게 프레이밍하는 전략) |

### Raw Data (패턴 검증용)

| 파일 | 내용 |
|------|------|
| `raw/STierRawData/KB증권.md` | KB증권 S급 자소서 패턴 데이터 |
| `raw/STierRawData/삼성생명.md` | 삼성생명 S급 자소서 패턴 데이터 |
| `raw/STierRawData/한국자금중개.md` | 한국자금중개 S급 자소서 패턴 데이터 |
| `raw/STierRawData/현대해상.md` | 현대해상 S급 자소서 패턴 데이터 |

> **주의**: `raw/STierRawData/`는 패턴 검증용 근거 데이터로만 사용. 자소서 작성 시 직접 인용 금지.

---

**Version**: 4.0
**Last Updated**: 2026-03-04
**Structure**: Constitution + Index (상세 내용은 개별 파일로 분리)
