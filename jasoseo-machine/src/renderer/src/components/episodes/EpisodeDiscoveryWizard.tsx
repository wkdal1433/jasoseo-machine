import { useState, useEffect, useRef } from 'react'
import { EpisodeIdea } from '../../../../main/automation/episode-interviewer'
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
  const [input, setInput] = useState('')
  const [isAiTyping, setIsAiAiTyping] = useState(false)
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // 1. 프로필 분석 및 구독 설정
  useEffect(() => {
    // 실시간 로그/프로그레스 구독
    const unsubProgress = (window.api as any).onOnboardingProgress((data: any) => setProgress(data))
    const unsubLogs = (window.api as any).onClaudeRawLog((data: string) => {
      if (data.trim()) setRawLogs(prev => [...prev.slice(-50), data.trim()])
    })

    const fetchIdeas = async () => {
      // 자동 복구 체크
      const savedSession = localStorage.getItem('episode_interview_session')
      if (savedSession) {
        const { idea, msgs } = JSON.parse(savedSession)
        if (confirm(`'${idea.title}' 인터뷰 기록이 있습니다. 이어서 진행할까요?`)) {
          setSelectedIdea(idea)
          setMessages(msgs)
          setStep('interview')
          return
        } else {
          localStorage.removeItem('episode_interview_session')
        }
      }

      try {
        const result = await window.api.episodeSuggestIdeas()
        if (result.success) {
          setIdeas(result.data)
          setStep('suggest')
        } else {
          alert('분석 실패: ' + result.error)
          onClose()
        }
      } catch { onClose() }
    }

    fetchIdeas()
    return () => { if (unsubProgress) unsubProgress(); if (unsubLogs) unsubLogs(); }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (selectedIdea && messages.length > 0) {
      localStorage.setItem('episode_interview_session', JSON.stringify({ idea: selectedIdea, msgs: messages }))
    }
  }, [messages])

  useEffect(() => {
    if (showTerminal) terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rawLogs, showTerminal])

  const handleSelectIdea = (idea: EpisodeIdea) => {
    setSelectedIdea(idea)
    setMessages([{ role: 'ai', content: `좋습니다! "${idea.title}" 에피소드를 만들어볼까요?\n\n${idea.hookMessage}` }])
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
        prompt: `에피소드 인터뷰 중...\n[주제]: ${selectedIdea?.title}\n[대화]: ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\nuser: ${userMsg}\n\n정보가 충분하면 최종 Markdown을 \`\`\`markdown 태그로 감싸서 출력하세요.`,
        maxTurns: 1
      })
      setMessages(prev => [...prev, { role: 'ai', content: response }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '에러가 발생했습니다.' }])
    } finally { setIsAiAiTyping(false) }
  }

  const handleSave = async (content: string) => {
    if (await window.api.episodeSaveFile(`ep_auto_${Date.now()}.md`, content)) {
      alert('에피소드 저장 완료!'); localStorage.removeItem('episode_interview_session'); onClose()
    }
  }

  const nextIdea = () => currentIndex + 3 < ideas.length && setCurrentIndex(currentIndex + 3)
  const prevIdea = () => currentIndex - 3 >= 0 && setCurrentIndex(currentIndex - 3)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="text-xl font-bold">AI 에피소드 발굴 마법사</h2>
              <p className="text-xs text-muted-foreground">프로필에서 보석 같은 순간을 찾아냅니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {step === 'interview' && (
              <button onClick={() => setStep('suggest')} className="text-sm font-bold text-primary hover:underline">← 목록으로</button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
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
                <p className="text-2xl font-bold animate-pulse">{progress.step || '프로필 분석 중...'}</p>
                <p className="text-sm text-muted-foreground">당신의 소중한 경험들을 꼼꼼하게 분류하고 있습니다.</p>
              </div>
              <div className="w-full max-w-md space-y-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                  <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress.percent}%` }}></div>
                </div>
                <div className="flex flex-col items-center">
                  <button onClick={() => setShowTerminal(!showTerminal)} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors bg-muted/50 px-3 py-1.5 rounded-full">
                    {showTerminal ? '▲ 로그 숨기기' : '▼ 👁️ AI 작업 로그 확인'}
                  </button>
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
                <h3 className="text-2xl font-bold">발굴된 에피소드 후보</h3>
                <p className="text-muted-foreground mt-2">인터뷰를 진행할 스토리를 하나 골라주세요.</p>
              </div>
              
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <button onClick={prevIdea} disabled={currentIndex === 0} className="p-3 rounded-full hover:bg-muted disabled:opacity-20 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path></svg>
                </button>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {ideas.slice(currentIndex, currentIndex + 3).map((idea, i) => (
                    <button key={i} onClick={() => handleSelectIdea(idea)} className="flex flex-col text-left rounded-3xl border border-border bg-muted/20 p-6 transition-all hover:border-primary hover:bg-primary/5 hover:scale-105 shadow-sm">
                      <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary uppercase">{idea.theme}</span>
                      <h4 className="mb-4 text-lg font-bold leading-tight">{idea.title}</h4>
                      <p className="flex-1 text-xs text-muted-foreground leading-relaxed line-clamp-4">{idea.hookMessage}</p>
                      <div className="mt-6 text-xs font-bold text-primary flex items-center gap-2">인터뷰 시작 <span className="text-lg">→</span></div>
                    </button>
                  ))}
                </div>

                <button onClick={nextIdea} disabled={currentIndex + 3 >= ideas.length} className="p-3 rounded-full hover:bg-muted disabled:opacity-20 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>
                </button>
              </div>
              
              <div className="flex justify-center gap-2">
                {Array.from({ length: Math.ceil(ideas.length / 3) }).map((_, i) => (
                  <div key={i} className={cn("h-1.5 w-1.5 rounded-full transition-all", Math.floor(currentIndex / 3) === i ? "bg-primary w-4" : "bg-muted")} />
                ))}
              </div>
            </div>
          )}

          {step === 'interview' && (
            <div className="h-full flex flex-col space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-3xl px-5 py-3 shadow-sm", msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted/50 border border-border rounded-tl-none")}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.content.includes('```markdown') && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                          <button onClick={() => { const m = msg.content.match(/```markdown\n([\s\S]*)\n```/); if (m) handleSave(m[1]); }} className="w-full rounded-xl bg-green-500 py-3 text-xs font-bold text-white shadow-lg hover:bg-green-600 transition-all active:scale-95">📥 이대로 에피소드 저장하기</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isAiTyping && <div className="text-[10px] text-muted-foreground animate-pulse ml-4">AI 컨설턴트 분석 중...</div>}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2 bg-muted/30 p-2 rounded-2xl border border-border">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="AI의 질문에 대답하세요..." className="flex-1 bg-transparent px-4 py-2 text-sm outline-none" />
                <button onClick={handleSendMessage} disabled={!input.trim() || isAiTyping} className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground shadow-md transition-all active:scale-95 disabled:opacity-50">전송</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
