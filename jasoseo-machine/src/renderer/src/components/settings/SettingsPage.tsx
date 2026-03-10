import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'

const MODEL_OPTIONS = [
  { group: 'Claude', models: [
    { value: 'opus', label: 'Opus', desc: '최고 품질, 느린 속도' },
    { value: 'sonnet', label: 'Sonnet', desc: '빠른 속도, 양호한 품질' }
  ]},
  { group: 'Gemini', models: [
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', desc: '최신 최고 품질 (Preview)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: '고품질, 안정적' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: '빠른 속도, 일상 작업에 적합' }
  ]}
]

export function SettingsPage() {
  const { claudePath, geminiPath, projectDir, model, theme, loadSettings, setSetting } = useSettingsStore()

  const [claudeTestResult, setClaudeTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isClaudeTesting, setIsClaudeTesting] = useState(false)
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isGeminiTesting, setIsGeminiTesting] = useState(false)
  
  const [bridgeInfo, setBridgeInfo] = useState<{ port: string; secret: string } | null>(null)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    loadSettings()
    loadBridgeInfo()
  }, [])

  const loadBridgeInfo = async () => {
    try {
      const info = await (window as any).api.bridgeGetInfo()
      setBridgeInfo(info)
    } catch (err) {
      console.error('Failed to load bridge info:', err)
    }
  }

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
    <div className="mx-auto max-w-xl p-8 pb-20">
      <h2 className="mb-6 text-xl font-bold">설정</h2>

      <div className="space-y-6">
        {/* v20.0 Chrome Extension Connection */}
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">🧩</span>
            <h3 className="text-lg font-bold text-primary">하이브리드 확장 프로그램 연동</h3>
          </div>
          <p className="mb-6 text-xs text-muted-foreground leading-relaxed">
            크롬 확장 프로그램을 통해 채용 사이트에 데이터를 직접 주입할 수 있습니다.<br/>
            아래 정보를 확장 프로그램 설정에 입력하세요.
          </p>
          
          {bridgeInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-xs font-bold text-muted-foreground">브릿지 포트</span>
                <code className="col-span-2 rounded-lg bg-white border border-primary/10 p-2 text-center text-sm font-mono font-bold text-primary">
                  {bridgeInfo.port}
                </code>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-xs font-bold text-muted-foreground">보안 시크릿 키</span>
                <div className="col-span-2 relative">
                  <code className={cn(
                    "block w-full rounded-lg bg-white border border-primary/10 p-2 text-center text-xs font-mono font-bold text-primary truncate",
                    !showSecret && "blur-sm select-none"
                  )}>
                    {bridgeInfo.secret}
                  </code>
                  <button 
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute inset-0 flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors rounded-lg text-[10px] font-bold opacity-0 hover:opacity-100"
                  >
                    {showSecret ? '숨기기' : '키 보기'}
                  </button>
                </div>
              </div>
              <div className="pt-2">
                <div className="rounded-lg bg-yellow-50 p-3 border border-yellow-100">
                  <p className="text-[10px] text-yellow-800 leading-tight">
                    <strong>⚠️ 주의:</strong> 이 키는 확장 프로그램과의 보안 통신을 위한 비밀번호입니다. 
                    절대 타인에게 공개하지 마세요.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground animate-pulse text-center py-4">서버 정보를 불러오는 중...</p>
          )}
        </div>

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

        {/* Project Directory */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">프로젝트 디렉토리</h3>
          <div>
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
          </div>
        </div>

        {/* Theme */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">UI 설정</h3>
          <div>
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
