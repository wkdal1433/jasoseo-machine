import { useWizardStore } from '@/stores/wizardStore'
import { ApplicationSetup } from './ApplicationSetup'
import { WizardStepper } from './WizardStepper'
import { QuestionTab } from './QuestionTab'
import { Step0Analysis } from './Step0_Analysis'
import { Step1Reframe } from './Step1_Reframe'
import { Step2EpisodeApproval } from './Step2_EpisodeApproval'
import { Step3to5Generation } from './Step3to5_Generation'
import { Step6to8Verification } from './Step6to8_Verification'
import { FinalResult } from './FinalResult'
import { FullReview } from './FullReview'

export function WizardPage() {
  const {
    applicationId, companyName, jobTitle,
    questions, activeQuestionIndex, step0Completed,
    setActiveQuestion, resetWizard
  } = useWizardStore()

  // Phase 1: No application yet → show setup form
  if (!applicationId) {
    return <ApplicationSetup />
  }

  const activeQuestion = questions[activeQuestionIndex]
  const allCompleted = questions.every((q) => q.status === 'completed')

  // Determine what to render based on current step
  const renderStepContent = () => {
    // Step 0 not done yet
    if (!step0Completed) {
      return <Step0Analysis />
    }

    // All questions completed → show full review
    if (allCompleted) {
      return <FullReview />
    }

    // Per-question step routing
    if (!activeQuestion) return null

    // Completed questions always show FinalResult
    if (activeQuestion.status === 'completed') {
      return <FinalResult />
    }

    const step = activeQuestion.currentStep

    // Step 1: no analysis yet → run Step 1-2
    if (!activeQuestion.analysisResult) {
      return <Step1Reframe />
    }

    // Step 2: has analysis but no approved episodes → Episode approval
    if (activeQuestion.approvedEpisodes.length === 0 || step === 2) {
      return <Step2EpisodeApproval />
    }

    // Step 3-5: generation
    if (step >= 3 && step <= 5) {
      return <Step3to5Generation />
    }

    // Step 6-8: verification
    if (step >= 6) {
      return <Step6to8Verification />
    }

    // Fallback
    return <Step1Reframe />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{companyName} · {jobTitle}</h2>
          </div>
          <button
            onClick={resetWizard}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            초기화
          </button>
        </div>

        {/* Step indicator (only show when Step 0 is done and viewing a question) */}
        {step0Completed && activeQuestion && !allCompleted && (
          <WizardStepper
            currentStep={activeQuestion.currentStep}
            step0Completed={step0Completed}
          />
        )}
      </div>

      {/* Question tabs (only show when Step 0 is done and multiple questions) */}
      {step0Completed && questions.length > 1 && !allCompleted && (
        <QuestionTab
          questions={questions}
          activeIndex={activeQuestionIndex}
          onTabClick={setActiveQuestion}
        />
      )}

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderStepContent()}
      </div>
    </div>
  )
}
