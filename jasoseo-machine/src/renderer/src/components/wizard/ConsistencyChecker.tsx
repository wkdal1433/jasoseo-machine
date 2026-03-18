/**
 * ConsistencyChecker.tsx — Cross-question 일관성 체크
 *
 * 1. 정적 체크 (즉시): 에피소드 중복 사용 횟수 체크 (규칙: 동일 에피소드 2회 초과 금지)
 * 2. AI 체크 (선택): 전체 문항 텍스트를 AI에게 보내 캐릭터 일관성 분석
 *
 * R3-4: 모든 문항 completed 상태일 때만 렌더링
 */
import { useState, useMemo } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { useEpisodeStore } from '@/stores/episodeStore'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, BarChart2 } from 'lucide-react'

interface EpisodeUsage {
  episodeId: string
  episodeTitle: string
  usedInQuestions: number[]  // question indices
  count: number
}

interface ConsistencyIssue {
  type: 'duplicate_episode' | 'ai_inconsistency'
  severity: 'warn' | 'error'
  message: string
  questionIndices?: number[]
}

interface AIConsistencyResult {
  overallConsistent: boolean
  issues: Array<{
    questionNumbers: number[]
    description: string
    suggestion: string
  }>
  summary: string
}

// 정적 에피소드 중복 분석 (순수 함수)
function analyzeEpisodeUsage(
  questions: { approvedEpisodes: string[] }[],
  getTitle: (id: string) => string
): EpisodeUsage[] {
  const usageMap = new Map<string, number[]>()

  questions.forEach((q, idx) => {
    q.approvedEpisodes.forEach((epId) => {
      if (!usageMap.has(epId)) usageMap.set(epId, [])
      usageMap.get(epId)!.push(idx)
    })
  })

  return Array.from(usageMap.entries()).map(([epId, indices]) => ({
    episodeId: epId,
    episodeTitle: getTitle(epId),
    usedInQuestions: indices,
    count: indices.length,
  }))
}

function buildConsistencyPrompt(
  companyName: string,
  questions: { question: string; generatedText: string }[]
): string {
  const questionsText = questions.map((q, i) =>
    `[문항 ${i + 1}]\n질문: ${q.question}\n\n답변:\n${q.generatedText}`
  ).join('\n\n---\n\n')

  return `당신은 자기소개서 전문 검토자입니다. 아래는 ${companyName} 지원서의 자기소개서 전체 문항입니다.

다음 기준으로 Cross-question 일관성을 분석해주세요:
1. 지원자의 성격/가치관이 문항 간 모순되지 않는지
2. 동일 경험이 다른 맥락으로 활용됐을 때 설명이 충돌하지 않는지
3. 지원 동기/포부가 일관된 방향성을 가지는지

결과를 다음 JSON 형식으로만 반환하세요:
{
  "overallConsistent": boolean,
  "issues": [
    {
      "questionNumbers": [1, 3],
      "description": "문항 1에서 팀워크를 강조했으나 문항 3에서 독립적 업무 선호를 강조해 충돌",
      "suggestion": "팀 내 역할 분담과 독립적 판단력을 조화롭게 표현하세요"
    }
  ],
  "summary": "전체적으로 일관성 있음 / 주요 충돌 X개 발견"
}

---

${questionsText}`
}

