import { describe, it, expect } from 'vitest'
import { parseEpisodeMd } from '../md-parser'

const FULL_EPISODE = `# Episode 1. 결제 파이프라인 구축

| 항목 | 내용 |
|------|------|
| **기간** | 2024.01 ~ 2024.06 |
| **역할** | 백엔드 개발 |
| **기술 스택** | Node.js, TypeScript, PostgreSQL |

## 상황 (Situation)
레거시 결제 모듈이 월 2회 장애 발생.

## 문제 (Problem)
비동기 처리 누락으로 결제 중복 발생.

## 행동 (Action)
멱등성 키 도입 및 분산 락 구현.

## 분석 (Analysis)
근본 원인은 race condition이었다.

## 결과 (Result)
장애 0건, 처리 속도 40% 향상.

## 학습 (Learning)
분산 시스템에서 멱등성의 중요성을 체득.
`

const PARTIAL_EPISODE = `# Episode 2. 팀 협업 개선

## 상황 (Situation)
코드 리뷰 문화가 없었다.

## 행동 (Action)
PR 템플릿 도입.
`

const MINIMAL_EPISODE = `신입 프로젝트 경험`

describe('parseEpisodeMd — 기본 파싱', () => {
  it('파일명에서 id를 추출한다', () => {
    const ep = parseEpisodeMd('ep1_payment.md', FULL_EPISODE)
    expect(ep.id).toBe('ep1')
  })

  it('제목을 파싱한다', () => {
    const ep = parseEpisodeMd('ep1_payment.md', FULL_EPISODE)
    expect(ep.title).toBe('결제 파이프라인 구축')
  })

  it('기간을 파싱한다', () => {
    const ep = parseEpisodeMd('ep1_payment.md', FULL_EPISODE)
    expect(ep.period).toBe('2024.01 ~ 2024.06')
  })

  it('역할을 파싱한다', () => {
    const ep = parseEpisodeMd('ep1_payment.md', FULL_EPISODE)
    expect(ep.role).toBe('백엔드 개발')
  })

  it('기술 스택을 배열로 파싱한다', () => {
    const ep = parseEpisodeMd('ep1_payment.md', FULL_EPISODE)
    expect(ep.techStack).toEqual(['Node.js', 'TypeScript', 'PostgreSQL'])
  })
})

describe('parseEpisodeMd — 완성도 판단 (inferStatus)', () => {
  it('6개 섹션 모두 있으면 ready', () => {
    const ep = parseEpisodeMd('ep1.md', FULL_EPISODE)
    expect(ep.status).toBe('ready')
  })

  it('2~4개 섹션이면 needs_review', () => {
    const ep = parseEpisodeMd('ep2.md', PARTIAL_EPISODE)
    expect(ep.status).toBe('needs_review')
  })

  it('섹션이 없으면 draft', () => {
    const ep = parseEpisodeMd('ep3.md', MINIMAL_EPISODE)
    expect(ep.status).toBe('draft')
  })
})

describe('parseEpisodeMd — HR 의도 분류', () => {
  it('Execution 키워드가 있으면 Execution 포함', () => {
    const ep = parseEpisodeMd('ep1.md', FULL_EPISODE)
    expect(ep.hrIntents).toContain('Execution')
  })

  it('협업 키워드가 있으면 Communication 포함', () => {
    const ep = parseEpisodeMd('ep2.md', PARTIAL_EPISODE)
    expect(ep.hrIntents).toContain('Communication')
  })

  it('키워드가 없으면 기본값 Execution', () => {
    const ep = parseEpisodeMd('ep3.md', MINIMAL_EPISODE)
    expect(ep.hrIntents).toEqual(['Execution'])
  })

  it('여러 키워드가 동시에 감지된다', () => {
    const content = FULL_EPISODE + '\n협업 팀워크 학습 성장'
    const ep = parseEpisodeMd('ep1.md', content)
    expect(ep.hrIntents).toContain('Execution')
    expect(ep.hrIntents).toContain('Communication')
    expect(ep.hrIntents).toContain('Growth')
  })
})

describe('parseEpisodeMd — 예외 처리', () => {
  it('제목이 없으면 파일명으로 폴백', () => {
    const ep = parseEpisodeMd('ep1_fallback.md', '내용만 있는 텍스트')
    expect(ep.title).toBeTruthy()
  })

  it('빈 콘텐츠도 crash 없이 처리', () => {
    expect(() => parseEpisodeMd('ep1.md', '')).not.toThrow()
  })
})
