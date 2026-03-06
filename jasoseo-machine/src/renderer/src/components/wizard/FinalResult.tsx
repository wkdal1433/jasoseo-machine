import { useWizardStore } from '@/stores/wizardStore'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { CopyButton } from '@/components/common/CopyButton'

export function FinalResult() {
  const { questions, activeQuestionIndex, setQuestionStep } = useWizardStore()

  const q = questions[activeQuestionIndex]
  if (!q) return null

  const v = q.verificationResult

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">최종 결과 — 문항 {q.questionNumber}</h3>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 whitespace-pre-wrap text-sm leading-relaxed">
          {q.generatedText}
        </div>
      </div>

      <CharacterCounter current={q.generatedText.length} limit={q.charLimit} />

      {v && (
        <div className="flex items-center gap-3 text-xs">
          <span className={v.hallucinationCheck.overallPassed ? 'text-green-600' : 'text-red-600'}>
            할루시네이션 {v.hallucinationCheck.overallPassed ? '\u2713' : '\u2717'}
          </span>
          <span className={v.failPatternCheck.overallPassed ? 'text-green-600' : 'text-red-600'}>
            탈락패턴 {v.failPatternCheck.overallPassed ? '\u2713' : '\u2717'}
          </span>
          <span className={v.dualCodingCheck.overallPassed ? 'text-green-600' : 'text-red-600'}>
            이중코딩 {v.dualCodingCheck.overallPassed ? '\u2713' : '\u2717'}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <CopyButton text={q.generatedText} />
        <button
          onClick={() => setQuestionStep(activeQuestionIndex, 3)}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          편집/재생성
        </button>
        <button
          onClick={() => setQuestionStep(activeQuestionIndex, 6)}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          재검증
        </button>
      </div>
    </div>
  )
}
