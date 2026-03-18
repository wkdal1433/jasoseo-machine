import { ChildProcess } from 'child_process'
import spawn from 'cross-spawn'
import { StringDecoder } from 'string_decoder'
import { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { AIProvider, ExecuteOptions } from './ai-provider'

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude'

  constructor(
    private readonly getCliPath: () => string,
    private readonly sendRawLog: (data: string) => void,
    private readonly activeProcesses: Map<string, ChildProcess>,
    private readonly genProcessId: () => string,
  ) {}

  async execute(options: ExecuteOptions, projectDir: string): Promise<string> {
    const cli = this.getCliPath()
    const model = options.modelOverride!
    const args = [
      '--output-format', options.outputFormat,
      '--allowedTools', 'Read',
      '--max-turns', String(options.maxTurns || 5),
      '--model', model,
      '-p', options.prompt,
    ]

    this.sendRawLog(`[CMD] ${cli} ${args.slice(0, 6).join(' ')} ...`)

    const procId = options.processId || this.genProcessId()
    return new Promise((resolve, reject) => {
      const child = spawn(cli, args, {
        cwd: projectDir || undefined,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      this.activeProcesses.set(procId, child)
      child.stdin?.end()

      const decoder = new StringDecoder('utf8')
      let output = '', stderrOutput = ''
      child.stdout?.on('data', (chunk: Buffer) => { const d = decoder.write(chunk); output += d; this.sendRawLog(d) })
      child.stderr?.on('data', (chunk: Buffer) => { const d = decoder.write(chunk); stderrOutput += d; this.sendRawLog(d) })

      child.on('close', (code) => {
        this.activeProcesses.delete(procId)
        if (code === 0) {
          resolve(output)
        } else {
          const msg = this.classifyError(stderrOutput, code || 1)
          this.sendRawLog(`[ERROR] exit=${code} | ${stderrOutput}`)
          reject(new Error(msg))
        }
      })
      child.on('error', (err) => {
        this.activeProcesses.delete(procId)
        reject(new Error(this.classifyError(err.message, -1)))
      })
    })
  }

  executeStream(options: ExecuteOptions, projectDir: string, window: BrowserWindow): ChildProcess {
    const cli = this.getCliPath()
    const model = options.modelOverride!
    const args = [
      '--output-format', 'stream-json',
      '--allowedTools', 'Read',
      '--max-turns', String(options.maxTurns || 5),
      '--model', model,
      '-p', options.prompt,
    ]

    const procId = options.processId || this.genProcessId()
    const child = spawn(cli, args, { cwd: projectDir || undefined, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] })
    this.activeProcesses.set(procId, child)
    child.stdin?.end()

    const decoder = new StringDecoder('utf8')
    let buffer = ''
    const safeSend = (channel: string, data: unknown) => {
      if (!window.isDestroyed()) window.webContents.send(channel, data)
    }

    const watchdog = setInterval(() => {
      if (Date.now() - lastPacketTime > 60000) {
        child.kill('SIGKILL')
        safeSend(IPC.CLAUDE_STREAM_ERROR, { message: 'AI 타임아웃' })
        clearInterval(watchdog)
      }
    }, 5000)
    let lastPacketTime = Date.now()

    child.stdout?.on('data', (chunk: Buffer) => {
      lastPacketTime = Date.now()
      buffer += decoder.write(chunk)
      const lines = buffer.split('\n'); buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim(); if (!trimmed) continue
        try { safeSend(IPC.CLAUDE_STREAM_CHUNK, JSON.parse(trimmed)) } catch { }
      }
    })
    child.on('error', (err) => {
      clearInterval(watchdog); this.activeProcesses.delete(procId)
      safeSend(IPC.CLAUDE_STREAM_ERROR, { message: err.message.includes('ENOENT') ? 'Claude CLI 실행 파일을 찾을 수 없습니다.' : err.message })
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
    return this.quickCliCheck(this.getCliPath())
  }

  private classifyError(stderr: string, exitCode: number): string {
    const lower = stderr.toLowerCase()
    if (lower.includes('enoent') || lower.includes('spawn') && exitCode === -1) {
      return 'Claude CLI를 찾을 수 없습니다. 설정 → Claude 경로를 확인해주세요.'
    }
    if (lower.includes('credit limit') || lower.includes('insufficient_quota') || lower.includes('out of credits')) {
      return '계정 한도 초과'
    }
    if (lower.includes('rate limit') || lower.includes('429')) {
      return '요청 한도 초과 (429). 잠시 후 재시도해주세요.'
    }
    return `AI 오류 (${exitCode}): ${stderr.trim().slice(0, 100)}`
  }

  private quickCliCheck(cli: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const child = spawn(cli, ['--version'], { stdio: ['pipe', 'pipe', 'pipe'] })
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
}
