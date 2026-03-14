import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '@/stores/wizardStore'
import { useHistoryStore } from '@/stores/historyStore'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { CopyButton } from '@/components/common/CopyButton'
import { buildSurgicalEditPrompt } from '@/lib/prompt-builder'
import { cn } from '@/lib/utils'

export function FullReview() {
  const navigate = useNavigate()
  const { questions, companyName, jobTitle, jobPosting, strategy, hrIntents } = useWizardStore()
  const { loadApplications } = useHistoryStore()
  const [localTexts, setLocalTexts] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const [isSurgicalEditing, setIsSurgicalEditing] = useState(false)
  const [surgicalInput, setSurgicalInput] = useState('')
  const [selectedRange, setSelectedRange] = useState<{ qIdx: number; start: number; end: number } | null>(null)

  useEffect(() => {
    setLocalTexts(questions.map((q) => q.generatedText))
  }, [questions])

  const handleUpdateText = (index: number, text: string) => {
    const next = [...localTexts]
    next[index] = text
    setLocalTexts(next)
  }

  // 부분 수술 실행 (v21.4)
  const runSurgicalEdit = async () => {
    if (!selectedRange || !surgicalInput.trim() || isSurgicalEditing) return
    
    setIsSurgicalEditing(true)
    const { qIdx, start, end } = selectedRange
    const fullText = localTexts[qIdx]
    const targetSection = fullText.slice(start, end)
    
    try {
      const prompt = buildSurgicalEditPrompt(fullText, targetSection, surgicalInput, strategy || 'Balanced')
      const response = await window.api.claudeExecute({ prompt, outputFormat: 'json', maxTurns: 1 })
      
      const newFullText = fullText.slice(0, start) + response.trim() + fullText.slice(end)
      handleUpdateText(qIdx, newFullText)
      setSurgicalInput('')
      setSelectedRange(null)
    } catch (err) {
      alert('부분 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSurgicalEditing(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const appId = `app_${Date.now()}`
      const now = new Date().toISOString()
      await window.api.appSave({
        id: appId,
        createdAt: now,
        updatedAt: now,
        companyName,
        jobTitle,
        jobPosting: jobPosting || '',
        strategy: strategy || null,
        hrIntents: hrIntents ? JSON.stringify(hrIntents) : null,
        status: 'completed',
        feedbackNote: null
      })
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        await window.api.clSave({
          id: `cl_${appId}_${i}`,
          applicationId: appId,
          questionNumber: i + 1,
          question: q.question,
          charLimit: q.charLimit || null,
          episodesUsed: q.approvedEpisodes.length > 0 ? JSON.stringify(q.approvedEpisodes) : null,
          analysisResult: q.analysisResult ? JSON.stringify(q.analysisResult) : null,
          finalText: localTexts[i] || q.generatedText,
          verificationResult: q.verificationResult ? JSON.stringify(q.verificationResult) : null,
          status: 'completed'
        })
      }
      await loadApplications()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendToExtension = async () => {
    setIsSending(true)
    try {
      const combined = localTexts.join('\n\n--- [다음 문항] ---\n\n')
      await window.api.bridgeSetScript(`
        (function() {
          const texts = ${JSON.stringify(localTexts)};
          alert('확장 프로그램을 통해 데이터가 주입됩니다. 문항 순서대로 채워집니다.');
          // 실제 주입 로직은 extension/content.js가 담당
        })()
      `)
      alert('확장 프로그램으로 데이터가 전송되었습니다. 브라우저에서 [자동 입력]을 눌러주세요!')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{companyName} - {jobTitle}</h2>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">Final Review & Hybrid Injection</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/wizard')} className="rounded-xl border border-border px-6 py-2.5 text-sm font-bold hover:bg-muted transition-all">뒤로가기</button>
          <button
            onClick={handleSave}
            disabled={isSaving || saveStatus === 'saved'}
            className={cn(
              'rounded-xl px-6 py-2.5 text-sm font-bold transition-all flex items-center gap-2',
              saveStatus === 'saved'
                ? 'bg-green-500 text-white'
                : 'border border-border hover:bg-muted'
            )}
          >
            {isSaving ? '저장 중...' : saveStatus === 'saved' ? '✓ 저장 완료' : '💾 이력 저장'}
          </button>
          <button onClick={handleSendToExtension} disabled={isSending} className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground shadow-lg hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
            🧩 확장 프로그램으로 전송
          </button>
        </div>
      </div>

      {/* Main Content: Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor List */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 border-r custom-scrollbar">
          {questions.map((q, i) => (
            <div key={q.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary uppercase tracking-tighter">문항 {i + 1}</span>
                <div className="flex items-center gap-4">
                  <CharacterCounter current={localTexts[i]?.length ?? 0} limit={q.charLimit} />
                  <CopyButton text={localTexts[i]} />
                </div>
              </div>
              <h3 className="mb-4 text-sm font-bold text-foreground leading-relaxed">Q. {q.question}</h3>
              <div className="relative">
                <textarea
                  value={localTexts[i]}
                  onChange={(e) => handleUpdateText(i, e.target.value)}
                  onMouseUp={(e) => {
                    const start = e.currentTarget.selectionStart
                    const end = e.currentTarget.selectionEnd
                    if (start !== end) setSelectedRange({ qIdx: i, start, end })
                    else setSelectedRange(null)
                  }}
                  className="w-full rounded-2xl border-2 border-border bg-card p-6 text-sm leading-relaxed outline-none focus:border-primary/30 transition-all min-h-[300px] shadow-sm resize-none"
                />
                
                {/* 🩹 Surgical Edit Floating UI */}
                {selectedRange?.qIdx === i && (
                  <div className="absolute top-[-50px] right-0 flex items-center gap-2 animate-in zoom-in-95 duration-200 bg-card border border-primary/20 p-2 rounded-xl shadow-2xl z-20">
                    <input 
                      type="text" 
                      value={surgicalInput}
                      onChange={(e) => setSurgicalInput(e.target.value)}
                      placeholder="선택한 부분만 어떻게 고칠까요?"
                      className="w-64 bg-muted/50 border-none px-3 py-1.5 text-xs rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button 
                      onClick={runSurgicalEdit}
                      disabled={!surgicalInput.trim() || isSurgicalEditing}
                      className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSurgicalEditing ? '수술 중...' : '🩹 부분 수정'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: A4 Live Preview */}
        <div className="w-[450px] bg-muted/30 overflow-y-auto p-10 hidden xl:block custom-scrollbar">
          <div className="mb-6 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">A4 Live Preview</span>
            <button onClick={() => window.print()} className="text-[10px] font-bold text-primary hover:underline">PDF 출력용 화면</button>
          </div>
          <div className="bg-white p-12 shadow-2xl min-h-[1400px] text-gray-800 font-serif leading-relaxed">
            <h1 className="text-center text-3xl font-bold border-b-4 border-gray-900 pb-6 mb-10 tracking-widest">자 기 소 개 서</h1>
            <div className="space-y-12">
              {questions.map((q, i) => (
                <div key={i}>
                  <h4 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    {i + 1}. {q.question.slice(0, 40)}...
                  </h4>
                  <p className="text-[13px] whitespace-pre-wrap text-justify">
                    {localTexts[i] || '내용이 입력되지 않았습니다.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
