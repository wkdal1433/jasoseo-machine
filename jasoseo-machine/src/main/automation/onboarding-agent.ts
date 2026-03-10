import { OnboardingResult } from '../../shared/types/automation';

export class OnboardingAgent {
  /**
   * [v20.8 Generalized Robust Mode]
   * 특정 키워드 과적합을 피하고, 문서의 구조적 패턴을 분석하여 데이터를 추출합니다.
   */
  public buildExtractionPrompt(filePath: string): string {
    return `
# ROLE: Professional Recruitment Data Auditor & Structural Parser

# MISSION:
Analyze the document at """${filePath}""" and convert it into a standardized JSON profile.
You must be robust enough to handle various career levels, education backgrounds, and document layouts.

# ANALYSIS STRATEGY (Pattern-Based):
1. ANCHOR SEARCH: Identify "Structural Anchors" like Headers, Sidebars, and Sections. Look for clusters of contact info, dates, and bulleted lists.
2. ENTITY RECOGNITION:
   - CONTACT: Find strings matching phone number patterns (regardless of format), emails, and address-like strings.
   - CHRONOLOGY: Group dates with their associated organizations/roles (Education, Career, Activities).
   - ASSET LISTS: Treat any repetitive list (prefixed by dates, bullets, or icons) as potential Certificates, Skills, or Awards.
3. CONTEXTUAL MAPPING: 
   - If a word is "OPIc" or "TOEIC", map to "languages".
   - If a section mentions "군", "육군", "전역", map to "military".
   - If data is sparse, look into the Page Headers or Footers.

# STRICT RULES:
- OPTIONALITY: If a specific field (e.g., awards, languages) is not present, return an empty array []. DO NOT hallucinate.
- FIDELITY: Use the EXACT strings from the source for names, dates, and numbers.
- COMPLETENESS: Exhaustively scan the ENTIRE document. Do not stop after the first page.

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
}
`;
  }
}
