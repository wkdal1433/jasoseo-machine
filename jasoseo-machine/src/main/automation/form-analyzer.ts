import { UserProfile } from '../../renderer/src/types/profile';

/**
 * Intelligent Form Analyzer (Batch Input Agent v7.5)
 * 
 * 본 모듈은 동적 HTML 구조에 완벽하게 대응하는 Fuzzy Selector 로직을 탑재했습니다.
 */

export interface MatchResult {
  fieldName: string;
  selectors: string[]; // 다중 선택자 지원
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
   * HTML 전처리: 불필요한 주석, 스크립트 태그 등을 제거하여 AI 컨텍스트 최적화
   */
  private cleanHTML(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 일괄 주입 스크립트 생성을 위한 프롬프트 빌더.
   */
  public buildBatchPrompt(formStructure: string, profile: UserProfile): string {
    const cleanForm = this.cleanHTML(formStructure);

    return `
# ROLE: High-Fidelity Recruitment Form Automator

# MISSION:
Analyze the [Job Application Form] and match it with the [User Profile]. 
Generate a ROBUST JavaScript snippet that fills all fields.

# USER PROFILE (Source of Truth):
${JSON.stringify(profile, null, 2)}

# TARGET FORM STRUCTURE:
${cleanForm}

# CORE REQUIREMENTS:
1. **Fuzzy Selectors (Critical)**: For each field, provide an ARRAY of possible CSS selectors. 
   - Example: ["#user_name", "input[name='nm']", "input[placeholder*='성명']"]
   - Prioritize IDs, then names, then distinctive attributes.
2. **Framework Compatibility**: The runtime provides an 'injectValue(selectors, value, type)' function which handles React/Vue state updates. Use it.
3. **No Auto-Submit**: Never attempt to click submit buttons.

# OUTPUT FORMAT (JSON ONLY):
{
  "totalMatches": 42,
  "matches": [
    { 
      "fieldName": "Name", 
      "selectors": ["#name", "input[name='user_name']"], 
      "value": "장준수", 
      "type": "text", 
      "reason": "Direct match" 
    }
  ],
  "script": "/* Example: injectValue(['#n', '[name=nm]'], 'Value', 'text'); */"
}
`;
  }

  /**
   * 생성된 스크립트에 '상태 업데이트 시뮬레이터' 및 'Fuzzy Selector' 런타임을 결합합니다.
   */
  public wrapWithEventSimulator(aiGeneratedScript: string): string {
    return `
(function() {
  console.log('%c🚀 Magic Auto-Fill Agent v7.5 Active', 'color: #fff; background: #6366f1; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  
  const findElement = (selectors) => {
    if (!Array.isArray(selectors)) selectors = [selectors];
    for (const s of selectors) {
      try {
        const el = document.querySelector(s);
        if (el) return el;
      } catch(e) {}
    }
    return null;
  };

  const triggerUpdate = (el) => {
    const events = ['input', 'change', 'blur'];
    events.forEach(name => el.dispatchEvent(new Event(name, { bubbles: true, cancelable: true })));
    if (el._valueTracker) el._valueTracker.setValue(el.value);
  };

  const injectValue = (selectors, value, type) => {
    const el = findElement(selectors);
    if (!el) {
      console.warn('⚠️ Field not found:', selectors);
      return false;
    }
    
    try {
      if (type === 'checkbox' || type === 'radio') {
        el.checked = !!value;
      } else {
        el.value = value;
      }
      triggerUpdate(el);
      console.log('✅ Filled:', el.name || el.id || selectors[0]);
      return true;
    } catch (err) {
      console.error('❌ Injection failed:', selectors[0], err);
      return false;
    }
  };

  // --- AI Generated Logic ---
  ${aiGeneratedScript}
  // --- End of Logic ---

  console.log('%c✨ Auto-Fill Task Completed!', 'color: #10b981; font-weight: bold;');
})();
    `.trim();
  }
}
