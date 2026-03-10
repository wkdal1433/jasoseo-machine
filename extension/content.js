(async function() {
  console.log('%c🧙‍♂️ Jasoseo Machine: Hands of God Active', 'color: #4f46e5; font-weight: bold;');

  // 1. 화면에 "자동 입력" 플로팅 버튼 생성
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

  // 2. 버튼 클릭 시 주입 로직 실행
  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerText = '⏳ 분석 중...';

    try {
      const config = await chrome.storage.local.get(['bridgePort', 'bridgeSecret']);
      if (!config.bridgePort || !config.bridgeSecret) {
        alert('확장 프로그램 설정에서 포트와 보안 키를 먼저 등록해 주세요!');
        return;
      }

      const timestamp = Date.now().toString();
      const nonce = Math.random().toString(36).substring(7);
      
      // HMAC SHA-256 서명 생성 (SubtleCrypto 사용)
      const encoder = new TextEncoder();
      const keyData = encoder.encode(config.bridgeSecret);
      const msgData = encoder.encode(`${timestamp}:${nonce}:{}`); // 빈 바디 기준
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
      const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      // 3. 브릿지 서버에 스크립트 요청
      const response = await fetch(`http://localhost:${config.bridgePort}/get-fill-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jasoseo-signature': signature,
          'x-jasoseo-timestamp': timestamp,
          'x-jasoseo-nonce': nonce
        },
        body: JSON.stringify({})
      });

      const result = await response.json();
      if (result.success && result.script) {
        // 4. 스크립트 주입 (eval 대신 Function 생성자 사용)
        console.log('🚀 Script Received! Injecting...');
        new Function(result.script)();
        btn.innerText = '✅ 완료!';
      } else {
        throw new Error(result.error || '대기 중인 스크립트가 없습니다. 앱에서 [전송]을 먼저 눌러주세요.');
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
