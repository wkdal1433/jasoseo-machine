import { ChildProcess } from 'child_process'
import spawn from 'cross-spawn'
import { StringDecoder } from 'string_decoder'
import { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getSetting } from './db'

const activeProcesses = new Set<ChildProcess>()

export function stopAllProcesses(): void {
  for (const proc of activeProcesses) {
    try { proc.kill('SIGKILL') } catch (err) { console.error('[Zombie Killer] Error:', err) }
  }
  activeProcesses.clear()
}

function sendRawLog(data: string): void {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) win.webContents.send(IPC.CLAUDE_RAW_LOG, data)
  })
}

type AIProvider = 'claude' | 'gemini'

function getModel(): string { return getSetting('model') || 'opus' }
function getProvider(): AIProvider {
  const model = getModel()
  return model.startsWith('gemini') ? 'gemini' : 'claude'
}
function getCliPath(provider: AIProvider): string {
  return provider === 'gemini' ? (getSetting('gemini_path') || 'gemini') : (getSetting('claude_path') || 'claude')
}
function getProjectDir(): string { return getSetting('project_dir') || '' }

interface ClassifiedError {
  type: 'rate_limit' | 'quota_exhausted' | 'auth' | 'not_found' | 'timeout' | 'unknown'
  message: string
}

function classifyError(stderr: string, exitCode: number): ClassifiedError {
  const lower = stderr.toLowerCase()
  if (lower.includes('credit limit reached') || lower.includes('insufficient_quota') || lower.includes('billing_error') || lower.includes('out of credits')) {
    return { type: 'quota_exhausted', message: '현재 계정의 토큰 또는 크레딧이 모두 소진되었습니다. 다른 AI 엔진으로 교체해 주세요.' }
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429')) {
    return { type: 'rate_limit', message: '사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 다른 엔진으로 교체해 주세요.' }
  }
  if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('auth') || lower.includes('not logged in')) {
    return { type: 'auth', message: 'AI 인증이 필요합니다. 터미널에서 로그인해주세요.' }
  }
  if (lower.includes('enoent') || lower.includes('not found') || lower.includes('command not found')) {
    return { type: 'not_found', message: 'AI CLI가 설치되어 있지 않거나 경로가 잘못되었습니다.' }
  }
  if (lower.includes('timeout') || lower.includes('etimedout') || lower.includes('network') || lower.includes('mcp connection error')) {
    return { type: 'timeout', message: '네트워크 또는 MCP 연결 시간이 초과되었습니다.' }
  }
  return { type: 'unknown', message: `AI 오류 (코드 ${exitCode}): ${stderr.trim().slice(0, 100)}` }
}

function buildSpawnEnv(): NodeJS.ProcessEnv { return { ...process.env } }

export interface ClaudeExecuteOptions {
  prompt: string
  outputFormat: 'json' | 'stream-json'
  jsonSchema?: string
  maxTurns?: number
  appendSystemPrompt?: string
}

function sanitizePromptForGemini(prompt: string): string {
  return prompt.replace(/먼저 MASTER_INDEX\.md를 읽어서[^\n]*\n?\n?/g, '').replace(/먼저 다음 파일들을 읽어주세요:\n(?:- [^\n]+\n)*/g, '')
}

function buildGeminiPrompt(options: ClaudeExecuteOptions): string {
  let prompt = sanitizePromptForGemini(options.prompt)
  if (options.outputFormat === 'json' || options.outputFormat === 'stream-json') {
    prompt = '아래 지시사항을 분석하고 요청된 JSON 형식으로 결과를 반환하세요. 마크다운 없이 JSON만 출력하세요.\n\n' + prompt
  }
  return prompt
}

function unwrapGeminiResponse(raw: string): string {
  let result = raw.trim()
  const jsonStart = result.indexOf('{')
  if (jsonStart > 0) result = result.slice(jsonStart)
  try {
    const wrapper = JSON.parse(result)
    if (wrapper.response !== undefined) result = wrapper.response
  } catch { /* ignore */ }
  const codeBlockMatch = result.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) result = codeBlockMatch[1].trim()
  return result
}

