# 자소서 머신 v2 — 고도화 로드맵

> 작성일: 2026-03-18
> 기준 커밋: complete_ver1 브랜치

---

## 개발 원칙

### 페이즈별 커밋/푸시 원칙

```
1. 각 Phase 시작 전: 현재 브랜치 상태 커밋 확인
2. 각 Phase 완료 시: 반드시 커밋 + 푸시 후 다음 Phase 진입
3. Phase 내 단위 기능 완성 시: 기능 단위 커밋 (중간 커밋 권장)
4. Phase 간 이동 시: 이전 Phase 브랜치 tag 생성 (v2-phase1 등)
5. 대형 리팩토링 전: 반드시 안정 상태 커밋 후 진입

커밋 메시지 컨벤션:
  feat:  새 기능
  fix:   버그 수정
  refactor: 로직 개편 (기능 변화 없음)
  style: UI/UX 변경
  docs:  문서
  test:  테스트 파일
  chore: 빌드/설정
```

### 버그 방지 원칙

```
1. 신규 로직은 반드시 Risk Register에 위험 항목 먼저 작성
2. 복잡한 로직(스냅샷, 시간예측 등)은 순수 함수로 분리 → 단위 테스트 작성
3. UI 변경은 기존 컴포넌트를 교체하기 전에 새 컴포넌트를 병렬 작성 후 교체
4. IPC 채널 추가 시: preload.ts → ipc-channels.ts → ipc-handlers.ts 순서 엄수
5. 타입 변경 시: types/ 먼저 → store 적용 → 컴포넌트 적용 순서 엄수
```

---

## 아키텍처 개요: Gate-Confidence-Reversibility 프레임워크

| | 신뢰도 HIGH | 신뢰도 LOW |
|---|---|---|
| **중요도 HIGH** | 자동진행 + 알림 | 필수 멈춤 (유저 확인) |
| **중요도 LOW** | 완전 자동 | 자동진행 + 경고 표시 |

### 게이트 레벨 정의

- **L3 필수 게이트** (자동 통과 불가): Step 0 결과, Step 2 에피소드 선택, Step 5 생성 결과
- **L2 조건부 게이트** (신뢰도 < 80% 시 멈춤): Step 1 질문재해석, Step 6-8 검증 결과
- **L1 완전 자동**: 프롬프트 빌드, 패턴 컨텍스트 로드, 검증 캐시 체크

---

## Phase 0 — 안전망 구축 (작업 전 필수)

**목표**: 이후 작업의 테스트 기반 확보

### 산출물
- [ ] `docs/CRITICAL_PATH_TEST_SCRIPT.md` — 시나리오 기반 수동 테스트 체크리스트
- [ ] `docs/RISK_REGISTER.md` — Phase별 위험 항목 사전 문서화
- [ ] `src/renderer/src/lib/__tests__/` — 순수 로직 단위 테스트 디렉토리

### 커밋 기준
```
Phase 0 완료 커밋: docs: 테스트 스크립트 + 리스크 레지스터 작성
```

---

## Phase 1 — 데이터 구조 확장

**목표**: UI 변화 없이 데이터 레이어만 확장 (리스크 최소)

### 변경 파일
- `types/wizard.ts` — `HRIntentItem`에 `confidence`, `reasoning`, `evidenceKeywords` 추가
- `types/wizard.ts` — `WizardQuestion`에 `snapshotBefore` 필드 추가
- `db.ts` — `execution_history` 스키마 추가 (step, model, duration, charLimit)
- `ipc-channels.ts` — 신규 채널 추가 (EXECUTION_HISTORY_SAVE, EXECUTION_HISTORY_GET)
- `main/claude-bridge.ts` → `ClaudeProvider` / `GeminiProvider` 클래스 분리

### 커밋 기준
```
Phase 1 완료 커밋: refactor: Provider 캡슐화 + 데이터 구조 확장 (UI 변화 없음)
```

