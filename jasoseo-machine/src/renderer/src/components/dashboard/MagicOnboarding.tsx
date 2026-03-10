import { useState, useCallback, useEffect } from 'react'
import type { OnboardingResult } from '../../../../shared/types/automation'
import { useEpisodeStore } from '@/stores/episodeStore'
import { useProfileStore } from '@/stores/profileStore'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
}

type Step = 'welcome' | 'parsing' | 'result'

export function MagicOnboarding({ onClose }: Props) {
  const [step, setStep] = useState<Step>('welcome')
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeInterviewIndex, setActiveInterviewIndex] = useState<number | null>(null)
  const [interviewMessages, setMessages] = useState<{ role: 'ai' | 'user'; content: string }[]>([])
  const [interviewInput, setInterviewInput] = useState('')
  const [isAiTyping, setIsAiAiTyping] = useState(false)
  
  const { loadEpisodes } = useEpisodeStore()
  const { loadProfile, setLock } = useProfileStore()

  useEffect(() => {
    setLock(true)
    return () => setLock(false)
  }, [])

  // AI에게 분석을 요청하는 통합 함수
  const requestAiAnalysis = async (input: string) => {
    setStep('parsing')
    try {
      // 이제 PDF 경로든 일반 텍스트든 AI가 알아서 처리함
      const response = await window.api.onboardingParseFile(input)
      if (response.success) {
        setResult(response.data)
        setStep('result')
      } else {
        alert('분석에 실패했습니다: ' + response.error)
        setStep('welcome')
      }
    } catch (err) {
      console.error(err)
      setStep('welcome')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (!file) return

    if (file.name.toLowerCase().endsWith('.pdf')) {
      // [v20.0 핵심] 로컬 파싱 없이 파일 경로만 AI에게 전달
      requestAiAnalysis(file.path)
    } else {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        requestAiAnalysis(content)
      }
      reader.readAsText(file)
    }
  }, [])

  const startInterview = (index: number) => {
    const ep = result?.episodes[index]
    if (!ep) return
    setActiveInterviewIndex(index)
    setMessages([{
      role: 'ai',
      content: `안녕하세요! "${ep.title}" 에피소드의 완성도를 높여볼까요?\n\n현재 분석 결과: ${ep.reason}\n\n부족한 부분을 채우기 위해 제가 질문을 드릴게요. 준비되셨나요?`
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
      const response = await window.api.claudeExecute({
        prompt: `에피소드 인라인 인터뷰 중입니다.\n[대상 에피소드]: ${ep.title}\n[기존 내용]: ${ep.content}\n[대화 내역]: ${interviewMessages.map(m => `${m.role}: ${m.content}`).join('\n')}\nuser: ${userMsg}\n\n[지시]: 부족한 S-P-A-A-R-L 요소를 채우기 위한 질문을 하세요. 완벽해졌다면 최종 Markdown을 \`\`\`markdown 태그로 감싸서 보내주세요.`,
        maxTurns: 1
      })
      setMessages((prev) => [...prev, { role: 'ai', content: response }])
      if (response.includes('```markdown')) {
        const match = response.match(/```markdown\n([\s\S]*)\n```/)
        if (match) {
          const updatedEpisodes = [...result!.episodes]
          updatedEpisodes[activeInterviewIndex] = {
            ...updatedEpisodes[activeInterviewIndex],
            content: match[1],
            status: 'ready',
            reason: '인터뷰 완료'
          }
          setResult({ ...result!, episodes: updatedEpisodes })
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', content: '오류 발생' }])
    } finally { setIsAiAiTyping(false) }
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
        await window.api.episodeSaveFile(`ep_magic_${Date.now()}_${i}.md`, ep.content)
      }
      await loadProfile(); await loadEpisodes();
      alert('데이터 반영 완료!'); onClose();
    } catch { alert('저장 실패'); }
  }

  return (
    <div className="flex flex-col h-full p-8 animate-in fade-in duration-500">
      <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lg flex-1">
        <div className="flex items-center justify-between border-b border-border p-6 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧙‍♂️</span>
            <div><h2 className="text-xl font-bold">매직 온보딩 에이전트</h2><p className="text-xs text-muted-foreground">PDF/MD 파일을 던져주세요.</p></div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors text-muted-foreground">뒤로가기</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 'welcome' && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop}
                className={cn("relative flex h-80 w-full max-w-2xl flex-col items-center justify-center rounded-3xl border-4 border-dashed transition-all", isDragging ? "border-primary bg-primary/5 scale-105" : "border-border bg-muted/20")}>
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">📄</div>
                <h3 className="mb-2 text-2xl font-bold">이력서나 자소서를 던져주세요</h3>
                <p className="mb-8 text-muted-foreground px-10">AI가 직접 파일을 읽고 12개 섹션 프로필과 에피소드를 구성합니다.</p>
                <label className="cursor-pointer rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90">
                  파일 선택하기
                  <input type="file" className="hidden" accept=".md,.txt,.pdf" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    if (file.name.toLowerCase().endsWith('.pdf')) requestAiAnalysis(file.path);
                    else { const reader = new FileReader(); reader.onload = (ev) => requestAiAnalysis(ev.target?.result as string); reader.readAsText(file); }
                  }} />
                </label>
              </div>
              <p className="mt-8 text-xs text-muted-foreground">※ v20.0 AI-Native 기술: AI가 직접 파일을 읽어 분석 정확도를 극대화합니다.</p>
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex h-full flex-col items-center justify-center space-y-8">
              <div className="h-24 w-24 animate-spin rounded-full border-8 border-primary/20 border-t-primary"></div>
              <div className="text-center"><p className="text-2xl font-bold animate-pulse">AI가 파일을 직접 읽고 분석 중입니다...</p><p className="text-muted-foreground">약 15~30초 정도 소요될 수 있습니다.</p></div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="text-center"><h3 className="text-3xl font-bold">🎉 분석 완료!</h3><p className="mt-2 text-muted-foreground">AI가 추출한 데이터를 확인해주세요.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold">📂 프로필 결과</h4>
                  <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm space-y-1">
                    <p><strong>성함:</strong> {result.profile.personal?.name || '미확인'}</p>
                    <p><strong>학력:</strong> {result.profile.education?.[0]?.name || '미확인'}</p>
                    {result.missingFields.length > 0 && <p className="text-xs text-orange-600 mt-2">⚠️ 누락: {result.missingFields.join(', ')}</p>}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-lg font-bold">✨ 에피소드 결과</h4>
                  <div className="space-y-3">
                    {result.episodes.map((ep, i) => (
                      <button key={i} onClick={() => activeInterviewIndex === i ? setActiveInterviewIndex(null) : startInterview(i)}
                        className={cn("w-full text-left rounded-2xl border bg-card p-4 shadow-sm", activeInterviewIndex === i ? "border-primary" : "border-border")}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("h-3 w-3 rounded-full", ep.status === 'ready' ? "bg-green-500" : ep.status === 'needs_review' ? "bg-yellow-500" : "bg-red-500")}></div>
                          <span className="text-sm font-bold">{ep.title}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{ep.reason}</p>
                        {activeInterviewIndex === i && (
                          <div className="mt-4 p-3 bg-muted rounded-xl text-xs space-y-2">
                            {interviewMessages.map((m, idx) => <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>{m.content}</div>)}
                            <div className="flex gap-2 mt-2">
                              <input type="text" value={interviewInput} onChange={(e) => setInterviewInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendInterviewMessage()} className="flex-1 bg-background border p-1 rounded" />
                              <button onClick={handleSendInterviewMessage} className="bg-primary text-white px-2 rounded">전송</button>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4">
                <button onClick={() => setStep('welcome')} className="rounded-xl border px-6 py-3 font-bold">다시 업로드</button>
                <button onClick={() => handleSaveAll('merge')} className="rounded-xl border-2 border-primary text-primary px-6 py-3 font-bold">🤝 병합 저장</button>
                <button onClick={() => handleSaveAll('overwrite')} className="rounded-xl bg-primary text-white px-6 py-3 font-bold">🚀 덮어쓰기</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
