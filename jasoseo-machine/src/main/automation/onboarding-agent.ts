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
   * AI에게 파일 경로를 전달하고 직접 읽어서 분석하도록 지시하는 프롬프트입니다. (v20.0 AI-Native 방식)
   */
  public buildExtractionPrompt(filePath: string): string {
    return `
# ROLE: High-Fidelity Recruitment Data Auditor (AI-Native Mode)

# MISSION:
Please use your tool to READ the PDF/MD file at the following path:
"""${filePath}"""

Analyze the content and extract structured information to set up the user's automated system.

# STRICT PROTOCOL: ANTI-HALLUCINATION
- FOLLOW THE "ZERO-ASSUMPTION RULE" RIGIDLY.
- " 명시적으로 서술되지 않은 모든 정보는 설령 논리적으로 타당하더라도 사용 불가 "
- Maintain "Quote-Level Fidelity": Use the exact terminology from the source.

# TASK 1: 12-Section Profile Extraction
Extract personal info, education, career, skills, awards, etc. 
- Only fill fields where clear evidence exists in the text you read.
- List all missing sections in "missingFields".

# TASK 2: S-P-A-A-R-L Episode Mining
Identify distinct stories from the file. Format each into the GOLD STANDARD S-P-A-A-R-L structure.
- DO NOT summarize too much; retain the technical details and specific actions.

# QUALITY RATING (Status):
- 'ready': Complete facts, specific numbers, and clear reasoning present.
- 'needs_review': Story exists but lacks data points or 'Analysis' depth.
- 'draft': Vague mention only. DO NOT fill in the blanks yourself.

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
      "reason": "[Crucial] Detailed reasoning for this status."
    }
  ],
  "missingFields": ["..."]
}
`;
  }
}
