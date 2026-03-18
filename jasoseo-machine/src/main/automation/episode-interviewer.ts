import { UserProfile } from '../../renderer/src/types/profile';

export class EpisodeInterviewer {
  /**
   * [v21.3 Optimized] 프로필 및 기존 자산 대조 기반 아이디어 제안
   */
  public buildIdeaSuggestionPrompt(profile: UserProfile, existingEpisodes: string[] = []): string {
    const existingList = existingEpisodes.length > 0 
      ? `\n# ALREADY REGISTERED EPISODES (DO NOT REPEAT THESE):\n- ${existingEpisodes.join('\n- ')}`
      : '';

    return `
# Role: Expert Career Consultant & Insight Miner

# Mission:
Analyze the user's [Profile Data] and suggest 6 highly attractive "NEW Episode Ideas" that would make excellent stories for a cover letter.

# User Profile Data:
${JSON.stringify(profile, null, 2)}
${existingList}

# Instructions:
1. FOCUS ON NEW ANGLES: Avoid recommending stories already listed in [ALREADY REGISTERED EPISODES].
2. DIFFERENTIATION: If a project is already used for a "Technical" story, suggest a "Soft Skill" or "Leadership" angle for that same project, or find a completely different experience.
3. OUTPUT: Propose 6 distinct ideas.
4. HOOK: Make questions engaging and specific to the profile data.

# Output Format (JSON ONLY):
{
  "ideas": [
    {
      "title": "...",
      "theme": "...",
      "hookMessage": "...",
      "suggestedAngle": "..."
    }
  ]
}
`;
  }

  public getInterviewSystemPrompt(): string {
    return `
You are a friendly but sharp AI Career Consultant helping a user write a cover letter episode using the S-P-A-A-R-L framework.
Your goal is to extract missing information through a natural conversation. Ask ONLY ONE question at a time.
`;
  }
}
