import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '@/stores/wizardStore'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { CopyButton } from '@/components/common/CopyButton'
import { cn } from '@/lib/utils'

export function FullReview() {
  const navigate = useNavigate()
  const {
    applicationId, companyName, jobTitle, jobPosting, strategy, hrIntents,
    questions, resetWizard, setGeneratedText
  } = useWizardStore()

  const [formHtml, setFormHtml] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [autoFillScript, setAutoFillScript] = useState<string | null>(null)
  const [showSecurityGuide, setShowSecurityGuide] = useState(false)
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split')

  const allCompleted = questions.every((q) => q.status === 'completed')
  
  // Combine all texts for the full document preview
  const fullDocumentText = questions
    .map((q) => `[문항 ${q.questionNumber}] ${q.question}\n\n${q.generatedText}`)
    .join('\n\n')

  // Episode usage summary
  const episodeMap: Record<string, number[]> = {}
  questions.forEach((q) => {
    q.approvedEpisodes.forEach((ep) => {
      if (!episodeMap[ep]) episodeMap[ep] = []
      episodeMap[ep].push(q.questionNumber)
    })
  })

  const generateAutoFillScript = async () => {
    if (!formHtml.trim()) {
      alert('채용 사이트의 body 내용을 붙여넣어 주세요.')
      return
    }
    setIsAnalyzing(true)
    try {
      const response = await window.api.analyzeFormStructure(formHtml)
      if (response.success) {
        setAutoFillScript(response.data.script)
      } else {
        alert('분석 실패: ' + response.error)
      }
    } catch (err) {
      alert('오류 발생: ' + err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveToHistory = async () => {
    await window.api.appSave({
      id: applicationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      companyName,
      jobTitle,
      jobPosting,
      strategy: strategy || null,
      hrIntents: hrIntents ? JSON.stringify(hrIntents) : null,
      status: 'completed',
      feedbackNote: null
    })

    for (const q of questions) {
      await window.api.clSave({
        id: q.id,
        applicationId,
        questionNumber: q.questionNumber,
        question: q.question,
        charLimit: q.charLimit,
        episodesUsed: JSON.stringify(q.approvedEpisodes),
        analysisResult: q.analysisResult ? JSON.stringify(q.analysisResult) : null,
        finalText: q.generatedText,
        verificationResult: q.verificationResult ? JSON.stringify(q.verificationResult) : null,
        status: q.status
      })
    }

    await window.api.draftDelete(applicationId)
    resetWizard()
    navigate('/history')
  }

  return (
    <div className="flex flex-col h-full space-y-6 pb-10">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xl font-bold">최종 검토 및 서류 완성</h3>
          <p className="text-sm text-muted-foreground mt-1">제출 전 마지막으로 내용을 다듬고 실제 서류 양식으로 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('editor')}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", viewMode === 'editor' ? "bg-white shadow-sm" : "text-muted-foreground")}
          >에디터</button>
          <button 
            onClick={() => setViewMode('split')}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", viewMode === 'split' ? "bg-white shadow-sm" : "text-muted-foreground")}
          >분할 보기</button>
          <button 
            onClick={() => setViewMode('preview')}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", viewMode === 'preview' ? "bg-white shadow-sm" : "text-muted-foreground")}
          >프리뷰</button>
        </div>
      </div>

      <div className={cn(
        "grid gap-6 flex-1 min-h-0",
        viewMode === 'split' ? "grid-cols-2" : "grid-cols-1"
      )}>
        {/* Left: Editor Column */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className="flex flex-col space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {/* Usage Summary */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">Experience Usage</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(episodeMap).map(([ep, qNums]) => (
                  <span key={ep} className="rounded-md bg-background border px-2 py-1 text-[10px] font-medium">
                    {ep} ({qNums.length})
                  </span>
                ))}
              </div>
            </div>

            {/* Editable Question Cards */}
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">문항 {q.questionNumber}</h4>
                  <CharacterCounter current={q.generatedText.length} limit={q.charLimit} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{q.question}</p>
                <textarea 
                  value={q.generatedText}
                  onChange={(e) => setGeneratedText(idx, e.target.value)}
                  className="w-full min-h-[200px] rounded-xl bg-muted/30 p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 border border-border/50 transition-all resize-none"
                  placeholder="내용을 입력하세요..."
                />
              </div>
            ))}
          </div>
        )}

        {/* Right: A4 Document Preview Column */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="bg-muted/50 rounded-3xl p-8 overflow-y-auto custom-scrollbar flex justify-center">
            {/* A4 Paper Mockup */}
            <div className="w-full max-w-[210mm] bg-white shadow-2xl p-[20mm] flex flex-col space-y-10 min-h-[297mm] h-fit">
              {/* Document Header */}
              <div className="border-b-2 border-black pb-6">
                <h4 className="text-3xl font-serif font-black tracking-tighter uppercase">{companyName} 입사지원서</h4>
                <div className="mt-4 flex justify-between text-sm font-medium">
                  <span>지원직무: {jobTitle}</span>
                  <span>작성일자: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Document Content */}
              <div className="flex-1 space-y-12">
                {questions.map((q) => (
                  <div key={q.id} className="space-y-4">
                    <div className="bg-muted/20 p-3 border-l-4 border-black">
                      <p className="text-sm font-bold leading-snug">
                        {q.questionNumber}. {q.question}
                      </p>
                    </div>
                    <div className="text-sm leading-8 text-justify font-serif whitespace-pre-wrap px-2">
                      {q.generatedText || (
                        <span className="text-muted-foreground italic">내용을 작성 중입니다...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Document Footer */}
              <div className="pt-10 text-center space-y-2 border-t border-border">
                <p className="text-sm font-medium">위 내용은 사실과 다름이 없음을 확인합니다.</p>
                <p className="text-lg font-bold mt-4">지 원 자 : {hrIntents?.[0] ? '장 준 수' : '__________'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 Magic Auto-Fill Section (Fixed at bottom or after content) */}
      <div className="rounded-3xl border-2 border-primary/20 bg-primary/5 p-8 shadow-inner mt-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-xl font-bold text-primary flex items-center gap-2">
              <span>⚡</span> 매직 일괄 자동 입력
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              분석된 사이트 구조에 맞춰 다듬어진 내용을 한 번에 채워넣습니다.
            </p>
          </div>
          <button 
            onClick={() => setShowSecurityGuide(true)}
            className="rounded-full bg-white/50 px-4 py-2 text-xs font-bold text-primary hover:bg-white transition-all border border-primary/10"
          >
            🛡️ 보안 및 사용 안내
          </button>
        </div>

        {!autoFillScript ? (
          <div className="flex gap-4">
            <input
              value={formHtml}
              onChange={(e) => setFormHtml(e.target.value)}
              placeholder="브라우저 <body> 우클릭 -> Copy outerHTML 후 붙여넣기"
              className="flex-1 rounded-xl border border-primary/10 bg-white/80 px-4 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={generateAutoFillScript}
              disabled={isAnalyzing || !formHtml.trim()}
              className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isAnalyzing ? '분석 중...' : '마법 스크립트 생성'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 animate-in zoom-in-95 duration-300">
            <div className="flex-1 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm font-bold text-green-700">
              ✅ 준비 완료! 콘솔에 붙여넣으세요.
            </div>
            <CopyButton text={autoFillScript} label="스크립트 복사" className="h-12 px-10 shadow-md" />
            <button onClick={() => setAutoFillScript(null)} className="text-xs text-muted-foreground underline">다시 생성</button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t border-border shrink-0">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-2xl border border-border bg-white h-14 text-sm font-bold hover:bg-muted transition-all"
        >
          🖨️ PDF 프리뷰 출력
        </button>
        <button
          onClick={saveToHistory}
          disabled={!allCompleted}
          className="flex-[2] rounded-2xl bg-primary h-14 text-lg font-bold text-primary-foreground shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {allCompleted ? '최종 저장 및 완료 💾' : '모든 문항을 작성해주세요'}
        </button>
      </div>

      {/* Security Guide Modal (Same as before) */}
      {showSecurityGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-card p-8 shadow-2xl border border-border animate-in zoom-in-95 duration-300">
            <h5 className="mb-4 text-xl font-bold flex items-center gap-2">🛡️ 안심 주입 가이드</h5>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>1. 브라우저에서 <strong>F12</strong>를 눌러 개발자 도구를 엽니다.</p>
              <p>2. <strong>Console</strong> 탭을 클릭합니다.</p>
              <p>3. 복사한 스크립트를 붙여넣고 <strong>Enter</strong>를 누릅니다.</p>
              <p className="text-xs bg-muted p-3 rounded-lg italic">※ 'allow pasting' 경고가 뜨면 해당 문구를 직접 타이핑한 뒤 다시 시도하세요.</p>
            </div>
            <button onClick={() => setShowSecurityGuide(false)} className="mt-8 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg">이해했습니다</button>
          </div>
        </div>
      )}
    </div>
  )
}
