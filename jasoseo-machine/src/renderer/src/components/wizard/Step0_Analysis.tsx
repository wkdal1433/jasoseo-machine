import { useState } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { buildStep0Prompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import type { HRIntentItem, Strategy, RecruitmentContext } from '@/types/application'
import { cn } from '@/lib/utils'

export function Step0Analysis() {
  const {
    companyName, jobTitle, jobPosting, strategy, hrIntents, recruitmentContext,
    questions, step0Completed, setStep0Result, setRecruitmentContext
  } = useWizardStore()
  
  const [isResearching, setIsResearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tempContext, setTempContext] = useState<RecruitmentContext | null>(null)

  // 1. 기업 정보 리서치 (Core 2)
  const runResearch = async () => {
    setIsResearching(true)
    setError(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await window.api.analyzeCompany(companyName, today)
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

  // 3. 기업 전략 해석 (기존 Step 0)
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
        if (!match) throw new Error('JSON 파싱 실패')
        parsed = JSON.parse(match[0])
      }

      setStep0Result(parsed.hrIntents, parsed.strategy)
    } catch (err: any) {
      setError('분석 실패: ' + err.message)
    }
    setIsAnalyzing(false)
  }

  if (step0Completed && hrIntents) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-green-600">
          <span className="text-xl">✅</span>
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
            {!tempContext && (
              <button
                onClick={runResearch}
                disabled={isResearching}
                className="rounded-lg bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
              >
                {isResearching ? '검색 중...' : '🌐 실시간 정보 사냥 시작'}
              </button>
            )}
          </div>

          {tempContext ? (
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
                      <a key={i} href={link.url} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 hover:underline truncate">
                        🔗 {link.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={confirmResearch} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg">
                  이 정보로 전략 수립하기
                </button>
                <button onClick={() => setTempContext(null)} className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold">
                  다시 검색
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">
                회사명을 기반으로 최신 인재상과 우대사항을 찾아드릴까요?
              </p>
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">✅</span>
            <div className="text-sm">
              <span className="font-bold text-green-700">기업 리서치 완료:</span> {tempContext?.hiringValues.slice(0, 3).join(', ')}...
            </div>
          </div>
          <button onClick={() => setRecruitmentContext({ ...recruitmentContext, isConfirmed: false })} className="text-xs text-muted-foreground underline">수정</button>
        </div>
      )}

      <section className="space-y-4">
        <h4 className={cn("font-bold text-sm", !recruitmentContext?.isConfirmed && "opacity-50")}>2. AI 전략 도출</h4>
        <div className={cn("rounded-2xl border border-border bg-muted/30 p-5", !recruitmentContext?.isConfirmed && "opacity-50")}>
          <p className="text-sm"><span className="font-semibold text-foreground">대상 기업:</span> {companyName}</p>
          <p className="text-sm"><span className="font-semibold text-foreground">지원 직무:</span> {jobTitle}</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-100 italic">
            ⚠️ {error}
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
            '합격 전략 수립 시작 🎯'
          )}
        </button>
      </section>
    </div>
  )
}
