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

    // 배열 필드 요약: 항목 수를 AI에게 명시적으로 전달
    const arraySummary = {
      certificates: (profile.certificates || []).map(c => ({ name: c.name, issuer: c.issuer, date: c.date })),
      activities:   (profile.activities   || []).map(a => ({ organization: a.organization, role: a.role, startDate: a.startDate, endDate: a.endDate })),
      awards:       (profile.awards       || []).map(a => ({ name: a.name, issuer: a.issuer, date: a.date })),
      training:     (profile.training     || []).map(t => ({ name: t.name, organization: t.organization })),
      languages:    (profile.languages    || []).map(l => ({ language: l.language, testName: l.testName, grade: l.grade })),
      experience:   (profile.experience   || []).map(e => ({ companyName: e.companyName, startDate: e.startDate, endDate: e.endDate })),
    };

    return `
# ROLE: High-Fidelity Recruitment Form Automator

# MISSION:
Analyze the [Job Application Form] and match it with the [User Profile].
Generate a ROBUST JavaScript snippet that fills ALL fields including ALL array items.

# USER PROFILE (Source of Truth):
${JSON.stringify(profile, null, 2)}

# TARGET FORM STRUCTURE:
${cleanForm}

# CORE REQUIREMENTS:

## 1. Fuzzy Selectors (Critical)
For each field, provide an ARRAY of possible CSS selectors.
- Example: ["#user_name", "input[name='nm']", "input[placeholder*='성명']"]
- Prioritize IDs, then names, then distinctive attributes.

## 2. Array Field Rules (MOST IMPORTANT)
The profile contains multiple items in array fields. You MUST fill ALL of them, not just the first.
Array item counts: ${JSON.stringify(Object.fromEntries(Object.entries(arraySummary).map(([k,v]) => [k, (v as any[]).length])))}

For each array field (certificates, activities, awards, training, languages, experience):
- Step A: If the form shows only 1 row but has an "추가" / "+" / "행 추가" button, call clickAddButton() BEFORE injecting each additional item.
- Step B: Inject items in ORDER (index 0 first, then 1, then 2...).
- Step C: Use the runtime's clickAddButton(selectors) to expand rows.

## 3. Field Mapping Rules (Strict)
Korean recruitment forms follow this EXACT column order. Never swap fields:

자격증 (certificates) row order:
  Column 1 = 자격증명 / 자격증 이름  → certificates[i].name
  Column 2 = 발행기관 / 취득기관     → certificates[i].issuer
  Column 3 = 취득일 / 발행일         → certificates[i].date

활동 (activities) row order:
  Column 1 = 기관명 / 단체명         → activities[i].organization
  Column 2 = 직책 / 역할             → activities[i].role
  Column 3 = 시작일                  → activities[i].startDate
  Column 4 = 종료일                  → activities[i].endDate

수상 (awards) row order:
  Column 1 = 수상명                  → awards[i].name
  Column 2 = 수여기관                → awards[i].issuer
  Column 3 = 수상일                  → awards[i].date

어학 (languages) row order:
  Column 1 = 언어                    → languages[i].language
  Column 2 = 시험명                  → languages[i].testName
  Column 3 = 등급/점수               → languages[i].grade

교육 (training) row order:
  Column 1 = 교육명                  → training[i].name
  Column 2 = 기관명                  → training[i].organization

## 4. Framework Compatibility — Function Selection Rules

Use the correct function for each field type:

| Field Type | Function | When to use |
|------------|----------|-------------|
| 일반 input/textarea/native select | injectValue(selectors, value, type) | placeholder가 있는 일반 입력창, select 태그 |
| 자동완성(Autocomplete) 입력창 | injectAutocomplete(selectors, value, fieldName) | 어학명, 자격증명처럼 "검색결과에서 선택" 방식. 타이핑 후 드롭다운이 뜨는 필드 |
| 커스텀 드롭다운 (li 기반) | injectCustomSelect(selectors, value, fieldName) | select가 아닌 클릭하면 li 목록이 펼쳐지는 커스텀 UI. 활용능력구분, 활용수준, 활용기간 등 |
| 체크박스/라디오 | injectValue(selectors, value, 'checkbox') | boolean 값은 반드시 true/false (문자열 금지) |
| 행 추가 버튼 | clickAddButton(selectors) | "추가" / "+" 버튼. 배열 항목 추가 전 호출 |

- Never attempt to click submit or 저장 buttons.

# OUTPUT FORMAT (JSON ONLY):
{
  "totalMatches": 42,
  "matches": [
    {
      "fieldName": "certificates[0].name",
      "selectors": ["#cert_name_0", "input[name='cert_nm_0']"],
      "value": "정보처리기사",
      "type": "text",
      "reason": "자격증명 첫번째 항목"
    }
  ],
  "script": "/* clickAddButton(['button.add-cert']); injectValue(['#cert_name_0'], '정보처리기사', 'text', 'certificates[0].name'); */"
}
`;
  }

  /**
   * 생성된 스크립트에 '상태 업데이트 시뮬레이터' 및 'Fuzzy Selector (with CORS detection)' 런타임을 결합합니다.
   */
  public wrapWithEventSimulator(aiGeneratedScript: string): string {
    return `
(function() {
  console.log('%c🚀 Magic Auto-Fill Agent v8.0 (Enterprise) Active', 'color: #fff; background: #6366f1; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  
  const corsBlockedFrames = [];
  const failedFields = [];

  /**
   * 모든 프레임(Iframe) 및 Shadow DOM을 순회하며 요소를 찾는 재귀 함수
   */
  const findInAllFrames = (selectors, doc = document, depth = 0) => {
    if (depth > 10) return null; // 깊이 제한 소폭 상향

    // 1. 현재 문서(또는 Shadow Root)에서 찾기
    for (const s of selectors) {
      try {
        const el = doc.querySelector(s);
        if (el) return el;
      } catch(e) {}
    }

    // 2. [v10.5 추가] 현재 문서의 모든 요소를 뒤져서 Shadow Root 내부 탐색
    const allElements = doc.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        const found = findInAllFrames(selectors, el.shadowRoot, depth + 1);
        if (found) return found;
      }
    }

    // 3. 하위 아이프레임들 뒤지기
    const iframes = doc.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
        const found = findInAllFrames(selectors, frameDoc, depth + 1);
        if (found) return found;
      } catch(e) {
        if (!corsBlockedFrames.includes(iframe.src)) {
          corsBlockedFrames.push(iframe.src || 'Unknown Source');
        }
      }
    }
    return null;
  };

  const triggerUpdate = (el) => {
    const events = ['input', 'change', 'blur'];
    events.forEach(name => el.dispatchEvent(new Event(name, { bubbles: true, cancelable: true })));
    if (el._valueTracker) el._valueTracker.setValue(el.value);
  };

  const clickAddButton = (selectors) => {
    if (!Array.isArray(selectors)) selectors = [selectors];
    const btn = findInAllFrames(selectors);
    if (!btn) {
      console.warn('⚠️ 추가 버튼을 찾지 못했습니다:', selectors);
      return false;
    }
    try {
      btn.click();
      console.log(\`➕ 행 추가 클릭: \${selectors[0]}\`);
      return true;
    } catch(e) {
      console.error('❌ 추가 버튼 클릭 실패:', e);
      return false;
    }
  };

  const injectValue = (selectors, value, type, fieldName) => {
    if (!Array.isArray(selectors)) selectors = [selectors];
    const el = findInAllFrames(selectors);

    if (!el) {
      failedFields.push({ name: fieldName || selectors[0], selectors });
      return false;
    }

    try {
      if (type === 'checkbox' || type === 'radio') {
        // "false" 문자열을 boolean false로 처리
        const boolVal = value === true || value === 'true' || value === '1' || value === 'yes';
        el.checked = boolVal;
      } else {
        el.value = value;
      }
      triggerUpdate(el);
      console.log(\`✅ Filled: \${fieldName || el.name || el.id}\`);
      return true;
    } catch (err) {
      console.error('❌ Injection failed:', fieldName, err);
      return false;
    }
  };

  /**
   * Autocomplete(자동완성) 입력창 처리
   * - 값 주입 후 검색 이벤트 발행 → 500ms 후 드롭다운 첫 번째 일치 항목 클릭
   */
  const injectAutocomplete = (selectors, value, fieldName) => {
    if (!Array.isArray(selectors)) selectors = [selectors];
    const el = findInAllFrames(selectors);
    if (!el) {
      failedFields.push({ name: fieldName || selectors[0], selectors });
      return false;
    }
    try {
      el.focus();
      el.value = value;
      ['keydown', 'keypress', 'input', 'keyup', 'change'].forEach(evName => {
        try {
          el.dispatchEvent(new Event(evName, { bubbles: true, cancelable: true }));
        } catch(e) {}
      });
      if (el._valueTracker) el._valueTracker.setValue('');
      console.log(\`🔍 Autocomplete triggered: \${fieldName} = "\${value}"\`);

      setTimeout(() => {
        const container = el.closest('[class*="wrap"], [class*="box"], [class*="group"], form')
                         || el.parentElement?.parentElement || document;
        const trySelectors = [
          '.suggest-list li', '.autocomplete li', '[class*="suggest"] li',
          '[class*="autocomplete"] li', '[class*="list"] li', 'ul[class*="suggest"] > li',
          '[role="listbox"] [role="option"]', '[role="option"]', 'ul > li'
        ];
        let clicked = false;
        for (const s of trySelectors) {
          const items = (container !== document ? container.querySelectorAll(s) : []);
          const globalItems = document.querySelectorAll(s);
          const pool = items.length > 0 ? items : globalItems;
          for (const item of pool) {
            const text = item.textContent.trim();
            if (text && (text.includes(value) || value.includes(text))) {
              item.click();
              console.log(\`✅ Autocomplete selected: \${fieldName} → "\${text}"\`);
              clicked = true;
              break;
            }
          }
          if (clicked) break;
        }
        if (!clicked) {
          console.warn(\`⚠️ Autocomplete 드롭다운 항목 미발견: \${fieldName} = "\${value}" — 수동 입력 필요\`);
          failedFields.push({ name: fieldName || selectors[0], selectors });
        }
      }, 600);
      return true;
    } catch (err) {
      console.error('❌ Autocomplete injection failed:', fieldName, err);
      return false;
    }
  };

  /**
   * 커스텀 드롭다운 (li 기반, native <select> 아님) 처리
   * - 드롭다운 트리거 클릭 → 400ms 후 옵션 텍스트 매칭 클릭
   */
  const injectCustomSelect = (selectors, value, fieldName) => {
    if (!Array.isArray(selectors)) selectors = [selectors];
    const el = findInAllFrames(selectors);
    if (!el) {
      failedFields.push({ name: fieldName || selectors[0], selectors });
      return false;
    }
    try {
      el.click();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      console.log(\`📋 CustomSelect opened: \${fieldName}\`);

      setTimeout(() => {
        const container = el.closest('[class*="select"], [class*="dropdown"], [class*="wrap"], [class*="box"]')
                         || el.parentElement?.parentElement || document;
        const trySelectors = [
          'li', '[role="option"]', '[class*="option"]', '[class*="item"]', 'a'
        ];
        let clicked = false;
        for (const s of trySelectors) {
          const items = container !== document ? container.querySelectorAll(s) : document.querySelectorAll(s);
          for (const item of items) {
            const text = item.textContent.trim();
            if (text && (text === value || text.includes(value) || value.includes(text))) {
              item.click();
              console.log(\`✅ CustomSelect selected: \${fieldName} → "\${text}"\`);
              clicked = true;
              break;
            }
          }
          if (clicked) break;
        }
        if (!clicked) {
          console.warn(\`⚠️ CustomSelect 옵션 미발견: \${fieldName} = "\${value}" — 수동 선택 필요\`);
          failedFields.push({ name: fieldName || selectors[0], selectors });
        }
      }, 500);
      return true;
    } catch (err) {
      console.error('❌ CustomSelect injection failed:', fieldName, err);
      return false;
    }
  };

  // --- AI Generated Logic ---
  ${aiGeneratedScript}
  // --- End of Logic ---

  console.log('%c✨ Auto-Fill Task Completed!', 'color: #10b981; font-weight: bold; font-size: 14px;');
  
  if (corsBlockedFrames.length > 0) {
    console.warn('%c🛡️ 보안 영역(CORS) 감지:', 'color: #f59e0b; font-weight: bold;', 
      '일부 입력창이 보안 아이프레임 안에 있어 자동 입력이 차단되었습니다.\\n' +
      '다음 필드들은 직접 복사해서 입력해 주세요:\\n', 
      failedFields.map(f => \`- \${f.name}\`).join('\\n')
    );
  } else if (failedFields.length > 0) {
    console.log('%c📝 미입력 필드 안내:', 'color: #6366f1; font-weight: bold;', 
      failedFields.map(f => \`- \${f.name}\`).join('\\n')
    );
  }
})();
    `.trim();
  }
}
