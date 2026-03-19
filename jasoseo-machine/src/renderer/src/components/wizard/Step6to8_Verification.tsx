import { useState } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { buildStep6to8Prompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import { cn } from '@/lib/utils'
import type { VerificationResult } from '@/types/application'
import { calcOverallVerificationScore, evaluateVerificationScore } from '@/lib/confidence-gate'
import { AlertTriangle, CheckCircle2, XCircle, MapPin } from 'lucide-react'
import { ModelPicker } from '@/components/common/ModelPicker'

export function Step6to8Verification() {
  const {
    companyName, jobTitle, hrIntents, strategy,
    questions, activeQuestionIndex,
    isVerifying, setIsVerifying,
    setVerificationResult, setAutoRegenerate, setQuestionStep, completeQuestion
  } = useWizardStore()
  const { saveSnapshot } = useSnapshotStore()

  const [error, setError] = useState<string | null>(null)

  const q = questions[activeQuestionIndex]
  if (!q || !hrIntents || !strategy) return null

  const runVerification = async () => {
    setIsVerifying(true)
    setError(null)
    try {
      const prompt = buildStep6to8Prompt(q.generatedText, q.approvedEpisodes, companyName, jobTitle, hrIntents, strategy)
      const verifyModel = await window.api.settingsGet('model_ep_verification') as string | null
      const raw = await window.api.claudeExecute({
        prompt,
        outputFormat: 'json',
        maxTurns: 5,
        appendSystemPrompt: GUI_SYSTEM_PROMPT,
        modelOverride: verifyModel || undefined
      })

      let parsed: VerificationResult
      try {
        parsed = JSON.parse(raw)
      } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('JSON 파싱 실패')
        parsed = JSON.parse(match[0])
      }

      setVerificationResult(activeQuestionIndex, parsed)
      // 검증 완료 스냅샷 저장
      saveSnapshot(
        `문항 ${activeQuestionIndex + 1}: 검증 완료`,
        useWizardStore.getState(),
        activeQuestionIndex
      )
    } catch (err) {
      setError((err as Error).message)
    }
    setIsVerifying(false)
  }

  const goBackToGeneration = () => {
    setQuestionStep(activeQuestionIndex, 3)
  }

  const regenerateWithFeedback = () => {
    setAutoRegenerate(activeQuestionIndex, true)
    setQuestionStep(activeQuestionIndex, 3)
  }

  const finishQuestion = () => {
    completeQuestion(activeQuestionIndex)
  }

  if (q.verificationResult) {
    const v = q.verificationResult
    const allPassed = v.hallucinationCheck.overallPassed &&
      v.failPatternCheck.overallPassed &&
      v.dualCodingCheck.overallPassed

    // 점수 계산 — scores 필드가 있으면 사용, 없으면 boolean → 추정값
    const scores = v.scores ?? {
      hallucination: v.hallucinationCheck.overallPassed ? 85 : 40,
      failPattern: v.failPatternCheck.overallPassed ? 85 : 40,
      dualCoding: v.dualCodingCheck.overallPassed ? 85 : 40,
      overall: 0,
    }
    if (!v.scores) {
      scores.overall = calcOverallVerificationScore(scores.hallucination, scores.failPattern, scores.dualCoding)
    }
    const overallDecision = evaluateVerificationScore(scores.overall)

    return (
      <div className="space-y-5">
        <h3 className="text-lg font-bold">검증 결과</h3>

        {/* 종합 스코어 대시보드 */}
        <div className={cn(
          'rounded-2xl border-2 p-5 space-y-4',
          overallDecision === 'proceed' ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
          : overallDecision === 'warn_and_proceed' ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950'
          : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950'
        )}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">종합 검증 점수</p>
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-bold',
                overallDecision === 'proceed' ? 'text-green-700 dark:text-green-300'
                : overallDecision === 'warn_and_proceed' ? 'text-amber-700 dark:text-amber-300'
                : 'text-red-700 dark:text-red-300'
              )}>{scores.overall}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
              {overallDecision === 'proceed' && <CheckCircle2 size={18} className="text-green-600" />}
              {overallDecision === 'warn_and_proceed' && <AlertTriangle size={18} className="text-amber-600" />}
              {overallDecision === 'stop' && <XCircle size={18} className="text-red-600" />}
            </div>
          </div>
          {/* 세부 점수 게이지 */}
          <div className="space-y-2">
            <ScoreBar label="할루시네이션 방지" score={scores.hallucination} weight="50%" />
            <ScoreBar label="탈락 패턴" score={scores.failPattern} weight="30%" />
            <ScoreBar label="이중 코딩" score={scores.dualCoding} weight="20%" />
          </div>
        </div>

        {/* Step 6: Hallucination */}
        <VerificationSection
          title="Step 6: 할루시네이션 방지 검증"
          items={v.hallucinationCheck.items}
          passed={v.hallucinationCheck.overallPassed}
          score={scores.hallucination}
        />

        {/* Step 7: Fail Pattern */}
        <VerificationSection
          title="Step 7: 탈락 패턴 검증"
          items={v.failPatternCheck.items}
          passed={v.failPatternCheck.overallPassed}
          score={scores.failPattern}
        />
        {v.failPatternCheck.suggestions.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
            <p className="mb-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300">개선 제안</p>
            <ul className="list-inside list-disc text-sm text-yellow-800 dark:text-yellow-200">
              {v.failPatternCheck.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step 8: Dual Coding */}
        <VerificationSection
          title="Step 8: 이중 코딩 최종 검증"
          items={v.dualCodingCheck.items}
          passed={v.dualCodingCheck.overallPassed}
          score={scores.dualCoding}
        />

        {/* 액션 아이템 */}
        {v.actionItems && v.actionItems.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <MapPin size={13} /> 수정 필요 위치
            </p>
            <div className="space-y-2">
              {v.actionItems.map((item, i) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{item.location}</span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400">{item.issue}</p>
                  <p className="text-xs text-foreground/70">→ {item.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!allPassed && (
            <>
              <button
                onClick={goBackToGeneration}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent whitespace-nowrap"
              >
                이전 단계로 (편집)
              </button>
              <button
                onClick={regenerateWithFeedback}
                className="rounded-md border border-blue-300 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950 whitespace-nowrap"
              >
                피드백 반영 재생성
              </button>
              <button
                onClick={() => {
                  setVerificationResult(activeQuestionIndex, null as unknown as VerificationResult)
                  runVerification()
                }}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent whitespace-nowrap"
              >
                재검증
              </button>
              <ModelPicker endpointKey="verification" />
            </>
          )}
          <button
            onClick={finishQuestion}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
          >
            {allPassed ? '문항 완료' : '검증 경고 무시하고 완료'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Step 6~8: 검증</h3>
      <p className="text-sm text-muted-foreground">
        할루시네이션 방지(Step 6), 탈락 패턴(Step 7), 이중 코딩(Step 8) 검증을 수행합니다.
      </p>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="line-clamp-5 text-sm leading-relaxed">{q.generatedText}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={goBackToGeneration}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            이전 단계로
          </button>
          <button
            onClick={runVerification}
            disabled={isVerifying}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                검증 중...
              </span>
            ) : (
              '검증 시작'
            )}
          </button>
        </div>
        <div className="flex justify-end">
          <ModelPicker endpointKey="verification" />
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label} <span className="opacity-50">({weight})</span></span>
        <span className="font-bold">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function VerificationSection({
  title, items, passed, score
}: {
  title: string
  items: { check: string; passed: boolean; detail: string }[]
  passed: boolean
  score?: number
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold">{title}</h4>
        <div className="flex items-center gap-2">
          {score !== undefined && (
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold',
              score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            )}>
              {score}점
            </span>
          )}
          <span className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            passed
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          )}>
            {passed ? '통과' : '실패'}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className={item.passed ? 'text-green-600' : 'text-red-600'}>
              {item.passed ? '\u2713' : '\u2717'}
            </span>
            <div>
              <span className="font-medium">{item.check}</span>
              {item.detail && (
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
