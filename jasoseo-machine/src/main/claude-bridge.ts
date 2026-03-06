import { spawn, ChildProcess } from 'child_process'
import { StringDecoder } from 'string_decoder'
import { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getSetting } from './db'

let activeProcess: ChildProcess | null = null

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

  // Rate limit / Token exhaustion
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('exceeded') ||
    lower.includes('usage limit') ||
    lower.includes('throttl')
  ) {
    return {
      type: 'rate_limit',
      message: 'AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요. (Pro 구독의 토큰 한도를 초과했을 수 있습니다)'
    }
  }

  // Authentication
  if (
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('auth') ||
    lower.includes('login') ||
    lower.includes('credential') ||
    lower.includes('permission denied') ||
    lower.includes('not logged in')
  ) {
    return {
      type: 'auth',
      message: 'AI 인증이 필요합니다. 터미널에서 로그인해주세요. (claude auth 또는 gemini auth)'
    }
  }

  // CLI not found
  if (
    lower.includes('enoent') ||
    lower.includes('not found') ||
    lower.includes('is not recognized') ||
    lower.includes('command not found') ||
    lower.includes('no such file')
  ) {
    return {
      type: 'not_found',
      message: 'AI CLI가 설치되어 있지 않거나 경로가 잘못되었습니다. 설정에서 CLI 경로를 확인해주세요.'
    }
  }

  // Timeout
  if (
    lower.includes('timeout') ||
    lower.includes('etimedout') ||
    lower.includes('econnrefused') ||
    lower.includes('network')
  ) {
    return {
      type: 'timeout',
      message: '네트워크 연결 시간이 초과되었습니다. 인터넷 연결을 확인해주세요.'
    }
  }

  // Unknown — include stderr for debugging
  const stderrPreview = stderr.trim().slice(0, 200)
  return {
    type: 'unknown',
    message: stderrPreview
      ? `AI 오류 (exit code ${exitCode}): ${stderrPreview}`
      : `AI CLI가 비정상 종료되었습니다. (exit code ${exitCode})`
  }
}

// ─── Args Builder ───

export interface ClaudeExecuteOptions {
  prompt: string
  outputFormat: 'json' | 'stream-json'
  jsonSchema?: string
  maxTurns?: number
  appendSystemPrompt?: string
}

function buildArgs(
  provider: AIProvider,
  options: ClaudeExecuteOptions,
  model: string
): { cli: string; args: string[]; prompt: string } {
  const cli = getCliPath(provider)

  if (provider === 'gemini') {
    // Gemini: merge system prompt into user prompt
    let prompt = options.prompt
    if (options.appendSystemPrompt) {
      prompt = `[시스템 지침]\n${options.appendSystemPrompt}\n\n한 번의 응답으로 완료해주세요.\n\n[사용자 요청]\n${options.prompt}`
    }

    const args: string[] = ['-p', prompt, '--output-format', options.outputFormat]
    args.push('-m', model)

    return { cli, args, prompt }
  }

  // Claude
  const args: string[] = ['-p', options.prompt, '--output-format', options.outputFormat]

  if (options.jsonSchema) {
    args.push('--json-schema', options.jsonSchema)
  }

  args.push('--allowedTools', 'Read')
  args.push('--max-turns', String(options.maxTurns || 5))
  args.push('--model', model)

  if (options.appendSystemPrompt) {
    args.push('--append-system-prompt', options.appendSystemPrompt)
  }

  return { cli, args, prompt: options.prompt }
}

// ─── Execute (single-shot) ───

export async function executeClaudePrompt(options: ClaudeExecuteOptions): Promise<string> {
  const model = getModel()
  const provider = getProvider()
  const projectDir = getProjectDir()
  const { cli, args } = buildArgs(provider, options, model)

  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, {
      cwd: projectDir || undefined,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    activeProcess = child
    const decoder = new StringDecoder('utf8')
    let output = ''
    let stderrOutput = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      output += decoder.write(chunk)
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = decoder.write(chunk)
      stderrOutput += text
      console.error('[AI CLI stderr]:', text)
    })

    child.on('close', (code) => {
      activeProcess = null
      output += decoder.end()

      if (code === 0) {
        resolve(output.trim())
      } else {
        const classified = classifyError(stderrOutput, code || 1)
        reject(new Error(classified.message))
      }
    })

    child.on('error', (err) => {
      activeProcess = null
      const classified = classifyError(err.message, -1)
      reject(new Error(classified.message))
    })
  })
}

