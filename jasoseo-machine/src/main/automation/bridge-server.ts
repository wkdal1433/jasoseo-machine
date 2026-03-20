import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createServer, Server } from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getSetting, setSetting, getUserProfile } from '../db';
import { BrowserWindow, dialog } from 'electron';
import { executeClaudePrompt, type ClaudeExecuteOptions } from '../claude-bridge';

// 429 발생 시 자동 재시도 (지수 백오프)
async function executeWithRetry(options: ClaudeExecuteOptions, maxRetries = 2, baseDelayMs = 2000): Promise<string> {
  let lastErr: Error = new Error('unknown')
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executeClaudePrompt(options)
    } catch (err: any) {
      lastErr = err
      if (err.message?.includes('429') && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        console.warn(`[retry] 429 감지 (model=${options.modelOverride}), ${delay}ms 후 재시도 (${attempt + 1}/${maxRetries})`)
        await new Promise(r => setTimeout(r, delay))
      } else {
        throw err
      }
    }
  }
  throw lastErr
}

/**
 * v20.0 Bridge Server (The Brain of "Hands of God")
 */

export class BridgeServer {
  private app: express.Application;
  private server: Server | null = null;
  private secretKey: string = '';
  private currentPort: number = 12345;
  private isAuthorized: boolean = false;
  private pendingAnswers: { question: string; answer: string; charLimit: number | null }[] | null = null;
  private emptyFieldsReport: { fields: string[]; url: string; reportedAt: string } | null = null;
  private extractedQuestions: { question: string; charLimit: number | null }[] | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.app = express();
    // Chrome Private Network Access (PNA) 정책 대응 — app.options('*') 대신 미들웨어로 처리
    this.app.use(cors({
      origin: '*',
      allowedHeaders: ['Content-Type', 'x-jasoseo-signature', 'x-jasoseo-timestamp', 'x-jasoseo-nonce'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }));
    this.app.use((_req, res, next) => {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      next();
    });
    this.app.use(express.json({ limit: '5mb' }));
    // initSecret()는 start()에서 호출 — 생성자 실행 시점에는 DB 초기화 전
    this.setupRoutes();
  }

  private initSecret() {
    let savedSecret = getSetting('extension_secret');
    if (!savedSecret) {
      savedSecret = crypto.randomBytes(32).toString('hex');
      setSetting('extension_secret', savedSecret);
    }
    this.secretKey = savedSecret;
  }

  public setPendingAnswers(answers: { question: string; answer: string; charLimit: number | null }[]) {
    this.pendingAnswers = answers;
  }

  public setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  public getExtractedQuestions() {
    const q = this.extractedQuestions;
    this.extractedQuestions = null;
    return q;
  }

  /** 소비하지 않고 조회만 (앱 시작 시 미수신 문항 확인용) */
  public peekExtractedQuestions() {
    return this.extractedQuestions;
  }

  public clearExtractedQuestions() {
    this.extractedQuestions = null;
  }

  /** 영문 enum 값을 한국 채용 폼에서 인식 가능한 한국어로 변환 */
  private normalizeProfileForFill(profile: any): any {
    const p = JSON.parse(JSON.stringify(profile));

    // 성별
    if (p.personal?.gender === 'male') p.personal.gender = '남';
    else if (p.personal?.gender === 'female') p.personal.gender = '여';

    // 병역 상태
    const militaryMap: Record<string, string> = {
      fulfilled: '군필', exempted: '면제', serving: '복무중', not_applicable: '해당없음'
    };
    if (p.preferences?.military?.status) {
      p.preferences.military.status = militaryMap[p.preferences.military.status] ?? p.preferences.military.status;
    }

    // 학력 상태
    const eduStatusMap: Record<string, string> = {
      graduated: '졸업', expected: '졸업예정', attending: '재학중', dropout: '중퇴'
    };
    if (Array.isArray(p.education)) {
      p.education.forEach((edu: any) => {
        if (edu.status) edu.status = eduStatusMap[edu.status] ?? edu.status;
      });
    }

    return p;
  }

  private setupRoutes() {
    const verifySignature = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const signature = req.headers['x-jasoseo-signature'] as string;
      const timestamp = req.headers['x-jasoseo-timestamp'] as string;
      const nonce = req.headers['x-jasoseo-nonce'] as string;

      if (!signature || !timestamp || !nonce) return res.status(401).json({ error: 'Missing headers' });

      const now = Date.now();
      if (Math.abs(now - parseInt(timestamp)) > 30000) return res.status(401).json({ error: 'Expired' });

      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(`${timestamp}:${nonce}:${JSON.stringify(req.body || {})}`)
        .digest('hex');

      if (signature !== expectedSignature) return res.status(403).json({ error: 'Invalid sig' });
      next();
    };

