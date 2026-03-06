import { useState } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { buildStep6to8Prompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import { cn } from '@/lib/utils'
import type { VerificationResult } from '@/types/application'

export function Step6to8Verification() {
  const {
    questions, activeQuestionIndex,
    isVerifying, setIsVerifying,
    setVerificationResult, setQuestionStep, completeQuestion
  } = useWizardStore()

  const [error, setError] = useState<string | null>(null)

  const q = questions[activeQuestionIndex]
  if (!q) return null

  const runVerification = async () => {
    setIsVerifying(true)
    setError(null)
    try {
      const prompt = buildStep6to8Prompt(q.generatedText, q.approvedEpisodes)
      const raw = await window.api.claudeExecute({
        prompt,
        outputFormat: 'json',
        maxTurns: 5,
        appendSystemPrompt: GUI_SYSTEM_PROMPT
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
    } catch (err) {
      setError((err as Error).message)
    }
    setIsVerifying(false)
  }

  const goBackToGeneration = () => {
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

    return (
      <div className="space-y-5">
        <h3 className="text-lg font-bold">검증 결과</h3>

        {/* Step 6: Hallucination */}
        <VerificationSection
          title="Step 6: 할루시네이션 방지 검증"
          items={v.hallucinationCheck.items}
          passed={v.hallucinationCheck.overallPassed}
        />

        {/* Step 7: Fail Pattern */}
        <VerificationSection
          title="Step 7: 탈락 패턴 검증"
          items={v.failPatternCheck.items}
          passed={v.failPatternCheck.overallPassed}
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
        />

        {/* Overall Result */}
        <div className={cn(
          'rounded-lg border-2 p-4 text-center',
          allPassed
            ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
            : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950'
        )}>
          <p className="text-lg font-bold">
            {allPassed ? '전체 검증 통과' : '일부 항목 실패'}
          </p>
        </div>

        <div className="flex gap-2">
          {!allPassed && (
            <>
              <button
                onClick={goBackToGeneration}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                이전 단계로 (편집/재생성)
              </button>
              <button
                onClick={() => {
                  setVerificationResult(activeQuestionIndex, null as unknown as VerificationResult)
                  runVerification()
                }}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                재검증
              </button>
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
    </div>
  )
}

function VerificationSection({
  title, items, passed
}: {
  title: string
  items: { check: string; passed: boolean; detail: string }[]
  passed: boolean
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold">{title}</h4>
        <span className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          passed
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        )}>
          {passed ? '통과' : '실패'}
        </span>
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
