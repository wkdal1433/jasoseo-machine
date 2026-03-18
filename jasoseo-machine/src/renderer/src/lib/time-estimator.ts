/**
 * 실행 시간 예측 시스템 (순수 함수 — Electron API 없음, 테스트 가능)
 *
 * 각 AI 호출의 과거 실행 시간을 기반으로 남은 시간을 예측합니다.
 * 실제 히스토리는 DB에 저장되고 이 함수는 계산만 담당합니다.
 */

export type StepKey =
  | 'step0_analysis'
  | 'step1_reframe'
  | 'step2_episode'
  | 'step3to5_generation'
  | 'step6_hallucination'
  | 'step7_fail_pattern'
  | 'step8_dual_coding'

/** 단계별 기본 예상 시간(초) — 히스토리가 없을 때 사용 */
export const DEFAULT_DURATION: Record<StepKey, number> = {
  step0_analysis: 45,
  step1_reframe: 25,
  step2_episode: 20,
  step3to5_generation: 80,
  step6_hallucination: 30,
  step7_fail_pattern: 25,
  step8_dual_coding: 25,
}

/**
 * 이동 평균으로 예상 시간 계산
 * - 히스토리 0개: 기본값 반환
 * - 히스토리 1-2개: 단순 평균
 * - 히스토리 3개+: 최근 5개 이동 평균 (오래된 데이터 가중치 감소)
 */
export function estimateStepDuration(step: StepKey, history: number[]): number {
  if (history.length === 0) return DEFAULT_DURATION[step]
  const recent = history.slice(-5)
  const sum = recent.reduce((a, b) => a + b, 0)
  return Math.round(sum / recent.length)
}

/**
 * 스트리밍 단계에서 토큰 속도 기반 남은 시간 계산 (초)
 * - currentChars: 현재까지 생성된 글자 수
 * - targetChars: 목표 글자 수 (charLimit)
 * - elapsedSecs: 경과 시간 (초)
 * - 최소 3초 경과 후에 의미 있는 예측 가능
 */
export function estimateStreamRemaining(
  currentChars: number,
  targetChars: number,
  elapsedSecs: number
): number | null {
  if (elapsedSecs < 3 || currentChars === 0) return null
  const charsPerSec = currentChars / elapsedSecs
  const remaining = (targetChars - currentChars) / charsPerSec
  return Math.max(0, Math.round(remaining))
}

/**
 * 전체 지원서 예상 소요 시간 계산 (초)
 * - questionCount: 문항 수
 * - histories: 단계별 히스토리
 */
export function estimateTotalDuration(
  questionCount: number,
  histories: Partial<Record<StepKey, number[]>>
): number {
  const get = (key: StepKey) => estimateStepDuration(key, histories[key] ?? [])

  const perQuestion =
    get('step1_reframe') +
    get('step2_episode') +
    get('step3to5_generation') +
    get('step6_hallucination') +
    get('step7_fail_pattern') +
    get('step8_dual_coding')

  return get('step0_analysis') + perQuestion * questionCount
}

/**
 * 초를 "X분 Y초" 형태로 포맷
 */
export function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}초`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s === 0 ? `${m}분` : `${m}분 ${s}초`
}

/**
 * 경과 시간과 예상 시간으로 진행률(0-100) 계산
 */
export function calcProgressPercent(elapsedSecs: number, estimatedSecs: number): number {
  if (estimatedSecs <= 0) return 0
  return Math.min(95, Math.round((elapsedSecs / estimatedSecs) * 100)) // 완료 전 최대 95%
}
