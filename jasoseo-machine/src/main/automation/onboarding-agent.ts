import { OnboardingResult } from '../../shared/types/automation';

export class OnboardingAgent {
  /**
   * 파일 내용을 직접 받아서 분석하는 프롬프트 (Gemini/Claude 공용)
   */
  public buildExtractionPromptFromContent(fileContent: string): string {
    return `
# ROLE: High-Fidelity Recruitment Data Auditor

# MISSION:
Analyze the following resume/cover letter document and extract structured information.
You must be robust enough to handle various career levels, education backgrounds, and document layouts.

# DOCUMENT CONTENT:
\`\`\`
${fileContent.slice(0, 15000)}
\`\`\`

${this.getCommonInstructions()}`
  }

  /**
   * AI에게 파일 경로를 전달하고 직접 읽어서 분석하도록 지시하는 프롬프트 (Claude Code 전용)
   */
  public buildExtractionPrompt(filePath: string): string {
    return `
# ROLE: High-Fidelity Recruitment Data Auditor (AI-Native Mode)

# MISSION:
Please use your tool to READ the PDF/MD file at the following path:
"""${filePath}"""

Analyze the content and extract structured information to set up the user's automated system.
You must be robust enough to handle various career levels, education backgrounds, and document layouts.

${this.getCommonInstructions()}`;
  }

  private getCommonInstructions(): string {
    return `# STRICT PROTOCOL: ANTI-HALLUCINATION
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

# OUTPUT JSON SCHEMA:
{
  "profile": {
    "personal": { "name": "string|null", "birthDate": "string|null", "email": "string|null", "mobile": "string|null", "address": "string|null", "gender": "male|female|null" },
    "education": [{"name": "string", "major": "string", "startDate": "string", "endDate": "string", "status": "string", "gpa": "string|null"}],
    "experience": [{"companyName": "string", "jobCategory": "string", "startDate": "string", "endDate": "string", "description": "string"}],
    "skills": ["string"],
    "activities": [{"organization": "string", "startDate": "string", "endDate": "string", "description": "string"}],
    "training": [{"name": "string", "organization": "string", "description": "string"}],
    "certificates": [{"name": "string", "issuer": "string", "date": "string"}],
    "languages": [{"language": "string", "testName": "string", "grade": "string", "date": "string"}],
    "awards": [{"name": "string", "issuer": "string", "date": "string"}],
    "overseas": [{"country": "string", "description": "string"}],
    "portfolio": [{"label": "string", "path": "string"}],
    "preferences": { "isVeteran": "boolean", "isDisabled": "boolean", "military": { "status": "string", "branch": "string", "rank": "string", "startDate": "string", "endDate": "string" } }
  },
  "episodes": [
    { "title": "string", "content": "string", "status": "ready|needs_review|draft", "reason": "string" }
  ],
  "missingFields": ["string"]
}`;
  }
}
