import type { Strategy, HRIntentItem, QuestionInput } from '../types/application'

/**
 * v9.5 방탄 프롬프트 빌더
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
- HR INTENTS: """${hrIntents.map(h => `${h.type}(${h.reason})`).join(', ')}"""
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
... (생략) ...
`
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
... (생략) ...
`
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
  return `[Step 1-2: 질문 재해석 + Episode 제안]

CLAUDE.md의 Step 1(질문 재정의)과 Step 2(Episode 제안)를 수행해주세요.

먼저 다음 파일들을 읽어주세요:
- MASTER_INDEX.md (Episode 선택 가이드, HR 의도 매칭 참조)
- analysis/generic_storytelling_patterns.md (§10 질문 재해석 기법 참조)
- analysis/angle_shifting_map.md (앵글 전환 기법 참조)

[기업명]: ${companyName}
[직무명]: ${jobTitle}
[HR 의도]: ${hrIntents.map((h) => `${h.type}(${h.reason})`).join(', ')}
[작성 전략]: ${strategy}

[채용공고 전문]:
${jobPosting}

[자소서 문항]: ${question}
[글자수 제한]: ${charLimit}자

수행 사항:
1. §10 기법을 적용하여 채용담당자의 실제 의도를 파악 (질문 재해석)
2. MASTER_INDEX.md의 Episode 활용 가이드를 참고하여 최적 Episode 2~3개 추천
3. angle_shifting_map.md를 참고하여 각 Episode의 앵글(강조점/생략점/기술 디테일 깊이) 결정

결과를 다음 JSON 형식으로 반환해주세요:
{
  "questionReframe": "재해석된 질문 의도 (채용담당자가 실제로 알고 싶은 것)",
  "suggestedEpisodes": [
    {
      "episodeId": "ep01",
      "reason": "이 Episode를 추천하는 이유 (HR 의도 매칭 근거)",
      "angle": "앵글: 강조할 포인트 / 생략할 부분 / 기술 디테일 깊이"
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
  const episodeInfo = approvedEpisodes
    .map((ep) => `${ep} (앵글: ${angles[ep] || '기본'})`)
    .join(', ')

  const episodeFiles = approvedEpisodes
    .map((ep) => `episodes/${ep}_*.md`)
    .join(', ')

  return `[Step 3-5: 자소서 생성]

CLAUDE.md의 Step 3(두괄식 도입부) → Step 4(본문 S-P-A-A-R-L) → Step 5(마무리) 순서대로 자소서를 작성해주세요.

먼저 다음 파일들을 읽어주세요:
- 승인된 Episode 파일: ${episodeFiles}
- analysis/generic_storytelling_patterns.md (§9 이중코딩, §11 구체성 기울기, §12 분량비율 참조)
${companyName ? `- appendix/APPENDIX_C_COMPANY_VALUES.md (기업별 가치 오버레이 확인)` : ''}

[기업명]: ${companyName}
[직무명]: ${jobTitle}
[HR 의도]: ${hrIntents.map((h) => `${h.type}(${h.reason})`).join(', ')}
[작성 전략]: ${strategy}
[질문 재해석]: ${questionReframe}
[승인된 Episode]: ${episodeInfo}
[글자수 제한]: ${charLimit}자

[채용공고 원문]:
${jobPosting}

[자소서 문항]:
${question}

작성 규칙:
1. §9 이중 코딩 기법 필수 적용: 소제목/도입부/마무리에 코드1(내 행동)과 코드2(회사 가치) 동시 반영
2. §11 구체성 기울기: Episode 원본의 고유명사·수치·기간을 정확히 사용
3. §12 분량비율: 도입부 15%, 본문(S-P-A-A-R-L) 70%, 마무리 15%
4. Episode에 없는 경험/사실은 절대 사용 금지
5. 글자수 제한(${charLimit}자)을 반드시 준수

소제목 + 자소서 본문만 출력하세요. JSON이 아닌 일반 텍스트로 작성하세요.`
}

export function buildStep6to8Prompt(
  generatedText: string,
  episodesUsed: string[]
): string {
  const episodeFiles = episodesUsed
    .map((ep) => `episodes/${ep}_*.md`)
    .join(', ')

  return `[Step 6-8: 검증 3종]

다음 자소서에 대해 CLAUDE.md의 Step 6, 7, 8 검증을 수행해주세요.

먼저 다음 파일들을 읽어주세요:
- protocols/ANTI_HALLUCINATION.md (Step 6: 할루시네이션 방지 7개 Hard Gate 체크리스트)
- protocols/FAIL_PATTERNS.md (Step 7: 9개 탈락 패턴 + 5개 체크리스트)
- analysis/generic_storytelling_patterns.md (Step 8: §9 이중 코딩 검증 기준)
- 사용된 Episode 파일: ${episodeFiles}

[자소서 전문]:
${generatedText}

[사용된 Episode]: ${episodesUsed.join(', ')}

검증 수행:
Step 6 (할루시네이션 방지): ANTI_HALLUCINATION.md의 7개 Hard Gate 항목 각각 검증
Step 7 (탈락 패턴): FAIL_PATTERNS.md의 9개 탈락 패턴 해당 여부 + 5개 체크리스트
Step 8 (이중 코딩): §9 기법 적용 여부 — 소제목, 도입부, 문제정의, 결과해석, 마무리

결과를 다음 JSON 형식으로 반환해주세요:
{
  "hallucinationCheck": {
    "items": [
      {"check": "프로젝트명 철자 동일", "passed": true, "detail": "Episode 원본과 비교한 상세 설명"}
    ],
    "overallPassed": true
  },
  "failPatternCheck": {
    "items": [
      {"check": "탈락 패턴 해당 여부", "passed": true, "detail": "상세 설명"}
    ],
    "overallPassed": true,
    "suggestions": ["개선이 필요한 경우 구체적 제안"]
  },
  "dualCodingCheck": {
    "items": [
      {"check": "소제목 이중 코딩", "passed": true, "detail": "코드1(내 행동) + 코드2(회사 가치) 확인"}
    ],
    "overallPassed": true
  }
}`
}

export { GUI_SYSTEM_PROMPT }
