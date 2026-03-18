/**
 * claude-bridge.ts — AI 실행 진입점
 *
 * v2: ClaudeProvider / GeminiProvider 클래스로 분리.
 * ipc-handlers.ts의 import 시그니처는 변경 없음 (R1-3 준수).
 */
import { ChildProcess } from 'child_process'
import spawn from 'cross-spawn'
import { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getSetting } from './db'
import { ClaudeProvider } from './providers/claude-provider'
import { GeminiProvider } from './providers/gemini-provider'
import type { ExecuteOptions as ProviderExecuteOptions } from './providers/ai-provider'

// ─── 프로세스 레지스트리 ────────────────────────────────────────────
const activeProcesses = new Map<string, ChildProcess>()

function genProcessId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function sendRawLog(data: string): void {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) win.webContents.send(IPC.CLAUDE_RAW_LOG, data)
  })
}

export function stopAllProcesses(): void {
  for (const proc of activeProcesses.values()) {
    try { proc.kill('SIGKILL') } catch { }
  }
  activeProcesses.clear()
}

export function cancelProcessById(id: string): boolean {
  const proc = activeProcesses.get(id)
  if (!proc) return false
  try { proc.kill('SIGKILL') } catch { }
  activeProcesses.delete(id)
  return true
}

// ─── Provider 팩토리 ────────────────────────────────────────────────
function getModel(override?: string): string {
  return override || getSetting('model') || 'gemini-3.0-pro'
}

function getProvider(model: string): 'claude' | 'gemini' {
  return model.startsWith('gemini') ? 'gemini' : 'claude'
}

function getCliPath(provider: 'claude' | 'gemini'): string {
  return provider === 'gemini'
    ? (getSetting('gemini_path') || 'gemini')
    : (getSetting('claude_path') || 'claude')
}

function makeProvider(model: string) {
  const provider = getProvider(model)
  if (provider === 'gemini') {
    return new GeminiProvider(
      () => getCliPath('gemini'),
      sendRawLog,
      activeProcesses,
      genProcessId,
    )
  }
  return new ClaudeProvider(
    () => getCliPath('claude'),
    sendRawLog,
    activeProcesses,
    genProcessId,
  )
}

// ─── 기존 export 시그니처 (ipc-handlers.ts 변경 없음) ───────────────
export interface ClaudeExecuteOptions {
  prompt: string
  outputFormat: 'json' | 'stream-json' | 'text'
  modelOverride?: string
  skipProjectDir?: boolean
  jsonSchema?: string
  maxTurns?: number
  appendSystemPrompt?: string
  filePath?: string
  conversational?: boolean
  processId?: string
}

export async function executeClaudePrompt(options: ClaudeExecuteOptions): Promise<string> {
  const model = getModel(options.modelOverride)
  const projectDir = getSetting('project_dir') || ''
  const provider = makeProvider(model)

  const providerOptions: ProviderExecuteOptions = { ...options, modelOverride: model }
  console.log(`[AI Spawn] provider=${provider.name} model=${model}`)
  return provider.execute(providerOptions, projectDir)
}

export function executeClaudeStream(options: ClaudeExecuteOptions, window: BrowserWindow): ChildProcess {
  const model = getModel(options.modelOverride)
  const projectDir = getSetting('project_dir') || ''
  const provider = makeProvider(model)

  const providerOptions: ProviderExecuteOptions = { ...options, modelOverride: model }
  return provider.executeStream(providerOptions, projectDir, window)
}

export function cancelActiveProcess(): boolean {
  stopAllProcesses()
  return true
}

export async function testClaudeConnection(): Promise<{ success: boolean; message: string }> {
  return new ClaudeProvider(
    () => getCliPath('claude'), sendRawLog, activeProcesses, genProcessId
  ).testConnection()
}

export async function testGeminiConnection(): Promise<{ success: boolean; message: string }> {
  return new GeminiProvider(
    () => getCliPath('gemini'), sendRawLog, activeProcesses, genProcessId
  ).testConnection()
}
