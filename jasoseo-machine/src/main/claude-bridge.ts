import { ChildProcess } from 'child_process'
import spawn from 'cross-spawn'
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

  const stderrPreview = stderr.trim().slice(0, 200)
  return {
    type: 'unknown',
    message: stderrPreview
      ? `AI 오류 (exit code ${exitCode}): ${stderrPreview}`
      : `AI CLI가 비정상 종료되었습니다. (exit code ${exitCode})`
  }
}

// ─── Environment ───

/** Build a clean env for spawning CLI subprocesses.
 *  Removes CLAUDECODE to avoid "nested session" errors when
 *  the app itself is launched from within a Claude Code session. */
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

/**
 * Gemini CLI in --output-format json cannot make tool calls (read files).
 * Strip file-reading instructions since CLAUDE.md is auto-loaded from project dir
 * and all necessary analysis data is already embedded in the prompt.
 */
function sanitizePromptForGemini(prompt: string): string {
  let result = prompt
  result = result.replace(/먼저 MASTER_INDEX\.md를 읽어서[^\n]*\n?\n?/g, '')
  result = result.replace(/먼저 다음 파일들을 읽어주세요:\n(?:- [^\n]+\n)*/g, '')
  return result
}

function buildGeminiPrompt(options: ClaudeExecuteOptions): string {
  let prompt = sanitizePromptForGemini(options.prompt)

  if (options.outputFormat === 'json' || options.outputFormat === 'stream-json') {
    const directive =
      '아래 지시사항을 분석하고 요청된 JSON 형식으로 결과를 반환하세요. ' +
      '빈 객체({})가 아닌 실제 분석 결과를 포함해야 합니다. ' +
      '마크다운 코드블록 없이 JSON만 출력하세요.\n\n'
    prompt = directive + prompt
  }

  return prompt
}

// ─── Gemini Response Unwrapper ───

/**
 * Gemini CLI wraps responses in {session_id, response, stats}.
 * stdout may also be prefixed with "MCP issues detected..." text.
 * This function extracts the actual model response.
 */
function unwrapGeminiResponse(raw: string): string {
  let result = raw.trim()

  // Strip MCP warning prefix if present (text before first '{')
  const jsonStart = result.indexOf('{')
  if (jsonStart > 0) {
    result = result.slice(jsonStart)
  }

  // Parse Gemini wrapper: {session_id, response, stats}
  try {
    const wrapper = JSON.parse(result)
    if (wrapper.response !== undefined) {
      result = wrapper.response
    }
  } catch {
    // Not JSON-wrapped, use as-is
  }

  // Strip markdown code blocks if Gemini wrapped response in ```json ... ```
  const codeBlockMatch = result.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    result = codeBlockMatch[1].trim()
  }

  return result
}

// ─── Execute (single-shot) ───

