import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import {
  Puzzle,
  Wrench,
  Zap,
  Settings,
  Globe,
  Network,
  RefreshCw,
  Star,
  AlertTriangle
} from 'lucide-react'

// Flash 전용 엔드포인트 키 — 확장 프로그램 핑퐁 파트 (속도 중심, Pro 모델 금지)
const FLASH_ONLY_KEYS = new Set(['form_analyze', 'profile_fill', 'form_extract'])

const ENDPOINT_CONFIGS = [
  { key: 'cover_letter',     label: '자소서 작성 (실시간)',    recommended: 'opus',                  reason: '최고 품질 글쓰기' },
  { key: 'company_analyze',  label: '기업 리서치 (Step 0)',    recommended: 'gemini-2.5-pro',        reason: '웹 검색 + 심층 분석' },
  { key: 'onboarding_parse', label: '온보딩 PDF 분석',         recommended: 'gemini-2.5-pro',        reason: '복잡한 문서 구조 파악' },
  { key: 'ep_suggest',       label: '에피소드 아이디어 제안',  recommended: 'gemini-2.5-flash',      reason: '구조화 출력, 중간 복잡도' },
  { key: 'web_fetch',        label: '채용공고 URL 파싱',       recommended: 'gemini-2.5-pro',        reason: 'fallback 시 복잡한 DOM 구조 해석 필요' },
  { key: 'pattern_analyze',  label: '자소서 패턴 분석',        recommended: 'gemini-2.5-flash',      reason: '단순 패턴 추출' },
  { key: 'form_analyze',     label: '폼 구조 분석 (확장) ⚡',  recommended: 'gemini-2.5-flash-lite', reason: '단순 필드 매칭 — Flash 전용' },
  { key: 'profile_fill',     label: '프로필 채우기 (확장) ⚡', recommended: 'gemini-2.5-flash-lite', reason: '매우 단순한 매핑 — Flash 전용' },
  { key: 'form_extract',     label: '문항 추출 (확장) ⚡',     recommended: 'gemini-2.5-flash-lite', reason: '매우 단순한 추출 — Flash 전용' },
] as const

const MODEL_OPTIONS = [
  { group: 'Claude', models: [
    { value: 'opus', label: 'Opus', desc: '최고 품질, 느린 속도' },
    { value: 'sonnet', label: 'Sonnet', desc: '빠른 속도, 양호한 품질' }
  ]},
  { group: 'Gemini 3 (Preview)', models: [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', desc: '최상위 추론/코딩 성능 (최신)' },
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', desc: '최신 실험적 기능, 대용량 컨텍스트' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', desc: '빠른 속도 + 높은 지능 균형' },
  ]},
  { group: 'Gemini 2.5 (Stable)', models: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: '검증된 고성능 안정화 모델' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: '대량 작업 처리에 최적화된 고속 모델' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', desc: '가장 가볍고 경제적' },
  ]},
  { group: 'Gemini Auto', models: [
    { value: 'auto', label: 'Auto', desc: '상황에 따라 Pro/Flash 자동 전환 (CLI 기본값)' },
  ]}
]

// 확장 프로그램 핑퐁 파트 전용 Flash 모델 목록
const FLASH_MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', desc: '가장 빠름 — 단순 매핑 최적 (추천)' },
  { value: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash',      desc: '균형형 — 복잡한 폼 구조에 적합' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', desc: '최신 Flash — 실험적' },
]

