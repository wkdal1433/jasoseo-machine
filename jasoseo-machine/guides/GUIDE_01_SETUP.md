# <img src="https://unpkg.com/lucide-static@latest/icons/book-open.svg" width="32" height="32" valign="bottom" /> 자소서 머신 사용 설명서 (Part 1 & 2: 설치 및 환경 설정)

본 가이드는 AI를 활용해 서류 합격률을 극대화하는 **자소서 머신**의 초기 설정 방법을 다룹니다.

---

## <img src="https://unpkg.com/lucide-static@latest/icons/settings.svg" width="24" height="24" valign="bottom" /> Part 1. 시작하기 전에 (필수 환경 설정)

자소서 머신은 로컬에 설치된 AI CLI를 빌려와 작동합니다.

### 1-1. Node.js 설치

[Node.js 공식 홈페이지](https://nodejs.org/)에서 **LTS 버전**을 설치해 주세요.

### 1-2. AI 엔진(CLI) 설치

두 가지 중 하나 이상을 설치해야 합니다. (둘 다 설치 권장)

#### <img src="https://unpkg.com/lucide-static@latest/icons/bot.svg" width="18" height="18" valign="bottom" /> Gemini CLI (구글, 기본 권장)

```bash
npm install -g @google/gemini-cli
gemini auth login
```

> Gemini Advanced 구독 필요. API 키 발급 불필요 — Google 계정 인증으로 대체.

#### <img src="https://unpkg.com/lucide-static@latest/icons/cpu.svg" width="18" height="18" valign="bottom" /> Claude Code (앤스로픽)

```bash
npm install -g @anthropic-ai/claude-code
claude
```

> Claude Pro 구독 필요. `claude` 명령어 실행 후 로그인 진행.

### 1-3. 설치 확인

터미널에서 다음 명령어로 정상 설치 여부를 확인합니다.

```bash
gemini --version
claude --version
```

버전 숫자가 출력되면 설치 완료입니다.

---

## <img src="https://unpkg.com/lucide-static@latest/icons/package.svg" width="24" height="24" valign="bottom" /> Part 2. 프로그램 설치 및 실행

### 2-1. 자소서 머신 실행

```bash
git clone https://github.com/wkdal1433/jasoseo-machine.git
cd jasoseo-machine
npm install
npm run dev
```

### 2-2. Chrome 확장 프로그램 등록 (채용 사이트 자동 입력용)

1. Chrome 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 스위치 활성화
3. **[압축해제된 확장 프로그램 로드]** 클릭
4. `jasoseo-machine/extension` 폴더 선택

---

## <img src="https://unpkg.com/lucide-static@latest/icons/settings.svg" width="24" height="24" valign="bottom" /> Part 2-3. 앱과 AI 엔진 연결 확인

1. 앱 좌측 하단 **설정** 메뉴 진입
2. **AI Provider 설정** 섹션에서 CLI 경로 확인 (기본값: `gemini` 또는 `claude`)
3. **[연결 테스트]** 버튼 클릭 → 초록색 성공 메시지 확인

---

**다음 단계:** [Part 2 → 나의 무기 만들기](./GUIDE_02_LIBRARY.md)
