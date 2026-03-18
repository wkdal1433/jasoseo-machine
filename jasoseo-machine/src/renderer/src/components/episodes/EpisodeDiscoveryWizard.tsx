import { useState, useEffect, useRef, useMemo } from 'react'
import type { EpisodeIdea } from '../../../../shared/types/automation'
import { useProfileStore } from '@/stores/profileStore'
import { cn } from '@/lib/utils'
import { ModelPicker } from '../common/ModelPicker'
import type { Episode } from '@/types/episode'
import { Search, Sparkles, RefreshCw, Eye, CheckCircle2, Download } from 'lucide-react'

interface Props {
  onClose: () => void
  initialEpisode?: Episode // 제공 시 suggest 스킵 → 해당 에피소드 직접 인터뷰
}

type Step = 'loading' | 'suggest' | 'interview'

export function EpisodeDiscoveryWizard({ onClose, initialEpisode }: Props) {
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
  const [savedTitle, setSavedTitle] = useState<string | null>(null) // 저장 완료 상태

  const { profile } = useProfileStore()

  // S-P-A-A-R-L 진행도: hiddenState에서 MISSING/FILLED 파싱
  const spaarlProgress = useMemo(() => {
    const SECTIONS = ['상황', '문제', '행동', '분석', '결과', '학습']
    const missingMatch = hiddenState.match(/MISSING=([^|]+)/)
    const filledMatch = hiddenState.match(/FILLED=([^|]+)/)
    const missing = missingMatch ? missingMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []
    const filled = filledMatch ? filledMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []
    // MISSING/FILLED 정보가 없으면(발굴 모드 등) 진행도 미표시
    const hasTracking = missingMatch !== null || filledMatch !== null
    return { missing, filled, all: SECTIONS, hasTracking }
  }, [hiddenState])

  const chatEndRef = useRef<HTMLDivElement>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 프로필 ID별 로컬 저장 키
  const IDEAS_CACHE_KEY = `mined_ideas_${(profile as any).id || 'default'}`
  const SESSION_CACHE_KEY = `interview_session_${(profile as any).id || 'default'}`

  useEffect(() => {
    const unsubProgress = (window.api as any).onOnboardingProgress((data: any) => setProgress(data))
    const unsubLogs = (window.api as any).onClaudeRawLog((data: string) => {
      if (data.trim()) setRawLogs(prev => [...prev.slice(-50), data.trim()])
    })

    const initWizard = async () => {
      // [보강 모드] 기존 에피소드가 주어진 경우 → suggest 스킵, 바로 인터뷰 시작
      if (initialEpisode) {
        await startRefineInterview(initialEpisode)
        return
      }

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

  // [보강 모드] 기존 에피소드를 읽고 AI가 부족한 부분 파악 후 첫 질문
  const startRefineInterview = async (episode: Episode) => {
    const fakeIdea: EpisodeIdea = {
      title: episode.title,
      theme: '보강',
      hookMessage: episode.summary || '',
      suggestedAngle: 'S-P-A-A-R-L 보완'
    }
    setSelectedIdea(fakeIdea)
    setStep('interview')
    setIsAiAiTyping(true)
    try {
      const response = await window.api.claudeExecute({
        prompt: `당신은 자기소개서 코치입니다.

[에피소드 제목]: ${episode.title}
[현재 에피소드 내용]:
${episode.rawContent.slice(0, 3000)}

위 에피소드를 S-P-A-A-R-L 6개 섹션(상황/문제/행동/분석/결과/학습) 기준으로 검토하세요.
어떤 섹션에 내용이 있고 어떤 섹션이 비어있거나 부족한지 파악한 뒤,
가장 우선적으로 채워야 할 섹션에 대해 **인터뷰 질문 1가지만** 한국어로 친근하게 물어보세요.

반드시 응답 끝에 다음 형식을 추가하세요:
[SESSION_ANCHOR: MISSING={부족한_섹션명,콤마구분} | FILLED={완성된_섹션명,콤마구분}]
예시: [SESSION_ANCHOR: MISSING=행동,분석,결과,학습 | FILLED=상황,문제]`,
        maxTurns: 1
      })
      const anchorMatch = response.match(/\[SESSION_ANCHOR: (.*?)\]/)
      let cleanText = response
      if (anchorMatch) {
        setHiddenState(`REFINE|${episode.title}|${anchorMatch[1]}|RAW:${episode.rawContent.slice(0, 2000)}`)
        cleanText = response.replace(anchorMatch[0], '').trim()
      } else {
        setHiddenState(`REFINE|${episode.title}|MISSING=상황,문제,행동,분석,결과,학습 | FILLED=|RAW:${episode.rawContent.slice(0, 2000)}`)
      }
      setMessages([{ role: 'ai', content: cleanText }])
    } catch {
      setMessages([{ role: 'ai', content: `"${episode.title}" 에피소드를 검토했습니다. 어떤 부분을 더 구체적으로 보강하고 싶으신가요?` }])
      setHiddenState(`REFINE|${episode.title}|RAW:${episode.rawContent.slice(0, 2000)}`)
    } finally {
      setIsAiAiTyping(false)
    }
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
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setIsAiAiTyping(true)

    try {
      const missingMatch = hiddenState.match(/MISSING=([^|]+)/)
      const stillMissing = missingMatch ? missingMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []
      const allFilled = stillMissing.length === 0

      const response = await window.api.claudeExecute({
        prompt: `당신은 자기소개서 인터뷰 코치입니다.

[인터뷰 주제]: ${selectedIdea?.title}
[현재 진행 상태]: ${hiddenState}

[지금까지 대화]:
${messages.map(m => `${m.role === 'ai' ? 'AI' : '사용자'}: ${m.content}`).join('\n\n')}
사용자: ${userMsg}

---
**규칙**:
${allFilled
  ? '모든 섹션이 채워졌습니다. 아래 형식의 완성된 마크다운을 출력하세요.'
  : `아직 부족한 섹션: [${stillMissing.join(', ')}]\n→ 다음으로 가장 중요한 섹션에 대해 **질문 1가지만** 한국어로 친근하게 물어보세요.\n→ 모든 섹션이 채워지기 전까지는 절대 마크다운을 출력하지 마세요.`
}

**마크다운 출력 시 반드시 이 형식 사용**:
\`\`\`markdown
# [에피소드 제목]

## 상황
(구체적인 상황과 배경)

## 문제
(직면한 문제 또는 도전)

## 행동
(내가 취한 구체적 행동과 판단)

## 분석
(선택의 근거, 대안 검토, 핵심 통찰)

## 결과
(수치·사실 기반의 결과)

## 학습
(이 경험에서 얻은 인사이트와 앞으로의 적용)
\`\`\`

응답 끝에 반드시 추가:
[SESSION_ANCHOR: MISSING={아직_부족한_섹션,콤마구분} | FILLED={완성된_섹션,콤마구분}]
모든 섹션이 완성되어 마크다운을 출력하는 경우: [SESSION_ANCHOR: MISSING= | FILLED=상황,문제,행동,분석,결과,학습]`,
        maxTurns: 1
      })
      const anchorMatch = response.match(/\[SESSION_ANCHOR: (.*?)\]/)
      let cleanText = response
      if (anchorMatch) {
        // 기존 RAW 원문 유지하면서 MISSING/FILLED 갱신
        const rawPart = hiddenState.match(/RAW:[\s\S]*/)?.[0] || ''
        const refinePart = hiddenState.match(/^REFINE\|[^|]+\|/)?.[0] || ''
        setHiddenState(`${refinePart}${anchorMatch[1]}|${rawPart}`)
        cleanText = response.replace(anchorMatch[0], '').trim()
      }
      setMessages(prev => [...prev, { role: 'ai', content: cleanText }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '에러 발생' }])
    } finally { setIsAiAiTyping(false) }
  }

  const handleSave = async (content: string) => {
    // 보강 모드: 기존 파일 덮어쓰기 / 발굴 모드: 새 파일 생성
    const fileName = initialEpisode ? initialEpisode.fileName : `ep_auto_${Date.now()}.md`
    if (await window.api.episodeSaveFile(fileName, content)) {
      localStorage.removeItem(SESSION_CACHE_KEY)
      setSavedTitle(selectedIdea?.title || initialEpisode?.title || '에피소드')
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
            {initialEpisode ? <Search size={24} /> : <Sparkles size={24} />}
            <div>
              <h2 className="text-xl font-bold">
                {initialEpisode ? `에피소드 보강 인터뷰` : 'AI 에피소드 발굴 마법사'}
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {initialEpisode
                  ? `"${initialEpisode.title}" — S-P-A-A-R-L 보완 중`
                  : step === 'suggest' ? '보석 창고에서 스토리를 골라보세요.' : 'AI와 대화하며 에피소드를 완성합니다.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {step === 'suggest' && !initialEpisode && (
              <div className="flex items-center gap-2">
                <button onClick={fetchNewIdeas} className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                  <RefreshCw size={12} /> 새로 분석하기
                </button>
                <ModelPicker endpointKey="ep_suggest" />
              </div>
            )}
            {step === 'interview' && !initialEpisode && (
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
                  <button onClick={() => setShowTerminal(!showTerminal)} className="text-[10px] font-bold text-muted-foreground hover:text-primary bg-muted/50 px-3 py-1.5 rounded-full flex items-center gap-1">{showTerminal ? '▲ 로그 숨기기' : <><Eye size={10} /> 실시간 작업 로그</>}</button>
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

          {step === 'interview' && savedTitle && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 size={64} className="text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">에피소드 저장 완료!</h3>
                <p className="text-muted-foreground text-sm">
                  <span className="font-semibold text-foreground">"{savedTitle}"</span>이(가)<br />
                  에피소드 관리 페이지에 저장되었습니다.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={onClose}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all"
                >
                  에피소드 관리에서 확인하기 →
                </button>
                {!initialEpisode && (
                  <button
                    onClick={() => { setSavedTitle(null); setStep('suggest') }}
                    className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    다른 에피소드도 발굴하기
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'interview' && !savedTitle && (
            <div className="h-full flex flex-col space-y-4 animate-in slide-in-from-right-4 duration-500">
              {/* S-P-A-A-R-L 진행도 표시 (보강 모드 + 섹션 추적 정보 있을 때) */}
              {initialEpisode && spaarlProgress.hasTracking && (
                <div className="flex items-center gap-2 rounded-2xl bg-muted/40 border border-border px-4 py-2.5">
                  <span className="text-[10px] font-bold text-muted-foreground shrink-0">진행도</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {spaarlProgress.all.map((section) => {
                      const isFilled = spaarlProgress.filled.includes(section)
                      const isMissing = spaarlProgress.missing.includes(section)
                      return (
                        <span
                          key={section}
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold border transition-colors',
                            isFilled
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : isMissing
                              ? 'bg-orange-50 text-orange-500 border-orange-200'
                              : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {isFilled ? '✓ ' : ''}{section}
                        </span>
                      )
                    })}
                  </div>
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                    {spaarlProgress.filled.length}/6 완성
                  </span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-3xl px-6 py-4 shadow-sm", msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted/50 border border-border rounded-tl-none")}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.content.includes('```markdown') && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                          <button onClick={() => { const m = msg.content.match(/```markdown\n([\s\S]*)\n```/); if (m) handleSave(m[1]); }} className="w-full rounded-xl bg-green-500 py-3 text-xs font-bold text-white shadow-lg hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-1.5"><Download size={14} /> 인터뷰 완료 및 에피소드 저장</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isAiTyping && <div className="text-[10px] text-muted-foreground animate-pulse ml-4 font-bold">AI가 답변을 다듬고 상태를 기록 중입니다...</div>}
                <div ref={chatEndRef} />
              </div>

              <div className="bg-muted/30 px-4 pt-3 pb-2 rounded-3xl border border-border focus-within:border-primary/50 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="AI의 질문에 대답하세요... (Shift+Enter 줄바꿈)"
                  className="w-full bg-transparent py-1 text-sm outline-none resize-none overflow-y-auto leading-relaxed"
                  style={{ maxHeight: '160px' }}
                />
                <div className="flex justify-end pt-1">
                  <button onClick={handleSendMessage} disabled={!input.trim() || isAiTyping} className="rounded-2xl bg-primary px-8 py-2 text-sm font-bold text-primary-foreground shadow-md transition-all active:scale-95 disabled:opacity-50">전송</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
