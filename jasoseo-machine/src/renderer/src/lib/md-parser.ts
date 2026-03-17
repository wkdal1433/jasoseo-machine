import type { Episode, EpisodeStatus } from '../types/episode'
import type { HRIntent } from '../types/application'

function inferStatus(content: string): EpisodeStatus {
  // S-P-A-A-R-L 섹션 존재 여부로 완성도 판단
  const hasSituation = /##\s*(상황|Situation|S\b)/i.test(content)
  const hasProblem = /##\s*(문제|Problem|P\b)/i.test(content)
  const hasAction = /##\s*(행동|Action|A\b)/i.test(content)
  const hasResult = /##\s*(결과|Result|R\b)/i.test(content)
  const filledSections = [hasSituation, hasProblem, hasAction, hasResult].filter(Boolean).length
  if (filledSections >= 3) return 'ready'
  if (filledSections >= 1) return 'needs_review'
  return 'draft'
}

export function parseEpisodeMd(fileName: string, content: string): Episode {
  const id = fileName.replace(/\.md$/, '').replace(/^ep(\d+)_.*/, 'ep$1')

  const titleMatch = content.match(/^#\s+Episode\s+\d+\.\s+(.+)$/m)
  const title = titleMatch?.[1]?.trim()
    || content.split(/[.。\n]/)[0]?.trim().slice(0, 60)
    || fileName

  const periodMatch = content.match(/\*\*기간\*\*\s*\|\s*(.+?)(?:\s*\||\s*$)/m)
  const period = periodMatch?.[1]?.trim() || ''

  const roleMatch = content.match(/\*\*역할\*\*\s*\|\s*(.+?)(?:\s*\||\s*$)/m)
  const role = roleMatch?.[1]?.trim() || ''

  const techMatch = content.match(/\*\*기술 스택\*\*\s*\|\s*(.+?)(?:\s*\||\s*$)/m)
  const techStack = techMatch?.[1]
    ?.split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean) || []

  // HR intent extraction: scan entire content for keywords
  // Episode files don't have a dedicated HR section, so we scan holistically
  const hrIntents: HRIntent[] = []
  const lowerContent = content.toLowerCase()

  // Execution indicators
  const executionKeywords = ['실행력', '문제해결', '성과', '구현', '파이프라인', '구축', '개발', '런칭', '배포', '최적화']
  if (executionKeywords.some((k) => content.includes(k))) {
    hrIntents.push('Execution')
  }

  // Growth indicators
  const growthKeywords = ['학습', '성장', '기술 흡수', '도전', '새로운', '탐구', '연구', '스터디', '자기주도']
  if (growthKeywords.some((k) => content.includes(k))) {
    hrIntents.push('Growth')
  }

  // Stability indicators
  const stabilityKeywords = ['책임', '신뢰', '보안', '안정', '품질', '검증', '무결성', '관리', '운영']
  if (stabilityKeywords.some((k) => content.includes(k))) {
    hrIntents.push('Stability')
  }

  // Communication indicators
  const communicationKeywords = ['협업', '소통', '조율', '리더십', '팀', '멘토', '온보딩', '커뮤니케이션']
  if (communicationKeywords.some((k) => content.includes(k))) {
    hrIntents.push('Communication')
  }

  // If no intents detected, default to Execution
  if (hrIntents.length === 0) {
    hrIntents.push('Execution')
  }

  // Summary: extract from 핵심 가치 or DO section
  let summary = ''
  const valueMatch = content.match(/## 프로젝트 핵심 가치[\s\S]*?>\s*\*\*(.+?)\*\*/m)
  if (valueMatch) {
    summary = valueMatch[1].trim()
  } else {
    const doSection = content.match(/### DO[\s\S]*?(?=###|$)/)?.[0] || ''
    summary = doSection
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .map((l) => l.replace(/^- /, '').trim())
      .slice(0, 3)
      .join(' | ')
  }

  return {
    id,
    title,
    fileName,
    period,
    role,
    techStack,
    hrIntents,
    summary,
    rawContent: content,
    status: inferStatus(content)
  }
}
