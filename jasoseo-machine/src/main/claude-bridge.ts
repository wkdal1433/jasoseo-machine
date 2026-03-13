import { ChildProcess } from 'child_process'
import spawn from 'cross-spawn'
import { StringDecoder } from 'string_decoder'
import { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getSetting } from './db'
import path from 'path'
import fs from 'fs'
import os from 'os'

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

function getModel(): string { return getSetting('model') || 'gemini-3.0-pro' }
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
    return { type: 'quota_exhausted', message: '계정 한도 초과' }
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429')) {
    return { type: 'rate_limit', message: '사용량 한도 도달' }
  }
  return { type: 'unknown', message: `AI 오류 (${exitCode}): ${stderr.trim().slice(0, 100)}` }
}

function buildSpawnEnv(provider?: string): NodeJS.ProcessEnv {
  const env = { ...process.env }
  if (provider === 'gemini') {
    env.NO_COLOR = '1'
    env.GEMINI_DISABLE_MCP = '1'
    env.GEMINI_INCLUDE_THOUGHTS = '0'
    env.PYTHONIOENCODING = 'utf-8'
    env.LANG = 'ko_KR.UTF-8'
  }
  return env
}

export interface ClaudeExecuteOptions {
  prompt: string
  outputFormat: 'json' | 'stream-json' | 'text'
  jsonSchema?: string
  maxTurns?: number
  appendSystemPrompt?: string
  filePath?: string
  conversational?: boolean
}

function sanitizePromptForGemini(prompt: string): string {
  return prompt.replace(/먼저 MASTER_INDEX\.md를 읽어서[^\n]*\n?\n?/g, '').replace(/먼저 다음 파일들을 읽어주세요:\n(?:- [^\n]+\n)*/g, '')
}

function unwrapGeminiResponse(raw: string): string {
  const cleaned = raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1)
    try {
      const parsed = JSON.parse(candidate)
      if (typeof parsed.response === 'string') {
        const inner = parsed.response
        const ib = inner.indexOf('{'); const il = inner.lastIndexOf('}')
        if (ib !== -1 && il > ib) return inner.slice(ib, il + 1)
        return inner
      }
      return candidate
    } catch { return candidate }
  }
  return cleaned.trim()
}

export async function executeClaudePrompt(options: ClaudeExecuteOptions): Promise<string> {
  const model = getModel(); const provider = getProvider(); const projectDir = getProjectDir(); const cli = getCliPath(provider)
  
  let finalFilePath = options.filePath
  let cleanupTempFile: string | null = null

  // [Phase 1: Path Neutralization] Gemini CLI만 해당 — 한글/특수문자 경로를 ASCII 임시 경로로 복사
  // Claude Code CLI는 한글 경로를 직접 처리 가능하므로 불필요
  if (provider === 'gemini' && finalFilePath && fs.existsSync(finalFilePath)) {
    try {
      const tempDir = os.tmpdir()
      const ext = path.extname(finalFilePath)
      const safeName = `analyze_${Date.now()}${ext}`
      const safePath = path.join(tempDir, safeName)
      fs.copyFileSync(finalFilePath, safePath)
      finalFilePath = safePath
      cleanupTempFile = safePath
    } catch (e) { console.error('[Path Fix] Failed to copy to temp:', e) }
  }

  // [핵심 조치 2] os.tmpdir() 포함 보장: 임시 파일이 항상 워크스페이스에 포함되도록
  const tempDir = os.tmpdir()
  const includeDirs: string[] = [projectDir, tempDir]
  if (finalFilePath) includeDirs.push(path.dirname(finalFilePath))
  // [핵심 조치 3] 역슬래시 → 슬래시 변환: Windows 경로 인식 오류 방지
  const includeFlags = includeDirs.filter(Boolean).flatMap(dir => ['--include-directories', dir.replace(/\\/g, '/')])

  let args: string[], prompt: string, tempPromptFile: string | null = null
  if (provider === 'gemini') {
    prompt = sanitizePromptForGemini(options.prompt)
    if (finalFilePath) {
      // [핵심 조치 3] @filepath 단일턴 방식 (검증된 패턴)
      // "도구를 써서 읽어라" 멀티턴 방식은 <ctrl46>} 빈 응답 유발 → @filepath로 사전 로딩
      const forwardSlashPath = finalFilePath.replace(/\\/g, '/')
      prompt = `@"${forwardSlashPath}"\n\n${prompt}`
    }
    if (options.outputFormat === 'json') {
      prompt = 'IMPORTANT: Output ONLY a single JSON object. No other text.\n\n' + prompt
    }

    tempPromptFile = path.join(tempDir, `g_p_${Date.now()}.txt`)
    fs.writeFileSync(tempPromptFile, prompt, 'utf8')

    // --allowed-mcp-server-names __none__: 등록된 MCP 서버 10개 시작 차단
    args = ['--yolo', '-m', model, '--allowed-mcp-server-names', '__none__', ...includeFlags, '-p', `@${tempPromptFile}`]
  } else {
    // Claude CLI: --include-directories 없음, 파일 경로는 프롬프트에 포함
    prompt = options.prompt
    args = ['--output-format', options.outputFormat, '--allowedTools', 'Read', '--max-turns', String(options.maxTurns || 5), '--model', model, '-p', prompt]
  }

  // 디버그: 실제 실행 커맨드 콘솔에 출력
  console.log(`[AI Spawn] ${cli} ${args.join(' ')}`)
  sendRawLog(`[CMD] ${cli} ${args.slice(0, 6).join(' ')} ...`)

  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, { cwd: projectDir || undefined, env: buildSpawnEnv(provider), stdio: ['pipe', 'pipe', 'pipe'] })
    activeProcesses.add(child)
    child.stdin?.end()
    
    const decoder = new StringDecoder('utf8'); let output = '', stderrOutput = ''
    child.stdout?.on('data', (chunk: Buffer) => { const d = decoder.write(chunk); output += d; sendRawLog(d) })
    child.stderr?.on('data', (chunk: Buffer) => { const d = decoder.write(chunk); stderrOutput += d; sendRawLog(d) })
    
    child.on('close', (code) => {
      activeProcesses.delete(child)
      if (tempPromptFile) try { fs.unlinkSync(tempPromptFile) } catch {}
      if (cleanupTempFile) try { fs.unlinkSync(cleanupTempFile) } catch {}

      console.log(`[AI Exit] code=${code} stderr=${stderrOutput.slice(0, 200)}`)
      if (code === 0) {
        resolve(provider === 'gemini' ? unwrapGeminiResponse(output) : output)
      } else {
        const err = classifyError(stderrOutput, code || 1)
        sendRawLog(`[ERROR] exit=${code} | ${stderrOutput}`)
        reject(new Error(err.message))
      }
    })
    child.on('error', (err) => {
      activeProcesses.delete(child)
      if (tempPromptFile) try { fs.unlinkSync(tempPromptFile) } catch {}
      if (cleanupTempFile) try { fs.unlinkSync(cleanupTempFile) } catch {}
      console.log(`[AI Spawn Error] ${err.message}`)
      sendRawLog(`[SPAWN ERROR] ${err.message}`)
      reject(new Error(classifyError(err.message, -1).message)) 
    })
  })
}

