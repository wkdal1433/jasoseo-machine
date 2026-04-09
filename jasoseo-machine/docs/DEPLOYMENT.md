# 자소서 머신 — 배포 계획서

> 최종 업데이트: 2026-03-16
> 작성 시점 기준 앱 상태: v21 브랜치 (feat/onboarding-pipeline-v21)

---

## 1. 배포 목표 및 철학

### 타겟 유저
- Claude Code Pro 또는 Gemini CLI 구독자
- CLI 설치/사용 능숙한 취준생/재직자
- "AI를 도구로 쓰는 사람" 페르소나

### 핵심 원칙
- **API 직접 호출 방식 NOT 사용** — 토큰 비용이 유저에게 전가됨
- **CLI 구독 기반** — Claude Pro ($20/mo) 또는 Gemini Advanced 구독자가 기존 구독을 활용
- **무료 배포 or 일회성 구매** — SaaS 서버 운영 비용 없음

---

## 2. 보안 현실 분석

### EXE/asar 보호 수준

| 방법 | 보호 수준 | 우회 난이도 |
|------|-----------|-------------|
| 기본 asar 아카이브 | 낮음 | `npx asar extract` 하나로 즉시 추출 가능 |
| Vite 미니파이 | 낮음~중간 | JS beautifier로 30분이면 읽기 가능 |
| javascript-obfuscator 난독화 | 중간 | 해독 가능하나 시간 소요 (수 시간) |
| Electron Fuses + asar integrity | 중간 | 공식 조작 방지, 우회는 가능 |
| 완전한 코드 보호 | **불가능** | Electron 앱의 구조적 한계 |

### 현실적 방어선
- **기술적 방어**: 난독화(obfuscation) — CLI 유저도 충분히 막히는 수준
- **법적 방어**: 라이선스 + EULA (역공학 금지 조항)
- **사업적 해자 (진짜 모트)**:
  - S급 합격 자소서 원데이터 누적
  - 유저 패턴 강화 데이터 축적
  - 지속적 프롬프트 업데이트
  - 코드를 봐도 데이터와 노하우는 복제 불가

### 결론
> 프롬프트 로직보다 **데이터(S급 원데이터)와 UX**가 진짜 경쟁 우위.
> 코드 공개 여부보다 지속적 업데이트 속도가 더 중요.

---

## 3. 배포 전 체크리스트

### 3-1. 코드 완성 여부

| 항목 | 상태 | 비고 |
|------|------|------|
| 매직 온보딩 파이프라인 | ⚠️ 진행중 | v21 브랜치 |
| 9-Step 자소서 생성 | ✅ | |
| 이력 저장/관리 | ✅ | |
| 패턴 강화 기능 | ✅ | |
| Chrome 확장 연동 | ✅ | Bridge Server v20 |
| 기본 패턴 번들링 | ❌ 미구현 | raw/STierRawData를 TS const로 변환 필요 |
| electron-builder 설정 | ❌ 미구현 | 아래 4번 참고 |

### 3-2. 배포 전 필수 작업

**순서:**
1. [ ] `feat/onboarding-pipeline-v21` → `main` 머지 (온보딩 안정화 후)
2. [ ] 기본 패턴 데이터 번들링 (raw/STierRawData → TypeScript const)
3. [ ] javascript-obfuscator 적용 (선택)
4. [ ] electron-builder 설치 및 설정
5. [ ] 앱 아이콘 제작 (512x512 PNG → ICO/ICNS)
6. [ ] 코드 서명 (Windows: EV 인증서 또는 셀프 서명)
7. [ ] EULA/라이선스 작성
8. [ ] README 및 설치 가이드 작성
9. [ ] Chrome 확장 Chrome Web Store 등록

---

## 4. electron-builder 설정 계획

### 설치
```bash
npm install --save-dev electron-builder
```

### package.json에 추가할 build 설정
```json
{
  "build": {
    "appId": "com.jasoseo.machine",
    "productName": "자소서 머신",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "out/**/*",
      "!out/**/*.map"
    ],
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": [{ "target": "dmg", "arch": ["x64", "arm64"] }],
      "icon": "build/icon.icns"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "runAfterFinish": true,
      "installerHeaderBackground": "#000000",
      "installerHeader": "build/installerHeader.bmp"
    },
    "asar": true,
    "asarUnpack": []
  }
}
```

### npm scripts에 추가
```json
{
  "scripts": {
    "dist": "electron-vite build && electron-builder",
    "dist:win": "electron-vite build && electron-builder --win",
    "dist:mac": "electron-vite build && electron-builder --mac"
  }
}
```

---

## 5. 배포 시 포함/제외 파일

### 포함 (자동 — electron-builder가 처리)
```
jasoseo-machine/out/          ← Vite 컴파일 결과물
  ├── main/index.js            ← 메인 프로세스 (번들됨)
  ├── preload/index.js         ← 프리로드 (번들됨)
  └── renderer/                ← UI (미니파이됨)
```

