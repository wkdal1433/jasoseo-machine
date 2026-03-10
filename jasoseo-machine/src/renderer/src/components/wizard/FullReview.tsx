import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '@/stores/wizardStore'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { CopyButton } from '@/components/common/CopyButton'
import { cn } from '@/lib/utils'

export function FullReview() {
  const navigate = useNavigate()
  const {
    applicationId, companyName, jobTitle, jobPosting, strategy, hrIntents,
    questions, resetWizard
  } = useWizardStore()

  const [formHtml, setFormHtml] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [autoFillScript, setAutoFillScript] = useState<string | null>(null)
  const [showSecurityGuide, setShowSecurityGuide] = useState(false)

  const allCompleted = questions.every((q) => q.status === 'completed')
  const allText = questions.map((q) =>
    `[문항 ${q.questionNumber}] ${q.question}\n\n${q.generatedText}`
  ).join('\n\n---\n\n')

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
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">전체 리뷰 및 제출 준비</h3>
        {allCompleted && (
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600 border border-green-500/20">
            작성 완료
          </span>
        )}
      </div>

      {/* Episode Usage Summary */}
      <div className="rounded-2xl border border-border bg-muted/30 p-5">
        <p className="mb-3 text-sm font-bold text-muted-foreground">경험 데이터 활용 요약</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(episodeMap).map(([ep, qNums]) => (
            <span
              key={ep}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium border",
                qNums.length > 2
                  ? "bg-red-50 border-red-200 text-red-700"
                  : qNums.length > 1
                    ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                    : "bg-green-50 border-green-200 text-green-700"
              )}
            >
              <strong>{ep}</strong>: {qNums.length}개 문항 활용
            </span>
          ))}
        </div>
      </div>

      {/* Questions Preview */}
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-bold text-foreground">문항 {q.questionNumber}</h4>
              <CharacterCounter current={q.generatedText.length} limit={q.charLimit} />
            </div>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              {q.question}
            </p>
            <div className="rounded-xl bg-muted/50 p-4 text-sm text-foreground/80 whitespace-pre-wrap line-clamp-4 italic border border-border/50">
              {q.generatedText || '(아직 생성되지 않음)'}
            </div>
          </div>
        ))}
      </div>

      {/* 🚀 Magic Auto-Fill (Batch Input Agent) */}
      <div className="rounded-3xl border-2 border-primary/20 bg-primary/5 p-8 shadow-inner">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-xl font-bold text-primary flex items-center gap-2">
              <span>⚡</span> 매직 일괄 자동 입력 (Beta)
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              채용 사이트의 입력창들을 한 번에 채우는 마법의 스크립트를 생성합니다.
            </p>
          </div>
          <button 
            onClick={() => setShowSecurityGuide(true)}
            className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-xs font-bold text-primary hover:bg-white transition-all border border-primary/10"
          >
            🛡️ 보안 안내 가이드
          </button>
        </div>

        {!autoFillScript ? (
          <div className="space-y-4">
            <textarea
              value={formHtml}
              onChange={(e) => setFormHtml(e.target.value)}
              placeholder="브라우저 개발자 도구(F12) -> Elements -> <body> 우클릭 -> Copy outerHTML 후 여기에 붙여넣으세요."
              className="min-h-[120px] w-full rounded-2xl border border-primary/10 bg-white/80 p-4 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              onClick={generateAutoFillScript}
              disabled={isAnalyzing || !formHtml.trim()}
              className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isAnalyzing ? '사이트 구조 분석 중...' : '마법의 주입 스크립트 생성 ✨'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-4">
              <p className="text-sm font-bold text-green-700">✅ 스크립트 생성 완료!</p>
              <p className="text-xs text-green-600 mt-1">아래 버튼을 눌러 복사한 뒤 브라우저 콘솔에 붙여넣으세요.</p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <CopyButton 
                  text={autoFillScript} 
                  label="마법 스크립트 복사하기" 
                  className="w-full h-14 text-base shadow-lg"
                />
              </div>
              <button 
                onClick={() => setAutoFillScript(null)}
                className="rounded-2xl border border-border bg-white px-6 py-4 text-sm font-bold hover:bg-muted transition-colors"
              >
                다시 생성
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Guide Modal */}
      {showSecurityGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-card p-8 shadow-2xl border border-border animate-in zoom-in-95 duration-300">
            <h5 className="mb-4 text-xl font-bold flex items-center gap-2">
              🛡️ 안심 주입(Safe-Paste) 가이드
            </h5>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                <p className="font-bold text-blue-800 mb-1">Q. 브라우저에서 '경고'가 떠요!</p>
                <p className="text-blue-700/80">
                  처음 콘솔을 사용하는 경우 브라우저가 <code className="bg-white px-1 rounded">allow pasting</code>을 입력하라고 요구할 수 있습니다. 
                  이는 정상적인 보안 절차이며, <strong>allow pasting</strong>을 직접 타이핑하고 엔터를 치면 복사한 스크립트를 붙여넣을 수 있습니다.
                </p>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                <li>생성된 스크립트는 <strong>오직 사용자님의 로컬 PC</strong>에서만 동작합니다.</li>
                <li>개인정보를 외부 서버로 전송하는 로직이 전혀 없는 <strong>순수 입력 대행 코드</strong>입니다.</li>
                <li>자동으로 '제출' 버튼을 누르지 않으므로, 입력된 내용을 충분히 검토할 수 있습니다.</li>
              </ul>
            </div>
            <button 
              onClick={() => setShowSecurityGuide(false)}
              className="mt-8 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg"
            >
              이해했습니다
            </button>
          </div>
        </div>
      )}

      {/* Final Save Action */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <div className="flex-1">
          <CopyButton text={allText} label="전체 자소서 텍스트 복사" className="w-full h-14 bg-secondary text-secondary-foreground" />
        </div>
        <button
          onClick={saveToHistory}
          disabled={!allCompleted}
          className="flex-[1.5] rounded-2xl bg-primary h-14 text-base font-bold text-primary-foreground shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
        >
          {allCompleted ? '이력 저장 및 종료 💾' : '모든 문항을 완료해주세요'}
        </button>
      </div>
    </div>
  )
}
