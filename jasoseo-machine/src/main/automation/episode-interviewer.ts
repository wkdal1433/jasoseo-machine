import { UserProfile } from '../../renderer/src/types/profile';

/**
 * Intelligent Episode Interviewer
 * 
 * 1. 사용자의 12개 섹션 프로필을 분석하여 작성할 만한 '경험 훅(Hook)'을 제안합니다.
 * 2. 사용자가 선택한 경험을 S-P-A-A-R-L 구조로 이끌어내기 위해 인터뷰 프롬프트를 생성합니다.
 */

export interface EpisodeIdea {
  title: string;
  theme: string; // 예: "갈등 극복", "기술적 도전"
  hookMessage: string; // 사용자에게 던지는 흥미로운 질문
  suggestedAngle: string;
}

export class EpisodeInterviewer {
  /**
   * 1. 프로필 기반 경험 아이디어 제안 프롬프트
   */
  public buildIdeaSuggestionPrompt(profile: UserProfile): string {
    return `
# Role: Expert Career Consultant & Interviewer

# Mission:
Analyze the user's [Profile Data] and suggest 3 highly attractive "Episode Ideas" that would make excellent stories for a cover letter.

# User Profile Data:
${JSON.stringify(profile, null, 2)}

# Instructions:
1. Find unique combinations in the profile (e.g., specific tech stack + a certain project/internship).
2. Propose exactly 3 distinct episode ideas (e.g., Technical Challenge, Team Conflict, Innovative Problem Solving).
3. The 'hookMessage' should be conversational, making the user think: "Ah, I remember that!"
   (e.g., "카카오 인턴 당시 React를 다루셨네요! 혹시 초기 로딩 속도나 렌더링 최적화를 진행하며 겪었던 기술적 트러블슈팅 경험이 있으신가요?")

# Output Format (Return ONLY the JSON object below):
{
  "ideas": [
    {
      "title": "Short catchy title",
      "theme": "Technical / Teamwork / Growth etc.",
      "hookMessage": "Engaging question based on their profile data...",
      "suggestedAngle": "Why this story is good for recruiters"
    }
  ]
}
`;
  }

  /**
   * 2. 인터뷰 진행을 위한 시스템 프롬프트
   * 채팅 UI에서 챗봇의 시스템 프롬프트로 사용됩니다.
   */
  public getInterviewSystemPrompt(): string {
    return `
You are a friendly but sharp AI Career Consultant helping a user write a cover letter episode using the S-P-A-A-R-L framework.
(Situation - Problem - Analysis - Action - Result - Learning)

Your goal is to extract missing information through a natural conversation.

# Rules:
1. Ask ONLY ONE question at a time.
2. If the user's answer is too vague, ask them to elaborate (especially for 'Action' and quantifiable 'Result').
3. Be highly encouraging.
4. When you have enough information to form a complete S-P-A-A-R-L markdown file, output the final markdown wrapped in \`\`\`markdown tags.
`;
  }
}
