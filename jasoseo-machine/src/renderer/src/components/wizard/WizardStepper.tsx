import { cn } from '@/lib/utils'
import type { WizardStep } from '@/types/wizard'

interface WizardStepperProps {
  currentStep: WizardStep
  step0Completed: boolean
  maxUnlockedStep?: number
  onStepClick?: (step: WizardStep) => void
  vertical?: boolean
}

const PHASES = [
  { label: '기업 분석', steps: [0] as WizardStep[] },
  { label: '질문 세팅', steps: [1, 2] as WizardStep[] },
  { label: '초안 생성', steps: [3, 4, 5] as WizardStep[] },
  { label: '품질 검증', steps: [6, 7, 8] as WizardStep[] },
]

export function WizardStepper({ currentStep, step0Completed, maxUnlockedStep, onStepClick, vertical = false }: WizardStepperProps) {
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

  // 수직 모드 (사이드바용)
  if (vertical) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">진행 단계</p>
        {PHASES.map((phase, pi) => {
          const status = getPhaseStatus(phase.steps)
          const clickable = isPhaseClickable(phase.steps)
          const isLast = pi === PHASES.length - 1

          return (
            <div key={pi} className="flex flex-col gap-0.5">
              <button
                onClick={() => clickable && onStepClick?.(phase.steps[0])}
                disabled={!clickable}
                title={phase.steps.map(s => `Step ${s}`).join(', ')}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left',
                  status === 'done' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
                  status === 'active' && 'bg-primary text-primary-foreground shadow-sm',
                  status === 'pending' && 'text-muted-foreground opacity-40 cursor-default',
                  clickable && status !== 'active' && 'hover:opacity-80 cursor-pointer',
                )}
              >
                {/* 아이콘 */}
                <span className="shrink-0 flex items-center justify-center w-4 h-4">
                  {status === 'done' && (
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {status === 'active' && (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground inline-block" />
                  )}
                  {status === 'pending' && (
                    <span className="h-2 w-2 rounded-full border border-current inline-block opacity-50" />
                  )}
                </span>

                <span>{phase.label}</span>

                {/* 서브 스텝 진행 점 */}
                {phase.steps.length > 1 && status !== 'pending' && (
                  <div className="ml-auto flex items-center gap-0.5">
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

              {/* 세로 연결선 */}
              {!isLast && (
                <div className="ml-[22px] w-px h-2 bg-border" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 수평 모드 (기본)
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
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
              {status === 'done' && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {status === 'active' && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground inline-block" />
              )}
              <span className="hidden sm:inline">{phase.label}</span>

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
