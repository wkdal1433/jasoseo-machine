# 자소서 머신 — 문제 해결 가이드

자주 발생하는 문제와 해결 방법을 정리했습니다.

---

## AI CLI 관련

### "AI CLI를 찾을 수 없습니다" 또는 앱이 응답하지 않음

**원인**: Gemini CLI 또는 Claude Code가 설치되지 않았거나 PATH에 등록되지 않음.

**확인 방법**:
```bash
gemini --version
claude --version
```

**해결**:

1. Gemini CLI 설치:
```bash
npm install -g @google/gemini-cli
gemini auth login
```

2. Claude Code 설치:
```bash
npm install -g @anthropic-ai/claude-code
claude
```

3. 설정에서 CLI 경로 직접 지정: 앱 → 설정(⚙️) → Gemini 경로 / Claude 경로

---

### "요청 한도 초과 (429)" 오류

**원인**: Gemini CLI를 다른 터미널에서 동시에 사용 중이거나 단시간 다수 요청.

**해결**:
- 다른 터미널의 Gemini 프로세스 종료 후 재시도
- 설정에서 모델을 Gemini Flash → Pro로 또는 Claude로 교체

---

### "계정 한도 초과" 오류

**원인**: Gemini Advanced 또는 Claude Pro 구독 토큰 소진.

**해결**:
- 다음 달 갱신 대기, 또는
- 설정에서 다른 CLI 엔진으로 교체

---

## 앱 설치 / 실행 관련

### `npm install` 실패

**증상**: `ENOENT`, `EACCES`, `gyp ERR` 등

**해결**:
```bash
# Node.js 버전 확인 (18+ 필요)
node --version

# npm 캐시 초기화 후 재시도
npm cache clean --force
npm install
```

Windows에서 `gyp ERR` 발생 시:
```bash
npm install --ignore-scripts
```

---

### `npm run dev` 후 흰 화면 또는 앱이 안 뜸

**해결**:
```bash
# 빌드 캐시 삭제 후 재시도
rm -rf out/
npm run dev
```

---

### 포트 12345 충돌 — "address already in use"

**원인**: Bridge Server 포트가 다른 프로세스에 점유됨.

**해결**:
```bash
# Windows
netstat -ano | findstr :12345
taskkill /PID <PID번호> /F
```

또는 앱 → 설정 → Bridge 포트를 다른 번호(예: 12346)로 변경.

---

## Chrome 확장 관련

### 확장 프로그램 버튼이 채용 사이트에 안 보임

**확인 순서**:
1. `chrome://extensions/` → 자소서 머신 확장이 활성화(파란색 토글) 상태인지 확인
2. 팝업(🔧 아이콘)에서 **Bridge 포트**와 **Secret**이 입력되어 있는지 확인
3. 앱이 실행 중인지 확인 (Bridge Server는 앱이 켜져 있어야 동작)
4. 페이지 새로고침 후 재시도

---

### 프로필 자동 채우기 후 저장이 안 됨

**원인**: 잡코리아 등 일부 사이트의 언어/교육 섹션은 커스텀 드롭다운(div 기반) UI 사용 → AI 채움 불가.

**해결**: 해당 항목은 수동으로 입력 후 저장 버튼 클릭.

---

## 데이터 관련

### 프로필/에피소드가 사라짐

**데이터 위치**:
- Windows: `%APPDATA%\jasoseo-machine\data\jasoseo-machine.json`

백업 파일(`jasoseo-machine.json.bak`)이 같은 위치에 있습니다. 원본을 덮어씌워 복구 가능.

---

### 에피소드 발굴 마법사에서 AI 응답이 끊김

**원인**: CLI 타임아웃 또는 네트워크 불안정.

**해결**: 앱 → 에피소드 → 해당 에피소드 → AI 인터뷰 재시작.

---

## 그 외

문제가 해결되지 않으면 [이슈를 등록](https://github.com/wkdal1433/jasoseo-machine/issues)해주세요.

이슈 등록 시 포함해주시면 빠른 해결에 도움이 됩니다:
- 운영체제 (Windows 10/11)
- Node.js 버전 (`node --version`)
- Gemini/Claude CLI 버전
- 에러 메시지 전문 (앱 → 설정 → 로그 뷰어)
