import { useState } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { buildStep0Prompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import type { HRIntentItem, Strategy } from '@/types/application'

export function Step0Analysis() {
  const {
    companyName, jobTitle, jobPosting, strategy, hrIntents,
    questions, step0Completed, setStep0Result
  } = useWizardStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const prompt = buildStep0Prompt(
        companyName, jobTitle, jobPosting,
        questions.map((q) => ({ question: q.question, charLimit: q.charLimit })),
        strategy || undefined
      )
      const raw = await window.api.claudeExecute({
        prompt,
        outputFormat: 'json',
        maxTurns: 5,
        appendSystemPrompt: GUI_SYSTEM_PROMPT
      })

      let parsed: { hrIntents: HRIntentItem[]; strategy: Strategy; strategyReason: string }
      try {
        parsed = JSON.parse(raw)
      } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('JSON 파싱 실패')
        parsed = JSON.parse(match[0])
      }

      setStep0Result(parsed.hrIntents, parsed.strategy)
    } catch (err) {
      setError((err as Error).message)
    }
    setIsAnalyzing(false)
  }

  if (step0Completed && hrIntents) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Step 0: 기업 분석 완료</h3>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <p className="mb-2 text-sm font-semibold">HR 의도</p>
          <div className="flex gap-2">
            {hrIntents.map((h, i) => (
              <span
                key={i}
                className="rounded-full bg-green-200 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-200"
              >
                {h.type}: {h.reason}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm">
            <span className="font-semibold">전략:</span> {strategy}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          아래 문항 탭에서 각 문항별 작업을 진행하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Step 0: 기업 전략 해석</h3>
      <p className="text-sm text-muted-foreground">
        채용공고를 AI가 분석하여 HR 의도와 최적 작성 전략을 결정합니다.
      </p>
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm"><span className="font-semibold">기업:</span> {companyName}</p>
        <p className="text-sm"><span className="font-semibold">직무:</span> {jobTitle}</p>
        <p className="text-sm"><span className="font-semibold">문항 수:</span> {questions.length}개</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={runAnalysis}
        disabled={isAnalyzing}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            AI 분석 중...
          </span>
        ) : (
          'AI 기업 분석 시작'
        )}
      </button>
    </div>
  )
}
