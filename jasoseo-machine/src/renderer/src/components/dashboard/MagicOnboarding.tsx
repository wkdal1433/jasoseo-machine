import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { OnboardingResult } from '../../../../shared/types/automation'
import { useEpisodeStore } from '@/stores/episodeStore'
import { useProfileStore } from '@/stores/profileStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import { EngineSwapModal } from '../common/EngineSwapModal'
import { ModelPicker } from '../common/ModelPicker'
import { Wand2, FileText, Sparkles, AlertTriangle, Eye, FolderOpen } from 'lucide-react'

interface Props {
  onClose: () => void
}

type Step = 'welcome' | 'parsing' | 'result' | 'done'

export function MagicOnboarding({ onClose }: Props) {
  const [step, setStep] = useState<Step>('welcome')
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState({ step: '', percent: 0 })
  const [rawLogs, setRawLogs] = useState<string[]>([])
  const [showTerminal, setShowTerminal] = useState(false)
  const [errorInfo, setErrorInfo] = useState<{ type: string; message: string } | null>(null)
  const [activeInterviewIndex, setActiveInterviewIndex] = useState<number | null>(null)
  const [interviewMessages, setMessages] = useState<{ role: 'ai' | 'user'; content: string }[]>([])
  const [interviewInput, setInterviewInput] = useState('')
  const [isAiTyping, setIsAiAiTyping] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const { loadEpisodes } = useEpisodeStore()
  const { profile, loadProfile, setLock } = useProfileStore()
  const { model } = useSettingsStore()
  const [savedEpisodeCount, setSavedEpisodeCount] = useState(0)

  useEffect(() => {
    setLock(true)
    const unsubscribeProgress = (window.api as any).onOnboardingProgress((data: any) => {
      setProgress(data)
    })
    const unsubscribeLogs = (window.api as any).onClaudeRawLog((data: string) => {
      if (data.trim()) {
        setRawLogs((prev) => [...prev.slice(-100), data.trim()])
      }
    })
    return () => {
      setLock(false)
      if (unsubscribeProgress) unsubscribeProgress()
      if (unsubscribeLogs) unsubscribeLogs()
    }
  }, [])

  useEffect(() => {
    if (showTerminal) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [rawLogs, showTerminal])

  // 인터뷰 상태 포함 임시저장 갱신 (result, 인터뷰 메시지, 활성 에피소드 인덱스)
  useEffect(() => {
    if (result && step === 'result') {
      try {
        window.api.draftSave('__onboarding_pending__', {
          result,
          interviewMessages,
          activeInterviewIndex,
          profileId: (profile as any)?.id
        })
      } catch { /* ignore */ }
    }
  }, [result, step, interviewMessages, activeInterviewIndex])

  // 대시보드 복원 배너에서 진입 시 임시저장 결과 불러오기
  useEffect(() => {
    if ((location.state as any)?.restoreOnboarding) {
      window.api.draftGet('__onboarding_pending__').then((draft: any) => {
        if (draft?.wizardState) {
          try {
            const saved = JSON.parse(draft.wizardState)
            // 새 포맷 { result, interviewMessages, activeInterviewIndex } 또는 구 포맷 OnboardingResult
            const savedResult: OnboardingResult = saved.result ?? saved
            setResult(savedResult)
            if (saved.interviewMessages?.length) setMessages(saved.interviewMessages)
            if (saved.activeInterviewIndex !== null && saved.activeInterviewIndex !== undefined) {
              setActiveInterviewIndex(saved.activeInterviewIndex)
            }
            setStep('result')
          } catch { /* ignore */ }
        }
      }).catch(() => { /* ignore */ })
    }
  }, [])

  // AI 분석 통합 요청 (v20.7: 경로 누락 방지 강화)
  const requestAiAnalysis = async (input: string) => {
    if (!input || input === 'undefined') {
      alert('파일 경로를 인식할 수 없습니다. 다시 시도해 주세요.');
      setStep('welcome');
      return;
    }

    setStep('parsing')
    setErrorInfo(null)
    setRawLogs(['분석 세션을 시작합니다...'])
    setProgress({ step: '분석 준비 중...', percent: 5 })
    try {
      const response = await window.api.onboardingParseFile(input)
      if (response.success) {
        setResult(response.data)
        // AI 처리 결과 즉시 임시저장 (앱 재시작 대비)
        try {
          await window.api.draftSave('__onboarding_pending__', { result: response.data, interviewMessages: [], activeInterviewIndex: null })
        } catch { /* 임시저장 실패는 무시 */ }
        setStep('result')
      } else {
        if (response.error.includes('한도') || response.error.includes('소진')) {
          const type = response.error.includes('소진') ? 'quota_exhausted' : 'rate_limit'
          setErrorInfo({ type, message: response.error })
        } else {
          alert('분석에 실패했습니다: ' + response.error)
        }
        setStep('welcome')
      }
    } catch (err) {
      console.error(err)
      setStep('welcome')
    }
  }

  // 파일 브라우저 열기 (v20.7: 네이티브 다이얼로그 방식)
  const handleSelectFile = async () => {
    const path = await (window.api as any).selectFile();
    if (path) {
      if (path.toLowerCase().endsWith('.pdf')) {
        requestAiAnalysis(path);
      } else {
        // MD/TXT 등은 내용을 읽어서 전달
        const content = await window.api.readMd(path);
        if (content) requestAiAnalysis(content);
      }
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    
    // 드롭된 파일은 .path가 보장됨 (Electron 특성)
    if (file.name.toLowerCase().endsWith('.pdf')) {
      requestAiAnalysis((file as any).path)
    } else {
      const reader = new FileReader()
      reader.onload = (event) => requestAiAnalysis(event.target?.result as string)
      reader.readAsText(file)
    }
  }, [])

  const startInterview = (index: number) => {
    const ep = result?.episodes[index]
    if (!ep) return
    setActiveInterviewIndex(index)
    setMessages([{
      role: 'ai',
      content: `안녕하세요! "${ep.title}" 에피소드의 완성도를 높여볼까요?\n\n부족한 부분을 채우기 위해 제가 질문을 드릴게요. 준비되셨나요?`
    }])
  }

  const handleSendInterviewMessage = async () => {
    if (!interviewInput.trim() || isAiTyping || activeInterviewIndex === null) return
    const userMsg = interviewInput.trim()
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setInterviewInput('')
    setIsAiAiTyping(true)
    try {
      const ep = result!.episodes[activeInterviewIndex]
      const onboardingInterviewModel = await window.api.settingsGet('model_ep_onboarding_interview') as string | null
      const response = await window.api.claudeExecute({
        prompt: `에피소드 인터뷰 중...\n[대상]: ${ep.title}\n[기존]: ${ep.content}\n[대화]: ${interviewMessages.map(m => `${m.role}: ${m.content}`).join('\n')}\nuser: ${userMsg}`,
        maxTurns: 1,
        modelOverride: onboardingInterviewModel || undefined,
      })
      setMessages((prev) => [...prev, { role: 'ai', content: response }])
      if (response.includes('```markdown')) {
        const match = response.match(/```markdown\n([\s\S]*)\n```/)
        if (match) {
          const updatedEpisodes = [...result!.episodes]
          updatedEpisodes[activeInterviewIndex] = { ...updatedEpisodes[activeInterviewIndex], content: match[1], status: 'ready' }
          setResult({ ...result!, episodes: updatedEpisodes })
        }
      }
    } catch { setMessages((prev) => [...prev, { role: 'ai', content: '오류 발생' }]) } 
    finally { setIsAiAiTyping(false) }
  }

  const handleSaveAll = async (mode: 'merge' | 'overwrite') => {
    if (!result) return
    try {
      const currentProfile = await window.api.userProfileGet();
      let finalProfile = result.profile;
      if (mode === 'merge' && currentProfile) {
        finalProfile = { ...result.profile, ...currentProfile, id: currentProfile.id };
      }
      await window.api.userProfileSave(finalProfile)
      for (let i = 0; i < result.episodes.length; i++) {
        const ep = result.episodes[i]
        const slug = (ep.title || '')
          .replace(/[^\w가-힣\s]/g, '').replace(/\s+/g, '_').slice(0, 30) || `ep${i + 1}`
        const fileName = `ep_magic_${Date.now()}_${i}_${slug}.md`
        const metaLines: string[] = []
        if (ep.organization) metaLines.push(`| **조직** | ${ep.organization} |`)
        if (ep.period)       metaLines.push(`| **기간** | ${ep.period} |`)
        if (ep.role)         metaLines.push(`| **역할** | ${ep.role} |`)
        const metaTable = metaLines.length > 0
          ? `\n| 항목 | 내용 |\n|------|------|\n${metaLines.join('\n')}\n`
          : ''
        const structured = `# Episode ${i + 1}. ${ep.title || slug}\n${metaTable}\n${ep.content}`
        await window.api.episodeSaveFile(fileName, structured)
      }
      // 저장 완료 → 임시저장 삭제
      try { await window.api.draftDelete('__onboarding_pending__') } catch { /* ignore */ }
      await loadProfile(); await loadEpisodes();
      setSavedEpisodeCount(result.episodes.length)
      setStep('done')
    } catch { alert('저장 실패'); }
  }

  return (
    <div className="flex flex-col h-full p-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lg flex-1">
        <div className="flex items-center justify-between border-b border-border p-6 bg-primary/5">
          <div className="flex items-center gap-3">
            <Wand2 size={40} className="text-primary" />
            <div><h2 className="text-xl font-bold">매직 온보딩 에이전트</h2><p className="text-xs text-muted-foreground">PDF/MD 파일을 던져주세요.</p></div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors text-muted-foreground">뒤로가기</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col">
          {step === 'welcome' && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop}
                className={cn("relative flex h-80 w-full max-w-2xl flex-col items-center justify-center rounded-3xl border-4 border-dashed transition-all", isDragging ? "border-primary bg-primary/5 scale-105" : "border-border bg-muted/20")}>
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText size={48} />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-foreground">이력서나 자소서를 던져주세요</h3>
                <p className="mb-8 text-muted-foreground px-10">AI가 직접 파일을 읽고 12개 섹션 프로필과 에피소드를 구성합니다.</p>
                
                {/* [v20.7] 네이티브 파일 선택 버튼으로 교체 */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleSelectFile}
                    className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90 transition-all active:scale-95"
                  >
                    파일 선택하기
                  </button>
                  <ModelPicker endpointKey="onboarding_parse" />
                </div>
              </div>
              <p className="mt-8 text-xs text-muted-foreground">※ v20.7 AI-Native 기술: 시스템 네이티브 파일 선택으로 경로 인식을 보장합니다.</p>
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex h-full flex-col items-center justify-center space-y-8">
              <div className="relative">
                <div className="h-24 w-24 animate-spin rounded-full border-8 border-primary/20 border-t-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-primary">{progress.percent}%</div>
              </div>
              <div className="text-center space-y-3">
                <p className="text-2xl font-bold animate-pulse">{progress.step || '분석 중...'}</p>
                <p className="text-sm text-muted-foreground">AI가 사용자님의 소중한 경험을 정성스럽게 읽고 있습니다.</p>
              </div>
              <div className="w-full max-w-md space-y-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress.percent}%` }}></div>
                </div>
                <div className="pt-4 flex flex-col items-center">
                  <button onClick={() => setShowTerminal(!showTerminal)} className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors bg-muted/50 px-3 py-1.5 rounded-full">
                    {showTerminal ? '▲ AI 작업 로그 숨기기' : <><Eye size={12} /> AI 작업 로그 확인하기</>}
                  </button>
                  {showTerminal && (
                    <div className="mt-4 w-full max-w-2xl animate-in slide-in-from-top-2 duration-300">
                      <div className="rounded-xl bg-black/90 p-4 shadow-2xl border border-white/10 font-mono text-[10px] leading-relaxed text-green-400/90 h-40 overflow-y-auto custom-scrollbar">
                        {rawLogs.map((log, i) => <div key={i} className="mb-1">[{new Date().toLocaleTimeString()}] {log}</div>)}
                        <div ref={terminalEndRef} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="text-center"><h3 className="text-3xl font-bold flex items-center justify-center gap-2"><Sparkles size={36} className="text-primary" /> 분석 완료!</h3><p className="mt-2 text-muted-foreground">추출된 데이터를 확인해주세요.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold flex items-center gap-2"><FolderOpen size={18} /> 프로필 결과</h4>
                  <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm space-y-1">
                    <p><strong>성함:</strong> {result.profile.personal?.name || '미확인'}</p>
                    <p><strong>학력:</strong> {result.profile.education?.[0]?.name || '미확인'}</p>
                    {result.missingFields.length > 0 && <p className="text-xs text-orange-600 mt-2 flex items-center gap-1"><AlertTriangle size={14} /> 누락: {result.missingFields.join(', ')}</p>}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-lg font-bold flex items-center gap-2"><Sparkles size={16} /> 에피소드 결과</h4>
                  <div className="space-y-3">
                    {result.episodes.map((ep, i) => (
                      <button key={i} onClick={() => activeInterviewIndex === i ? setActiveInterviewIndex(null) : startInterview(i)}
                        className={cn("w-full text-left rounded-2xl border bg-card p-4 shadow-sm", activeInterviewIndex === i ? "border-primary" : "border-border")}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("h-3 w-3 rounded-full", ep.status === 'ready' ? "bg-green-500" : "bg-yellow-500")}></div>
                          <span className="text-sm font-bold">{ep.title}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{ep.reason}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4">
                <button onClick={() => setStep('welcome')} className="rounded-xl border px-6 py-3 font-bold text-sm">다시 업로드</button>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveAll('merge')} className="rounded-xl border-2 border-primary text-primary px-6 py-3 font-bold text-sm">기존 데이터와 병합</button>
                  <button onClick={() => handleSaveAll('overwrite')} className="rounded-xl bg-primary text-white px-8 py-3 font-bold text-sm shadow-xl">새 데이터로 덮어쓰기</button>
                </div>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex h-full flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-primary">
                <Sparkles size={64} />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-foreground">온보딩 완료!</h3>
                <p className="text-muted-foreground leading-relaxed">
                  프로필과 <strong className="text-foreground">{savedEpisodeCount}개</strong>의 에피소드가 저장되었습니다.<br />
                  이제 자소서를 작성할 수 있어요.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-sm">
                <button
                  onClick={() => { navigate('/wizard'); onClose(); }}
                  className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105"
                >
                  지금 바로 지원서 작성하기 →
                </button>
                <button
                  onClick={onClose}
                  className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  대시보드로 돌아가기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {errorInfo && (
        <EngineSwapModal 
          failedModel={model}
          errorType={errorInfo.type}
          onClose={() => setErrorInfo(null)}
          onSwapped={() => { setErrorInfo(null); alert('엔진 교체 완료! 다시 시도해주세요.'); }}
        />
      )}
    </div>
  )
}
