# 프로필 자동 채움 기능 디버깅 보고서

**작성일**: 2026-03-17
**브랜치**: `feat/generalize-episode-injection`
**마지막 커밋**: `e6fc1fe` (2026-03-16 10:12)

---

## 1. 시스템 구조

```
[채용 사이트 페이지]
  Chrome 확장 프로그램 (content.js)
    ↓ HTTP POST (HMAC-SHA256 서명)
  Electron 앱 — Express Bridge Server (localhost:12345)
    ↓ subprocess spawn
  Gemini CLI (gemini --yolo -m gemini-2.5-flash)
    ↓ JSON 응답
  Bridge Server → content.js → DOM 값 주입
```

---

## 2. 목표

채용 사이트의 지원서 입력 폼(이름, 이메일, 전화번호, 학교, 전공 등)에
앱에 저장된 사용자 프로필을 **AI가 자동으로 분석하여 채워주는** 기능.

**핵심 요구사항**:
- 사이트마다 폼 라벨이 다름 → 키워드 매칭으로는 일반화 불가
- AI가 라벨 텍스트를 보고 프로필의 어떤 값을 채울지 판단해야 함
- 모든 채용 사이트에서 동작해야 함 (사이트 특화 코드 금지)

---

## 3. 현재 구현

### 3-1. content.js — 폼 필드 메타데이터 수집

```javascript
// 5가지 전략으로 라벨 텍스트 수집
// 1. <label for="id">
// 2. aria-label 속성
// 3. placeholder
// 4. 부모 <label> 태그
// 5. 가까운 형제/조상 텍스트 (최대 4레벨, 30자 이하)

formInputs.push({
  idx,           // data-fill-idx 속성으로 DOM 식별
  id,
  name,
  labelText,
  placeholder,
  ariaLabel,
});
```

### 3-2. content.js — 병렬 실행

```javascript
const [profileRes, profileFillResult, analyzeResult] = await Promise.allSettled([
  bridgePost(port, secret, '/get-profile'),
  withTimeout(bridgePost(port, secret, '/analyze-profile-fill', { inputs: formInputs }), 40000),
  bridgePost(port, secret, '/analyze-form', { html })
]);
```

### 3-3. bridge-server.ts — `/analyze-profile-fill` 엔드포인트 (현재 상태)

```typescript
const prompt = `Convert the following User Profile data into a Form Field mapping.

[USER PROFILE]
${JSON.stringify(profile, null, 2)}

[TARGET FORM FIELDS]
${fieldLines}   // [idx] label="..." placeholder="..." aria-label="..." name="..."

RULES:
- DO NOT use any tools (e.g., web_fetch, google_search).
- Output ONLY a single JSON object in the format: {"fills": [{"idx": number, "value": "string"}, ...]}
- Only map fields that have a high confidence match.
- If no matches are found, return {"fills": []}.
- No preamble or explanation.`;

// Timeout: 30초
// Options: skipProjectDir: true (워크스페이스 디렉토리 제외)
```

### 3-4. claude-bridge.ts — Gemini CLI spawn 명령

```
gemini --yolo -m gemini-2.5-flash
  --allowed-mcp-server-names __none__
  --include-directories C:/Users/scspr/AppData/Local/Temp
  -p @<tempPromptFile>
```

`skipProjectDir: true` 적용 시 → `--include-directories C:/Users/scspr/WorkSpace/jasoseo` **제외됨**

---

## 4. 확인된 증상

### 현재 터미널 로그 (매번 동일)

```
[AI Spawn] gemini --yolo -m gemini-2.5-flash --allowed-mcp-server-names __none__
           --include-directories C:/Users/scspr/AppData/Local/Temp
           -p @C:\...\g_p_XXXX.txt

[profile-fill] 에러: timeout

[AI Exit] code=0  ← Gemini는 결국 응답했으나 타임아웃 이후 도착
```

### 브라우저 콘솔

