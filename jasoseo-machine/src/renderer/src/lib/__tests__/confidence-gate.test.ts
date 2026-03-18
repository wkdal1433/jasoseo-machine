import { describe, it, expect } from 'vitest'
import {
  evaluateGate,
  evaluateVerificationScore,
  calcOverallVerificationScore,
  CONFIDENCE_THRESHOLD,
  STEP_GATE_LEVEL,
} from '../confidence-gate'

describe('STEP_GATE_LEVEL 정의', () => {
  it('Step 0 (기업분석)은 L3_mandatory', () => {
    expect(STEP_GATE_LEVEL[0]).toBe('L3_mandatory')
  })

  it('Step 2 (에피소드 선택)은 L3_mandatory', () => {
    expect(STEP_GATE_LEVEL[2]).toBe('L3_mandatory')
  })

  it('Step 5 (생성 결과)는 L3_mandatory', () => {
    expect(STEP_GATE_LEVEL[5]).toBe('L3_mandatory')
  })

  it('Step 1 (질문재해석)은 L2_conditional', () => {
    expect(STEP_GATE_LEVEL[1]).toBe('L2_conditional')
  })

  it('Step 3/4 (생성 내부 단계)는 L1_auto', () => {
    expect(STEP_GATE_LEVEL[3]).toBe('L1_auto')
    expect(STEP_GATE_LEVEL[4]).toBe('L1_auto')
  })
})

describe('evaluateGate — L3_mandatory', () => {
  it('신뢰도와 관계없이 항상 stop', () => {
    expect(evaluateGate(0, 99).decision).toBe('stop')
    expect(evaluateGate(0, 50).decision).toBe('stop')
    expect(evaluateGate(2, 100).decision).toBe('stop')
    expect(evaluateGate(5, 0).decision).toBe('stop')
  })
})

describe('evaluateGate — L2_conditional', () => {
  it(`신뢰도 ${CONFIDENCE_THRESHOLD}% 이상이면 warn_and_proceed`, () => {
    expect(evaluateGate(1, CONFIDENCE_THRESHOLD).decision).toBe('warn_and_proceed')
    expect(evaluateGate(1, 95).decision).toBe('warn_and_proceed')
    expect(evaluateGate(6, 100).decision).toBe('warn_and_proceed')
  })

  it(`신뢰도 ${CONFIDENCE_THRESHOLD}% 미만이면 stop`, () => {
    expect(evaluateGate(1, CONFIDENCE_THRESHOLD - 1).decision).toBe('stop')
    expect(evaluateGate(1, 50).decision).toBe('stop')
    expect(evaluateGate(7, 0).decision).toBe('stop')
  })

  it('stop 결과에는 이유 문자열이 포함됨', () => {
    const result = evaluateGate(1, 40)
    expect(result.reason).toContain('40%')
    expect(result.reason.length).toBeGreaterThan(0)
  })
})

describe('evaluateGate — L1_auto', () => {
  it('신뢰도와 관계없이 항상 proceed', () => {
    expect(evaluateGate(3, 0).decision).toBe('proceed')
    expect(evaluateGate(4, 100).decision).toBe('proceed')
  })
})

describe('evaluateVerificationScore', () => {
  it('80점 이상: proceed', () => {
    expect(evaluateVerificationScore(80)).toBe('proceed')
    expect(evaluateVerificationScore(100)).toBe('proceed')
  })

  it('60-79점: warn_and_proceed', () => {
    expect(evaluateVerificationScore(60)).toBe('warn_and_proceed')
    expect(evaluateVerificationScore(79)).toBe('warn_and_proceed')
  })

  it('60점 미만: stop', () => {
    expect(evaluateVerificationScore(59)).toBe('stop')
    expect(evaluateVerificationScore(0)).toBe('stop')
  })
})

describe('calcOverallVerificationScore', () => {
  it('할루시네이션 50% + 탈락패턴 30% + 이중코딩 20% 가중평균', () => {
    // 100 * 0.5 + 100 * 0.3 + 100 * 0.2 = 100
    expect(calcOverallVerificationScore(100, 100, 100)).toBe(100)

    // 80 * 0.5 + 60 * 0.3 + 40 * 0.2 = 40 + 18 + 8 = 66
    expect(calcOverallVerificationScore(80, 60, 40)).toBe(66)

    // 0 * 0.5 + 0 * 0.3 + 0 * 0.2 = 0
    expect(calcOverallVerificationScore(0, 0, 0)).toBe(0)
  })

  it('할루시네이션이 0점이면 아무리 나머지가 좋아도 낮은 점수', () => {
    // 0 * 0.5 + 100 * 0.3 + 100 * 0.2 = 0 + 30 + 20 = 50
    expect(calcOverallVerificationScore(0, 100, 100)).toBe(50)
  })
})
