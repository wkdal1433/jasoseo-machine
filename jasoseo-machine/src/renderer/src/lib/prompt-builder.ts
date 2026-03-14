import type { Strategy, HRIntentItem, QuestionInput } from '../types/application'
import type { Episode } from '../types/episode'

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
// [v21.5] 컨텍스트 트리머: 질문 연관도에 따라 프로필 섹션 필터링
function trimContext(profile: any, question: string): string {
  if (!profile) return '{}'
  const q = question.toLowerCase();
  const result: any = { personal: profile.personal }; // 기본 정보는 항상 포함

  // 1. 지원동기/가치관 질문 -> 기업 분석 및 인성 강조
  if (q.includes('지원동기') || q.includes('포부') || q.includes('가치관')) {
    result.experience = profile.experience;
    result.preferences = profile.preferences;
  }
  // 2. 기술/직무 역량 질문 -> 스킬 및 프로젝트 강조
  else if (q.includes('기술') || q.includes('역량') || q.includes('개발') || q.includes('프로젝트')) {
    result.skills = profile.skills;
    result.experience = profile.experience;
    result.education = profile.education;
  }
  // 3. 기타 (보수적 접근: 데이터가 적으면 다 보냄)
  else {
    return JSON.stringify(profile, null, 2);
  }

  return JSON.stringify(result, null, 2);
}

export function buildStep1to2Prompt(
  companyName: string,
  jobTitle: string,
  jobPosting: string,
  hrIntents: HRIntentItem[],
  strategy: Strategy,
  question: string,
  charLimit: number,
  fullProfile: any, // 프로필 전체 전달
  episodes: Episode[] = []
): string {
  const strategyAnchor = buildGlobalStrategyAnchor(companyName, jobTitle, hrIntents, strategy);
  const trimmedProfile = trimContext(fullProfile, question);

  const episodeList = episodes.length > 0
    ? episodes.map(ep =>
        `- ID: ${ep.id} | 제목: ${ep.title} | 기간: ${ep.period} | 역할: ${ep.role}\n  HR의도: ${ep.hrIntents.join(', ')} | 요약: ${ep.summary}`
      ).join('\n')
    : '(에피소드 없음)';

  return `${strategyAnchor}

[Step 1-2: 질문 재해석 + Episode 제안]

[최적화된 프로필 데이터]:
${trimmedProfile}

[사용 가능한 에피소드] (아래 목록에서만 선택할 것):
${episodeList}

[자소서 문항]: """${question}"""

[글자수 제한]: ${charLimit}자

수행 사항:
1. 채용담당자의 실제 의도를 파악 (질문 재해석)
2. 위 [사용 가능한 에피소드] 목록에서 최적 Episode 2~3개 추천 (목록 외 ID 사용 금지)
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
  angles: Record<string, string>,
  episodeContents: Record<string, string> = {}
): string {
  const strategyAnchor = buildGlobalStrategyAnchor(companyName, jobTitle, hrIntents, strategy);

  const episodeInfo = approvedEpisodes
    .map((ep) => `"""${ep}""" (앵글: """${angles[ep] || '기본'}""")`)
    .join(', ')

  const embeddedEpisodes = approvedEpisodes.length > 0
    ? approvedEpisodes.map(epId => {
        const content = episodeContents[epId]
        return content
          ? `\n## Episode: ${epId}\n"""\n${content}\n"""`
          : `\n## Episode: ${epId}\n(내용 없음)`
      }).join('\n')
    : '(승인된 에피소드 없음)'

  return `${strategyAnchor}

[Step 3-5: 자소서 생성]

[질문 재해석]: """${questionReframe}"""
[승인된 Episode]: ${episodeInfo}
[글자수 제한]: ${charLimit}자

[승인된 에피소드 원문] (아래 내용만 사용할 것, 없는 사실 추가 금지):
${embeddedEpisodes}

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

// [v21.8] 글자수 축약 프롬프트 (비율 기반, JS가 실제 글자수 측정)
export function buildShortenPrompt(text: string, currentLen: number, targetLen: number): string {
  const reductionPct = Math.round((1 - targetLen / currentLen) * 100)
  const lower = Math.round(targetLen * 0.92)
  const upper = targetLen
  return `다음 자소서를 내용의 핵심(에피소드 수치·고유명사·행동 근거)을 유지하면서 약 ${reductionPct}% 분량을 줄여주세요.

목표 범위: ${lower}자 ~ ${upper}자 (현재 ${currentLen}자)

줄이는 방법:
1. 중복 표현·부연 설명 제거
2. 도입/마무리 문장 압축 (에피소드 본문 우선 보존)
3. 수치·기간·고유명사는 절대 삭제 금지

[자소서 원문]:
"""
${text}
"""

수정된 자소서 전문만 출력하세요. 설명·주석 없이 텍스트만.`
}

// [v21.4] 부분 수술(Surgical Edit) 프롬프트
export function buildSurgicalEditPrompt(
  fullText: string,
  targetSection: string,
  userInstruction: string,
  strategy: string
): string {
  return `
# Role: Professional Editor & Copywriter
# Mission: Revise the [TARGET SECTION] based on the [USER INSTRUCTION] while maintaining the flow of the [FULL CONTEXT].

# FULL CONTEXT (For reference only):
"""${fullText}"""

# TARGET SECTION (The part to be changed):
"""${targetSection}"""

# USER INSTRUCTION:
"""${userInstruction}"""

# WRITING STRATEGY: """${strategy}"""

# Guidelines:
1. Replace ONLY the [TARGET SECTION].
2. Ensure the tone and connectives match the surrounding text in [FULL CONTEXT].
3. Maintain factual consistency.
4. Respond ONLY with the revised section text (no preamble).
`;
}

export { GUI_SYSTEM_PROMPT }
