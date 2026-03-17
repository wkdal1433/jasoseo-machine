(async function() {
  console.log('%c🧙‍♂️ Jasoseo Machine: Hands of God Active', 'color: #4f46e5; font-weight: bold;');

  // HMAC 서명 생성 헬퍼
  async function makeSignature(secret, body = {}) {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(7);
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(`${timestamp}:${nonce}:${JSON.stringify(body)}`);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { timestamp, nonce, signature };
  }

  async function bridgePost(port, secret, path, body = {}) {
    const { timestamp, nonce, signature } = await makeSignature(secret, body);
    const response = await fetch(`http://localhost:${port}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jasoseo-signature': signature,
        'x-jasoseo-timestamp': timestamp,
        'x-jasoseo-nonce': nonce
      },
      body: JSON.stringify(body)
    });
    return response.json();
  }

  // 프로필 필드 자동 매칭 — label/aria-label/placeholder/부모텍스트 다중 전략
  function fillProfileFields(profile) {
    if (!profile) return [];
    const p = profile.personal || {};
    const edu = (profile.education || [])[0] || {};
    const exp = (profile.experience || [])[0] || {};

    // [키워드 그룹] → 값 매핑 (프로필에 있는 모든 필드 커버)
    const fieldRules = [
      { keys: ['이름', '성명', '한글명', '한글이름', '성함'], value: p.name },
      { keys: ['생년월일', '생년', '출생일', 'birth'], value: p.birthDate },
      { keys: ['이메일', 'email', 'e-mail', 'e_mail', '메일'], value: p.email },
      { keys: ['휴대폰', '휴대전화', '핸드폰', '휴대번호', 'mobile', 'cell'], value: p.mobile },
      { keys: ['전화', '집전화', '전화번호', 'phone', 'tel'], value: p.phone || p.mobile },
      { keys: ['연락처'], value: p.mobile || p.phone },
      { keys: ['주소', 'address'], value: p.address },
      { keys: ['학교', '대학교', '학교명', '출신학교', '최종학교'], value: edu.name },
      { keys: ['전공', '학과', '학부', '주전공'], value: edu.major },
      { keys: ['학점', '평점', 'gpa', '성적'], value: edu.gpa },
      { keys: ['직장', '회사', '직전직장', '직전회사', '회사명'], value: exp.companyName },
      { keys: ['직무', '담당업무', '업무내용'], value: exp.jobCategory },
    ].filter(r => r.value);

    // 입력 요소의 라벨 텍스트를 여러 방법으로 가져오기
    function getLabelText(input) {
      // 1. <label for="id">
      if (input.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (lbl) return lbl.textContent.trim();
      }
      // 2. aria-label 속성
      const ariaLabel = input.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;
      // 3. placeholder
      if (input.placeholder) return input.placeholder;
      // 4. 부모 <label>
      let node = input.parentElement;
      while (node && node !== document.body) {
        if (node.tagName === 'LABEL') return node.textContent.replace(input.value || '', '').trim();
        node = node.parentElement;
      }
      // 5. 가까운 조상에서 짧은 텍스트 형제 탐색 (최대 4레벨)
      node = input.parentElement;
      for (let i = 0; i < 4 && node && node !== document.body; i++) {
        for (const child of node.children) {
          if (child.contains(input)) continue;
          const t = child.textContent.trim();
          if (t.length > 0 && t.length < 30 && !t.includes('\n')) return t;
        }
        node = node.parentElement;
      }
      return '';
    }

    // React/Vue 네이티브 setter로 값 주입
    function setNativeValue(input, value) {
      const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value');
      if (setter && setter.set) setter.set.call(input, value);
      else input.value = value;
      ['input', 'change', 'blur'].forEach(e => input.dispatchEvent(new Event(e, { bubbles: true })));
    }

    let filledCount = 0;
    const selectors = 'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])';
    document.querySelectorAll(selectors).forEach(input => {
      if (input.disabled || input.readOnly) return;
      const style = window.getComputedStyle(input);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (input.offsetWidth === 0) return;
      if (input.value) return; // 이미 채워진 필드는 건드리지 않음

      const rawLabel = getLabelText(input);
      if (!rawLabel) return;
      const label = rawLabel.toLowerCase().replace(/[\s\*\(\)\[\]]/g, '');

      const rule = fieldRules.find(r => r.keys.some(k => label.includes(k.replace(/\s/g, ''))));
      if (rule) {
        setNativeValue(input, rule.value);
        filledCount++;
        console.log(`✅ 프로필 채움: "${rawLabel}" → "${rule.value}"`);
      }
    });
    console.log(`[프로필] ${filledCount}개 필드 채움`);
    return [];
  }

  // "0 / 1000" 형태의 글자수 카운터를 공통 조상에서 탐색 → 자소서 textarea 판별에 사용
  function findNearbyCharLimit(ta) {
    let ancestor = ta.parentElement;
    for (let i = 0; i < 8 && ancestor; i++) {
      for (const leaf of ancestor.querySelectorAll('*')) {
        if (leaf.children.length > 0) continue;
        const m = leaf.textContent.trim().match(/^\d+\s*[\/\|]\s*(\d+)$/);
        if (m) return parseInt(m[1]);
      }
      ancestor = ancestor.parentElement;
    }
    return null;
  }

  function findLabelText(el) {
    // 1) id 기반 <label for="...">
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) return lbl.textContent.trim();
    }
    // 2) 부모 중 <label>
    let p = el.parentElement;
    while (p) {
      if (p.tagName === 'LABEL') return p.textContent.replace(el.value || '', '').trim();
      p = p.parentElement;
    }
    // 3) el → 부모 → 조부모 순으로 이전 형제 탐색 (최대 6레벨)
    // 안내문/글자수 제한 텍스트는 건너뜀
    const instructionPattern = /최소|최대|자 이내|자 이상|글자.*입력|입력.*글자|서술.*해주세요|작성.*해주세요|\d+자.*내로|\d+자.*이내/;
    let node = el;
    for (let depth = 0; depth < 6; depth++) {
      let prev = node.previousElementSibling;
      while (prev) {
        const t = prev.textContent.trim();
        if (t.length >= 15 && t.length <= 600 && !instructionPattern.test(t)) return t;
        prev = prev.previousElementSibling;
      }
      if (!node.parentElement) break;
      node = node.parentElement;
    }
    return '';
  }

  // 자소서 문항 추출: textarea + label 쌍을 스캔해서 question + charLimit 반환
  function extractCoverLetterQuestions() {
    const questions = [];
    const visited = new Set();

    document.querySelectorAll('textarea').forEach(ta => {
      if (ta.offsetHeight < 60) return;
      const style = window.getComputedStyle(ta);
      if (style.display === 'none' || style.visibility === 'hidden') return;

      if (visited.has(ta)) return;
      visited.add(ta);

      // 1차 필터: "N / 1000" 카운터로 자소서 textarea 판별
      //   카운터가 있으면 해당 limit 사용, 없으면 maxlength 속성으로 폴백
      const nearbyLimit = findNearbyCharLimit(ta);
      const maxLenAttr = ta.getAttribute('maxlength');
      const maxLen = maxLenAttr ? parseInt(maxLenAttr) : null;

      // 카운터가 있는데 200 미만이면 자소서가 아님 (학력·경력 단문 등)
      if (nearbyLimit !== null && nearbyLimit < 200) return;
      // 카운터도 없고 maxlength도 없으면 자소서로 간주 (제한 없는 경우)
      // 카운터 없이 maxlength만 있고 200 미만이면 제외
      if (nearbyLimit === null && maxLen !== null && maxLen < 200) return;

      const charLimit = nearbyLimit ?? maxLen;

      const labelText = findLabelText(ta);
      if (!labelText) return;
      // placeholder 폴백이면 실제 질문을 못 찾은 것 → 건너뜀
      if (labelText === ta.placeholder) return;

      // 글자수 제한 추출: "지원동기 (800자 이내)" → 800  (카운터 우선, 없으면 레이블에서)
      const charLimitMatch = labelText.match(/(\d{3,4})\s*자/);
      const finalCharLimit = charLimit ?? (charLimitMatch ? parseInt(charLimitMatch[1]) : null);

      // 순수 문항 텍스트 (글자수 부분 제거)
      const question = labelText.replace(/[\(\（][^)\）]*\d+\s*자[^\)\）]*[\)\）]/g, '').trim();

      if (question.length > 10) {
        questions.push({ question, charLimit: finalCharLimit });
      }
    });

    return questions;
  }

  // ── 버튼 표시/숨김 상태 관리 ──────────────────────────────────────────
  const STORAGE_KEY = 'jasoseoButtonsVisible';

  // 컨테이너: 두 버튼을 함께 감싸서 한 번에 show/hide
  const btnContainer = document.createElement('div');
  Object.assign(btnContainer.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px'
  });
  document.body.appendChild(btnContainer);

  // 1. 플로팅 버튼 생성
  const btn = document.createElement('button');
  btn.innerText = '✨ 자동 입력';
  Object.assign(btn.style, {
    padding: '12px 20px', background: '#4f46e5', color: 'white',
    border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.3s', fontSize: '14px'
  });
  btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';

  // 1-b. "📋 문항 추출" 버튼
  const extractBtn = document.createElement('button');
  extractBtn.innerText = '📋 문항 추출';
  Object.assign(extractBtn.style, {
    padding: '10px 18px', background: '#0891b2', color: 'white',
    border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.3s', fontSize: '13px'
  });
  extractBtn.onmouseover = () => extractBtn.style.transform = 'scale(1.05)';
  extractBtn.onmouseout = () => extractBtn.style.transform = 'scale(1)';

  // 1-c. 숨기기 버튼 (작은 ×)
  const hideBtn = document.createElement('button');
  hideBtn.innerText = '× 숨기기';
  Object.assign(hideBtn.style, {
    padding: '4px 10px', background: 'rgba(0,0,0,0.35)', color: 'white',
    border: 'none', borderRadius: '20px', cursor: 'pointer',
    fontSize: '11px', alignSelf: 'flex-end', transition: 'background 0.2s'
  });
  hideBtn.onmouseover = () => hideBtn.style.background = 'rgba(0,0,0,0.6)';
  hideBtn.onmouseout = () => hideBtn.style.background = 'rgba(0,0,0,0.35)';

  btnContainer.appendChild(hideBtn);
  btnContainer.appendChild(extractBtn);
  btnContainer.appendChild(btn);

  // 1-d. 복원 미니 버튼 (숨겨진 상태에서 우하단에 작게 표시)
  const showBtn = document.createElement('button');
  showBtn.innerText = '자소서M';
  Object.assign(showBtn.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
    padding: '6px 12px', background: '#4f46e5', color: 'white',
    border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer',
    fontSize: '11px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'none', opacity: '0.7'
  });
  showBtn.onmouseover = () => showBtn.style.opacity = '1';
  showBtn.onmouseout = () => showBtn.style.opacity = '0.7';
  document.body.appendChild(showBtn);

  // ── 표시/숨김 헬퍼 ──────────────────────────────────────────────────
  function setVisible(visible) {
    btnContainer.style.display = visible ? 'flex' : 'none';
    showBtn.style.display = visible ? 'none' : 'block';
    chrome.storage.local.set({ [STORAGE_KEY]: visible });
  }

  hideBtn.onclick = () => setVisible(false);
  showBtn.onclick = () => setVisible(true);

  // 초기 상태 로드 (기본값: 표시)
  chrome.storage.local.get([STORAGE_KEY], (res) => {
    const visible = res[STORAGE_KEY] !== false;
    btnContainer.style.display = visible ? 'flex' : 'none';
    showBtn.style.display = visible ? 'none' : 'block';
  });

  // 팝업에서 상태 변경 시 실시간 반영
  chrome.storage.onChanged.addListener((changes) => {
    if (STORAGE_KEY in changes) {
      const visible = changes[STORAGE_KEY].newValue !== false;
      btnContainer.style.display = visible ? 'flex' : 'none';
      showBtn.style.display = visible ? 'none' : 'block';
    }
  });

  // textarea 주변 컨텍스트만 추출 (Gemini에 보낼 최소 HTML)
  function captureFormHtml() {
    const tas = Array.from(document.querySelectorAll('textarea')).filter(ta => {
      if (ta.offsetHeight < 40) return false;
      const s = window.getComputedStyle(ta);
      return s.display !== 'none' && s.visibility !== 'hidden';
    });

    if (tas.length === 0) {
      // textarea가 없으면 body 전체 축약본
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script, style, svg, noscript, iframe').forEach(el => el.remove());
      clone.querySelectorAll('img').forEach(el => el.removeAttribute('src'));
      return clone.innerHTML.slice(0, 20000);
    }

    // 각 textarea의 공통 조상 컨테이너를 찾아서 그 innerHTML만 수집
    const parts = [];
    const seen = new Set();
    for (const ta of tas) {
      // textarea 기준 최대 8레벨 위 조상 중 가장 가까운 section/div/form 사용
      let node = ta.parentElement;
      for (let i = 0; i < 8 && node && node !== document.body; i++) {
        const tag = node.tagName.toLowerCase();
        if (['section', 'article', 'form', 'fieldset'].includes(tag) || node.offsetHeight > 200) break;
        node = node.parentElement;
      }
      const container = node || ta.parentElement;
      if (container && !seen.has(container)) {
        seen.add(container);
        const clone = container.cloneNode(true);
        clone.querySelectorAll('script, style, svg, noscript, iframe').forEach(el => el.remove());
        clone.querySelectorAll('img').forEach(el => el.removeAttribute('src'));
        parts.push(clone.outerHTML);
      }
    }
    return parts.join('\n').slice(0, 30000);
  }

  // 1-b 클릭: Gemini로 문항 분석 → 앱으로 전송 + 프로필 자동 입력
  extractBtn.onclick = async () => {
    extractBtn.disabled = true;
    extractBtn.innerText = '⏳ AI 분석 중...';

    try {
      const config = await chrome.storage.local.get(['bridgePort', 'bridgeSecret']);
      if (!config.bridgePort || !config.bridgeSecret) {
        alert('확장 프로그램 설정에서 포트와 보안 키를 먼저 등록해 주세요!');
        return;
      }
      const port = config.bridgePort;
      const secret = config.bridgeSecret;

      // 폼 입력 필드 메타데이터 수집 (Gemini에 보낼 경량 구조체)
      const formInputs = [];
      const selectors = 'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])';
      document.querySelectorAll(selectors).forEach((input) => {
        if (input.disabled || input.readOnly) return;
        const style = window.getComputedStyle(input);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (input.offsetWidth === 0) return;
        if (input.value) return;

        // 라벨 텍스트 수집 — fillProfileFields의 getLabelText와 동일한 5가지 전략 적용
        let labelText = '';
        // 1. <label for="id">
        if (input.id) {
          try {
            const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
            if (lbl) labelText = lbl.textContent.trim();
          } catch {}
        }
        // 2. aria-label
        if (!labelText) labelText = input.getAttribute('aria-label') || '';
        // 3. placeholder
        if (!labelText) labelText = input.placeholder || '';
        // 4. 부모 <label>
        if (!labelText) {
          let node = input.parentElement;
          while (node && node !== document.body) {
            if (node.tagName === 'LABEL') { labelText = node.textContent.replace(input.value || '', '').trim(); break; }
            node = node.parentElement;
          }
        }
        // 5. 가까운 조상의 형제 텍스트
        if (!labelText) {
          let node = input.parentElement;
          outer: for (let i = 0; i < 4 && node && node !== document.body; i++) {
            for (const child of node.children) {
              if (child.contains(input)) continue;
              const t = child.textContent.trim();
              if (t.length > 0 && t.length < 30 && !t.includes('\n')) { labelText = t; break outer; }
            }
            node = node.parentElement;
          }
        }

        const idx = formInputs.length;
        input.setAttribute('data-fill-idx', idx);
        formInputs.push({
          idx,
          id: input.id || null,
          name: input.getAttribute('name') || null,
          labelText: labelText.replace(/[*\s]+/g, ' ').trim(),
          placeholder: input.placeholder || null,
          ariaLabel: input.getAttribute('aria-label') || null,
        });
      });

      // AI 폼 분석 + 프로필 매핑 분석 병렬 실행
      // 프로필 매핑은 최대 40초 — 초과 시 그냥 건너뜀
      const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'timeout' }), ms))
      ]);

      const html = captureFormHtml();
      const [profileRes, profileFillResult, analyzeResult] = await Promise.allSettled([
        bridgePost(port, secret, '/get-profile').catch(() => null),
        formInputs.length > 0
          ? bridgePost(port, secret, '/analyze-profile-fill', { inputs: formInputs })
          : Promise.resolve({ success: false }),
        bridgePost(port, secret, '/analyze-form', { html })
      ]);

      const profile = (profileRes.status === 'fulfilled' && profileRes.value?.success)
        ? profileRes.value.profile
        : null;

      // 1단계: AI 매핑으로 채울 수 있는 필드 채움 (매칭 안 된 필드는 건너뜀)
      console.log('[디버그] profileFillResult:', JSON.stringify(profileFillResult));
      const aiFills = (profileFillResult.status === 'fulfilled' && profileFillResult.value?.success)
        ? profileFillResult.value.fills || []
        : [];
      aiFills.forEach(({ idx, value }) => {
        const input = document.querySelector(`[data-fill-idx="${idx}"]`);
        if (!input || !value) return;
        const proto = window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value');
        if (setter && setter.set) setter.set.call(input, value);
        else input.value = value;
        ['input', 'change', 'blur'].forEach(e => input.dispatchEvent(new Event(e, { bubbles: true })));
        console.log(`✅ AI 프로필 채움: idx=${idx} → "${value}"`);
      });
      console.log(`[프로필] AI ${aiFills.length}개 채움`);

      // 2단계: 키워드 매칭으로 나머지 표준 필드 보완
      // (이미 AI가 채운 필드는 input.value 있어서 자동 스킵됨)
      if (profile) {
        fillProfileFields(profile);
      } else {
        console.log('[프로필] 프로필 정보 없음 — 키워드 보완 생략');
      }

      if (analyzeResult.status !== 'fulfilled' || !analyzeResult.value?.success) {
        // AI 분석 실패 시 rule-based 폴백
        console.warn('⚠️ AI 분석 실패, rule-based 폴백:', analyzeResult);
        const questions = extractCoverLetterQuestions();
        if (questions.length === 0) {
          alert('자소서 입력창을 찾지 못했습니다.\n지원서 작성 페이지에서 눌러주세요.');
          return;
        }
        const result = await bridgePost(port, secret, '/submit-extracted-questions', { questions });
        if (!result?.success) throw new Error(result?.error || '전송 실패');
        extractBtn.innerText = `✅ ${questions.length}개 전송! (폴백)`;
        return;
      }

      const questions = analyzeResult.value.questions; // [{question, charLimit, order}]
      if (!questions || questions.length === 0) {
        alert('자소서 문항을 찾지 못했습니다.\n지원서 작성 페이지에서 눌러주세요.');
        return;
      }

      console.log('📋 AI 추출 문항:', questions);

      // 앱으로 전송 (charLimit만 있으면 됨)
      const toSend = questions.map(q => ({ question: q.question, charLimit: q.charLimit ?? null }));
      const result = await bridgePost(port, secret, '/submit-extracted-questions', { questions: toSend });
      if (result?.success) {
        extractBtn.innerText = `✅ ${questions.length}개 전송!`;
      } else {
        throw new Error(result?.error || '전송 실패');
      }
    } catch (err) {
      alert('문항 추출 실패: ' + err.message);
      extractBtn.innerText = '❌ 실패';
    } finally {
      setTimeout(() => {
        extractBtn.disabled = false;
        extractBtn.innerText = '📋 문항 추출';
      }, 5000);
    }
  };

  // 문자열 정규화 (공백 제거, 소문자)
  function normalizeText(s) {
    return s.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // 두 질문 텍스트가 충분히 유사한지 판단 (앞 40자 포함 관계)
  function questionsMatch(stored, found) {
    const a = normalizeText(stored);
    const b = normalizeText(found);
    if (a === b) return true;
    const prefix = Math.min(40, Math.min(a.length, b.length));
    if (prefix >= 10 && a.slice(0, prefix) === b.slice(0, prefix)) return true;
    return false;
  }

  // textarea에 값을 React/Vue 호환 방식으로 채움
  function fillTextarea(ta, text) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (setter) setter.set.call(ta, text);
    else ta.value = text;
    ['input', 'change', 'keyup'].forEach(evt => ta.dispatchEvent(new Event(evt, { bubbles: true })));
  }

  // 자소서 textarea 목록 반환 (findNearbyCharLimit 재사용)
  function getCoverLetterTextareas() {
    return Array.from(document.querySelectorAll('textarea')).filter(ta => {
      if (ta.offsetHeight < 60) return false;
      const s = window.getComputedStyle(ta);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const nearbyLimit = findNearbyCharLimit(ta);
      const maxLen = ta.getAttribute('maxlength') ? parseInt(ta.getAttribute('maxlength')) : null;
      if (nearbyLimit !== null && nearbyLimit < 200) return false;
      if (nearbyLimit === null && maxLen !== null && maxLen < 200) return false;
      return true;
    });
  }

  // 2. 버튼 클릭 시 주입 로직 실행
  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerText = '⏳ 처리 중...';

    try {
      const config = await chrome.storage.local.get(['bridgePort', 'bridgeSecret']);
      if (!config.bridgePort || !config.bridgeSecret) {
        alert('확장 프로그램 설정에서 포트와 보안 키를 먼저 등록해 주세요!');
        return;
      }

      const port = config.bridgePort;
      const secret = config.bridgeSecret;

      // 답변 목록 + 프로필 병렬 요청
      const [answersResult, profileResult] = await Promise.allSettled([
        bridgePost(port, secret, '/get-answers'),
        bridgePost(port, secret, '/get-profile')
      ]);

      // 프로필 기본 정보 자동 입력
      const unfilledFields = [];
      if (profileResult.status === 'fulfilled' && profileResult.value?.success && profileResult.value?.profile) {
        const unfilled = fillProfileFields(profileResult.value.profile);
        unfilledFields.push(...unfilled);
      }
      if (unfilledFields.length > 0) {
        try {
          await bridgePost(port, secret, '/report-empty-fields', { fields: unfilledFields, url: location.href });
        } catch { /* 선택적 기능 */ }
      }

      // 답변 없으면 에러
      if (answersResult.status !== 'fulfilled' || !answersResult.value?.success) {
        const msg = answersResult.status === 'fulfilled'
          ? (answersResult.value?.error || '대기 중인 답변이 없습니다. 앱에서 [전송]을 먼저 눌러주세요.')
          : '브릿지 서버에 연결할 수 없습니다.';
        throw new Error(msg);
      }

      const answers = answersResult.value.answers; // [{question, answer, charLimit}]
      const allTa = getCoverLetterTextareas();
      let filledCount = 0;
      const usedTa = new Set();

      // 1차: question 텍스트 매칭으로 채움
      for (const ans of answers) {
        for (const ta of allTa) {
          if (usedTa.has(ta)) continue;
          const labelText = findLabelText(ta);
          if (labelText && questionsMatch(ans.question, labelText)) {
            fillTextarea(ta, ans.answer);
            usedTa.add(ta);
            filledCount++;
            console.log(`✅ 매칭: "${ans.question.slice(0, 30)}..."`);
            break;
          }
        }
      }

      // 2차 폴백: 매칭 실패 시 순서대로 채움
      if (filledCount === 0 && allTa.length > 0) {
        console.log('⚠️ 질문 매칭 실패 — 순서 기반 폴백으로 채웁니다.');
        answers.forEach((ans, i) => {
          if (allTa[i] && !usedTa.has(allTa[i])) {
            fillTextarea(allTa[i], ans.answer);
            filledCount++;
          }
        });
      }

      btn.innerText = `✅ ${filledCount}개 완료!`;
      console.log(`✅ ${filledCount}/${answers.length}개 문항 자동 입력 완료`);
    } catch (err) {
      alert('주입 실패: ' + err.message);
      btn.innerText = '❌ 실패';
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerText = '✨ 자동 입력';
      }, 3000);
    }
  };
})();
