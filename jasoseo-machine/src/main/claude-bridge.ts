import { spawn, ChildProcess } from 'child_process'
import { StringDecoder } from 'string_decoder'
import { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getSetting } from './db'

let activeProcess: ChildProcess | null = null

function getClaudePath(): string {
  return getSetting('claude_path') || 'claude'
}

function getProjectDir(): string {
  return getSetting('project_dir') || ''
}

function getModel(): string {
  return getSetting('model') || 'opus'
}

export interface ClaudeExecuteOptions {
  prompt: string
  outputFormat: 'json' | 'stream-json'
  jsonSchema?: string
  maxTurns?: number
  appendSystemPrompt?: string
}

export async function executeClaudePrompt(options: ClaudeExecuteOptions): Promise<string> {
  const claudePath = getClaudePath()
  const projectDir = getProjectDir()
  const model = getModel()

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

  return new Promise((resolve, reject) => {
    const child = spawn(claudePath, args, {
      cwd: projectDir || undefined,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    activeProcess = child
    const decoder = new StringDecoder('utf8')
    let output = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      output += decoder.write(chunk)
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = decoder.write(chunk)
      console.error('[Claude CLI stderr]:', text)
    })

    child.on('close', (code) => {
      activeProcess = null
      output += decoder.end()

      if (code === 0) {
        resolve(output.trim())
      } else {
        reject(new Error(`Claude CLI exited with code ${code}`))
      }
    })

    child.on('error', (err) => {
      activeProcess = null
      reject(err)
    })
  })
}

export function executeClaudeStream(
  options: ClaudeExecuteOptions,
  window: BrowserWindow
): ChildProcess {
  const claudePath = getClaudePath()
  const projectDir = getProjectDir()
  const model = getModel()

  const args: string[] = ['-p', options.prompt, '--output-format', 'stream-json']

  args.push('--allowedTools', 'Read')
  args.push('--max-turns', String(options.maxTurns || 5))
  args.push('--model', model)

  if (options.appendSystemPrompt) {
    args.push('--append-system-prompt', options.appendSystemPrompt)
  }

  const child = spawn(claudePath, args, {
    cwd: projectDir || undefined,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe']
  })

  activeProcess = child
  const decoder = new StringDecoder('utf8')
  let buffer = ''

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
    console.error('[Claude CLI stderr]:', text)
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
    window.webContents.send(IPC.CLAUDE_STREAM_END, { code })
  })

  child.on('error', (err) => {
    activeProcess = null
    window.webContents.send(IPC.CLAUDE_STREAM_ERROR, { message: err.message })
  })

  return child
}

export function cancelActiveProcess(): boolean {
  if (activeProcess) {
    activeProcess.kill()
    activeProcess = null
    return true
  }
  return false
}

export async function testClaudeConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await executeClaudePrompt({
      prompt: 'Say "connected" and nothing else.',
      outputFormat: 'json',
      maxTurns: 1
    })
    return { success: true, message: result }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}