export function ConsistencyChecker() {
  const { questions, companyName, hrIntents } = useWizardStore()
  const { episodes } = useEpisodeStore()

  const [aiResult, setAiResult] = useState<AIConsistencyResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // R3-4: 모든 문항 completed여야 함
  const allCompleted = questions.every((q) => q.status === 'completed')
  if (!allCompleted || questions.length === 0) return null

  const getEpisodeTitle = (id: string) => episodes.find((e) => e.id === id)?.title || id

  // 정적 에피소드 사용 분석
  const episodeUsages = useMemo(
    () => analyzeEpisodeUsage(questions, getEpisodeTitle),
    [questions, episodes]
  )

  const staticIssues: ConsistencyIssue[] = episodeUsages
    .filter((u) => u.count > 1)
    .map((u) => ({
      type: 'duplicate_episode' as const,
      severity: u.count > 2 ? 'error' as const : 'warn' as const,
      message: `"${u.episodeTitle}" 에피소드가 ${u.count}개 문항에 중복 사용됨 (문항 ${u.usedInQuestions.map((i) => i + 1).join(', ')})`,
      questionIndices: u.usedInQuestions,
    }))

  const hasStaticIssues = staticIssues.length > 0

  const runAICheck = async () => {
    setIsChecking(true)
    setAiError(null)
    try {
      const prompt = buildConsistencyPrompt(
        companyName,
        questions.map((q) => ({ question: q.question, generatedText: q.generatedText }))
      )
      const raw = await window.api.claudeExecute({ prompt, outputFormat: 'json', maxTurns: 1 })
      let parsed: AIConsistencyResult
      try {
        parsed = JSON.parse(raw)
      } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('JSON 파싱 실패')
        parsed = JSON.parse(match[0])
      }
      setAiResult(parsed)
    } catch (err) {
      setAiError((err as Error).message)
    }
    setIsChecking(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BarChart2 size={18} className="text-primary" />
        <h3 className="text-base font-bold">Cross-question 일관성 체크</h3>
      </div>

      {/* 정적 에피소드 중복 체크 */}
      <div className="rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">에피소드 사용 현황</p>
          {hasStaticIssues
            ? <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 px-2 py-0.5 text-xs font-bold">중복 {staticIssues.length}건</span>
            : <span className="rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 text-xs font-bold">이상 없음</span>
          }
        </div>

        {/* 에피소드별 사용 테이블 */}
        <div className="space-y-1.5">
          {episodeUsages.map((u) => (
            <div key={u.episodeId} className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 text-xs',
              u.count > 2 ? 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
              : u.count > 1 ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800'
              : 'bg-muted/30'
            )}>
              <span className="font-medium truncate max-w-[60%]">{u.episodeTitle}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">문항 {u.usedInQuestions.map((i) => i + 1).join(', ')}</span>
                {u.count > 1
                  ? <AlertTriangle size={12} className={u.count > 2 ? 'text-red-500' : 'text-amber-500'} />
                  : <CheckCircle2 size={12} className="text-green-500" />
                }
              </div>
            </div>
          ))}
          {episodeUsages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">에피소드 사용 없음</p>
          )}
        </div>

        {/* 정적 이슈 목록 */}
        {staticIssues.map((issue, i) => (
          <div key={i} className={cn(
            'rounded-lg border p-3 flex items-start gap-2 text-xs',
            issue.severity === 'error'
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
              : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
          )}>
            {issue.severity === 'error'
              ? <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              : <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            }
            <p className={issue.severity === 'error' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}>
              {issue.message}
            </p>
          </div>
        ))}
      </div>

      {/* AI 캐릭터 일관성 체크 */}
      <div className="rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">AI 캐릭터 일관성 분석</p>
            <p className="text-xs text-muted-foreground mt-0.5">전체 문항 간 성격·가치관·경험 서술이 일관되는지 AI가 검토합니다</p>
          </div>
          <button
            onClick={runAICheck}
            disabled={isChecking}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {isChecking
              ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> 분석 중...</>
              : <><Sparkles size={12} /> AI 분석 시작</>
            }
          </button>
        </div>

        {aiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {aiError}
          </div>
        )}

        {aiResult && (
          <div className="space-y-3">
            {/* 종합 결과 */}
            <div className={cn(
              'rounded-xl border-2 p-3 flex items-center gap-3',
              aiResult.overallConsistent
                ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
                : 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950'
            )}>
              {aiResult.overallConsistent
                ? <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                : <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              }
              <p className="text-sm font-medium">{aiResult.summary}</p>
            </div>

            {/* 이슈 목록 */}
            {aiResult.issues.length > 0 && (
              <div className="space-y-2">
                {aiResult.issues.map((issue, i) => (
                  <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200">
                        문항 {issue.questionNumbers.join(', ')}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300">{issue.description}</p>
                    <p className="text-xs text-foreground/70">→ {issue.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!aiResult && !isChecking && (
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
            <p className="text-xs text-muted-foreground">
              버튼을 눌러 AI에게 전체 자소서의 일관성을 분석시키세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
