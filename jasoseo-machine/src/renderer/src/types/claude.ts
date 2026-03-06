export interface ClaudeExecuteOptions {
  prompt: string
  outputFormat: 'json' | 'stream-json'
  jsonSchema?: string
  maxTurns?: number
  appendSystemPrompt?: string
}

export interface StreamEvent {
  type: 'assistant' | 'result' | 'tool_use' | 'tool_result' | 'error' | 'system'
  subtype?: string
  content_block?: {
    type: string
    text?: string
  }
  result?: string
  content?: string
}
