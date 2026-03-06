import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

export function SettingsPage() {
  const { claudePath, projectDir, model, theme, loadSettings, setSetting } = useSettingsStore()
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const testConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await window.api.settingsTestCli()
      setTestResult(result as { success: boolean; message: string })
    } catch (err) {
      setTestResult({ success: false, message: (err as Error).message })
    }
    setIsTesting(false)
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
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">모델</label>
              <select
                value={model}
                onChange={(e) => setSetting('model', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="opus">Opus (최고 품질)</option>
                <option value="sonnet">Sonnet (빠른 속도)</option>
              </select>
            </div>
            <button
              onClick={testConnection}
              disabled={isTesting}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              {isTesting ? '테스트 중...' : '연결 테스트'}
            </button>
            {testResult && (
              <p
                className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}
              >
                {testResult.success ? '연결 성공' : `연결 실패: ${testResult.message}`}
              </p>
            )}
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
                placeholder="C:\Users\...\자기소개서"
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
