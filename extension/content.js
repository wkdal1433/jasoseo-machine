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

  // 프로필 필드 자동 매칭 (label 텍스트 → input 값)
  function fillProfileFields(profile) {
    if (!profile) return [];
    const fieldMap = {
      '이름': profile.name, '성명': profile.name, 'name': profile.name,
      '전화': profile.phone, '연락처': profile.phone, '휴대폰': profile.phone, 'phone': profile.phone,
      '이메일': profile.email, 'email': profile.email, 'e-mail': profile.email,
      '학교': profile.school, '대학교': profile.school, '학력': profile.school,
      '전공': profile.major, '학과': profile.major,
    };
    const unfilled = [];
    document.querySelectorAll('label').forEach(label => {
      const text = label.textContent.trim().toLowerCase();
      const matchKey = Object.keys(fieldMap).find(k => text.includes(k.toLowerCase()));
      if (!matchKey) return;
      const value = fieldMap[matchKey];
      if (!value) { unfilled.push(label.textContent.trim()); return; }
      const forAttr = label.getAttribute('for');
      const input = forAttr ? document.getElementById(forAttr) : label.querySelector('input, textarea');
      if (!input || input.value) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (setter) setter.set.call(input, value);
      else input.value = value;
      ['input', 'change'].forEach(evt => input.dispatchEvent(new Event(evt, { bubbles: true })));
    });
    return unfilled;
  }

  // 자소서 문항 추출: textarea + label 쌍을 스캔해서 question + charLimit 반환
  function extractCoverLetterQuestions() {
    const questions = [];
    const visited = new Set();

    function findLabelText(el) {
      // 1) id 기반 <label for="...">
      if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) return lbl.textContent.trim();
      }
      // 2) 부모 중 <label>
      let parent = el.parentElement;
      while (parent) {
        if (parent.tagName === 'LABEL') return parent.textContent.replace(el.value || '', '').trim();
        parent = parent.parentElement;
      }
      // 3) 직전 형제 요소 텍스트 (div/p/span)
      let prev = el.previousElementSibling;
      while (prev) {
        const t = prev.textContent.trim();
        if (t.length > 5 && t.length < 200) return t;
        prev = prev.previousElementSibling;
      }
      // 4) placeholder 폴백
      return el.placeholder || '';
    }

    document.querySelectorAll('textarea').forEach(ta => {
      if (ta.offsetHeight < 60) return; // 너무 작은 것 제외
      const style = window.getComputedStyle(ta);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (visited.has(ta)) return;
      visited.add(ta);

      const labelText = findLabelText(ta);
      if (!labelText) return;

      // 글자수 제한 추출: "지원동기 (800자 이내)" → 800
      const charLimitMatch = labelText.match(/(\d{2,4})\s*자/);
      const charLimit = charLimitMatch ? parseInt(charLimitMatch[1]) : null;

      // 순수 문항 텍스트 (글자수 부분 제거)
      const question = labelText.replace(/[\(\（]\s*\d+\s*자[^\)\）]*[\)\）]/g, '').trim();

      if (question.length > 5) {
        questions.push({ question, charLimit });
      }
    });

    return questions;
  }

  // 1. 플로팅 버튼 생성
  const btn = document.createElement('button');
  btn.innerText = '✨ 자동 입력';
  Object.assign(btn.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
    padding: '12px 20px', background: '#4f46e5', color: 'white',
    border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.3s'
  });
  btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';
  document.body.appendChild(btn);

  // 1-b. "📋 문항 추출 + 프로필 자동입력" 버튼 (지원서 작성 페이지용)
  const extractBtn = document.createElement('button');
  extractBtn.innerText = '📋 문항 추출';
  Object.assign(extractBtn.style, {
    position: 'fixed', bottom: '70px', right: '20px', zIndex: '999999',
    padding: '10px 18px', background: '#0891b2', color: 'white',
    border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.3s', fontSize: '13px'
  });
  extractBtn.onmouseover = () => extractBtn.style.transform = 'scale(1.1)';
  extractBtn.onmouseout = () => extractBtn.style.transform = 'scale(1)';
  document.body.appendChild(extractBtn);

  // 1-b 클릭: 문항 추출 + 프로필 입력 → bridge /submit-extracted-questions
  extractBtn.onclick = async () => {
    extractBtn.disabled = true;
    extractBtn.innerText = '⏳ 추출 중...';

    try {
      const config = await chrome.storage.local.get(['bridgePort', 'bridgeSecret']);
      if (!config.bridgePort || !config.bridgeSecret) {
        alert('확장 프로그램 설정에서 포트와 보안 키를 먼저 등록해 주세요!');
        return;
      }
      const port = config.bridgePort;
      const secret = config.bridgeSecret;

      // 문항 추출
      const questions = extractCoverLetterQuestions();

      // 프로필 가져와서 자동 입력
      const profileResult = await bridgePost(port, secret, '/get-profile').catch(() => null);
      if (profileResult?.success && profileResult?.profile) {
        fillProfileFields(profileResult.profile);
      }

      if (questions.length === 0) {
        alert('자소서 입력창을 찾지 못했습니다.\n지원서 작성 페이지에서 눌러주세요.');
        return;
      }

      // 추출된 문항을 앱으로 전송
      const result = await bridgePost(port, secret, '/submit-extracted-questions', { questions });
      if (result?.success) {
        extractBtn.innerText = `✅ ${questions.length}개 전송!`;
        console.log('📋 추출된 문항:', questions);
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
      }, 4000);
    }
  };

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

      // 3. 자소서 스크립트 요청 + 프로필 요청 병렬 실행
      const [scriptResult, profileResult] = await Promise.allSettled([
        bridgePost(port, secret, '/get-fill-script'),
        bridgePost(port, secret, '/get-profile')
      ]);

      let filledCount = 0;

      // 4. 자소서 스크립트 실행
      if (scriptResult.status === 'fulfilled' && scriptResult.value.success && scriptResult.value.script) {
        console.log('🚀 Script Received! Injecting...');
        new Function(scriptResult.value.script)();
        filledCount++;
      }

      // 5. 프로필 기본 정보 자동 입력
      const unfilledFields = [];
      if (profileResult.status === 'fulfilled' && profileResult.value.success && profileResult.value.profile) {
        const unfilled = fillProfileFields(profileResult.value.profile);
        unfilledFields.push(...unfilled);
      }

      // 6. 채워지지 않은 필드 보고
      if (unfilledFields.length > 0) {
        try {
          await bridgePost(port, secret, '/report-empty-fields', { fields: unfilledFields, url: location.href });
        } catch { /* 선택적 기능, 실패해도 무관 */ }
      }

      btn.innerText = '✅ 완료!';
      if (filledCount === 0 && scriptResult.status === 'fulfilled' && !scriptResult.value.success) {
        throw new Error(scriptResult.value.error || '대기 중인 스크립트가 없습니다. 앱에서 [전송]을 먼저 눌러주세요.');
      }
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
