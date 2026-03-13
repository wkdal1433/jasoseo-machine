import { useState } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { useProfileStore } from '@/stores/profileStore'
import { useEpisodeStore } from '@/stores/episodeStore'
import { buildStep1to2Prompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import type { AnalysisResult } from '@/types/application'

export function Step1Reframe() {
  const {
    companyName, jobTitle, jobPosting, hrIntents, strategy,
    questions, activeQuestionIndex, setQuestionAnalysis
  } = useWizardStore()
  const { profile } = useProfileStore()
  const { episodes } = useEpisodeStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const q = questions[activeQuestionIndex]
  if (!q || !hrIntents || !strategy) return null

  const runStep1to2 = async () => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const prompt = buildStep1to2Prompt(
        companyName, jobTitle, jobPosting,
        hrIntents, strategy,
        q.question, q.charLimit, profile, episodes
      )
      const raw = await window.api.claudeExecute({
        prompt,
        outputFormat: 'json',
        maxTurns: 5,
        appendSystemPrompt: GUI_SYSTEM_PROMPT
      })

      let parsed: { questionReframe: string; suggestedEpisodes: { episodeId: string; reason: string; angle: string }[] }
      try {
        parsed = JSON.parse(raw)
      } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('JSON 파싱 실패')
        parsed = JSON.parse(match[0])
      }

      const analysis: AnalysisResult = {
        hrIntents,
        strategy,
        strategyReason: '',
        questionReframe: parsed.questionReframe,
        suggestedEpisodes: parsed.suggestedEpisodes
      }
      setQuestionAnalysis(activeQuestionIndex, analysis)
    } catch (err) {
      setError((err as Error).message)
    }
    setIsAnalyzing(false)
  }

  if (q.analysisResult) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Step 1: 질문 재해석 완료</h3>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">원래 질문</p>
          <p className="mb-3 text-sm">{q.question}</p>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">재해석된 질문 의도</p>
          <p className="text-sm font-medium">{q.analysisResult.questionReframe}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          다음 Step에서 추천된 Episode를 승인해주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Step 1-2: 질문 재해석 + Episode 추천</h3>
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm"><span className="font-semibold">문항:</span> {q.question}</p>
        <p className="text-sm"><span className="font-semibold">글자수:</span> {q.charLimit}자</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={runStep1to2}
        disabled={isAnalyzing}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            AI 분석 중...
          </span>
        ) : (
          '질문 재해석 + Episode 추천'
        )}
      </button>
    </div>
  )
}