    this.app.get('/ping', (req, res) => {
      res.json({ status: 'alive', version: 'v20.0' });
    });

    this.app.post('/get-profile', verifySignature, async (req, res) => {
      if (!this.isAuthorized) {
        const result = await dialog.showMessageBox({
          type: 'question',
          buttons: ['허용', '거부'],
          defaultId: 0,
          title: '보안 알림',
          message: '확장 프로그램이 프로필 데이터에 접근하려 합니다.',
          detail: '승인하시겠습니까?',
        });
        if (result.response === 0) this.isAuthorized = true;
        else return res.status(403).json({ error: 'Denied' });
      }
      res.json({ success: true, profile: getUserProfile() });
    });

    // Gemini로 프로필 → 폼 필드 매핑 분석 (HTML 대신 경량 메타데이터 사용)
    this.app.post('/analyze-profile-fill', verifySignature, async (req, res) => {
      const { inputs } = req.body || {};
      if (!Array.isArray(inputs) || inputs.length === 0) {
        return res.json({ success: false, error: 'No inputs provided' });
      }

      const profile = this.normalizeProfileForFill(getUserProfile());
      if (!profile) return res.json({ success: false, error: 'No profile' });

      // 폼 필드 목록 (idx로 식별)
      const fieldLines = inputs.map((f: any) => {
        let line = `[${f.idx}] type="${f.type || 'text'}" label="${f.labelText || ''}"`;
        if (f.placeholder) line += ` placeholder="${f.placeholder}"`;
        if (f.ariaLabel) line += ` aria-label="${f.ariaLabel}"`;
        if (f.name) line += ` name="${f.name}"`;
        if (f.type === 'select' && f.options?.length) line += ` options=[${f.options.join(', ')}]`;
        return line;
      }).join('\n');

      const prompt = `Convert the following User Profile data into a Form Field mapping.

[USER PROFILE]
${JSON.stringify(profile, null, 2)}

[TARGET FORM FIELDS]
${fieldLines}

RULES:
- DO NOT use any tools (e.g., web_fetch, google_search).
- Output ONLY a single JSON object in the format: {"fills": [{"idx": number, "value": "string"}, ...]}
- Only map fields that have a high confidence match.
- For type="select": the value MUST exactly match one of the option values shown in options=[...] (use the part before "(value=", or the value= part). Pick the most semantically correct option.
- For type="date": output value in YYYY-MM-DD format.
- For type="checkbox": output "true" ONLY if the profile explicitly indicates this field is true/yes/applicable. Output "false" otherwise. NEVER check boxes that look like privacy agreements or terms consent. Fields with disabled=true may become enabled after other fields are filled — still include them in mapping if they match.
- Fields marked disabled=true will be retried automatically after other fields are filled.
- For type="text": output the profile value as a plain string.
- If no matches are found, return {"fills": []}.
- No preamble or explanation.`;

      try {
        const modelOverride = getSetting('model_ep_profile_fill') || undefined
        const raw = await executeWithRetry({ prompt, outputFormat: 'json', skipProjectDir: true, modelOverride });
        console.log(`\n===== PROFILE FILL RAW (${raw.length} chars) =====`);
        console.log(raw.slice(0, 500));
        console.log('=====');
        const extractJSON = (text: string): string => {
          const clean = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          const fb = clean.indexOf('{'); const lb = clean.lastIndexOf('}');
          return fb !== -1 && lb > fb ? clean.slice(fb, lb + 1) : clean;
        };
        const parsed = JSON.parse(extractJSON(raw));
        const fills = Array.isArray(parsed) ? parsed : (parsed.fills || []);
        console.log(`[profile-fill] 매핑된 fills: ${JSON.stringify(fills)}`);
        res.json({ success: true, fills });
      } catch (err: any) {
        console.error('[profile-fill] 에러:', err.message);
        res.json({ success: false, error: err.message });
      }
    });

    // 확장 프로그램이 미완성 필드를 보고하는 엔드포인트
    this.app.post('/report-empty-fields', verifySignature, (req, res) => {
      const { fields, url } = req.body || {};
      if (fields && fields.length > 0) {
        this.emptyFieldsReport = { fields, url: url || '', reportedAt: new Date().toISOString() };
      }
      res.json({ success: true });
    });

