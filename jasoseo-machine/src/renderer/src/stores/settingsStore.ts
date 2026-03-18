import { create } from 'zustand'

interface SettingsState {
  claudePath: string
  geminiPath: string
  projectDir: string
  model: string
  theme: 'light' | 'dark' | 'system'
  autoApproveEpisodes: boolean
  isLoaded: boolean
  loadSettings: () => Promise<void>
  setSetting: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  claudePath: 'claude',
  geminiPath: 'gemini',
  projectDir: '',
  model: 'gemini-3.1-pro-preview',
  theme: 'light',
  autoApproveEpisodes: false,
  isLoaded: false,

  loadSettings: async () => {
    const claudePath = (await window.api.settingsGet('claude_path')) || 'claude'
    const geminiPath = (await window.api.settingsGet('gemini_path')) || 'gemini'
    const projectDir = (await window.api.settingsGet('project_dir')) || ''
    const rawModel = await window.api.settingsGet('model')
    const model = rawModel || 'gemini-3.1-pro-preview'
    const theme = ((await window.api.settingsGet('theme')) as 'light' | 'dark' | 'system') || 'light'
    const autoApproveEpisodes = (await window.api.settingsGet('auto_approve_episodes')) === 'true'
    // DB에 model이 없으면 기본값을 저장해서 bridge와 UI가 항상 동기화되도록 함
    if (!rawModel) await window.api.settingsSet('model', model)
    set({ claudePath, geminiPath, projectDir, model, theme, autoApproveEpisodes, isLoaded: true })
  },

  setSetting: async (key: string, value: string) => {
    await window.api.settingsSet(key, value)
    const keyMap: Record<string, string> = {
      claude_path: 'claudePath',
      gemini_path: 'geminiPath',
      project_dir: 'projectDir',
      auto_approve_episodes: 'autoApproveEpisodes',
    }
    const stateKey = keyMap[key] || key
    const parsedValue: string | boolean = key === 'auto_approve_episodes' ? value === 'true' : value
    set({ [stateKey]: parsedValue } as Partial<SettingsState>)
  }
}))
