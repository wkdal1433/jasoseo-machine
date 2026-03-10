import type { Strategy, HRIntentItem, QuestionInput } from '../types/application'

/**
 * v20.0 방탄 프롬프트 빌더
 * 1. 프롬프트 인젝션 방어용 구분자(""") 도입
 * 2. 글로벌 전략 일관성 유지를 위한 닻(Anchor) 로직 강화
 */

const GUI_SYSTEM_PROMPT = `You are operating inside the 자소서 머신 GUI.
Follow CLAUDE.md's 9-Step Workflow strictly.
Do not include markdown code blocks around JSON responses.
Return ONLY the JSON object, no extra text before or after.
Respond in Korean unless the JSON schema requires otherwise.`

// 글로벌 전략 닻(Anchor) 생성 헬퍼
function buildGlobalStrategyAnchor(companyName: string, jobTitle: string, hrIntents: HRIntentItem[], strategy: Strategy): string {
  return `
# GLOBAL STRATEGY ANCHOR (NEVER IGNORE)
- TARGET COMPANY: """${companyName}"""
- TARGET JOB: """${jobTitle}"""
- HR INTENTS: """${hrIntents.map(h => `${h.intent}(${h.reason})`).join(', ')}"""
- WRITING STRATEGY: """${strategy}"""
# All subsequent steps MUST align with this strategy.
`;
}

export function buildStep0Prompt(
  companyName: string,
  jobTitle: string,
  jobPosting: string,
  questions: QuestionInput[],
  strategy?: Strategy
): string {
  const questionList = questions
    .map((q, i) => `문항 ${i + 1}: """${q.question}""" (${q.charLimit}자)`)
    .join('\n')

  return `[Step 0: 기업 전략 해석]

다음 기업의 채용공고를 분석하고, CLAUDE.md의 9-Step Workflow에 따라 Step 0을 수행해주세요.

[기업명]: """${companyName}"""
[직무명]: """${jobTitle}"""
${strategy ? `[선호 전략]: """${strategy}"""` : ''}

[채용공고 전문]:
"""
${jobPosting}
"""

[자소서 문항]:
${questionList}

수행 사항:
1. 채용공고에서 반복·강조되는 키워드를 추출
2. 키워드를 HR 의도 4가지(Execution, Growth, Stability, Communication)로 분류
3. 상위 HR 의도 2개를 결정하고 근거 제시
4. Conservative/Balanced/Aggressive 중 최적 전략 선택 및 근거

결과를 다음 JSON 형식으로 반환해주세요:
{
  "hrIntents": [{"intent": "Execution|Growth|Stability|Communication", "reason": "선택 근거"}],
  "strategy": "Conservative|Balanced|Aggressive",
  "strategyReason": "전략 선택 근거"
}`
}

export function buildStep1to2Prompt(
  companyName: string,
  jobTitle: string,
  jobPosting: string,
  hrIntents: HRIntentItem[],
  strategy: Strategy,
  question: string,
  charLimit: number
): string {
  const strategyAnchor = buildGlobalStrategyAnchor(companyName, jobTitle, hrIntents, strategy);

  return `${strategyAnchor}

[Step 1-2: 질문 재해석 + Episode 제안]

CLAUDE.md의 Step 1(질문 재정의)과 Step 2(Episode 제안)를 수행해주세요.

[자소서 문항]: """${question}"""
[글자수 제한]: ${charLimit}자

수행 사항:
1. 채용담당자의 실제 의도를 파악 (질문 재해석)
2. 최적 Episode 2~3개 추천
3. 각 Episode의 앵글(강조점/생략점/기술 디테일 깊이) 결정

결과를 다음 JSON 형식으로 반환해주세요:
{
  "questionReframe": "재해석된 질문 의도",
  "suggestedEpisodes": [
    {
      "episodeId": "ep01",
      "reason": "추천 이유",
      "angle": "앵글 상세"
    }
  ]
}`
}

export function buildStep3to5Prompt(
  companyName: string,
  jobTitle: string,
  jobPosting: string,
  hrIntents: HRIntentItem[],
  strategy: Strategy,
  questionReframe: string,
  question: string,
  charLimit: number,
  approvedEpisodes: string[],
  angles: Record<string, string>
): string {
  const strategyAnchor = buildGlobalStrategyAnchor(companyName, jobTitle, hrIntents, strategy);
  
  const episodeInfo = approvedEpisodes
    .map((ep) => `"""${ep}""" (앵글: """${angles[ep] || '기본'}""")`)
    .join(', ')

  return `${strategyAnchor}

[Step 3-5: 자소서 생성]

[질문 재해석]: """${questionReframe}"""
[승인된 Episode]: ${episodeInfo}
[글자수 제한]: ${charLimit}자

[자소서 문항]:
"""
${question}
"""

작성 규칙:
1. 소제목/도입부/마무리에 내 행동과 회사 가치 동시 반영
2. Episode 원본의 고유명사·수치·기간을 정확히 사용
3. 도입부 15%, 본문(S-P-A-A-R-L) 70%, 마무리 15%
4. Episode에 없는 경험/사실은 절대 사용 금지
5. 글자수 제한(${charLimit}자) 준수

소제목 + 자소서 본문만 출력하세요. JSON이 아닌 일반 텍스트로 작성하세요.`
}

export function buildStep6to8Prompt(
  generatedText: string,
  episodesUsed: string[],
  companyName: string,
  jobTitle: string,
  hrIntents: HRIntentItem[],
  strategy: Strategy
): string {
  const strategyAnchor = buildGlobalStrategyAnchor(companyName, jobTitle, hrIntents, strategy);

  return `${strategyAnchor}

[Step 6-8: 검증 3종]

다음 자소서에 대해 Step 6(할루시네이션), 7(탈락 패턴), 8(이중 코딩) 검증을 수행해주세요.

[자소서 전문]:
"""
${generatedText}
"""

[사용된 Episode]: ${episodesUsed.join(', ')}

결과를 다음 JSON 형식으로 반환해주세요:
{
  "hallucinationCheck": {
    "items": [{"check": "내용", "passed": true, "detail": "설명"}],
    "overallPassed": true
  },
  "failPatternCheck": {
    "items": [{"check": "내용", "passed": true, "detail": "설명"}],
    "overallPassed": true,
    "suggestions": []
  },
  "dualCodingCheck": {
    "items": [{"check": "내용", "passed": true, "detail": "설명"}],
    "overallPassed": true
  }
}`
}

export { GUI_SYSTEM_PROMPT }