export async function executeClaudePrompt(options: ClaudeExecuteOptions): Promise<string> {
  const model = getModel(); const provider = getProvider(); const projectDir = getProjectDir(); const cli = getCliPath(provider)
  let args: string[], prompt: string
  if (provider === 'gemini') {
    prompt = buildGeminiPrompt(options)
    // [v20.7] --yolo와 --approval-mode 중복 사용 방지 (후자만 사용)
    args = ['--output-format', options.outputFormat, '-m', model, '--approval-mode', 'yolo']
  } else {
    prompt = options.prompt
    args = ['--output-format', options.outputFormat, '--allowedTools', 'Read', '--max-turns', String(options.maxTurns || 5), '--model', model]
    if (options.jsonSchema) args.push('--json-schema', options.jsonSchema)
    if (options.appendSystemPrompt) args.push('--append-system-prompt', options.appendSystemPrompt)
    args.push('-p', prompt)
  }

  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, { cwd: projectDir || undefined, env: buildSpawnEnv(), stdio: ['pipe', 'pipe', 'pipe'] })
    activeProcesses.add(child)
    if (provider === 'gemini') { child.stdin?.write(prompt); child.stdin?.end() }
    const decoder = new StringDecoder('utf8'); let output = '', stderrOutput = ''
    child.stdout?.on('data', (chunk: Buffer) => { const d = decoder.write(chunk); output += d; sendRawLog(d) })
    child.stderr?.on('data', (chunk: Buffer) => { const d = decoder.write(chunk); stderrOutput += d; sendRawLog(d) })
    child.on('close', (code) => {
      activeProcesses.delete(child)
      if (code === 0) resolve(provider === 'gemini' ? unwrapGeminiResponse(output) : output.trim())
      else reject(new Error(classifyError(stderrOutput, code || 1).message))
    })
    child.on('error', (err) => { activeProcesses.delete(child); reject(new Error(classifyError(err.message, -1).message)) })
  })
}

export function executeClaudeStream(options: ClaudeExecuteOptions, window: BrowserWindow): ChildProcess {
  const model = getModel(); const provider = getProvider(); const projectDir = getProjectDir(); const cli = getCliPath(provider)
  const outputFormat = 'stream-json' as const
  let args: string[], prompt: string
  if (provider === 'gemini') {
    prompt = sanitizePromptForGemini(options.prompt)
    // [v20.7] --approval-mode yolo만 사용하여 충돌 방지
    args = ['--output-format', outputFormat, '-m', model, '--approval-mode', 'yolo']
  } else {
    prompt = options.prompt
    args = ['--output-format', outputFormat, '--allowedTools', 'Read', '--max-turns', String(options.maxTurns || 5), '--model', model]
    if (options.jsonSchema) args.push('--json-schema', options.jsonSchema)
    if (options.appendSystemPrompt) args.push('--append-system-prompt', options.appendSystemPrompt)
    args.push('-p', prompt)
  }

  const child = spawn(cli, args, { cwd: projectDir || undefined, env: buildSpawnEnv(), stdio: ['pipe', 'pipe', 'pipe'] })
  activeProcesses.add(child)
  if (provider === 'gemini') { child.stdin?.write(prompt); child.stdin?.end() }
  const decoder = new StringDecoder('utf8'); let buffer = '', stderrOutput = '', geminiFullText = ''
  let lastPacketTime = Date.now()
  const watchdog = setInterval(() => {
    if (Date.now() - lastPacketTime > 15000) { 
      child.kill('SIGKILL'); window.webContents.send(IPC.CLAUDE_STREAM_ERROR, { message: 'AI 응답이 15초간 없어 연결을 종료했습니다.' }); clearInterval(watchdog)
    }
  }, 2000)

  child.stdout?.on('data', (chunk: Buffer) => {
    lastPacketTime = Date.now(); const d = decoder.write(chunk); sendRawLog(d); buffer += d
    const lines = buffer.split('\n'); buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim(); if (!trimmed) continue
      try {
        const event = JSON.parse(trimmed)
        if (provider === 'gemini') {
          if (event.type === 'message' && event.role === 'assistant' && event.delta) {
            geminiFullText += event.content || ''; window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, { type: 'content_block_delta', delta: { text: event.content || '' } })
          } else if (event.type === 'result') {
            window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, { type: 'result', result: { text: geminiFullText } })
          }
        } else { window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, event) }
      } catch { /* ignore */ }
    }
  })
  child.stderr?.on('data', (chunk: Buffer) => { const d = decoder.write(chunk); stderrOutput += d; sendRawLog(d) })
  child.on('close', (code) => { clearInterval(watchdog); activeProcesses.delete(child); window.webContents.send(IPC.CLAUDE_STREAM_END, { code }) })
  child.on('error', (err) => { clearInterval(watchdog); activeProcesses.delete(child); window.webContents.send(IPC.CLAUDE_STREAM_ERROR, { message: classifyError(err.message, -1).message }) })
  return child
}

export function cancelActiveProcess(): boolean { stopAllProcesses(); return true }
export async function testClaudeConnection(): Promise<{ success: boolean; message: string }> {
  try { return { success: true, message: await executeClaudePrompt({ prompt: 'Say "connected"', outputFormat: 'json', maxTurns: 1 }) } } catch (err) { return { success: false, message: (err as Error).message } }
}
export async function testGeminiConnection(): Promise<{ success: boolean; message: string }> {
  try { return { success: true, message: await executeClaudePrompt({ prompt: 'Say "connected"', outputFormat: 'json', maxTurns: 1 }) } } catch (err) { return { success: false, message: (err as Error).message } }
}
