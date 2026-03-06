import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '@/stores/wizardStore'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { CopyButton } from '@/components/common/CopyButton'

export function FullReview() {
  const navigate = useNavigate()
  const {
    applicationId, companyName, jobTitle, jobPosting, strategy, hrIntents,
    questions, resetWizard
  } = useWizardStore()

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

  const saveToHistory = async () => {
    // Save application
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

    // Save each cover letter
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

    // Delete draft
    await window.api.draftDelete(applicationId)

    resetWizard()
    navigate('/history')
  }

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold">
        {companyName} · {jobTitle} — 전체 리뷰
      </h3>

      {/* Episode Usage Summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Episode 사용 현황</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(episodeMap).map(([ep, qNums]) => (
            <span
              key={ep}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                qNums.length > 2
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : qNums.length > 1
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              }`}
            >
              {ep} ({qNums.length}회)
            </span>
          ))}
        </div>
      </div>

      {/* Per-question summary */}
      {questions.map((q) => (
        <div key={q.id} className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-bold">문항 {q.questionNumber}: {q.question}</h4>
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              q.status === 'completed'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {q.status === 'completed' ? '완료' : '미완료'}
            </span>
          </div>
          <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>Episodes: {q.approvedEpisodes.join(', ')}</span>
            <CharacterCounter current={q.generatedText.length} limit={q.charLimit} />
          </div>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {q.generatedText || '(아직 생성되지 않음)'}
          </p>
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-2">
        <CopyButton text={allText} label="전체 복사" />
        <button
          onClick={saveToHistory}
          disabled={!allCompleted}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {allCompleted ? '이력에 저장' : '모든 문항을 완료해주세요'}
        </button>
      </div>
    </div>
  )
}
