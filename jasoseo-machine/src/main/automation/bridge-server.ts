import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createServer, Server } from 'http';
import { getSetting, setSetting, getUserProfile } from '../db';
import { BrowserWindow, dialog } from 'electron';

/**
 * v20.0 Bridge Server (The Brain of "Hands of God")
 */

export class BridgeServer {
  private app: express.Application;
  private server: Server | null = null;
  private secretKey: string = '';
  private currentPort: number = 12345;
  private isAuthorized: boolean = false;
  private currentScript: string | null = null; // 현재 생성된 주입 스크립트 메모리 보관

  constructor() {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    this.initSecret();
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

  /**
   * 프론트엔드에서 생성된 스크립트를 서버 메모리에 등록
   */
  public setPendingScript(script: string) {
    this.currentScript = script;
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

    // 확장 프로그램이 주입 스크립트를 가져가는 엔드포인트
    this.app.post('/get-fill-script', verifySignature, (req, res) => {
      if (!this.isAuthorized) return res.status(403).json({ error: 'Not authorized' });
      if (!this.currentScript) return res.status(404).json({ error: 'No script pending' });
      
      res.json({ success: true, script: this.currentScript });
      // 전달 후 메모리 해제 (1회성 보안)
      this.currentScript = null; 
    });
  }

  public async start(startPort: number = 12345): Promise<number> {
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
}

export const bridgeServer = new BridgeServer();
