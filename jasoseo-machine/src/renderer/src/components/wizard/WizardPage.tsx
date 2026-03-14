import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '@/stores/wizardStore'
import { useProfileStore } from '@/stores/profileStore'
import { Navigate } from 'react-router-dom'
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
    setQuestionAnalysis,
    setActiveQuestion,
    setQuestionStep
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

  // 아직 지원서 정보가 입력되지 않은 상태 → 독립 라우트로 이동
  if (!companyName) {
    return <Navigate to="/wizard/setup" replace />
  }

  const handleExit = () => {
    // useAutoSave가 이미 주기적으로 저장 중 → 바로 나가도 됨
    navigate('/')
  }

  return (
    <div className="flex h-full flex-col">
      {/* 상단 헤더: 회사명 + 임시저장 후 나가기 */}
      <div className="flex items-center justify-between border-b bg-card px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">{companyName}</span>
          {jobTitle && <span className="text-xs text-muted-foreground">· {jobTitle}</span>}
          {step0Completed && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              기업 분석 완료
            </span>
          )}
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="임시저장 후 대시보드로 이동"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
            <path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-16.97,16.98l-72-72a12,12,0,0,1,0-16.98l72-72a12,12,0,0,1,16.97,16.98L69,116H216A12,12,0,0,1,228,128Z"/>
          </svg>
          임시저장 후 나가기
        </button>
      </div>

      {!step0Completed ? (
        <div className="flex-1 overflow-y-auto p-8">
          <Step0_Analysis />
        </div>
      ) : (
        <div className="flex h-full overflow-hidden">
          {/* Left Side: Question List & Global Stepper */}
          <div className="w-80 flex flex-col border-r bg-muted/10">
            <div className="p-6 border-b bg-card">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest mb-4">Questions</h3>
              <div className="space-y-2">
                <QuestionTab
                  questions={questions}
                  activeIndex={activeQuestionIndex}
                  onTabClick={setActiveQuestion}
                />
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <WizardStepper
              currentStep={activeQuestion.currentStep}
              step0Completed={step0Completed}
              onStepClick={(step) => setQuestionStep(activeQuestionIndex, step)}
            />
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
