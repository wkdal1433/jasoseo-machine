import { ChildProcess } from 'child_process'
import spawn from 'cross-spawn'
import { StringDecoder } from 'string_decoder'
import { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { AIProvider, ExecuteOptions } from './ai-provider'

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'

  constructor(
    private readonly getCliPath: () => string,
    private readonly sendRawLog: (data: string) => void,
    private readonly activeProcesses: Map<string, ChildProcess>,
    private readonly genProcessId: () => string,
  ) {}

  async execute(options: ExecuteOptions, projectDir: string): Promise<string> {
    const cli = this.getCliPath()
    const model = options.modelOverride!
    const tempDir = os.tmpdir()

    // 파일 경로 ASCII 변환 (한글 경로 대응)
    let finalFilePath = options.filePath
    let cleanupTempFile: string | null = null
    if (finalFilePath && fs.existsSync(finalFilePath)) {
      try {
        const ext = path.extname(finalFilePath)
        const safePath = path.join(tempDir, `analyze_${Date.now()}${ext}`)
        fs.copyFileSync(finalFilePath, safePath)
        finalFilePath = safePath; cleanupTempFile = safePath
      } catch { /* 변환 실패 시 원본 경로 사용 */ }
    }

    const includeDirs = options.skipProjectDir ? [tempDir] : [projectDir, tempDir]
    if (finalFilePath) includeDirs.push(path.dirname(finalFilePath))
    const includeFlags = includeDirs.filter(Boolean).flatMap(d => ['--include-directories', d.replace(/\\/g, '/')])

    let prompt = this.sanitize(options.prompt)
    if (options.outputFormat === 'json') prompt = 'IMPORTANT: Output ONLY a single JSON object. No other text.\n\n' + prompt
    if (finalFilePath) {
      const fwdPath = finalFilePath.replace(/\\/g, '/')
      prompt = `@"${fwdPath}"\n\nNOTE: The file above has been pre-loaded. Do NOT use shell tools.\n\n${prompt}`
    }

    const tempPromptFile = path.join(tempDir, `g_p_${Date.now()}.txt`)
    fs.writeFileSync(tempPromptFile, prompt, 'utf8')
    const args = ['--yolo', '-m', model, '--allowed-mcp-server-names', '__none__', ...includeFlags, '-p', `@${tempPromptFile}`]

    this.sendRawLog(`[CMD] ${cli} ${args.slice(0, 6).join(' ')} ...`)

    const procId = options.processId || this.genProcessId()
    return new Promise((resolve, reject) => {
      const child = spawn(cli, args, { cwd: projectDir || undefined, env: this.buildEnv(), stdio: ['pipe', 'pipe', 'pipe'] })
      this.activeProcesses.set(procId, child)
      child.stdin?.end()

      const decoder = new StringDecoder('utf8'); let output = '', stderrOutput = ''
      child.stdout?.on('data', (chunk: Buffer) => { const d = decoder.write(chunk); output += d; this.sendRawLog(d) })
      child.stderr?.on('data', (chunk: Buffer) => { const d = decoder.write(chunk); stderrOutput += d; this.sendRawLog(d) })

      child.on('close', (code) => {
        this.activeProcesses.delete(procId)
        try { fs.unlinkSync(tempPromptFile) } catch { }
        if (cleanupTempFile) try { fs.unlinkSync(cleanupTempFile) } catch { }
        if (code === 0) {
          resolve(this.unwrapResponse(output))
        } else {
          const msg = this.classifyError(stderrOutput, code || 1)
          this.sendRawLog(`[ERROR] exit=${code} | ${stderrOutput}`)
          reject(new Error(msg))
        }
      })
      child.on('error', (err) => {
        this.activeProcesses.delete(procId)
        try { fs.unlinkSync(tempPromptFile) } catch { }
        if (cleanupTempFile) try { fs.unlinkSync(cleanupTempFile) } catch { }
        reject(new Error(this.classifyError(err.message, -1)))
      })
    })
  }

  executeStream(options: ExecuteOptions, projectDir: string, window: BrowserWindow): ChildProcess {
    const cli = this.getCliPath()
    const model = options.modelOverride!
    const includeDirs = [projectDir]
    if (options.filePath && path.isAbsolute(options.filePath)) includeDirs.push(path.dirname(options.filePath))
    const includeFlags = includeDirs.filter(Boolean).flatMap(d => ['--include-directories', d])

    const prompt = this.sanitize(options.prompt)
    const args = ['--output-format', 'stream-json', '--yolo', '-m', model, '--allowed-mcp-server-names', '__none__', ...includeFlags]

    const procId = options.processId || this.genProcessId()
    const child = spawn(cli, args, { cwd: projectDir || undefined, env: this.buildEnv(), stdio: ['pipe', 'pipe', 'pipe'] })
    this.activeProcesses.set(procId, child)
    child.stdin?.write(prompt); child.stdin?.end()

    const decoder = new StringDecoder('utf8'); let buffer = '', geminiFullText = ''
    let lastPacketTime = Date.now()
    const safeSend = (channel: string, data: unknown) => {
      if (!window.isDestroyed()) window.webContents.send(channel, data)
    }
    const watchdog = setInterval(() => {
      if (Date.now() - lastPacketTime > 60000) {
        child.kill('SIGKILL'); safeSend(IPC.CLAUDE_STREAM_ERROR, { message: 'AI 타임아웃' }); clearInterval(watchdog)
      }
    }, 5000)

    child.stdout?.on('data', (chunk: Buffer) => {
      lastPacketTime = Date.now(); buffer += decoder.write(chunk)
      const lines = buffer.split('\n'); buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim(); if (!trimmed) continue
        try {
          const event = JSON.parse(trimmed)
          if (event.type === 'message' && event.delta) {
            geminiFullText += event.content || ''
            safeSend(IPC.CLAUDE_STREAM_CHUNK, { type: 'content_block_delta', delta: { text: event.content || '' } })
          } else if (event.type === 'result') {
            safeSend(IPC.CLAUDE_STREAM_CHUNK, { type: 'result', result: { text: geminiFullText } })
          }
        } catch { }
      }
    })
    child.on('error', (err) => {
      clearInterval(watchdog); this.activeProcesses.delete(procId)
      safeSend(IPC.CLAUDE_STREAM_ERROR, { message: err.message.includes('ENOENT') ? 'Gemini CLI 실행 파일을 찾을 수 없습니다.' : err.message })
    })
    child.on('close', (code) => {
      clearInterval(watchdog); this.activeProcesses.delete(procId)
      if (code !== null && code !== 0) {
        safeSend(IPC.CLAUDE_STREAM_ERROR, { message: `AI 프로세스 오류 (code ${code})` })
      } else {
        safeSend(IPC.CLAUDE_STREAM_END, {})
      }
    })
    return child
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const child = spawn(this.getCliPath(), ['--version'], { stdio: ['pipe', 'pipe', 'pipe'] })
      child.stdin?.end()
      let out = ''
      child.stdout?.on('data', (d: Buffer) => { out += d.toString() })
      child.stderr?.on('data', (d: Buffer) => { out += d.toString() })
      child.on('close', (code) => {
        const msg = out.trim().slice(0, 80)
        resolve(code === 0 ? { success: true, message: msg || '연결 성공' } : { success: false, message: msg || `exit ${code}` })
      })
      child.on('error', (err) => resolve({ success: false, message: err.message }))
    })
  }

  private sanitize(prompt: string): string {
    return prompt
      .replace(/먼저 MASTER_INDEX\.md를 읽어서[^\n]*\n?\n?/g, '')
      .replace(/먼저 다음 파일들을 읽어주세요:\n(?:- [^\n]+\n)*/g, '')
  }

  private buildEnv(): NodeJS.ProcessEnv {
    return { ...process.env, NO_COLOR: '1', GEMINI_DISABLE_MCP: '1', GEMINI_INCLUDE_THOUGHTS: '0', PYTHONIOENCODING: 'utf-8', LANG: 'ko_KR.UTF-8' }
  }

  private unwrapResponse(raw: string): string {
    const cleaned = raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    const firstBrace = cleaned.indexOf('{'); const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1)
      try {
        const parsed = JSON.parse(candidate)
        if (typeof parsed.response === 'string') {
          const inner = parsed.response
          const ia = inner.indexOf('['); const il = inner.lastIndexOf(']')
          const ib = inner.indexOf('{'); const ij = inner.lastIndexOf('}')
          if (ia !== -1 && il > ia && (ib === -1 || ia < ib)) return inner.slice(ia, il + 1)
          if (ib !== -1 && ij > ib) return inner.slice(ib, ij + 1)
          return inner
        }
        return candidate
      } catch { return candidate }
    }
    return cleaned.trim()
  }

  private classifyError(stderr: string, exitCode: number): string {
    const lower = stderr.toLowerCase()
    if (lower.includes('enoent') || lower.includes('spawn') && exitCode === -1) {
      return 'Gemini CLI를 찾을 수 없습니다. 설정 → Gemini 경로를 확인해주세요.'
    }
    if (lower.includes('credit limit') || lower.includes('insufficient_quota') || lower.includes('out of credits')) return '계정 한도 초과'
    if (lower.includes('rate limit') || lower.includes('429')) return '요청 한도 초과 (429). 다른 터미널에서 Gemini 사용 중이라면 종료 후 재시도해주세요.'
    return `AI 오류 (${exitCode}): ${stderr.trim().slice(0, 100)}`
  }
}
