import { cn } from '@/lib/utils'
import type { WizardStep } from '@/types/wizard'

interface WizardStepperProps {
  currentStep: WizardStep
  step0Completed: boolean
  maxUnlockedStep?: number
  onStepClick?: (step: WizardStep) => void
}

const PHASES = [
  { label: '기업 분석', steps: [0] as WizardStep[] },
  { label: '질문 세팅', steps: [1, 2] as WizardStep[] },
  { label: '초안 생성', steps: [3, 4, 5] as WizardStep[] },
  { label: '품질 검증', steps: [6, 7, 8] as WizardStep[] },
]

export function WizardStepper({ currentStep, step0Completed, maxUnlockedStep, onStepClick }: WizardStepperProps) {
  const getPhaseStatus = (steps: WizardStep[]) => {
    const maxStep = Math.max(...steps)
    const minStep = Math.min(...steps)
    if (currentStep > maxStep) return 'done'
    if (steps.includes(currentStep)) return 'active'
    if (currentStep < minStep) return 'pending'
    return 'pending'
  }

  const isPhaseClickable = (steps: WizardStep[]) => {
    const minStep = steps[0]
    if (maxUnlockedStep !== undefined) return minStep <= maxUnlockedStep
    return currentStep >= minStep || getPhaseStatus(steps) === 'active'
  }

  return (
    <div className="flex items-center gap-1.5">
      {PHASES.map((phase, pi) => {
        const status = getPhaseStatus(phase.steps)
        const clickable = isPhaseClickable(phase.steps)
        const isLast = pi === PHASES.length - 1

        return (
          <div key={pi} className="flex items-center gap-1.5">
            <button
              onClick={() => clickable && onStepClick?.(phase.steps[0])}
              disabled={!clickable}
              title={phase.steps.map(s => `Step ${s}`).join(', ')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                status === 'done' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
                status === 'active' && 'bg-primary text-primary-foreground shadow-sm',
                status === 'pending' && 'bg-muted text-muted-foreground opacity-40 cursor-default',
                clickable && status !== 'active' && 'hover:opacity-80 cursor-pointer',
              )}
            >
              {/* 완료 체크 / 진행 중 점 */}
              {status === 'done' && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {status === 'active' && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground inline-block" />
              )}
              <span className="hidden sm:inline">{phase.label}</span>

              {/* 서브 스텝 점 (active/done 페이즈만 표시) */}
              {phase.steps.length > 1 && status !== 'pending' && (
                <div className="flex items-center gap-0.5">
                  {phase.steps.map((step) => (
                    <span
                      key={step}
                      className={cn(
                        'h-1 w-1 rounded-full transition-colors',
                        step <= currentStep
                          ? status === 'active' ? 'bg-primary-foreground' : 'bg-green-600 dark:bg-green-400'
                          : status === 'active' ? 'bg-primary-foreground/30' : 'bg-green-300 dark:bg-green-700',
                      )}
                    />
                  ))}
                </div>
              )}
            </button>

            {/* 페이즈 구분선 */}
            {!isLast && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0 text-muted-foreground/30">
                <path d="M2 1L6 4L2 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
}
