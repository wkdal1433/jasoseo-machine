import { useState, useEffect, useRef } from 'react'
import { EpisodeIdea } from '../../../../main/automation/episode-interviewer'

interface Props {
  onClose: () => void
}

type Step = 'loading' | 'suggest' | 'interview' | 'confirm'

export function EpisodeDiscoveryWizard({ onClose }: Props) {
  const [step, setStep] = useState<Step>('loading')
  const [ideas, setIdeas] = useState<EpisodeIdea[]>([])
  const [selectedIdea, setSelectedIdea] = useState<EpisodeIdea | null>(null)
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isAiTyping, setIsAiAiTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 1. 프로필 분석 및 아이디어 제안 로드
  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        const result = await window.api.episodeSuggestIdeas()
        if (result.success) {
          setIdeas(result.data)
          setStep('suggest')
        } else {
          alert('경험 분석에 실패했습니다: ' + result.error)
          onClose()
        }
      } catch (err) {
        console.error(err)
        onClose()
      }
    }
    fetchIdeas()
  }, [])

  // 채팅 스크롤 자동 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 2. 인터뷰 시작
  const handleSelectIdea = (idea: EpisodeIdea) => {
    setSelectedIdea(idea)
    setMessages([
      {
        role: 'ai',
        content: `좋습니다! "${idea.title}" 에피소드를 만들어볼까요?\n\n${idea.hookMessage}`
      }
    ])
    setStep('interview')
  }

  // 3. 채팅 전송
  const handleSendMessage = async () => {
    if (!input.trim() || isAiTyping) return

    const userMsg = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setIsAiAiTyping(true)

    try {
      // AI 인터뷰 진행 (현재는 간단하게 시뮬레이션, 추후 Claude API 스트리밍 연결 가능)
      // 실시간 대화를 위해 이전 대화 맥락을 포함한 프롬프트를 전달해야 함
      const response = await window.api.claudeExecute({
        prompt: `사용자와의 에피소드 인터뷰 중입니다.
        
        [주제]: ${selectedIdea?.title}
        [대화 내역]:
        ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
        user: ${userMsg}
        
        [지시]: 사용자의 답변을 듣고 S-P-A-A-R-L 구조를 완성하기 위한 질문을 하나 더 던지세요.
        만약 정보가 충분하다면 최종 Markdown을 생성하고 마지막에 '인터뷰를 종료하고 에피소드를 저장할까요?'라고 물어보세요.`,
        maxTurns: 1
      })

      setMessages((prev) => [...prev, { role: 'ai', content: response }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', content: '죄송합니다. 오류가 발생했습니다.' }])
    } finally {
      setIsAiAiTyping(false)
    }
  }

  // 4. 에피소드 저장
  const handleSave = async (content: string) => {
    const fileName = `ep_auto_${Date.now()}.md`
    const success = await window.api.episodeSaveFile(fileName, content)
    if (success) {
      alert('에피소드가 성공적으로 저장되었습니다!')
      onClose()
    } else {
      alert('저장에 실패했습니다.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-lg font-bold">AI 에피소드 발굴 마법사</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'loading' && (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <div className="text-center">
                <p className="font-bold">당신의 프로필을 정밀 분석 중입니다...</p>
                <p className="text-sm text-muted-foreground">보석 같은 경험을 찾는 데 10초 정도 소요됩니다.</p>
              </div>
            </div>
          )}

          {step === 'suggest' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold">이런 경험은 어떠신가요?</h3>
                <p className="text-sm text-muted-foreground mt-1">프로필을 기반으로 AI가 찾아낸 가장 강력한 스토리 후보들입니다.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ideas.map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectIdea(idea)}
                    className="flex flex-col text-left rounded-xl border border-border bg-muted/30 p-5 transition-all hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02]"
                  >
                    <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                      {idea.theme}
                    </span>
                    <h4 className="mb-3 font-bold leading-snug">{idea.title}</h4>
                    <p className="flex-1 text-xs text-muted-foreground line-clamp-3">
                      {idea.hookMessage}
                    </p>
                    <div className="mt-4 text-[10px] font-medium text-primary">
                      인터뷰 시작하기 →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'interview' && (
            <div className="flex h-full flex-col space-y-4">
              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted text-foreground rounded-tl-none border border-border'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.content.includes('```markdown') && (
                        <button 
                          onClick={() => {
                            const match = msg.content.match(/```markdown\n([\s\S]*)\n```/)
                            if (match) handleSave(match[1])
                          }}
                          className="mt-3 w-full rounded-lg bg-green-500 py-2 text-xs font-bold text-white transition-colors hover:bg-green-600"
                        >
                          📥 완벽합니다! 이대로 저장하기
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted animate-pulse rounded-2xl px-4 py-2 text-xs border border-border text-muted-foreground">
                      AI 컨설턴트가 생각 중...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="flex gap-2 pt-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="대답을 입력하세요..."
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isAiTyping}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  보내기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
