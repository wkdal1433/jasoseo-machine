/**
 * Intelligent Company & Recruitment Analyst
 * 
 * 역할을 수행하는 핵심 모듈입니다:
 * 1. 현재 시점(Target Date)을 기반으로 최신 채용 공고 및 기업 정보를 인터넷에서 검색.
 * 2. 수집된 정보에서 인재상, 모집요건, 우대사항(JD)을 추출.
 * 3. 사용자에게 제안할 후보 리스트와 출처 링크를 정제.
 */

export interface CompanyAnalysisResponse {
  companyName: string;
  recruitmentSeason: string; // 예: 2026년 상반기
  foundLinks: { title: string; url: string }[];
  hiringValues: string[]; // 인재상/핵심가치
  preferredQualifications: string[]; // 우대사항/직무요건
  analysisNote: string;
}

export class CompanyAnalyst {
  /**
   * 시점 고정을 위한 검색 쿼리를 생성합니다.
   * 사용자님이 우려한 '과거 데이터 회피'를 위해 날짜를 강제로 닻(Anchor)으로 삼습니다.
   */
  public buildSearchQuery(companyName: string, currentDate: string, additionalContext?: string): string {
    const base = `${companyName} ${currentDate} 상반기 채용 공고 인재상 모집요강 우대사항 직무기술서(JD) 분석`;
    return additionalContext ? `${base} ${additionalContext}` : base;
  }

  /**
   * AI(Claude/Gemini)에게 검색 결과를 분석하도록 지시하는 프롬프트를 빌드합니다.
   */
  public buildAnalysisPrompt(companyName: string, searchResult: string, currentDate: string, additionalContext?: string): string {
    const additionalSection = additionalContext
      ? `\n# Additional Focus (User Request):\n${additionalContext}\nPay extra attention to this aspect when extracting data.\n`
      : '';
    return `
# Role: Expert Recruitment Data Analyst

# Context:
Today is ${currentDate}. You are analyzing recruitment data for "${companyName}".

# Mission:
Based on the provided [Search Results], extract the most accurate and UP-TO-DATE information for the 2026 recruitment season.
DO NOT use data from 2024 or 2025 unless it is explicitly stated that the core values remain unchanged for 2026.
${additionalSection}
# Search Results:
${searchResult}

# Instructions:
1. Identify the "Recruitment Season" (e.g., 2026 First Half).
2. List 3-5 high-quality source links (Career page, News, Blog analysis).
3. Extract "Hiring Values" (Company Vision, Core Values, Talent Traits).
4. Extract "Preferred Qualifications" (Specific skills, technologies, or experiences highly valued in this season).
5. Ensure all data is relevant as of ${currentDate}.

# Output Format (JSON ONLY):
{
  "companyName": "${companyName}",
  "recruitmentSeason": "...",
  "foundLinks": [{ "title": "...", "url": "..." }],
  "hiringValues": ["...", "..."],
  "preferredQualifications": ["...", "..."],
  "analysisNote": "..."
}
`;
  }
}