export async function executeClaudePrompt(options: ClaudeExecuteOptions): Promise<string> {
  const model = getModel()
  const provider = getProvider()
  const projectDir = getProjectDir()
  const cli = getCliPath(provider)

  // Build args — Gemini does NOT get -p flag (prompt goes via stdin)
  let args: string[]
  let prompt: string

  if (provider === 'gemini') {
    prompt = buildGeminiPrompt(options)
    args = ['--output-format', options.outputFormat, '-m', model]
  } else {
    prompt = options.prompt
    args = ['--output-format', options.outputFormat]
    if (options.jsonSchema) {
      args.push('--json-schema', options.jsonSchema)
    }
    args.push('--allowedTools', 'Read')
    args.push('--max-turns', String(options.maxTurns || 5))
    args.push('--model', model)
    if (options.appendSystemPrompt) {
      args.push('--append-system-prompt', options.appendSystemPrompt)
    }
    args.push('-p', prompt)
  }

  console.error(`[DEBUG] provider=${provider}, cli=${cli}, model=${model}`)
  console.error(`[DEBUG] prompt length=${prompt.length}, args count=${args.length}`)
  console.error(`[DEBUG] prompt via ${provider === 'gemini' ? 'STDIN' : '-p flag'}`)

  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, {
      cwd: projectDir || undefined,
      env: buildSpawnEnv(),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    activeProcess = child

    // Gemini: write prompt to stdin (avoids Windows cmd.exe arg escaping issues)
    if (provider === 'gemini') {
      child.stdin?.write(prompt)
      child.stdin?.end()
    }

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
        let result = output.trim()
        console.error('[DEBUG] raw output length:', result.length)
        console.error('[DEBUG] raw output preview:', result.slice(0, 300))

        if (provider === 'gemini') {
          result = unwrapGeminiResponse(result)
          console.error('[DEBUG] unwrapped response:', result.slice(0, 500))
        }

        resolve(result)
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
  const cli = getCliPath(provider)

  // Force stream-json for streaming
  const outputFormat = 'stream-json' as const

  // Build args — Gemini does NOT get -p flag (prompt goes via stdin)
  let args: string[]
  let prompt: string

  if (provider === 'gemini') {
    prompt = sanitizePromptForGemini(options.prompt)
    args = ['--output-format', outputFormat, '-m', model]
  } else {
    prompt = options.prompt
    args = ['--output-format', outputFormat]
    if (options.jsonSchema) {
      args.push('--json-schema', options.jsonSchema)
    }
    args.push('--allowedTools', 'Read')
    args.push('--max-turns', String(options.maxTurns || 5))
    args.push('--model', model)
    if (options.appendSystemPrompt) {
      args.push('--append-system-prompt', options.appendSystemPrompt)
    }
    args.push('-p', prompt)
  }

  const child = spawn(cli, args, {
    cwd: projectDir || undefined,
    env: buildSpawnEnv(),
    stdio: ['pipe', 'pipe', 'pipe']
  })

  activeProcess = child

  // Gemini: write prompt to stdin
  if (provider === 'gemini') {
    child.stdin?.write(prompt)
    child.stdin?.end()
  }

  const decoder = new StringDecoder('utf8')
  let buffer = ''
  let stderrOutput = ''
  let geminiFullText = ''

  child.stdout?.on('data', (chunk: Buffer) => {
    buffer += decoder.write(chunk)
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
            window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, {
              type: 'content_block_delta',
              delta: { text: event.content || '' }
            })
          } else if (event.type === 'result') {
            window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, {
              type: 'result',
              result: { text: geminiFullText }
            })
          }
        } else {
          window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, event)
        }
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
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim())
        if (provider === 'gemini') {
          if (event.type === 'message' && event.role === 'assistant' && event.delta) {
            geminiFullText += event.content || ''
            window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, {
              type: 'content_block_delta',
              delta: { text: event.content || '' }
            })
          } else if (event.type === 'result') {
            window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, {
              type: 'result',
              result: { text: geminiFullText }
            })
          }
        } else {
          window.webContents.send(IPC.CLAUDE_STREAM_CHUNK, event)
        }
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
        env: buildSpawnEnv(),
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
      // Use stdin for Gemini to avoid Windows arg escaping issues
      const child = spawn(geminiPath, ['--output-format', 'json'], {
        cwd: projectDir || undefined,
        env: buildSpawnEnv(),
        stdio: ['pipe', 'pipe', 'pipe']
      })

      child.stdin?.write('Say "connected" and nothing else.')
      child.stdin?.end()

      const decoder = new StringDecoder('utf8')
      let output = ''
      let stderrOutput = ''

      child.stdout?.on('data', (chunk: Buffer) => { output += decoder.write(chunk) })
      child.stderr?.on('data', (chunk: Buffer) => { stderrOutput += decoder.write(chunk) })

      child.on('close', (code) => {
        output += decoder.end()
        if (code === 0) {
          resolve(unwrapGeminiResponse(output))
        } else {
          reject(new Error(classifyError(stderrOutput, code || 1).message))
        }
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
