import { create } from 'zustand'

interface SettingsState {
  claudePath: string
  geminiPath: string
  projectDir: string
  model: string
  theme: 'light' | 'dark' | 'system'
  isLoaded: boolean
  loadSettings: () => Promise<void>
  setSetting: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  claudePath: 'claude',
  geminiPath: 'gemini',
  projectDir: '',
  model: 'opus',
  theme: 'light',
  isLoaded: false,

  loadSettings: async () => {
    const claudePath = (await window.api.settingsGet('claude_path')) || 'claude'
    const geminiPath = (await window.api.settingsGet('gemini_path')) || 'gemini'
    const projectDir = (await window.api.settingsGet('project_dir')) || ''
    const model = (await window.api.settingsGet('model')) || 'opus'
    const theme = ((await window.api.settingsGet('theme')) as 'light' | 'dark' | 'system') || 'light'
    set({ claudePath, geminiPath, projectDir, model, theme, isLoaded: true })
  },

  setSetting: async (key: string, value: string) => {
    await window.api.settingsSet(key, value)
    const keyMap: Record<string, string> = {
      claude_path: 'claudePath',
      gemini_path: 'geminiPath',
      project_dir: 'projectDir'
    }
    const stateKey = keyMap[key] || key
    set({ [stateKey]: value } as Partial<SettingsState>)
  }
}))
