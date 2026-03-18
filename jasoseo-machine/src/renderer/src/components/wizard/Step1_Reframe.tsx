import { useState, useEffect } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { useProfileStore } from '@/stores/profileStore'
import { useEpisodeStore } from '@/stores/episodeStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { buildStep1to2Prompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import type { AnalysisResult } from '@/types/application'
import { Lightbulb, FastForward } from 'lucide-react'

function questionSimilarity(a: string, b: string): number {
  const tokenize = (s: string) => s.replace(/[^가-힣a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const setA = new Set(tokenize(a))
  const setB = new Set(tokenize(b))
  if (setA.size === 0 || setB.size === 0) return 0
  const intersection = [...setA].filter((w) => setB.has(w)).length
  return intersection / Math.max(setA.size, setB.size)
}

interface SimilarDraft {
  company: string
  question: string
  text: string
  date: string
}

export function Step1Reframe() {
  const {
    companyName, jobTitle, jobPosting, hrIntents, strategy,
    questions, activeQuestionIndex, setQuestionAnalysis, setGeneratedText, setQuestionStep,
    approveEpisode,
    getState: getWizardState,
  } = useWizardStore()
  const { profile } = useProfileStore()
  const { episodes } = useEpisodeStore()
  const { applications, loadApplications } = useHistoryStore()
  const { saveSnapshot } = useSnapshotStore()
  const { autoApproveEpisodes } = useSettingsStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [similarDraft, setSimilarDraft] = useState<SimilarDraft | null>(null)
  const [showDraftBanner, setShowDraftBanner] = useState(true)

  const q = questions[activeQuestionIndex]

  useEffect(() => {
    loadApplications()
  }, [])

  useEffect(() => {
    if (!q || q.analysisResult || applications.length === 0) return
    let cancelled = false
    const checkHistory = async () => {
      const recent = applications.slice(0, 5)
      for (const app of recent) {
        if (cancelled) return
        try {
          const detail = await window.api.appGet(app.id) as { coverLetters: { question: string; finalText: string }[] }
          if (!detail?.coverLetters) continue
          for (const cl of detail.coverLetters) {
            if (!cl.finalText || !cl.question) continue
            const sim = questionSimilarity(q.question, cl.question)
            if (sim > 0.3) {
              if (!cancelled) {
                setSimilarDraft({ company: app.companyName, question: cl.question, text: cl.finalText, date: app.updatedAt.slice(0, 10) })
                setShowDraftBanner(true)
              }
              return
            }
          }
        } catch { /* ignore */ }
      }
    }
    checkHistory()
    return () => { cancelled = true }
  }, [applications, q?.id])

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
      // 자동 승인 모드: 첫 번째 추천 에피소드 자동 선택 후 Step 3으로 이동
      if (autoApproveEpisodes && parsed.suggestedEpisodes.length > 0) {
        approveEpisode(activeQuestionIndex, parsed.suggestedEpisodes[0].episodeId)
        setQuestionStep(activeQuestionIndex, 3)
      }
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

      {/* 이전 유사 문항 재활용 배너 */}
      {similarDraft && showDraftBanner && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                <Lightbulb size={14} /> 유사 문항 발견 — {similarDraft.company} ({similarDraft.date})
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200 line-clamp-2">
                Q: {similarDraft.question}
              </p>
            </div>
            <button onClick={() => setShowDraftBanner(false)} className="text-amber-500 hover:text-amber-700 text-lg leading-none">×</button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setGeneratedText(activeQuestionIndex, similarDraft.text)
                setShowDraftBanner(false)
                // 초안 주입 후 현재 상태 스냅샷 저장
                saveSnapshot(`문항 ${activeQuestionIndex + 1}: 이전 초안 주입`, getWizardState(), activeQuestionIndex)
                // Step 3~5로 바로 이동
                setQuestionStep(activeQuestionIndex, 3)
              }}
              className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors flex items-center justify-center gap-1.5"
            >
              <FastForward size={12} /> 이전 초안 불러오기 + 바로 생성 단계로
            </button>
            <button
              onClick={() => {
                setGeneratedText(activeQuestionIndex, similarDraft.text)
                setShowDraftBanner(false)
              }}
              className="rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950 py-2 px-3 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
            >
              참고만
            </button>
          </div>
        </div>
      )}

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
