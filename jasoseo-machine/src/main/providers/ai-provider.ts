import { ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'

export interface ExecuteOptions {
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

export interface AIProvider {
  readonly name: string
  execute(options: ExecuteOptions, projectDir: string): Promise<string>
  executeStream(options: ExecuteOptions, projectDir: string, window: BrowserWindow): ChildProcess
  testConnection(): Promise<{ success: boolean; message: string }>
}
