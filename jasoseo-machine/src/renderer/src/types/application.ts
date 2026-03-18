export type HRIntent = 'Execution' | 'Growth' | 'Stability' | 'Communication'
export type Strategy = 'Conservative' | 'Balanced' | 'Aggressive'
export type AppStatus = 'draft' | 'completed' | 'passed' | 'failed'
export type CLStatus = 'pending' | 'in_progress' | 'completed'

export interface HRIntentItem {
  intent: HRIntent
  reason: string
  // v2 확장 — 옵셔널 (기존 데이터 호환)
  confidence?: number          // 0-100: AI 분석 신뢰도
  reasoning?: string           // 신뢰도 근거 설명
  evidenceKeywords?: string[]  // 채용공고 근거 키워드
}

export interface Application {
  id: string
  createdAt: string
  updatedAt: string
  currentDate: string // 작성 시점 (예: 2026-03-09)
  targetRecruitmentSeason: string // 목표 공채 시즌 (예: 2026년 상반기)
  companyName: string
  jobTitle: string
  jobPosting: string
  strategy: Strategy | null
  hrIntents: HRIntentItem[] | null
  status: AppStatus
  feedbackNote: string | null
  recruitmentContext?: RecruitmentContext // AI가 수집한 기업 정보 컨텍스트
}

export interface RecruitmentContext {
  foundLinks: Array<{ url: string; title: string }>
  hiringValues: string[]
  preferredQualifications: string[]
  isConfirmed: boolean
  lastUpdated: string
}

export interface CoverLetter {
  id: string
  applicationId: string
  questionNumber: number
  question: string
  charLimit: number | null
  episodesUsed: string[] | null
  analysisResult: AnalysisResult | null
  finalText: string | null
  verificationResult: VerificationResult | null
  status: CLStatus
}

export interface AnalysisResult {
  hrIntents: HRIntentItem[]
  strategy: Strategy
  strategyReason: string
  questionReframe: string
  suggestedEpisodes: SuggestedEpisode[]
  // v2 확장 — 옵셔널
  alternativeIntents?: HRIntentItem[]  // 탈락한 의도들 (근거 포함)
  strategyConfidence?: number          // 전략 선택 신뢰도 (0-100)
}

export interface SuggestedEpisode {
  episodeId: string
  reason: string
  angle: string
}

export interface VerificationResult {
  hallucinationCheck: {
    items: VerificationItem[]
    overallPassed: boolean
  }
  failPatternCheck: {
    items: VerificationItem[]
    overallPassed: boolean
    suggestions: string[]
  }
  dualCodingCheck: {
    items: VerificationItem[]
    overallPassed: boolean
  }
  // v2 확장 — 옵셔널 점수 기반 검증
  scores?: {
    hallucination: number  // 0-100 (높을수록 안전)
    failPattern: number    // 0-100 (높을수록 안전)
    dualCoding: number     // 0-100
    overall: number        // 가중평균 (50/30/20)
  }
  actionItems?: Array<{    // 구체적 수정 위치 + 방법
    location: string       // "3번째 단락 2번째 문장"
    issue: string          // 문제 설명
    suggestion: string     // 구체적 수정 방향
  }>
}

export interface VerificationItem {
  check: string
  passed: boolean
  detail: string
}

export interface QuestionInput {
  question: string
  charLimit: number
}
