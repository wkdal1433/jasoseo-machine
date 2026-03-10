import { useState, useEffect, useRef } from 'react'
import { EpisodeIdea } from '../../../../main/automation/episode-interviewer'
import { useProfileStore } from '@/stores/profileStore'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
}

type Step = 'loading' | 'suggest' | 'interview'

export function EpisodeDiscoveryWizard({ onClose }: Props) {
  const [step, setStep] = useState<Step>('loading')
  const [ideas, setIdeas] = useState<EpisodeIdea[]>([])
  const [currentIndex, setCurrentIndex] = useState(0) // 캐로절 인덱스
  const [progress, setProgress] = useState({ step: '', percent: 0 })
  const [rawLogs, setRawLogs] = useState<string[]>([])
  const [showTerminal, setShowTerminal] = useState(false)
  
  const [selectedIdea, setSelectedIdea] = useState<EpisodeIdea | null>(null)
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; content: string }[]>([])
  const [hiddenState, setHiddenState] = useState<string>('')
  const [input, setInput] = useState('')
  const [isAiTyping, setIsAiAiTyping] = useState(false)
  
  const { profile } = useProfileStore()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // 프로필 ID별 로컬 저장 키
  const IDEAS_CACHE_KEY = `mined_ideas_${(profile as any).id || 'default'}`
  const SESSION_CACHE_KEY = `interview_session_${(profile as any).id || 'default'}`

  useEffect(() => {
    const unsubProgress = (window.api as any).onOnboardingProgress((data: any) => setProgress(data))
    const unsubLogs = (window.api as any).onClaudeRawLog((data: string) => {
      if (data.trim()) setRawLogs(prev => [...prev.slice(-50), data.trim()])
    })

    const initWizard = async () => {
      // 1. 진행 중인 인터뷰 세션 복구 시도
      const savedSession = localStorage.getItem(SESSION_CACHE_KEY)
      if (savedSession) {
        const { idea, msgs, state } = JSON.parse(savedSession)
        if (confirm(`'${idea.title}' 인터뷰 기록이 있습니다. 이어서 진행할까요?`)) {
          setSelectedIdea(idea); setMessages(msgs); setHiddenState(state || ''); setStep('interview'); return
        } else {
          localStorage.removeItem(SESSION_CACHE_KEY)
        }
      }

      // 2. 저장된 아이디어 목록(창고) 확인
      const cachedIdeas = localStorage.getItem(IDEAS_CACHE_KEY)
      if (cachedIdeas) {
        setIdeas(JSON.parse(cachedIdeas))
        setStep('suggest')
        return
      }

      // 3. 캐시가 없으면 최초 분석 실행
      await fetchNewIdeas()
    }

    initWizard()
    return () => { if (unsubProgress) unsubProgress(); if (unsubLogs) unsubLogs(); }
  }, [])

  const fetchNewIdeas = async () => {
    setStep('loading')
    try {
      const result = await window.api.episodeSuggestIdeas()
      if (result.success) {
        setIdeas(result.data)
        localStorage.setItem(IDEAS_CACHE_KEY, JSON.stringify(result.data)) // 창고에 저장
        setStep('suggest')
      } else {
        alert('분석 실패: ' + result.error); onClose()
      }
    } catch { onClose() }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (selectedIdea && messages.length > 0) {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ 
        idea: selectedIdea, msgs: messages, state: hiddenState 
      }))
    }
  }, [messages, hiddenState])

  useEffect(() => {
    if (showTerminal) terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rawLogs, showTerminal])

  const handleSelectIdea = (idea: EpisodeIdea) => {
    setSelectedIdea(idea)
    setMessages([{ role: 'ai', content: `좋습니다! "${idea.title}" 에피소드를 만들어볼까요?\n\n${idea.hookMessage}` }])
    setHiddenState(`START: ${idea.title}`)
    setStep('interview')
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isAiTyping) return
    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setIsAiAiTyping(true)

    try {
      const response = await window.api.claudeExecute({
        prompt: `인터뷰 중... [상태]: ${hiddenState}\n[주제]: ${selectedIdea?.title}\n[대화]: ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\nuser: ${userMsg}\n\n질문 후 [SESSION_ANCHOR: {상태}] 필수. 완벽하면 \`\`\`markdown 출력.`,
        maxTurns: 1
      })
      const anchorMatch = response.match(/\[SESSION_ANCHOR: (.*?)\]/)
      let cleanText = response
      if (anchorMatch) {
        setHiddenState(anchorMatch[1])
        cleanText = response.replace(anchorMatch[0], '').trim()
      }
      setMessages(prev => [...prev, { role: 'ai', content: cleanText }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '에러 발생' }])
    } finally { setIsAiAiTyping(false) }
  }

  const handleSave = async (content: string) => {
    if (await window.api.episodeSaveFile(`ep_auto_${Date.now()}.md`, content)) {
      alert('저장 완료!'); localStorage.removeItem(SESSION_CACHE_KEY); setStep('suggest')
    }
  }

  // 캐로절 제어: 한 번에 하나씩 밀기 (v21.2)
  const nextIdea = () => {
    if (currentIndex < ideas.length - 1) setCurrentIndex(currentIndex + 1)
  }
  const prevIdea = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="text-xl font-bold">AI 에피소드 발굴 마법사</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {step === 'suggest' ? '보석 창고에서 스토리를 골라보세요.' : 'AI와 대화하며 에피소드를 완성합니다.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {step === 'suggest' && (
              <button onClick={fetchNewIdeas} className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                🔄 새로 분석하기
              </button>
            )}
            {step === 'interview' && (
              <button onClick={() => setStep('suggest')} className="text-sm font-bold text-primary hover:underline">← 창고로 돌아가기</button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-8">
          {step === 'loading' && (
            <div className="flex h-full flex-col items-center justify-center space-y-10">
              <div className="relative">
                <div className="h-24 w-24 animate-spin rounded-full border-8 border-primary/20 border-t-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-primary">{progress.percent}%</div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold animate-pulse">{progress.step || '보석 캐는 중...'}</p>
                <p className="text-sm text-muted-foreground">프로필 깊숙한 곳에서 특별한 경험들을 찾아내고 있습니다.</p>
              </div>
              <div className="w-full max-w-md space-y-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                  <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress.percent}%` }}></div>
                </div>
                <div className="flex flex-col items-center">
                  <button onClick={() => setShowTerminal(!showTerminal)} className="text-[10px] font-bold text-muted-foreground hover:text-primary bg-muted/50 px-3 py-1.5 rounded-full">{showTerminal ? '▲ 로그 숨기기' : '▼ 👁️ 실시간 작업 로그'}</button>
                  {showTerminal && (
                    <div className="mt-4 w-full animate-in slide-in-from-top-2 duration-300">
                      <div className="rounded-xl bg-black/90 p-4 font-mono text-[10px] text-green-400/90 h-32 overflow-y-auto custom-scrollbar">
                        {rawLogs.map((log, i) => <div key={i} className="mb-1">[{new Date().toLocaleTimeString()}] {log}</div>)}
                        <div ref={terminalEndRef} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'suggest' && (
            <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-500">
              <div className="text-center">
                <h3 className="text-3xl font-bold">당신을 위한 에피소드 보석함</h3>
                <p className="text-muted-foreground mt-2">지금까지 발굴된 모든 후보들입니다. 인터뷰를 시작할 항목을 고르세요.</p>
              </div>
              
              <div className="flex items-center gap-6 flex-1 overflow-hidden relative px-12">
                {/* 수동 제어 버튼 (v21.2) */}
                <button onClick={prevIdea} disabled={currentIndex === 0} className="absolute left-0 z-10 p-4 rounded-full bg-card border border-border shadow-lg hover:bg-primary hover:text-white disabled:opacity-20 transition-all active:scale-90">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path></svg>
                </button>
                
                <div className="flex-1 flex gap-6 overflow-hidden">
                  {/* 중앙 3개 카드 렌더링 */}
                  {ideas.slice(currentIndex, currentIndex + 3).map((idea, i) => (
                    <button key={i} onClick={() => handleSelectIdea(idea)} className="flex-1 flex flex-col text-left rounded-3xl border border-border bg-muted/20 p-8 transition-all hover:border-primary hover:bg-primary/5 hover:scale-105 shadow-sm">
                      <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary uppercase">{idea.theme}</span>
                      <h4 className="mb-4 text-xl font-bold leading-tight line-clamp-2">{idea.title}</h4>
                      <p className="flex-1 text-sm text-muted-foreground leading-relaxed line-clamp-5">{idea.hookMessage}</p>
                      <div className="mt-8 text-xs font-bold text-primary flex items-center gap-2">상세 인터뷰 진행 <span className="text-lg">→</span></div>
                    </button>
                  ))}
                </div>

                <button onClick={nextIdea} disabled={currentIndex + 3 >= ideas.length} className="absolute right-0 z-10 p-4 rounded-full bg-card border border-border shadow-lg hover:bg-primary hover:text-white disabled:opacity-20 transition-all active:scale-90">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>
                </button>
              </div>
              
              <div className="flex justify-center gap-3">
                {ideas.map((_, i) => (
                  <div key={i} className={cn("h-1.5 rounded-full transition-all", 
                    i >= currentIndex && i < currentIndex + 3 ? "bg-primary w-6" : "bg-muted w-1.5"
                  )} />
                ))}
              </div>
            </div>
          )}

          {step === 'interview' && (
            <div className="h-full flex flex-col space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-3xl px-6 py-4 shadow-sm", msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted/50 border border-border rounded-tl-none")}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.content.includes('```markdown') && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                          <button onClick={() => { const m = msg.content.match(/```markdown\n([\s\S]*)\n```/); if (m) handleSave(m[1]); }} className="w-full rounded-xl bg-green-500 py-3 text-xs font-bold text-white shadow-lg hover:bg-green-600 transition-all active:scale-95">📥 인터뷰 완료 및 에피소드 저장</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isAiTyping && <div className="text-[10px] text-muted-foreground animate-pulse ml-4 font-bold">AI가 답변을 다듬고 상태를 기록 중입니다...</div>}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2 bg-muted/30 p-3 rounded-3xl border border-border focus-within:border-primary/50 transition-colors">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="AI의 질문에 대답하세요..." className="flex-1 bg-transparent px-4 py-2 text-sm outline-none" />
                <button onClick={handleSendMessage} disabled={!input.trim() || isAiTyping} className="rounded-2xl bg-primary px-8 py-2 text-sm font-bold text-primary-foreground shadow-md transition-all active:scale-95 disabled:opacity-50">전송</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
