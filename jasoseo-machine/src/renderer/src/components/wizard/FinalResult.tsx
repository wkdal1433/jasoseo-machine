import { useState } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { CopyButton } from '@/components/common/CopyButton'
import { buildHeadlineGradePrompt } from '@/lib/prompt-builder'
import { ModelPicker } from '@/components/common/ModelPicker'
import { cn } from '@/lib/utils'
import { Pencil, Star, RefreshCw } from 'lucide-react'

type HeadlineGrade = 'S' | 'A' | 'B' | 'C'
interface HeadlineGradeResult { grade: HeadlineGrade; reason: string; improved: string }

const GRADE_COLORS: Record<HeadlineGrade, string> = {
  S: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  A: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  B: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  C: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function FinalResult() {
  const { questions, activeQuestionIndex, setQuestionStep, setGeneratedText, reopenQuestion, setActiveQuestion, companyName, jobTitle } = useWizardStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [headlineGrade, setHeadlineGrade] = useState<HeadlineGradeResult | null>(null)
  const [isGrading, setIsGrading] = useState(false)

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

  const runHeadlineGrade = async () => {
    if (!q) return
    const headline = q.generatedText.split('\n')[0].replace(/^#+\s*/, '').trim()
    if (!headline) return
    setIsGrading(true)
    try {
      const prompt = buildHeadlineGradePrompt(headline, jobTitle, companyName)
      const headlineModel = await window.api.settingsGet('model_ep_headline_grade') as string | null
      const raw = await window.api.claudeExecute({ prompt, outputFormat: 'json', maxTurns: 1, modelOverride: headlineModel || undefined })
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) setHeadlineGrade(JSON.parse(match[0]) as HeadlineGradeResult)
    } catch { /* ignore */ } finally {
      setIsGrading(false)
    }
  }

  const applyImprovedHeadline = () => {
    if (!headlineGrade || !q) return
    const lines = q.generatedText.split('\n')
    lines[0] = headlineGrade.improved
    setGeneratedText(activeQuestionIndex, lines.join('\n'))
    setHeadlineGrade(null)
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

      {/* 소제목 등급 평가 (#3) */}
      {!isEditing && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Star size={12} /> 소제목 품질 등급
            </span>
            <div className="flex items-center gap-1.5">
              <ModelPicker endpointKey="headline_grade" />
              <button
                onClick={runHeadlineGrade}
                disabled={isGrading}
                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
              >
                {isGrading ? <><RefreshCw size={10} className="animate-spin" /> 평가 중...</> : '평가하기'}
              </button>
            </div>
          </div>
          {headlineGrade && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', GRADE_COLORS[headlineGrade.grade])}>
                  {headlineGrade.grade}급
                </span>
                <span className="text-xs text-muted-foreground">{headlineGrade.reason}</span>
              </div>
              {headlineGrade.grade !== 'S' && headlineGrade.improved && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-3 py-1.5">
                  <span className="text-xs text-green-800 dark:text-green-200 flex-1">S급 개선안: {headlineGrade.improved}</span>
                  <button
                    onClick={applyImprovedHeadline}
                    className="shrink-0 rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-green-700"
                  >
                    적용
                  </button>
                </div>
              )}
            </div>
          )}
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
