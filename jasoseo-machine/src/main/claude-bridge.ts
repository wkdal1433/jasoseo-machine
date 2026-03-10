import { ChildProcess } from 'child_process'
import spawn from 'cross-spawn'
import { StringDecoder } from 'string_decoder'
import { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getSetting } from './db'

// 실행 중인 모든 하위 프로세스 관리 (v10.0 좀비 킬러)
const activeProcesses = new Set<ChildProcess>()

/**
 * 모든 활성 프로세스를 강제 종료합니다. (Graceful Shutdown)
 */
export function stopAllProcesses(): void {
  for (const proc of activeProcesses) {
    try {
      proc.kill('SIGKILL')
    } catch (err) {
      console.error('[Zombie Killer] Error:', err)
    }
  }
  activeProcesses.clear()
}

// 모든 윈도우에 날것의 로그 전송 (v20.6 실시간 중계)
function sendRawLog(data: string): void {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.CLAUDE_RAW_LOG, data)
    }
  })
}

// ─── Provider Detection ───

type AIProvider = 'claude' | 'gemini'

function getModel(): string {
  return getSetting('model') || 'opus'
}

function getProvider(): AIProvider {
  const model = getModel()
  return model.startsWith('gemini') ? 'gemini' : 'claude'
}

function getCliPath(provider: AIProvider): string {
  if (provider === 'gemini') {
    return getSetting('gemini_path') || 'gemini'
  }
  return getSetting('claude_path') || 'claude'
}

function getProjectDir(): string {
  return getSetting('project_dir') || ''
}

// ─── Error Classification ───

interface ClassifiedError {
  type: 'rate_limit' | 'auth' | 'not_found' | 'timeout' | 'unknown'
  message: string
}

function classifyError(stderr: string, exitCode: number): ClassifiedError {
  const lower = stderr.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429') || lower.includes('quota')) {
    return { type: 'rate_limit', message: 'AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.' }
  }
  if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('auth') || lower.includes('not logged in')) {
    return { type: 'auth', message: 'AI 인증이 필요합니다. 터미널에서 로그인해주세요.' }
  }
  if (lower.includes('enoent') || lower.includes('not found') || lower.includes('command not found')) {
    return { type: 'not_found', message: 'AI CLI가 설치되어 있지 않거나 경로가 잘못되었습니다.' }
  }
  if (lower.includes('timeout') || lower.includes('etimedout') || lower.includes('network')) {
    return { type: 'timeout', message: '네트워크 연결 시간이 초과되었습니다.' }
  }
  return { type: 'unknown', message: `AI 오류 (코드 ${exitCode}): ${stderr.trim().slice(0, 100)}` }
}

function buildSpawnEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env.CLAUDECODE
  return env
}

// ─── Prompt Helpers ───

export interface ClaudeExecuteOptions {
  prompt: string
  outputFormat: 'json' | 'stream-json'
  jsonSchema?: string
  maxTurns?: number
  appendSystemPrompt?: string
}

function sanitizePromptForGemini(prompt: string): string {
  let result = prompt
  result = result.replace(/먼저 MASTER_INDEX\.md를 읽어서[^\n]*\n?\n?/g, '')
  result = result.replace(/먼저 다음 파일들을 읽어주세요:\n(?:- [^\n]+\n)*/g, '')
  return result
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

// ─── Execute (single-shot) ───

export async function executeClaudePrompt(options: ClaudeExecuteOptions): Promise<string> {
  const model = getModel()
  const provider = getProvider()
  const projectDir = getProjectDir()
  const cli = getCliPath(provider)

  let args: string[], prompt: string
  if (provider === 'gemini') {
    prompt = buildGeminiPrompt(options)
    args = ['--output-format', options.outputFormat, '-m', model]
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

    if (provider === 'gemini') {
      child.stdin?.write(prompt)
      child.stdin?.end()
    }

    const decoder = new StringDecoder('utf8')
    let output = '', stderrOutput = ''

    child.stdout?.on('data', (chunk: Buffer) => { 
      const decoded = decoder.write(chunk)
      output += decoded
      sendRawLog(decoded) 
    })
    child.stderr?.on('data', (chunk: Buffer) => { 
      const decoded = decoder.write(chunk)
      stderrOutput += decoded
      sendRawLog(decoded)
    })

    child.on('close', (code) => {
      activeProcesses.delete(child)
      if (code === 0) resolve(provider === 'gemini' ? unwrapGeminiResponse(output) : output.trim())
      else reject(new Error(classifyError(stderrOutput, code || 1).message))
    })

    child.on('error', (err) => {
      activeProcesses.delete(child)
      reject(new Error(classifyError(err.message, -1).message))
    })
  })
}

