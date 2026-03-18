import { useState } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { CopyButton } from '@/components/common/CopyButton'
import { Pencil } from 'lucide-react'

export function FinalResult() {
  const { questions, activeQuestionIndex, setQuestionStep, setGeneratedText, reopenQuestion, setActiveQuestion } = useWizardStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')

  const q = questions[activeQuestionIndex]
  if (!q) return null

  const v = q.verificationResult

  const handleStartEdit = () => {
    setEditText(q.generatedText)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    setGeneratedText(activeQuestionIndex, editText)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleGoToStep = (step: number) => {
    reopenQuestion(activeQuestionIndex)
    setQuestionStep(activeQuestionIndex, step as any)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">최종 결과 — 문항 {q.questionNumber}</h3>
        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil size={14} className="inline mr-1" /> 직접 수정
          </button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[300px] resize-none bg-transparent text-sm leading-relaxed outline-none"
            autoFocus
          />
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {q.generatedText}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <CharacterCounter current={isEditing ? editText.length : q.generatedText.length} limit={q.charLimit} />
        {isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              취소
            </button>
            <button
              onClick={handleSaveEdit}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              저장
            </button>
          </div>
        )}
      </div>

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

      {!isEditing && (
        <div className="flex gap-2 flex-wrap">
          <CopyButton text={q.generatedText} />
          <button
            onClick={() => handleGoToStep(3)}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            편집/재생성
          </button>
          <button
            onClick={() => handleGoToStep(6)}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            재검증
          </button>
          {activeQuestionIndex < questions.length - 1 && (
            <button
              onClick={() => setActiveQuestion(activeQuestionIndex + 1)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 ml-auto"
            >
              다음 문항 →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