// ─── Execute (streaming) ───

export function executeClaudeStream(
  options: ClaudeExecuteOptions,
  window: BrowserWindow
): ChildProcess {
  const model = getModel()
  const provider = getProvider()
  const projectDir = getProjectDir()

  // Force stream-json for streaming
  const streamOptions = { ...options, outputFormat: 'stream-json' as const }
  const { cli, args } = buildArgs(provider, streamOptions, model)

  const child = spawn(cli, args, {
    cwd: projectDir || undefined,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe']
  })

  activeProcess = child
  const decoder = new StringDecoder('utf8')
  let buffer = ''
  let stderrOutput = ''

  child.stdout?.on('data', (chunk: Buffer) => {
    buffer += decoder.write(chunk)
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const event = JSON.parse(trimmed)
        window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, event)
      } catch {
        // Not valid JSON line, skip
      }
    }
  })

  child.stderr?.on('data', (chunk: Buffer) => {
    const text = decoder.write(chunk)
    stderrOutput += text
    console.error('[AI CLI stderr]:', text)
  })

  child.on('close', (code) => {
    activeProcess = null
    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim())
        window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, event)
      } catch {
        // ignore
      }
    }

    if (code !== 0 && code !== null) {
      const classified = classifyError(stderrOutput, code)
      window.webContents.send(IPC.CLAUDE_STREAM_ERROR, { message: classified.message })
    }

    window.webContents.send(IPC.CLAUDE_STREAM_END, { code })
  })

  child.on('error', (err) => {
    activeProcess = null
    const classified = classifyError(err.message, -1)
    window.webContents.send(IPC.CLAUDE_STREAM_ERROR, { message: classified.message })
  })

  return child
}

// ─── Cancel ───

export function cancelActiveProcess(): boolean {
  if (activeProcess) {
    activeProcess.kill()
    activeProcess = null
    return true
  }
  return false
}

// ─── Connection Tests ───

export async function testClaudeConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const claudePath = getSetting('claude_path') || 'claude'
    const projectDir = getProjectDir()

    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn(claudePath, ['-p', 'Say "connected" and nothing else.', '--output-format', 'json', '--max-turns', '1'], {
        cwd: projectDir || undefined,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      })

      const decoder = new StringDecoder('utf8')
      let output = ''
      let stderrOutput = ''

      child.stdout?.on('data', (chunk: Buffer) => { output += decoder.write(chunk) })
      child.stderr?.on('data', (chunk: Buffer) => { stderrOutput += decoder.write(chunk) })

      child.on('close', (code) => {
        output += decoder.end()
        if (code === 0) resolve(output.trim())
        else reject(new Error(classifyError(stderrOutput, code || 1).message))
      })

      child.on('error', (err) => {
        reject(new Error(classifyError(err.message, -1).message))
      })
    })

    return { success: true, message: result }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

export async function testGeminiConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const geminiPath = getSetting('gemini_path') || 'gemini'
    const projectDir = getProjectDir()

    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn(geminiPath, ['-p', 'Say "connected" and nothing else.', '--output-format', 'json'], {
        cwd: projectDir || undefined,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      })

      const decoder = new StringDecoder('utf8')
      let output = ''
      let stderrOutput = ''

      child.stdout?.on('data', (chunk: Buffer) => { output += decoder.write(chunk) })
      child.stderr?.on('data', (chunk: Buffer) => { stderrOutput += decoder.write(chunk) })

      child.on('close', (code) => {
        output += decoder.end()
        if (code === 0) resolve(output.trim())
        else reject(new Error(classifyError(stderrOutput, code || 1).message))
      })

      child.on('error', (err) => {
        reject(new Error(classifyError(err.message, -1).message))
      })
    })

    return { success: true, message: result }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}
