import { cn } from '@/lib/utils'
import type { WizardStep } from '@/types/wizard'

interface WizardStepperProps {
  currentStep: WizardStep
  step0Completed: boolean
  onStepClick?: (step: WizardStep) => void
}

const stepLabels: Record<number, string> = {
  0: '기업분석',
  1: '질문재해석',
  2: 'Episode',
  3: '도입부',
  4: '본문',
  5: '마무리',
  6: '할루시네이션',
  7: '탈락패턴',
  8: '이중코딩'
}

export function WizardStepper({ currentStep, step0Completed, onStepClick }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 9 }, (_, i) => {
        const step = i as WizardStep
        const isCompleted = step === 0 ? step0Completed : step < currentStep
        const isCurrent = step === currentStep
        const isClickable = isCompleted || isCurrent

        return (
          <button
            key={step}
            onClick={() => isClickable && onStepClick?.(step)}
            disabled={!isClickable}
            className={cn(
              'flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors',
              isCompleted && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
              isCurrent && 'bg-primary text-primary-foreground',
              !isCompleted && !isCurrent && 'bg-muted text-muted-foreground opacity-50'
            )}
          >
            <span className="font-bold">{step}</span>
            <span className="hidden xl:inline">{stepLabels[step]}</span>
          </button>
        )
      })}
    </div>
  )
}