### 절대 포함하면 안 되는 것 (워크스페이스 루트)
```
jasoseo/                       ← 워크스페이스 루트 전체 (앱 디렉토리 밖)
├── raw/STierRawData/*.md      ← S급 합격 자소서 원문 (핵심 IP)
├── episodes/                  ← 개인 에피소드 (개인정보)
├── CLAUDE.md                  ← AI 전략 청사진 (소스 비공개 시)
├── protocols/                 ← AI 작성 규칙
├── appendix/                  ← 기업별 데이터
├── analysis/                  ← 패턴 분석
├── *.pdf / *.docx             ← 개인 서류
├── .claude/                   ← Claude 메모리 (개인정보)
└── docs/ 내 SESSION_CONTEXT   ← 개인 컨텍스트
```

> ⚠️ electron-builder는 `jasoseo-machine/` 내부만 패키징함.
> 워크스페이스 루트는 자동으로 제외됨. 단, jasoseo-machine 내부에
> raw 데이터를 하드코딩할 때는 어떤 형태로 넣을지 신중히 결정할 것.

---

## 6. 기본 패턴 번들링 전략

`raw/STierRawData/*.md`의 S급 합격 자소서 원문을 앱에 내장하는 방법:

### 방법 A: TypeScript const로 변환 (권장)
```typescript
// src/main/data/default-patterns.ts
export const DEFAULT_PATTERNS = {
  KB증권: {
    narrativeStructure: "...",
    openingStyle: "...",
    dualCodingKeywords: [...],
    // ...
  },
  삼성생명: { ... },
  현대해상: { ... },
  한국자금중개: { ... }
}
```
- 원문 그대로가 아닌 **AI가 추출한 패턴 데이터**만 저장
- 원문은 번들에 포함하지 않음 → IP 보호 + 용량 절약
- 미니파이 후 읽기 어려움

### 방법 B: 암호화된 JSON (고강도 보호)
- 빌드 시 AES-256 암호화
- 런타임에 하드코딩된 키로 복호화
- 키가 JS에 있어 결국 추출 가능하나 난이도↑

> **권장**: 방법 A로 먼저 진행. 원문 자체는 번들하지 않는 것이 핵심.

---

## 7. CLI 의존성 해결 방안

### 현재 상태
앱이 작동하려면 유저 컴퓨터에 다음 중 하나가 필요:
- `claude` 명령어 (Claude Code CLI, Pro 구독)
- `gemini` 명령어 (Gemini CLI, Advanced 구독)

### 설치 가이드 전략
배포 시 `INSTALL_GUIDE.md` 또는 앱 내 온보딩에서:
```
1. Claude Pro ($20/월) 구독
2. claude code 설치: npm install -g @anthropic-ai/claude-code
3. claude 명령어로 로그인
4. 자소서 머신 설치 및 실행
```

### 앱 내 자동 감지
이미 구현됨 — 설정 페이지에서 CLI 상태 확인 (`SETTINGS_TEST_CLI`)

---

## 8. GitHub 저장소 전략

### 공개 레포 (jasoseo-machine)
```
공개 대상:
  jasoseo-machine/src/      ← 소스코드 (공개 가능)
  jasoseo-machine/package.json
  extension/                ← Chrome 확장

비공개 처리 (.gitignore):
  jasoseo-machine/.env (있다면)
  out/                      ← 빌드 결과물
  dist-electron/            ← 배포 파일
  node_modules/
```

### 공개하지 않는 항목 (로컬 보관)
```
episodes/                   ← 개인 에피소드
개인 서류 전체
```

---

## 9. Chrome 확장 배포

### 옵션 A: Chrome Web Store
- 등록비: $5 (1회)
- 심사 기간: 1~7일
- 자동 업데이트 지원
- 신뢰도 높음

### 옵션 B: 수동 배포 (개발자 모드)
- 앱과 함께 `extension.zip` 배포
- 유저가 `chrome://extensions` → "압축 해제된 항목 로드"
- 간단하지만 업데이트 불편

> 초기 배포: 옵션 B로 빠르게 → 안정화 후 옵션 A로 이관

---

## 10. 배포 로드맵

```
현재 상태
  → [P0] 온보딩 파이프라인 안정화 (feat/onboarding-pipeline-v21 완성)
  → [P1] 기본 패턴 데이터 번들링
  → [P2] electron-builder 설정 + 아이콘
  → [P3] 베타 테스트 (지인 5~10명)
  → [P4] 피드백 반영 + 버그 수정
  → [P5] Chrome Web Store 등록
  → [P6] 공개 배포 (GitHub Releases or 별도 랜딩 페이지)
```

---

## 부록: 보안 강화 옵션 (필요 시 적용)

### javascript-obfuscator 적용
```bash
npm install --save-dev javascript-obfuscator
```
electron-vite 빌드 후 main 프로세스 JS에 적용.
렌더러(React)는 번들 특성상 obfuscation 효과 제한적.

### Electron Fuses (asar 무결성)
```typescript
// 빌드 후 postinstall 스크립트에서 적용
import { flipFuses, FuseV1Options } from '@electron/fuses'
```
asar 파일 교체 방지. 역추출은 막지 못하나 조작 방지 효과.

### 라이선스/EULA
배포 파일에 포함할 EULA에 명시:
- 역공학(reverse engineering) 금지
- 상업적 재배포 금지
- 소스코드 공개 금지