---

## Phase 2 — UI 레이어 교체

**목표**: 기존 Step 컴포넌트를 새 UX로 교체

### 변경 파일
- `Step0_Analysis.tsx` — 신뢰도 표시 + HR 의도 편집 가능 UI 추가
- `Step3to5_Generation.tsx` — 시간 예측 + 글자수 기반 진행률 추가
- `Step6to8_Verification.tsx` — 점수 대시보드 + 액션 아이템 목록 추가
- `WizardPage.tsx` — 조건부 게이트 레이어 삽입 (L2/L3 판단 로직)

### 커밋 기준
```
각 Step 컴포넌트 완료 시 개별 커밋
Phase 2 완료 커밋: style: Step 0/3~5/6~8 UX 고도화 완료
```

---

## Phase 3 — 신규 서브시스템

**목표**: 스냅샷/되돌리기, 시간예측, Cross-question 일관성 체크

> ⚠️ 가장 복잡한 Phase. Risk Register 필수 확인 후 진입.

### 신규 파일
- `stores/snapshotStore.ts` — 스냅샷 저장/복원 시스템
- `lib/time-estimator.ts` — 실행 시간 예측 계산 (순수 함수, 단위 테스트 포함)
- `components/wizard/DecisionTimeline.tsx` — AI 자동 결정 요약 뷰
- `components/wizard/ConsistencyChecker.tsx` — Cross-question 캐릭터 일관성 체크

### 커밋 기준
```
각 서브시스템 완료 시 개별 커밋
Phase 3 완료 커밋: feat: 스냅샷/시간예측/일관성체크 서브시스템 완료
```

---

## 기능 변경 명세

### 변경되는 것 (Upgrade)

| 현재 | v2 |
|------|-----|
| Step 0: HR 의도 + 전략 표시 | + 신뢰도 % + 근거 키워드 + 직접 편집 가능 |
| Step 2: 에피소드 단일 추천 | 2-3개 조합 옵션 병렬 제시 → 유저 선택 |
| Step 3-5: 페이즈 표시만 | + 예상 시간 + 글자수 기반 진행률 (%) |
| Step 6-8: 통과/실패 | + 점수(0-100) + 수정 위치 + 액션 아이템 |
| claude-bridge.ts: if/else 모델 분기 | ClaudeProvider / GeminiProvider 클래스 분리 |
| wizardStore: 현재 상태만 관리 | + 스냅샷 히스토리 + 게이트 상태 |
| DB: 기존 테이블 | + execution_history 테이블 |
| types/wizard.ts: 기본 필드 | + confidence, reasoning, alternatives |

### 제거되는 것

| 항목 | 이유 |
|------|------|
| 단계별 맹목적 자동진행 | 신뢰도 기반 조건부 게이트로 대체 |
| (이미 완료) 컴포넌트 레벨 stream useEffect | 스토어로 이동 완료 |
| (이미 완료) 9-step 숫자 스텝 | 4페이즈로 교체 완료 |

### 새로 생기는 것

| 항목 | Phase | 난이도 |
|------|-------|--------|
| 조건부 게이트 컴포넌트 | 2 | 중 |
| 실행 시간 예측 시스템 | 3 | 고 |
| 스냅샷 / 되돌리기 시스템 | 3 | 고 |
| 결정 타임라인 뷰 | 3 | 중 |
| Cross-question 일관성 체크 | 3 | 중 |
| 에피소드 품질 점수 표시 | 2 | 하 |
| Provider 캡슐화 클래스 | 1 | 중 |
| Critical Path Test Script | 0 | 하 |

---

## 현재 브랜치 구조

```
main
└── feat/generalize-episode-injection  (v1 개발 누적)
    └── complete_ver1  ← 현재 안정 버전 태그 지점
        └── verNew     ← v2 개발 시작 브랜치
```

---

*마지막 업데이트: 2026-03-18*
