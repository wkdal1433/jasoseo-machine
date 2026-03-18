import { describe, it, expect } from 'vitest'
import {
  estimateStepDuration,
  estimateStreamRemaining,
  estimateTotalDuration,
  formatDuration,
  calcProgressPercent,
  DEFAULT_DURATION,
} from '../time-estimator'

describe('estimateStepDuration', () => {
  it('히스토리가 없으면 기본값 반환', () => {
    expect(estimateStepDuration('step0_analysis', [])).toBe(DEFAULT_DURATION.step0_analysis)
    expect(estimateStepDuration('step3to5_generation', [])).toBe(DEFAULT_DURATION.step3to5_generation)
  })

  it('히스토리 1개: 그 값 그대로 반환', () => {
    expect(estimateStepDuration('step0_analysis', [30])).toBe(30)
  })

  it('히스토리 2개: 단순 평균', () => {
    expect(estimateStepDuration('step0_analysis', [30, 50])).toBe(40)
  })

  it('히스토리 3개+: 이동 평균', () => {
    expect(estimateStepDuration('step0_analysis', [38, 41, 45, 39])).toBe(41)
  })

  it('히스토리 6개 이상: 최근 5개만 사용', () => {
    // 오래된 100은 무시, 최근 5개 [40,42,38,41,39] 평균 = 40
    expect(estimateStepDuration('step0_analysis', [100, 40, 42, 38, 41, 39])).toBe(40)
  })
})

describe('estimateStreamRemaining', () => {
  it('경과 시간이 3초 미만이면 null 반환', () => {
    expect(estimateStreamRemaining(300, 1000, 2)).toBeNull()
  })

  it('현재 글자가 0이면 null 반환', () => {
    expect(estimateStreamRemaining(0, 1000, 5)).toBeNull()
  })

  it('정상 케이스: 속도 기반 남은 시간 계산', () => {
    // 5초에 500자 생성 = 100자/초, 목표 1000자 → 남은 500자 / 100자/초 = 5초
    expect(estimateStreamRemaining(500, 1000, 5)).toBe(5)
  })

  it('목표를 초과해도 0 이하로 내려가지 않음', () => {
    expect(estimateStreamRemaining(1200, 1000, 10)).toBe(0)
  })
})

describe('estimateTotalDuration', () => {
  it('히스토리 없을 때 기본값 기반 계산', () => {
    const result = estimateTotalDuration(1, {})
    const expected =
      DEFAULT_DURATION.step0_analysis +
      DEFAULT_DURATION.step1_reframe +
      DEFAULT_DURATION.step2_episode +
      DEFAULT_DURATION.step3to5_generation +
      DEFAULT_DURATION.step6_hallucination +
      DEFAULT_DURATION.step7_fail_pattern +
      DEFAULT_DURATION.step8_dual_coding
    expect(result).toBe(expected)
  })

  it('문항 2개면 perQuestion 비용이 2배', () => {
    const single = estimateTotalDuration(1, {})
    const double = estimateTotalDuration(2, {})
    const step0 = DEFAULT_DURATION.step0_analysis
    expect(double - single).toBe(single - step0)
  })
})

describe('formatDuration', () => {
  it('60초 미만: "N초" 형식', () => {
    expect(formatDuration(45)).toBe('45초')
    expect(formatDuration(0)).toBe('0초')
  })

  it('정확히 60초: "1분" 형식', () => {
    expect(formatDuration(60)).toBe('1분')
  })

  it('1분 이상: "N분 M초" 형식', () => {
    expect(formatDuration(90)).toBe('1분 30초')
    expect(formatDuration(125)).toBe('2분 5초')
  })

  it('분 단위로 딱 떨어지면 초 생략', () => {
    expect(formatDuration(120)).toBe('2분')
  })
})

describe('calcProgressPercent', () => {
  it('0% 케이스', () => {
    expect(calcProgressPercent(0, 60)).toBe(0)
  })

  it('50% 케이스', () => {
    expect(calcProgressPercent(30, 60)).toBe(50)
  })

  it('예상 시간을 초과해도 95% 상한 유지 (완료 전 100% 표시 방지)', () => {
    expect(calcProgressPercent(100, 60)).toBe(95)
  })

  it('예상 시간이 0이면 0% 반환', () => {
    expect(calcProgressPercent(10, 0)).toBe(0)
  })
})
