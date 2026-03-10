import { OnboardingResult } from '../../shared/types/automation';

/**
 * Magic Onboarding Agent
 * 
 * 역할을 수행하는 핵심 모듈입니다:
 * 1. 기존 자소서/이력서(PDF, MD, Text) 내용을 읽어들임.
 * 2. AI를 통해 12개 섹션 프로필을 자동 추출 및 매칭.
 * 3. AI를 통해 본문 내의 경험들을 S-P-A-A-R-L 에피소드로 자동 분해.
 * 4. 각 데이터의 신뢰도/완성도에 따라 피드백 메시지 생성.
 */
export class OnboardingAgent {
  /**
   * AI 분석용 통합 프롬프트 빌더.
   * 무가정 원칙(Zero-Assumption)을 적용하여 팩트 기반의 프로필과 에피소드를 추출합니다.
   */
  public buildExtractionPrompt(rawText: string): string {
    return `
# ROLE: High-Fidelity Recruitment Data Auditor

# STRICT PROTOCOL: ANTI-HALLUCINATION (READ CAREFULLY)
You must follow the "Zero-Assumption Rule".
- DO NOT invent, assume, or infer any information not explicitly stated in the [Raw Text].
- If a specific number, technology, or action is missing, leave it blank or mark it as missing.
- " 명시적으로 서술되지 않은 모든 정보는 설령 논리적으로 타당하더라도 사용 불가 "
- Maintain "Quote-Level Fidelity": Use the exact terminology found in the source text.

# MISSION:
Convert the user's previous cover letter or resume into a structured 12-section profile and high-quality S-P-A-A-R-L episodes.

# TASK 1: 12-Section Profile Extraction
Extract personal info, education, career, skills, awards, etc. 
- Only fill fields where clear evidence exists in the text.
- List all sections that are missing in the "missingFields" array.

# TASK 2: S-P-A-A-R-L Episode Mining
Identify distinct experiences. For each, create a Markdown episode following this GOLD STANDARD structure:
## TITLE: [Clear Project Name/Task]
## S - Situation: Context and background.
## P - Problem: The core challenge faced.
## A - Analysis: The reasoning and data behind your decisions.
## A - Action: Specific steps YOU took (verbs, tools used).
## R - Result: Quantitative/Qualitative outcome.
## L - Learning: Personal growth or insights gained.

# QUALITY RATING (Status):
- 'ready': All S-P-A-A-R-L components are present with specific facts and numbers.
- 'needs_review': The story exists but lacks specific numbers or clear 'Analysis'.
- 'draft': Only a vague mention of the event exists. DO NOT fill in the blanks yourself.

# INPUT RAW TEXT:
${rawText}

# OUTPUT FORMAT (JSON ONLY, NO PREAMBLE):
{
  "profile": {
    "personal": { "name": "...", "email": "..." },
    "education": [],
    "career": [],
    "skills": [],
    "military": {}
  },
  "episodes": [
    {
      "title": "...",
      "content": "...",
      "status": "ready | needs_review | draft",
      "reason": "[Crucial] Explain why this status was given based on fact-checking."
    }
  ],
  "missingFields": ["..."]
}
`;
  }
}
