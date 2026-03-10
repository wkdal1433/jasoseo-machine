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
   * 텍스트 전처리: 불필요한 공백 및 중복 줄바꿈을 제거하여 토큰 효율을 높입니다.
   */
  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 연속된 공백을 하나로 축소
      .replace(/\n+/g, '\n') // 연속된 줄바꿈을 하나로 축소
      .trim();
  }

  /**
   * AI 분석용 통합 프롬프트 빌더.
   * 섹션별 분할 분석(Sectional Analysis) 기법을 도입하여 대용량 데이터 대응력을 강화합니다.
   */
  public buildExtractionPrompt(rawText: string): string {
    const cleanText = this.preprocessText(rawText);
    
    return `
# ROLE: High-Fidelity Recruitment Data Auditor (Large-Scale Mode)

# STRICT PROTOCOL: ANTI-HALLUCINATION
- FOLLOW THE "ZERO-ASSUMPTION RULE" RIGIDLY.
- " 명시적으로 서술되지 않은 모든 정보는 설령 논리적으로 타당하더라도 사용 불가 "
- Maintain "Quote-Level Fidelity": Use the exact terminology from the source.

# MISSION:
Analyze the provided [Raw Text] by mentally segmenting it into [1. Personal/Education], [2. Professional Experience/Projects], and [3. Essay/Cover Letter Content].
Extract as much structured information as possible without missing details in long context.

# TASK 1: 12-Section Profile Extraction
Focus on sections 1 & 2 of the text. 
- Only fill fields where clear evidence exists.
- List all missing sections in "missingFields".

# TASK 2: S-P-A-A-R-L Episode Mining
Focus on sections 2 & 3 of the text.
Identify distinct stories. Format each into the GOLD STANDARD S-P-A-A-R-L structure.
- DO NOT summarize too much; retain the technical details and specific actions.

# QUALITY RATING (Status):
- 'ready': Complete facts, specific numbers, and clear reasoning present.
- 'needs_review': Story exists but lacks data points or 'Analysis' depth.
- 'draft': Vague mention only. DO NOT fill in the blanks yourself.

# INPUT RAW TEXT (Pre-processed):
${cleanText}

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
