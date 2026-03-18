/**
 * 신뢰도 기반 게이트 판단 (순수 함수 — 테스트 가능)
 *
 * Gate-Confidence-Reversibility 프레임워크의 핵심 판단 로직
 */

export type GateLevel = 'L1_auto' | 'L2_conditional' | 'L3_mandatory'

export type GateDecision = 'proceed' | 'warn_and_proceed' | 'stop'

export interface GateResult {
  decision: GateDecision
  level: GateLevel
  reason: string
}

/** 각 단계의 게이트 레벨 정의 */
export const STEP_GATE_LEVEL: Record<number, GateLevel> = {
  0: 'L3_mandatory',  // 기업분석 — 잘못되면 모든 문항에 영향
  1: 'L2_conditional', // 질문재해석
  2: 'L3_mandatory',  // 에피소드 선택 — 없는 경험 방지
  3: 'L1_auto',
  4: 'L1_auto',
  5: 'L3_mandatory',  // 생성 결과 확인
  6: 'L2_conditional',
  7: 'L2_conditional',
  8: 'L2_conditional',
}

/** L2 조건부 게이트 통과 임계값 */
export const CONFIDENCE_THRESHOLD = 80

/**
 * 신뢰도와 단계 번호로 게이트 결정 반환
 */
export function evaluateGate(step: number, confidence: number): GateResult {
  const level = STEP_GATE_LEVEL[step] ?? 'L1_auto'

  if (level === 'L1_auto') {
    return { decision: 'proceed', level, reason: '자동 진행' }
  }

  if (level === 'L3_mandatory') {
    return {
      decision: 'stop',
      level,
      reason: '이 단계는 반드시 확인이 필요합니다.',
    }
  }

  // L2_conditional
  if (confidence >= CONFIDENCE_THRESHOLD) {
    return {
      decision: 'warn_and_proceed',
      level,
      reason: `신뢰도 ${confidence}% — 자동 진행 (확인하려면 수정 가능)`,
    }
  }

  return {
    decision: 'stop',
    level,
    reason: `신뢰도 ${confidence}%로 낮습니다. AI가 확신하지 못합니다. 직접 확인해주세요.`,
  }
}

/**
 * 검증 점수(0-100)를 게이트 결정으로 변환
 */
export function evaluateVerificationScore(score: number): GateDecision {
  if (score >= 80) return 'proceed'
  if (score >= 60) return 'warn_and_proceed'
  return 'stop'
}

/**
 * 여러 검증 점수를 받아 최종 종합 점수 계산
 * - hallucinationScore: 높을수록 안전 (100 = 위험 없음)
 * - failPatternScore: 높을수록 안전
 * - dualCodingScore: 높을수록 좋음
 */
export function calcOverallVerificationScore(
  hallucinationScore: number,
  failPatternScore: number,
  dualCodingScore: number
): number {
  // 할루시네이션은 가중치 높게 (50%), 탈락패턴 30%, 이중코딩 20%
  return Math.round(
    hallucinationScore * 0.5 +
    failPatternScore * 0.3 +
    dualCodingScore * 0.2
  )
}
