/**
 * Intelligent Form Agent - Core Brain
 * 
 * 역할을 분리하여 기존 9-Step 워크플로우에 영향을 주지 않는 독립 모듈로 설계됨.
 * HTML 폼 구조를 분석하여 사용자 프로필(12개 섹션)과의 매핑 관계를 결정하는 AI 엔진.
 */

import { UserProfile } from '../../renderer/src/types/profile';

export interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  tagName: 'INPUT' | 'TEXTAREA' | 'SELECT';
}

export interface MappingResult {
  fieldId: string;
  value: any;
  reason: string;
}

/**
 * AI를 위한 시스템 프롬프트 생성 (형식 격리)
 */
export function buildAnalysisPrompt(profile: UserProfile, fields: FormField[]): string {
  return `
You are an expert recruitment system automation agent.
Your mission is to map the user's profile data to the specific HTML form fields of a job application site.

[User Profile Data]
${JSON.stringify(profile, null, 2)}

[Target HTML Form Fields]
${JSON.stringify(fields, null, 2)}

[Instructions]
1. Analyze each field's id, name, label, and placeholder.
2. Find the most appropriate data from the User Profile.
3. For fields like "Grade" (학년), extract only the relevant part (e.g., "4" from "University 4th year").
4. If a field is a "Checkbox" or "Select", choose the best matching option value.
5. Return ONLY a JSON array of MappingResult: [{ "fieldId": "...", "value": "...", "reason": "..." }]

Ensure absolute accuracy. If you are unsure, do not map the field.
  `.trim();
}
