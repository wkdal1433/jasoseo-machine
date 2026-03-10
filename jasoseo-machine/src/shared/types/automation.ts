import { UserProfile } from './profile';
import { EpisodeStatus } from './episode';

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