// ─── Execute (streaming) ───

export function executeClaudeStream(options: ClaudeExecuteOptions, window: BrowserWindow): ChildProcess {
  const model = getModel()
  const provider = getProvider()
  const projectDir = getProjectDir()
  const cli = getCliPath(provider)
  const outputFormat = 'stream-json' as const

  let args: string[], prompt: string
  if (provider === 'gemini') {
    prompt = sanitizePromptForGemini(options.prompt)
    args = ['--output-format', outputFormat, '-m', model]
  } else {
    prompt = options.prompt
    args = ['--output-format', outputFormat, '--allowedTools', 'Read', '--max-turns', String(options.maxTurns || 5), '--model', model]
    if (options.jsonSchema) args.push('--json-schema', options.jsonSchema)
    if (options.appendSystemPrompt) args.push('--append-system-prompt', options.appendSystemPrompt)
    args.push('-p', prompt)
  }

  const child = spawn(cli, args, { cwd: projectDir || undefined, env: buildSpawnEnv(), stdio: ['pipe', 'pipe', 'pipe'] })
  activeProcesses.add(child)

  if (provider === 'gemini') {
    child.stdin?.write(prompt)
    child.stdin?.end()
  }

  const decoder = new StringDecoder('utf8')
  let buffer = '', stderrOutput = '', geminiFullText = ''

  let lastPacketTime = Date.now()
  const watchdog = setInterval(() => {
    if (Date.now() - lastPacketTime > 15000) { 
      console.error('[Watchdog] Stream timed out. Killing process.')
      child.kill('SIGKILL')
      window.webContents.send(IPC.CLAUDE_STREAM_ERROR, { message: 'AI 응답이 15초간 없어 연결을 강제 종료했습니다.' })
      clearInterval(watchdog)
    }
  }, 2000)

  child.stdout?.on('data', (chunk: Buffer) => {
    lastPacketTime = Date.now()
    const decoded = decoder.write(chunk)
    sendRawLog(decoded)
    
    buffer += decoded
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const event = JSON.parse(trimmed)
        if (provider === 'gemini') {
          if (event.type === 'message' && event.role === 'assistant' && event.delta) {
            geminiFullText += event.content || ''
            window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, { type: 'content_block_delta', delta: { text: event.content || '' } })
          } else if (event.type === 'result') {
            window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, { type: 'result', result: { text: geminiFullText } })
          }
        } else {
          window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, event)
        }
      } catch { /* ignore */ }
    }
  })

  child.stderr?.on('data', (chunk: Buffer) => { 
    const decoded = decoder.write(chunk)
    stderrOutput += decoded 
    sendRawLog(decoded)
  })

  child.on('close', (code) => {
    clearInterval(watchdog)
    activeProcesses.delete(child)
    window.webContents.send(IPC.CLAUDE_STREAM_END, { code })
  })

  child.on('error', (err) => {
    clearInterval(watchdog)
    activeProcesses.delete(child)
    window.webContents.send(IPC.CLAUDE_STREAM_ERROR, { message: classifyError(err.message, -1).message })
  })

  return child
}

export function cancelActiveProcess(): boolean {
  stopAllProcesses()
  return true
}

export async function testClaudeConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await executeClaudePrompt({ prompt: 'Say "connected"', outputFormat: 'json', maxTurns: 1 })
    return { success: true, message: result }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

export async function testGeminiConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await executeClaudePrompt({ prompt: 'Say "connected"', outputFormat: 'json', maxTurns: 1 })
    return { success: true, message: result }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}