export function SettingsPage() {
  const { claudePath, geminiPath, projectDir, model, theme, colorTheme, autoApproveEpisodes, loadSettings, setSetting } = useSettingsStore()

  const [claudeTestResult, setClaudeTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isClaudeTesting, setIsClaudeTesting] = useState(false)
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isGeminiTesting, setIsGeminiTesting] = useState(false)
  
  const [endpointModels, setEndpointModels] = useState<Record<string, string>>({})
  const [bridgeInfo, setBridgeInfo] = useState<{ port: string; secret: string } | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)

  const handleCopySecret = () => {
    if (!bridgeInfo?.secret) return
    navigator.clipboard.writeText(bridgeInfo.secret)
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  useEffect(() => {
    loadSettings()
    loadBridgeInfo()
    loadEndpointModels()
  }, [])

  const loadEndpointModels = async () => {
    const models: Record<string, string> = {}
    for (const ep of ENDPOINT_CONFIGS) {
      const val = await window.api.settingsGet(`model_ep_${ep.key}`) as string | null
      if (!val) {
        // DB에 없으면 추천값을 즉시 저장 — UI 표시만 되고 실제 AI 호출엔 반영 안 되는 버그 방지
        await window.api.settingsSet(`model_ep_${ep.key}`, ep.recommended)
      }
      models[ep.key] = val || ep.recommended
    }
    setEndpointModels(models)
  }

  const handleEndpointModelChange = async (key: string, value: string) => {
    await window.api.settingsSet(`model_ep_${key}`, value)
    setEndpointModels(prev => ({ ...prev, [key]: value }))
  }

  const resetEndpointModels = async () => {
    for (const ep of ENDPOINT_CONFIGS) {
      await window.api.settingsSet(`model_ep_${ep.key}`, ep.recommended)
    }
    setEndpointModels(Object.fromEntries(ENDPOINT_CONFIGS.map(ep => [ep.key, ep.recommended])))
  }

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

  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false)
  const [fixtureMessage, setFixtureMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const loadDevFixtures = async () => {
    setIsLoadingFixtures(true)
    setFixtureMessage(null)
    try {
      const result = await (window.api as any).devLoadFixtures()
      if (result.success) {
        setFixtureMessage({ type: 'success', text: `✅ 로드 완료! 프로필 1개 + 에피소드 ${result.episodeCount}개 저장됨. 페이지를 새로고침(F5)하면 반영됩니다.` })
      } else {
        setFixtureMessage({ type: 'error', text: '❌ 로드 실패: ' + result.error })
      }
    } finally {
      setIsLoadingFixtures(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl p-8 pb-20">
      <h2 className="mb-6 text-xl font-bold">설정</h2>

      <div className="space-y-6">
        {/* v20.0 Chrome Extension Connection */}
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Puzzle size={24} className="text-primary" />
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
                  {!showSecret ? (
                    <button
                      onClick={() => setShowSecret(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors rounded-lg text-[10px] font-bold opacity-0 hover:opacity-100"
                    >
                      키 보기
                    </button>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowSecret(false)}
                        className="rounded px-2 py-0.5 bg-black/10 hover:bg-black/20 text-[10px] font-bold transition-colors"
                      >
                        숨기기
                      </button>
                      <button
                        onClick={handleCopySecret}
                        className="rounded px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-opacity"
                      >
                        {secretCopied ? '✓ 복사됨' : '복사'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-2">
                <div className="rounded-lg bg-yellow-50 p-3 border border-yellow-100">
                  <p className="text-[10px] text-yellow-800 leading-tight">
                    <strong className="inline-flex items-center gap-1"><AlertTriangle size={14} className="inline" /> 주의:</strong> 이 키는 확장 프로그램과의 보안 통신을 위한 비밀번호입니다.
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

        {/* AI 호출별 모델 설정 */}
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">AI 호출별 모델 설정</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">기능마다 최적 모델을 선택하세요. ⭐는 앱 추천 모델입니다.</p>
            </div>
            <button
              onClick={resetEndpointModels}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent whitespace-nowrap"
            >
              ↺ 추천으로 초기화
            </button>
          </div>
          <div className="space-y-2">
            {ENDPOINT_CONFIGS.map((ep) => {
              const isFlashOnly = FLASH_ONLY_KEYS.has(ep.key)
              const availableModels = isFlashOnly ? FLASH_MODEL_OPTIONS : MODEL_OPTIONS.flatMap(g => g.models)
              const current = endpointModels[ep.key] || ep.recommended
              const isRecommended = current === ep.recommended
              return (
                <div key={ep.key} className={`grid grid-cols-2 items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${isFlashOnly ? 'hover:bg-yellow-50 bg-yellow-50/40 border border-yellow-100' : 'hover:bg-accent/30'}`}>
                  <div>
                    <span className="text-xs font-medium">{ep.label}</span>
                    <span className="ml-1.5 text-[10px] text-muted-foreground">⭐ {ep.recommended}</span>
                    {isRecommended && <span className="ml-1 text-[10px] bg-primary/10 text-primary rounded px-1">추천</span>}
                    {isFlashOnly && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 rounded px-1">Flash 전용</span>}
                  </div>
                  <select
                    value={current}
                    onChange={(e) => handleEndpointModelChange(ep.key, e.target.value)}
                    className={`rounded-md border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring ${isFlashOnly ? 'border-yellow-200 bg-yellow-50' : 'border-input bg-background'}`}
                  >
                    {availableModels.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        {/* CLI 경로 + 연결 테스트 (선택된 모델 기준) */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {isGeminiModel ? 'Gemini CLI' : 'Claude Code CLI'} 설정
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">CLI 경로</label>
              <input
                type="text"
                value={isGeminiModel ? geminiPath : claudePath}
                onChange={(e) => setSetting(isGeminiModel ? 'gemini_path' : 'claude_path', e.target.value)}
                placeholder={isGeminiModel ? 'gemini' : 'claude'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={isGeminiModel ? testGeminiConnection : testClaudeConnection}
                disabled={isGeminiModel ? isGeminiTesting : isClaudeTesting}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
              >
                {(isGeminiModel ? isGeminiTesting : isClaudeTesting) ? '테스트 중...' : '연결 테스트'}
              </button>
              {(isGeminiModel ? geminiTestResult : claudeTestResult) && (
                <p className={`text-sm ${(isGeminiModel ? geminiTestResult : claudeTestResult)?.success ? 'text-green-600' : 'text-red-600'}`}>
                  {(isGeminiModel ? geminiTestResult : claudeTestResult)?.success ? '연결 성공' : `연결 실패: ${(isGeminiModel ? geminiTestResult : claudeTestResult)?.message}`}
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
          <h3 className="mb-4 text-sm font-semibold">UI 설정</h3>

          {/* 밝기 모드 */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">밝기 모드</p>
            <div className="flex gap-2">
              {([
                { value: 'light', label: '라이트', icon: '☀️' },
                { value: 'dark',  label: '다크',   icon: '🌙' },
              ] as const).map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSetting('theme', t.value)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                    theme === t.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 색상 팔레트 */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">색상 컨셉</p>
            <div className="space-y-2">
              {([
                {
                  value: 'standard-blue',
                  name: '스탠다드 블루',
                  desc: '깔끔하고 무난한 기본 파랑',
                  swatches: ['#3b82f6', '#eff6ff', '#dbeafe'],
                  darkSwatches: ['#60a5fa', '#1e3a5f', '#1e40af'],
                },
                {
                  value: 'navy',
                  name: '전문가 네이비',
                  desc: '딥 인디고 + 골드 포인트. 권위감',
                  swatches: ['#2c4a9c', '#f0f4ff', '#f59e0b'],
                  darkSwatches: ['#6b8ee8', '#0a0f1e', '#f59e0b'],
                },
                {
                  value: 'natural-wood',
                  name: '내추럴 우드',
                  desc: '따뜻한 OAK + 버터 아이보리. 카페 느낌',
                  swatches: ['#7c5c35', '#faf7f2', '#c2783a'],
                  darkSwatches: ['#b8895a', '#150f08', '#c2783a'],
                },
                {
                  value: 'spring',
                  name: 'Spring',
                  desc: '블러시 핑크 + 로즈. 부드럽고 포근한 느낌',
                  swatches: ['#f9eff1', '#f5d5dc', '#e8909f'],
                  darkSwatches: ['#c97080', '#1f1014', '#e8909f'],
                },
                {
                  value: 'summer',
                  name: 'Summer',
                  desc: '하늘빛 블루 + 샌드 베이지. 시원한 해변 느낌',
                  swatches: ['#e0f4fc', '#74bef0', '#fde4b0'],
                  darkSwatches: ['#4a9ed4', '#071520', '#f0b84a'],
                },
                {
                  value: 'fall',
                  name: 'Fall',
                  desc: '웜 차콜 그레이 + 번트 앰버. 늦가을 흐린 오후 느낌',
                  swatches: ['#f2f0ee', '#c0b8b0', '#c45a18'],
                  darkSwatches: ['#c45a18', '#171310', '#c0b8b0'],
                },
                {
                  value: 'winter',
                  name: 'Winter',
                  desc: '아이시 블루 + 딥 틸. 차갑고 선명한 느낌',
                  swatches: ['#eaf5fc', '#90bfe8', '#1e7a85'],
                  darkSwatches: ['#3aabba', '#080f18', '#90bfe8'],
                },
              ] as const).map((ct) => {
                const isSelected = (colorTheme || 'standard-blue') === ct.value
                const isDark = theme === 'dark'
                const dots = isDark ? ct.darkSwatches : ct.swatches
                return (
                  <button
                    key={ct.value}
                    onClick={() => setSetting('color_theme', ct.value)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {/* 색상 스와치 */}
                    <div className="flex shrink-0 gap-1">
                      {dots.map((color, i) => (
                        <span
                          key={i}
                          className="block h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {/* 텍스트 */}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ct.name}</p>
                      <p className="text-xs text-muted-foreground">{ct.desc}</p>
                    </div>
                    {/* 선택 표시 */}
                    {isSelected && (
                      <span className="shrink-0 text-xs font-bold text-primary">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 자동화 설정 */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold">자동화 설정</h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApproveEpisodes}
              onChange={(e) => setSetting('auto_approve_episodes', String(e.target.checked))}
              className="mt-0.5 accent-primary"
            />
            <div>
              <p className="text-sm font-medium">AI 추천 에피소드 자동 승인</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Step 2를 건너뛰고 AI가 최고 점수로 추천한 에피소드를 자동 선택합니다. 빠른 초안 작성 시 유용합니다.
              </p>
            </div>
          </label>
        </div>

        {/* Dev Tools — 개발 환경에서만 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 dark:bg-orange-950 p-4">
            <h3 className="mb-1 text-sm font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1"><Wrench size={14} /> 개발용 도구 (Dev Only)</h3>
            <p className="mb-3 text-xs text-orange-600 dark:text-orange-400">
              AI 호출 없이 테스트 프로필 + 에피소드 3개를 즉시 로드합니다.
            </p>
            <button
              onClick={loadDevFixtures}
              disabled={isLoadingFixtures}
              className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isLoadingFixtures ? '로딩 중...' : <span className="flex items-center gap-1"><Zap size={14} /> 테스트 데이터 즉시 로드</span>}
            </button>
            {fixtureMessage && (
              <p className={`mt-2 text-xs rounded-md p-2 ${fixtureMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {fixtureMessage.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
