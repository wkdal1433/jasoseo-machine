import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

const MODEL_OPTIONS = [
  { group: 'Claude', models: [
    { value: 'opus', label: 'Opus', desc: '최고 품질, 느린 속도' },
    { value: 'sonnet', label: 'Sonnet', desc: '빠른 속도, 양호한 품질' }
  ]},
  { group: 'Gemini', models: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: '고품질, 복잡한 작업에 적합' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: '빠른 속도, 일상 작업에 적합' }
  ]}
]

export function SettingsPage() {
  const { claudePath, geminiPath, projectDir, model, theme, loadSettings, setSetting } = useSettingsStore()

  const [claudeTestResult, setClaudeTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isClaudeTesting, setIsClaudeTesting] = useState(false)
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isGeminiTesting, setIsGeminiTesting] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const isGeminiModel = model.startsWith('gemini')

  const testClaudeConnection = async () => {
    setIsClaudeTesting(true)
    setClaudeTestResult(null)
    try {
      const result = await window.api.settingsTestCli()
      setClaudeTestResult(result as { success: boolean; message: string })
    } catch (err) {
      setClaudeTestResult({ success: false, message: (err as Error).message })
    }
    setIsClaudeTesting(false)
  }

  const testGeminiConnection = async () => {
    setIsGeminiTesting(true)
    setGeminiTestResult(null)
    try {
      const result = await window.api.settingsTestGemini()
      setGeminiTestResult(result as { success: boolean; message: string })
    } catch (err) {
      setGeminiTestResult({ success: false, message: (err as Error).message })
    }
    setIsGeminiTesting(false)
  }

  const browseDirectory = async () => {
    const dir = await window.api.selectDirectory()
    if (dir) {
      setSetting('project_dir', dir as string)
    }
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <h2 className="mb-6 text-xl font-bold">설정</h2>

      <div className="space-y-6">
        {/* Model Selection */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">AI 모델 선택</h3>
          <div className="space-y-4">
            {MODEL_OPTIONS.map((group) => (
              <div key={group.group}>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{group.group} 계열</p>
                <div className="space-y-1.5">
                  {group.models.map((m) => (
                    <label
                      key={m.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                        model === m.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="model"
                        value={m.value}
                        checked={model === m.value}
                        onChange={() => setSetting('model', m.value)}
                        className="accent-primary"
                      />
                      <div>
                        <span className="text-sm font-medium">{m.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{m.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {isGeminiModel && (
            <p className="mt-3 text-xs text-muted-foreground">
              Gemini CLI는 Google 계정 로그인(무료)으로 사용 가능합니다.
              터미널에서 <code className="rounded bg-muted px-1">gemini</code> 실행 후 로그인하세요.
            </p>
          )}
        </div>

        {/* Claude CLI */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Claude Code CLI</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">CLI 경로</label>
              <input
                type="text"
                value={claudePath}
                onChange={(e) => setSetting('claude_path', e.target.value)}
                placeholder="claude"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                기본값: claude (PATH에 등록된 경우). 아닐 경우 전체 경로 입력
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={testClaudeConnection}
                disabled={isClaudeTesting}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
              >
                {isClaudeTesting ? '테스트 중...' : '연결 테스트'}
              </button>
              {claudeTestResult && (
                <p className={`text-sm ${claudeTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {claudeTestResult.success ? '연결 성공' : `연결 실패: ${claudeTestResult.message}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Gemini CLI */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Gemini CLI</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">CLI 경로</label>
              <input
                type="text"
                value={geminiPath}
                onChange={(e) => setSetting('gemini_path', e.target.value)}
                placeholder="gemini"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                기본값: gemini. 설치: <code className="rounded bg-muted px-1">npm i -g @google/gemini-cli</code>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={testGeminiConnection}
                disabled={isGeminiTesting}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
              >
                {isGeminiTesting ? '테스트 중...' : '연결 테스트'}
              </button>
              {geminiTestResult && (
                <p className={`text-sm ${geminiTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {geminiTestResult.success ? '연결 성공' : `연결 실패: ${geminiTestResult.message}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Project Directory */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">프로젝트 디렉토리</h3>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              자기소개서 프로젝트 경로
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={projectDir}
                onChange={(e) => setSetting('project_dir', e.target.value)}
                placeholder="C:\Users\...\jasoseo"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={browseDirectory}
                className="whitespace-nowrap rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                폴더 선택
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              CLAUDE.md와 episodes/ 폴더가 있는 디렉토리
            </p>
          </div>
        </div>

        {/* Theme */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">UI 설정</h3>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">테마</label>
            <select
              value={theme}
              onChange={(e) => setSetting('theme', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="light">라이트</option>
              <option value="dark">다크</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
