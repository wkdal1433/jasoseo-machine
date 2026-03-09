import { UserProfile } from '../../renderer/src/types/profile';
import { EpisodeStatus } from '../../renderer/src/types/episode';

/**
 * Magic Onboarding Agent
 * 
 * 역할을 수행하는 핵심 모듈입니다:
 * 1. 기존 자소서/이력서(PDF, MD, Text) 내용을 읽어들임.
 * 2. AI를 통해 12개 섹션 프로필을 자동 추출 및 매칭.
 * 3. AI를 통해 본문 내의 경험들을 S-P-A-A-R-L 에피소드로 자동 분해.
 * 4. 각 데이터의 신뢰도/완성도에 따라 피드백 메시지 생성.
 */

export interface OnboardingResult {
  profile: Partial<UserProfile>;
  episodes: Array<{
    title: string;
    content: string; // S-P-A-A-R-L 마크다운
    status: EpisodeStatus;
    reason: string; // 왜 이 상태인지 (부족한 부분 설명)
  }>;
  missingFields: string[]; // 프로필에서 누락된 필드 목록
}

export class OnboardingAgent {
  /**
   * AI 분석용 통합 프롬프트 빌더.
   * 입력된 거대한 텍스트 뭉치에서 프로필과 에피소드를 동시에 채굴합니다.
   */
  public buildExtractionPrompt(rawText: string): string {
    return `
# Role: Expert Data Extraction & Career Profiling Agent

# Mission:
Analyze the provided [Raw Text] which is a user's previous cover letter or resume. 
Extract as much structured information as possible to set up the user's new automated system.

# Raw Text:
${rawText}

# Task 1: Extract 12-Section Profile
Identify name, contact, education (school, major, grade), career (company, role, period), skills, awards, military service, etc.

# Task 2: Carve Out Episodes
Identify distinct stories/experiences in the text. For each experience, format it into S-P-A-A-R-L structure.
- Situation, Problem, Analysis, Action, Result, Learning.
- Rate the completeness: 'ready' (if all parts are clear), 'needs_review' (if some parts are weak), 'draft' (if many parts missing).

# Output Format (JSON ONLY):
{
  "profile": {
    "personal": { "name": "...", "email": "..." },
    "education": [...],
    "career": [...],
    "skills": ["...", "..."],
    "military": { ... }
  },
  "episodes": [
    {
      "title": "Short title for the story",
      "content": "Full S-P-A-A-R-L Markdown content here",
      "status": "ready | needs_review | draft",
      "reason": "Feedback on what is missing or well-written"
    }
  ],
  "missingFields": ["list of profile sections that couldn't be found"]
}
`;
  }
}
