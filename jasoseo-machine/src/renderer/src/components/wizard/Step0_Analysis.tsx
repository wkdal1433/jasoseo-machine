import { useState, useEffect } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { useEpisodeStore } from '@/stores/episodeStore'
import { buildStep0Prompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import type { HRIntentItem, Strategy, RecruitmentContext } from '@/types/application'
import { cn } from '@/lib/utils'
import { CheckCircle2, Globe, Search, Link, Lightbulb, AlertTriangle, Target } from 'lucide-react'

const INTENT_LABELS: Record<string, string> = {
  Execution: '실행력',
  Growth: '성장',
  Stability: '안정성',
  Communication: '협업',
}

export function Step0Analysis() {
  const {
    companyName, jobTitle, jobPosting, strategy, hrIntents, recruitmentContext,
    questions, step0Completed, setStep0Result, setRecruitmentContext
  } = useWizardStore()
  const { episodes, loadEpisodes } = useEpisodeStore()

  const [isResearching, setIsResearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tempContext, setTempContext] = useState<RecruitmentContext | null>(null)
  const [showResearchInput, setShowResearchInput] = useState(false)
  const [researchContext, setResearchContext] = useState('')

  useEffect(() => {
    if (episodes.length === 0) loadEpisodes()
  }, [])

  // 1. 기업 정보 리서치
  const runResearch = async (additionalContext?: string) => {
    setIsResearching(true)
    setShowResearchInput(false)
    setError(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await window.api.analyzeCompany(companyName, today, additionalContext || undefined)
      if (response.success) {
        setTempContext({
          foundLinks: response.data.foundLinks,
          hiringValues: response.data.hiringValues,
          preferredQualifications: response.data.preferredQualifications,
          isConfirmed: false,
          lastUpdated: new Date().toISOString()
        })
      } else {
        throw new Error(response.error)
      }
    } catch (err: any) {
      setError('리서치 실패: ' + err.message)
    } finally {
      setIsResearching(false)
    }
  }

  // 2. 리서치 결과 확정
  const confirmResearch = () => {
    if (tempContext) {
      setRecruitmentContext({ ...tempContext, isConfirmed: true })
    }
  }

  // 3. 기업 전략 해석
  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const contextAugmentedPosting = recruitmentContext
        ? `${jobPosting}\n\n[수집된 기업 정보]\n인재상: ${recruitmentContext.hiringValues.join(', ')}\n우대사항: ${recruitmentContext.preferredQualifications.join(', ')}`
        : jobPosting

      const prompt = buildStep0Prompt(
        companyName, jobTitle, contextAugmentedPosting,
        questions.map((q) => ({ question: q.question, charLimit: q.charLimit })),
        strategy || undefined
      )
      const raw = await window.api.claudeExecute({
        prompt,
        outputFormat: 'json',
        maxTurns: 5,
        appendSystemPrompt: GUI_SYSTEM_PROMPT
      })

      let parsed: { hrIntents: HRIntentItem[]; strategy: Strategy }
      try {
        parsed = JSON.parse(raw)
      } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('JSON 파싱 실패: ' + raw.slice(0, 200))
        parsed = JSON.parse(match[0])
      }

      if (!Array.isArray(parsed.hrIntents) || parsed.hrIntents.length === 0) {
        throw new Error('AI가 유효한 HR 의도를 반환하지 않았습니다. 다시 시도해주세요.')
      }
      if (!parsed.strategy) {
        parsed.strategy = strategy || 'Balanced'
      }

      setStep0Result(parsed.hrIntents, parsed.strategy)
    } catch (err: any) {
      setError('분석 실패: ' + err.message)
    }
    setIsAnalyzing(false)
  }

  // 에피소드 매칭: hiringValues ↔ episode hrIntents
  const episodeMatches = (() => {
    if (!recruitmentContext?.isConfirmed || episodes.length === 0) return []
    const intents = ['Execution', 'Growth', 'Stability', 'Communication'] as const
    return intents.map((intent) => {
      const matchingEpisodes = episodes.filter((ep) => ep.hrIntents.includes(intent as any))
      return { intent, label: INTENT_LABELS[intent], matchingEpisodes }
    }).filter((m) => m.matchingEpisodes.length > 0)
  })()

  if (step0Completed && hrIntents) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 size={20} className="text-green-500" />
          <h3 className="text-lg font-bold">Step 0: 기업 분석 및 전략 수립 완료</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950">
            <p className="mb-3 text-sm font-bold text-green-800">AI 제안 HR 의도</p>
            <div className="space-y-2">
              {hrIntents.map((h, i) => (
                <div key={i} className="text-xs">
                  <span className="font-bold text-green-700">[{h.intent}]</span> {h.reason}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950">
            <p className="mb-3 text-sm font-bold text-blue-800">선택된 작성 전략</p>
            <p className="text-sm font-bold text-blue-700 capitalize">{strategy}</p>
            <p className="mt-1 text-xs text-blue-600/80 leading-relaxed">
              해당 기업의 가치와 직무 우대사항을 고려한 전략입니다.
            </p>
          </div>
        </div>

        {recruitmentContext && (
          <div className="rounded-2xl border border-border bg-muted/20 p-5">
            <p className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider text-muted-foreground/60">Confirmed Hiring Values</p>
            <div className="flex flex-wrap gap-2">
              {recruitmentContext.hiringValues.map((v, i) => (
                <span key={i} className="rounded-full bg-background border border-border px-2 py-1 text-[10px]">{v}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold">Step 0: 지능형 기업 분석</h3>
        <p className="text-sm text-muted-foreground mt-1">
          2026년 최신 공고를 분석하고 최적의 합격 전략을 수립합니다.
        </p>
      </div>

      {!recruitmentContext?.isConfirmed ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm">1. 실시간 기업 리서치</h4>
            {!tempContext && !showResearchInput && (
              <button
                onClick={() => runResearch()}
                disabled={isResearching}
                className="rounded-lg bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
              >
                {isResearching ? '검색 중...' : <span className="flex items-center gap-1.5"><Globe size={14} /> 실시간 정보 사냥 시작</span>}
              </button>
            )}
          </div>

          {isResearching && (
            <div className="rounded-2xl border-2 border-dashed border-primary/30 p-10 text-center animate-pulse">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent inline-block mr-2" />
              <span className="text-sm text-muted-foreground">인터넷에서 최신 정보를 수집 중입니다...</span>
            </div>
          )}

          {showResearchInput && !isResearching && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <p className="text-xs font-bold text-primary">추가 검색 컨텍스트 (선택사항)</p>
              <p className="text-xs text-muted-foreground">
                더 구체적으로 찾고 싶은 정보가 있다면 입력하세요.
                예: "기술 스택 우대사항", "신입 공채 자격요건", "ESG 경영 가치관"
              </p>
              <textarea
                value={researchContext}
                onChange={(e) => setResearchContext(e.target.value)}
                placeholder="예: 백엔드 개발자 기술 우대사항 위주로 찾아줘"
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => runResearch(researchContext.trim() || undefined)}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
                >
                  <Search size={14} className="inline mr-1" /> 다시 검색
                </button>
                <button
                  onClick={() => { setShowResearchInput(false); setResearchContext('') }}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {tempContext && !isResearching && !showResearchInput ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-primary mb-2">추천 인재상/핵심가치</p>
                  <div className="flex flex-wrap gap-2">
                    {tempContext.hiringValues.map((v, i) => (
                      <span key={i} className="rounded-full bg-white border border-primary/10 px-3 py-1 text-xs font-medium">{v}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary mb-2">확인된 참고 링크 (클릭하여 확인)</p>
                  <div className="space-y-1">
                    {tempContext.foundLinks.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate">
                        <Link size={14} /> {link.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={confirmResearch} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg">
                  이 정보로 전략 수립하기
                </button>
                <button
                  onClick={() => { setShowResearchInput(true); setResearchContext('') }}
                  className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold"
                >
                  다시 검색
                </button>
              </div>
            </div>
          ) : (
            !isResearching && !showResearchInput && (
              <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  회사명을 기반으로 최신 인재상과 우대사항을 찾아드릴까요?
                </p>
              </div>
            )
          )}
        </section>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              <div className="text-sm">
                <span className="font-bold text-green-700">기업 리서치 완료:</span>{' '}
                {recruitmentContext.hiringValues.slice(0, 3).join(', ')}
                {recruitmentContext.hiringValues.length > 3 && '...'}
              </div>
            </div>
            <button
              onClick={() => setRecruitmentContext({ ...recruitmentContext, isConfirmed: false })}
              className="text-xs text-muted-foreground underline"
            >
              수정
            </button>
          </div>

          {/* 에피소드 매칭도 */}
          {episodeMatches.length > 0 && (
            <div className="rounded-2xl border border-border bg-muted/10 p-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Lightbulb size={14} /> 내 에피소드 매칭도
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                기업 인재상과 내 에피소드 간 겹치는 역량입니다. 참고용 표시입니다.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {episodeMatches.map(({ intent, label, matchingEpisodes }) => (
                  <div key={intent} className="rounded-xl border border-border bg-background p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{label}</span>
                      <span className="text-[10px] text-muted-foreground">{matchingEpisodes.length}개 에피소드</span>
                    </div>
                    <div className="space-y-0.5">
                      {matchingEpisodes.slice(0, 2).map((ep) => (
                        <p key={ep.id} className="text-[11px] text-foreground/70 truncate">· {ep.title}</p>
                      ))}
                      {matchingEpisodes.length > 2 && (
                        <p className="text-[10px] text-muted-foreground">+{matchingEpisodes.length - 2}개 더</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h4 className={cn("font-bold text-sm", !recruitmentContext?.isConfirmed && "opacity-50")}>2. AI 전략 도출</h4>
          {!recruitmentContext?.isConfirmed && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              ① 리서치를 먼저 완료해주세요
            </span>
          )}
        </div>
        <div className={cn("rounded-2xl border border-border bg-muted/30 p-5", !recruitmentContext?.isConfirmed && "opacity-50")}>
          <p className="text-sm"><span className="font-semibold text-foreground">대상 기업:</span> {companyName}</p>
          <p className="text-sm"><span className="font-semibold text-foreground">지원 직무:</span> {jobTitle}</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-100 italic flex items-center gap-1.5">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || !recruitmentContext?.isConfirmed}
          className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:grayscale"
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              최적의 합격 전략 수립 중...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">합격 전략 수립 시작 <Target size={14} /></span>
          )}
        </button>
      </section>
    </div>
  )
}