    // 확장 프로그램이 추출한 자소서 문항을 앱으로 전송
    // isAuthorized 불필요 — 앱→확장이 아닌 확장→앱 방향이므로 HMAC 서명 검증으로 충분
    this.app.post('/submit-extracted-questions', verifySignature, (req, res) => {
      const { questions } = req.body || {};
      if (Array.isArray(questions) && questions.length > 0) {
        this.extractedQuestions = questions;
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('questions-extracted', questions);
        }
      }
      res.json({ success: true, received: questions?.length ?? 0 });
    });

    // Gemini로 페이지 HTML을 분석해서 자소서 문항+글자수 추출 (isAuthorized 불필요 — 페이지 HTML만 처리)
    this.app.post('/analyze-form', verifySignature, async (req, res) => {
      const { html } = req.body || {};
      if (!html || typeof html !== 'string') return res.status(400).json({ success: false, error: 'No HTML provided' });

      const tmpFile = path.join(os.tmpdir(), `form_${Date.now()}.html`);
      try {
        fs.writeFileSync(tmpFile, html, 'utf-8');
        const prompt = `이 HTML은 한국 채용 지원 사이트의 자기소개서 작성 폼 일부입니다.
자기소개서 textarea 입력창을 모두 찾아서, 각 입력창에 해당하는 실제 질문 텍스트와 글자수 제한을 추출하세요.

반환 규칙:
- question: HTML에 실제로 명시된 질문 텍스트만 사용. "지원동기", "성장과정" 같은 일반적인 문항을 추측하거나 생성하는 것은 절대 금지.
- charLimit: 글자수 제한 숫자 (없으면 null)
- order: 페이지에서 위에서부터의 순서 (0부터 시작)
- HTML에 자소서 textarea가 없거나 질문을 확인할 수 없으면 반드시 {"questions": []} 반환 (절대 임의 문항 생성 금지)
- "최소 N자", "최대 N자", "N자 이내" 같은 안내문은 question에 포함하지 마세요.

반드시 아래와 같은 형태의 단일 JSON 객체로만 반환하세요 (배열 직접 반환 금지):
{"questions": [{"question":"...", "charLimit":1000, "order":0}, ...]}`;

        const raw = await executeWithRetry({ prompt, outputFormat: 'json', filePath: tmpFile, modelOverride: getSetting('model_ep_form_extract') || undefined });

        // [디버그] Gemini 응답 원문을 파일로 저장 (확인 후 삭제 예정)
        const debugFile = path.join(os.tmpdir(), `gemini_raw_${Date.now()}.txt`);
        fs.writeFileSync(debugFile, raw, 'utf-8');
        console.log(`\n========== RAW GEMINI RESPONSE (${raw.length} chars) ==========`);
        console.log(raw.slice(0, 500));
        console.log(`=== saved to: ${debugFile} ===\n`);

        // 텍스트에서 JSON(객체 또는 배열) 추출 — 마크다운 코드블록·앞뒤 설명글 제거
        const extractJSON = (text: string): string => {
          const clean = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          const fb = clean.indexOf('{'); const lb = clean.lastIndexOf('}');
          const fa = clean.indexOf('['); const la = clean.lastIndexOf(']');
          if (fb !== -1 && (fa === -1 || fb < fa)) return fb !== -1 && lb > fb ? clean.slice(fb, lb + 1) : clean;
          return fa !== -1 && la > fa ? clean.slice(fa, la + 1) : clean;
        };

        const parsed = JSON.parse(extractJSON(raw));
        const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
        res.json({ success: true, questions });
      } catch (err: any) {
        res.json({ success: false, error: err.message });
      } finally {
        try { fs.unlinkSync(tmpFile); } catch {}
      }
    });

    // 확장 프로그램이 생성된 답변 목록을 가져가는 엔드포인트
    this.app.post('/get-answers', verifySignature, (req, res) => {
      if (!this.isAuthorized) return res.status(403).json({ error: 'Not authorized' });
      if (!this.pendingAnswers) return res.json({ success: false, error: 'No answers pending' });

      res.json({ success: true, answers: this.pendingAnswers });
      // 전달 후 메모리 해제 (1회성 보안)
      this.pendingAnswers = null;
    });
  }

  public async start(startPort: number = 12345): Promise<number> {
    this.initSecret(); // DB 초기화 후 호출되므로 저장된 시크릿 올바르게 로드
    return new Promise((resolve, reject) => {
      const tryListen = (port: number) => {
        this.server = this.app.listen(port, () => {
          this.currentPort = port;
          setSetting('bridge_port', String(port));
          resolve(port);
        }).on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') tryListen(port + 1);
          else reject(err);
        });
      };
      tryListen(startPort);
    });
  }

  public stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  public getSecret(): string { return this.secretKey; }
  public getEmptyFieldsReport() { const r = this.emptyFieldsReport; this.emptyFieldsReport = null; return r; }
}

export const bridgeServer = new BridgeServer();