export function executeClaudeStream(options: ClaudeExecuteOptions, window: BrowserWindow): ChildProcess {
  const model = getModel(); const provider = getProvider(); const projectDir = getProjectDir(); const cli = getCliPath(provider)
  const includeDirs: string[] = [projectDir]
  if (options.filePath && path.isAbsolute(options.filePath)) includeDirs.push(path.dirname(options.filePath))
  const includeFlags = includeDirs.filter(Boolean).flatMap(dir => ['--include-directories', dir])

  let args: string[], prompt: string
  if (provider === 'gemini') {
    prompt = sanitizePromptForGemini(options.prompt)
    args = ['--output-format', 'stream-json', '--yolo', '-m', model, '--allowed-mcp-server-names', '__none__', ...includeFlags]
  } else {
    prompt = options.prompt
    args = ['--output-format', 'stream-json', '--allowedTools', 'Read', '--max-turns', String(options.maxTurns || 5), '--model', model, ...includeFlags, '-p', prompt]
  }

  const child = spawn(cli, args, { cwd: projectDir || undefined, env: buildSpawnEnv(provider), stdio: ['pipe', 'pipe', 'pipe'] })
  activeProcesses.add(child)
  if (provider === 'gemini') { child.stdin?.write(prompt); child.stdin?.end() }
  const decoder = new StringDecoder('utf8'); let buffer = '', geminiFullText = ''
  let lastPacketTime = Date.now()
  const watchdog = setInterval(() => {
    if (Date.now() - lastPacketTime > 60000) { 
      child.kill('SIGKILL'); window.webContents.send(IPC.CL_STREAM_ERROR, { message: 'AI 타임아웃' }); clearInterval(watchdog)
    }
  }, 5000)

  child.stdout?.on('data', (chunk: Buffer) => {
    lastPacketTime = Date.now(); buffer += decoder.write(chunk)
    const lines = buffer.split('\n'); buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim(); if (!trimmed) continue
      try {
        const event = JSON.parse(trimmed)
        if (provider === 'gemini') {
          if (event.type === 'message' && event.delta) {
            geminiFullText += event.content || ''; window.webContents.send(IPC.CL_STREAM_CHUNK, { type: 'content_block_delta', delta: { text: event.content || '' } })
          } else if (event.type === 'result') {
            window.webContents.send(IPC.CL_STREAM_CHUNK, { type: 'result', result: { text: geminiFullText } })
          }
        } else { window.webContents.send(IPC.CL_STREAM_CHUNK, event) }
      } catch { }
    }
  })
  child.on('close', () => { clearInterval(watchdog); activeProcesses.delete(child) })
  return child
}

export function cancelActiveProcess(): boolean { stopAllProcesses(); return true }

function quickCliCheck(cli: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const child = spawn(cli, ['--version'], { stdio: ['pipe', 'pipe', 'pipe'] })
    child.stdin?.end()
    let out = ''
    child.stdout?.on('data', (d: Buffer) => { out += d.toString() })
    child.stderr?.on('data', (d: Buffer) => { out += d.toString() })
    child.on('close', (code) => {
      const msg = out.trim().slice(0, 80)
      sendRawLog(`[CLI Check] ${cli} --version → exit=${code} | ${msg}`)
      resolve(code === 0 ? { success: true, message: msg || '연결 성공' } : { success: false, message: msg || `exit ${code}` })
    })
    child.on('error', (err) => {
      sendRawLog(`[CLI Check Error] ${cli}: ${err.message}`)
      resolve({ success: false, message: err.message })
    })
  })
}

export async function testClaudeConnection(): Promise<{ success: boolean; message: string }> {
  return quickCliCheck(getSetting('claude_path') || 'claude')
}
export async function testGeminiConnection(): Promise<{ success: boolean; message: string }> {
  return quickCliCheck(getSetting('gemini_path') || 'gemini')
}
