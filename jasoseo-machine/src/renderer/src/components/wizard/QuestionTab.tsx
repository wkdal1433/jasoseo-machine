import { cn } from '@/lib/utils'
import type { WizardQuestion } from '@/types/wizard'

interface QuestionTabProps {
  questions: WizardQuestion[]
  activeIndex: number
  onTabClick: (index: number) => void
}

export function QuestionTab({ questions, activeIndex, onTabClick }: QuestionTabProps) {
  return (
    <div className="flex gap-1 border-b border-border">
      {questions.map((q, i) => {
        const hasApproved = q.approvedEpisodes.length > 0
        const needsApproval = q.currentStep === 2 && !hasApproved

        return (
          <button
            key={q.id}
            onClick={() => onTabClick(i)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              i === activeIndex
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span>문항 {q.questionNumber}</span>
            {q.status === 'completed' && (
              <span className="text-green-600">&#10003;</span>
            )}
            {q.status !== 'completed' && hasApproved && (
              <span className="flex h-2 w-2 rounded-full bg-green-500" title="에피소드 승인 완료" />
            )}
            {needsApproval && (
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-amber-500" title="에피소드 승인 필요" />
            )}
            {q.status === 'in_progress' && !hasApproved && q.currentStep !== 2 && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            )}
          </button>
        )
      })}
    </div>
  )
}
