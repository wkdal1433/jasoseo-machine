import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '@/stores/wizardStore'
import { useProfileStore } from '@/stores/profileStore'
import { ApplicationSetup } from './ApplicationSetup'
import { Step0Analysis as Step0_Analysis } from './Step0_Analysis'
import { Step1Reframe as Step1_Reframe } from './Step1_Reframe'
import { Step2EpisodeApproval as Step2_EpisodeApproval } from './Step2_EpisodeApproval'
import { Step3to5Generation as Step3to5_Generation } from './Step3to5_Generation'
import { Step6to8Verification as Step6to8_Verification } from './Step6to8_Verification'
import { FinalResult } from './FinalResult'
import { WizardStepper } from './WizardStepper'
import { QuestionTab } from './QuestionTab'
import { buildStep1to2Prompt } from '@/lib/prompt-builder'

export function WizardPage() {
  const navigate = useNavigate()
  const {
    questions,
    activeQuestionIndex,
    step0Completed,
    companyName,
    jobTitle,
    jobPosting,
    hrIntents,
    strategy,
    setQuestionAnalysis
  } = useWizardStore()
  const { profile } = useProfileStore()

  const allCompleted = questions.length > 0 && questions.every((q) => q.status === 'completed')

  // [v21.6] 추측성 선행 분석 (Speculative Pre-fetch)
  useEffect(() => {
    if (step0Completed && hrIntents && strategy) {
      // 모든 문항에 대해 백그라운드에서 Step 1-2 분석 시작 (병렬)
      questions.forEach((q, idx) => {
        if (q.currentStep === 0) {
          prefetchQuestionAnalysis(idx)
        }
      })
    }
  }, [step0Completed])

  const prefetchQuestionAnalysis = async (index: number) => {
    try {
      const q = questions[index]
      const prompt = buildStep1to2Prompt(
        companyName, jobTitle, jobPosting, hrIntents!, strategy!, q.question, q.charLimit, profile
      )
      const response = await window.api.claudeExecute({ prompt, outputFormat: 'json', maxTurns: 1 })
      const data = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}')
      setQuestionAnalysis(index, data)
    } catch {
      // prefetch 실패는 사용자에게 알리지 않고 넘어감 (수동 클릭 시 재시도됨)
    }
  }

  const activeQuestion = questions[activeQuestionIndex]
  if (!activeQuestion && questions.length > 0) return null

  // 아직 지원서 정보가 입력되지 않은 상태 → ApplicationSetup 먼저 표시
  if (!companyName) {
    return <ApplicationSetup />
  }

  return (
    <div className="flex h-full flex-col">
      {!step0Completed ? (
        <Step0_Analysis />
      ) : (
        <div className="flex h-full overflow-hidden">
          {/* Left Side: Question List & Global Stepper */}
          <div className="w-80 flex flex-col border-r bg-muted/10">
            <div className="p-6 border-b bg-card">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest mb-4">Questions</h3>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <QuestionTab key={q.id} index={i} active={i === activeQuestionIndex} />
                ))}
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <WizardStepper currentStep={activeQuestion.currentStep} />
            </div>
            {allCompleted && (
              <div className="p-4 border-t bg-card animate-in slide-in-from-bottom duration-500">
                <button
                  onClick={() => navigate('/review')}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  🎉 전체 검토 화면으로 →
                </button>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">모든 문항 완료!</p>
              </div>
            )}
          </div>

          {/* Right Side: Step Content */}
          <div className="flex-1 overflow-y-auto bg-background p-10">
            {activeQuestion.currentStep === 1 && <Step1_Reframe />}
            {activeQuestion.currentStep === 2 && <Step2_EpisodeApproval />}
            {(activeQuestion.currentStep >= 3 && activeQuestion.currentStep <= 5) && <Step3to5_Generation />}
            {(activeQuestion.currentStep >= 6 && activeQuestion.currentStep <= 8) && <Step6to8_Verification />}
            {activeQuestion.status === 'completed' && <FinalResult />}
          </div>
        </div>
      )}
    </div>
  )
}
