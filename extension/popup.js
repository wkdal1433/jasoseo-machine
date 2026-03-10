document.getElementById('save').addEventListener('click', () => {
  const port = document.getElementById('port').value || '12345';
  const secret = document.getElementById('secret').value;

  chrome.storage.local.set({ bridgePort: port, bridgeSecret: secret }, () => {
    const status = document.getElementById('status');
    status.textContent = '✅ 저장되었습니다!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});

// 기존 값 로드
chrome.storage.local.get(['bridgePort', 'bridgeSecret'], (res) => {
  if (res.bridgePort) document.getElementById('port').value = res.bridgePort;
  if (res.bridgeSecret) document.getElementById('secret').value = res.bridgeSecret;
});
