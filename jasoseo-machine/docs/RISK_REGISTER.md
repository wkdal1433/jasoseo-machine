# Risk Register — 자소서 머신 v2

> Phase 진입 전 해당 섹션 반드시 확인
> 위험도: 🔴 HIGH / 🟡 MEDIUM / 🟢 LOW

---

## Phase 1 — 데이터 구조 확장

| ID | 위험 항목 | 위험도 | 예방 조치 |
|----|-----------|--------|-----------|
| R1-1 | `types/wizard.ts` 필드 추가 시 기존 `restoreFromDraft` 역직렬화 실패 | 🟡 | 새 필드에 기본값 보장, `restoreFromDraft`에서 `?? default` 처리 |
| R1-2 | DB `execution_history` 스키마 추가 시 기존 DB 파일과 충돌 | 🟡 | 스키마 초기화를 `init()` 단계에서 `IF NOT EXISTS` 패턴으로 처리 |
| R1-3 | Provider 클래스 분리 시 기존 `ipc-handlers.ts`의 import 경로 오류 | 🟡 | 분리 전 기존 함수 export 유지, 점진적 교체 |
| R1-4 | `confidence` 필드가 없는 기존 저장 데이터를 로드할 때 undefined 오류 | 🟢 | 옵셔널 필드(`confidence?: number`)로 선언, UI에서 `?? 0` 처리 |

---

## Phase 2 — UI 레이어 교체

| ID | 위험 항목 | 위험도 | 예방 조치 |
|----|-----------|--------|-----------|
| R2-1 | Step 0 UI 수정 시 기존 `setStep0Result` 호출 누락으로 `step0Completed` 미설정 | 🔴 | 교체 전 기존 컴포넌트 동작 단위 테스트로 명세화 |
| R2-2 | 조건부 게이트 레이어 삽입 시 L3 게이트를 실수로 L2로 설정 → 자동 통과 버그 | 🔴 | `STEP_GATE_LEVEL` 상수를 `confidence-gate.ts`에서 중앙 관리, 직접 하드코딩 금지 |
| R2-3 | 시간 예측 표시 추가 시 히스토리 DB 미로드 상태에서 NaN 표시 | 🟡 | `estimateStepDuration`에 기본값 보장됨, UI에서 `null` 체크 후 "측정 중..." 표시 |
| R2-4 | Step 6-8 점수 UI 추가 시 기존 `verificationResult` 타입 불일치 | 🟡 | 타입 확장 시 기존 필드 유지, 신규 필드는 옵셔널로 추가 |
| R2-5 | 병렬 초안 옵션 UI에서 옵션 선택 전 다음 단계 버튼 활성화 버그 | 🟡 | 선택 상태 없으면 버튼 `disabled` 처리, 초기값을 `null`로 설정 |

---

## Phase 3 — 신규 서브시스템

| ID | 위험 항목 | 위험도 | 예방 조치 |
|----|-----------|--------|-----------|
| R3-1 | 스냅샷 저장 시 `wizardStore` 전체를 직렬화하면 함수 필드(`_streamCleanup` 등) 직렬화 오류 | 🔴 | 스냅샷은 순수 데이터만 저장 (함수 필드 제외), `WizardSnapshot` 별도 타입 정의 |
| R3-2 | 스냅샷 복원 시 현재 진행 중인 스트림이 있으면 충돌 | 🔴 | 복원 전 `stopStreamListening()` 호출 필수, 생성 중 복원 버튼 비활성화 |
| R3-3 | 실행 시간 히스토리가 이상값(네트워크 지연 등)을 포함해 예측 정확도 저하 | 🟡 | 기록 시 상위/하위 20% 이상값 제거 후 저장 (IQR 필터링 추가 예정) |
| R3-4 | Cross-question 일관성 체크가 전체 문항 미완성 시 호출되면 빈 배열 처리 오류 | 🟡 | 체크 호출 조건: 모든 문항 `status === 'completed'` 확인 후 진입 |
| R3-5 | 결정 타임라인 뷰에서 오래된 스냅샷 데이터가 메모리에 과다 축적 | 🟢 | 스냅샷 최대 보관 수 제한 (최근 10개), 오래된 항목 자동 삭제 |

---

## 전 Phase 공통 위험

| ID | 위험 항목 | 위험도 | 예방 조치 |
|----|-----------|--------|-----------|
| RC-1 | IPC 채널 추가 시 preload.ts/ipc-channels.ts/ipc-handlers.ts 중 하나만 수정해 ReferenceError 발생 | 🔴 | 체크리스트: 세 파일 동시 확인 (Critical Path Test에 포함) |
| RC-2 | Zustand `initialState`에 새 필드 추가 후 `resetWizard`에서 누락 | 🟡 | `resetWizard`는 `{ ...initialState }` 스프레드로 구현 — 자동 포함됨 |
| RC-3 | TypeScript `strict` 미적용으로 null 체크 누락 → 런타임 crash | 🟡 | `tsconfig.json`에 `"strict": true` 확인 (현재 미적용 시 Phase 1에서 활성화) |
| RC-4 | Windows 경로 백슬래시로 인한 Gemini CLI 파일 경로 오류 (기존 이슈 재발) | 🟡 | Provider 분리 시 경로 정규화 로직(`replace(/\\/g, '/')`) 반드시 유지 |

---

## 검증 완료 체크리스트 (Phase 완료 전 확인)

```
Phase 1 완료 체크:
  □ npm test — 전체 통과
  □ 기존 앱 실행 후 새 지원서 생성 정상 동작
  □ 기존 임시저장 불러오기 정상 동작 (DB 호환성)

Phase 2 완료 체크:
  □ npm test — 전체 통과
  □ Critical Path Test Script 시나리오 A, B, C 통과
  □ Step 0 → 2 흐름에서 게이트 정상 동작 확인

Phase 3 완료 체크:
  □ npm test — 전체 통과
  □ Critical Path Test Script 전 시나리오 통과
  □ 스냅샷 저장/복원 후 데이터 무결성 확인
  □ 메모리 누수 없음 확인 (크롬 DevTools)
```