```
[프로필] AI 0개 채움
✅ 프로필 채움: "*회사명" → "테크스타트업"   ← 키워드 매칭 1개
[프로필] 1개 필드 채움
```

---

## 5. 여태까지 시도한 것들

| 시도 | 내용 | 결과 |
|------|------|------|
| 1 | 키워드 매칭만 사용 (`label[for]` 1가지 전략) | 라벨 못 찾음 |
| 2 | 라벨 탐지 5가지 전략으로 확장 | 부분 개선, 일반화 불가 |
| 3 | AI 기반 `/analyze-profile-fill` 추가 | JSON 파싱 에러 |
| 4 | `unwrapGeminiResponse()` 배열 감지 로직 수정 | 파싱 해결, 여전히 0개 |
| 5 | `app.options('*')` → cors() 미들웨어로 교체 | 크래시 해결 |
| 6 | `rule_value` undefined 버그 수정 | 코드 버그 수정 |
| 7 | AI fill 후 키워드 매칭 보완 (캐스케이드) | 구조 개선 |
| 8 | 모델 `gemini-2.5-pro` → `gemini-2.5-flash` | 여전히 timeout |
| 9 | `skipProjectDir: true` 추가 (워크스페이스 스캔 제거) | spawn에서 확인됨, 여전히 timeout |
| 10 | 프롬프트 페르소나 제거 + "DO NOT use tools" 추가 | 여전히 timeout |
| 11 | 전체 프로필 JSON 전달 | 적용됨, 효과 미확인 |
| 12 | 타임아웃 5초 → 30초 | 현재 상태 |

---

## 6. 핵심 미스터리

**`AI Exit code=0`**: Gemini는 결국 응답을 만들어냄.
하지만 30초 타임아웃을 초과하여 도착함.

질문:
1. Gemini CLI가 단순 텍스트→JSON 매핑에 왜 30초 이상 걸리는가?
2. `DO NOT use tools` 프롬프트 지시에도 불구하고 `web_fetch`를 실행하는가?
3. `--allowed-mcp-server-names __none__`으로 MCP는 막았지만, Gemini 내장 도구(web_fetch, google_search)를 subprocess spawn 시 막는 CLI 플래그가 존재하는가?
4. `--yolo` 모드가 도구 자동 승인을 하는데, 이것이 오히려 불필요한 도구 실행을 유발하는가?

---

## 7. 참고: 정상 작동하는 유사 기능

`/analyze-form` 엔드포인트 (자소서 문항 추출)는 **정상 작동** 중:
- 동일한 `executeClaudePrompt()` 사용
- 동일한 `gemini-2.5-flash` 모델
- **차이점**: `filePath` 옵션으로 HTML 파일을 `@filepath` 방식으로 전달
- 결과: 10~30초 내 응답, 문항 정확히 추출

`/analyze-profile-fill`과의 차이:
- 파일 없이 **순수 텍스트 프롬프트**만 전달
- `skipProjectDir: true` 적용

---

## 8. 관련 파일

```
jasoseo-machine/
├── src/main/automation/bridge-server.ts   ← /analyze-profile-fill 엔드포인트
├── src/main/claude-bridge.ts              ← executeClaudePrompt(), skipProjectDir 옵션
extension/
└── content.js                             ← formInputs 수집, AI fill + 키워드 보완
```

---

## 9. 기대하는 정상 동작

**터미널**:
```
===== PROFILE FILL RAW (N chars) =====
{"fills": [{"idx": 0, "value": "홍길동"}, {"idx": 2, "value": "hong@email.com"}]}
[profile-fill] 매핑된 fills: [...]
```

**브라우저 콘솔**:
```
✅ AI 프로필 채움: idx=0 → "홍길동"
✅ AI 프로필 채움: idx=2 → "hong@email.com"
[프로필] AI N개 채움
```

**화면**: 지원서 폼의 이름/이메일/전화/학교/전공 등 입력창에 값이 채워짐.
