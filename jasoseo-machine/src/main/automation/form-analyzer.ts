import { UserProfile } from '../../renderer/src/types/profile';

/**
 * Intelligent Form Analyzer (Batch Input Agent)
 * 
 * 본 모듈은 반복적인 폼 입력을 증오하는 사용자를 위해 설계되었습니다:
 * 1. 50~100개의 필드를 단 한 번의 스크립트로 일괄 주입.
 * 2. 단순 값 대입을 넘어 React/Vue/Angular의 상태를 강제 업데이트하는 이벤트 시뮬레이션.
 * 3. 보안이 강화된 사이트를 우회하기 위해 사용자 직접 실행(Console) 방식 채택.
 */

export interface MatchResult {
  fieldName: string;
  selector: string;
  value: string | number | boolean;
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'textarea';
  reason: string;
}

export interface FormAnalysisResponse {
  totalMatches: number;
  matches: MatchResult[];
  script: string;
}

export class FormAnalyzer {
  /**
   * 일괄 주입 스크립트 생성을 위한 프롬프트 빌더.
   * 프로필 데이터와 폼 구조를 대조하여 '지능형 통합 스크립트'를 설계합니다.
   */
  public buildBatchPrompt(formStructure: string, profile: UserProfile): string {
    return `
# ROLE: Recruitment Form Automation Specialist (Batch Injection Mode)

# MISSION:
Analyze the provided [Job Application Form Structure] and match it with the [User Profile]. 
Generate a SINGLE, ROBUST JavaScript snippet that fills EVERY possible field in one go.

# USER PROFILE (12 Sections - Source of Truth):
${JSON.stringify(profile, null, 2)}

# JOB APPLICATION FORM (Target Structure - HTML or Text):
${formStructure}

# CORE REQUIREMENTS:
1. **Comprehensive Matching**: Match as many fields as possible (Grade, Major, GPA, Awards, Military, etc.).
2. **Framework Compatibility**: For each field, simulate 'input', 'change', and 'blur' events so that modern frameworks (React/Vue/Angular) detect the change.
3. **Smart Select/Radio**: For choice-based fields, pick the option that best matches the profile.
4. **Single Execution**: The script should be self-executing (IIFE) and provide a summary of what was filled.

# OUTPUT FORMAT (Return ONLY the JSON object below):
{
  "totalMatches": 42,
  "matches": [
    { "fieldName": "Grade", "selector": "#grade_input", "value": "4", "type": "text", "reason": "Matched from education.grade" }
  ],
  "script": "/* Universal Injection Script Here */"
}
`;
  }

  /**
   * 생성된 스크립트에 '상태 업데이트 시뮬레이터' 유틸리티를 결합합니다.
   * 이 유틸리티는 React/Vue 등에서 값이 증발하는 현상을 방지합니다.
   */
  public wrapWithEventSimulator(aiGeneratedScript: string): string {
    return `
(function() {
  console.log('%c🚀 Intelligent Form Filler Agent Active', 'color: #fff; background: #6366f1; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  
  /**
   * 상태 업데이트 유도 유틸리티 (React/Vue/Angular 지원)
   */
  const triggerUpdate = (el) => {
    const events = ['input', 'change', 'blur'];
    events.forEach(name => {
      el.dispatchEvent(new Event(name, { bubbles: true, cancelable: true }));
    });
    
    // React 전용 valueTracker 업데이트 (필수)
    const tracker = el._valueTracker;
    if (tracker) {
      tracker.setValue(el.value);
    }
  };

  /**
   * 개별 필드 주입 로직
   */
  const injectValue = (selector, value, type) => {
    const el = document.querySelector(selector);
    if (!el) return false;
    
    try {
      if (type === 'checkbox' || type === 'radio') {
        el.checked = !!value;
      } else {
        el.value = value;
      }
      
      triggerUpdate(el);
      console.log(\`✅ Filled: \${selector} -> \${value}\`);
      return true;
    } catch (err) {
      console.error(\`❌ Failed: \${selector}\`, err);
      return false;
    }
  };

  // --- AI Generated Logic Starts ---
  ${aiGeneratedScript}
  // --- AI Generated Logic Ends ---

  console.log('%c✨ Batch Filling Completed Successfully!', 'color: #10b981; font-weight: bold; font-size: 14px;');
})();
    `.trim();
  }
}
