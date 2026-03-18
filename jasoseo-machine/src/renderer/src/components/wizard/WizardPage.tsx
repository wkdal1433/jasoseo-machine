import { useState, useEffect, useCallback } from 'react'
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
import { DecisionTimeline } from './DecisionTimeline'
import { buildStep1to2Prompt } from '@/lib/prompt-builder'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { cn } from '@/lib/utils'

import { ArrowLeft, PartyPopper, CheckCircle2, AlertTriangle, ChevronRight, Target, BarChart2 } from 'lucide-react'

const INTENT_LABELS: Record<string, string> = {
  Execution: '실행력', Growth: '성장', Stability: '안정성', Communication: '협업',
}

// ── Gate Confirmation Screen (L3 필수 확인) ──────────────────────────────────
function Step0GateScreen({ onConfirm }: { onConfirm: () => void }) {
  const { hrIntents, strategy, strategyConfidence, companyName, questions } = useWizardStore()
  if (!hrIntents || !strategy) return null

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center min-h-0">
      <div className="w-full max-w-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold">기업 분석 완료</h2>
          <p className="text-sm text-muted-foreground">
            {companyName} 합격 전략 수립이 완료됐습니다. 아래 내용을 확인하고 작성을 시작하세요.
          </p>
        </div>

        {/* 분석 요약 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* HR 의도 카드 */}
          <div className="rounded-2xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-5 space-y-3">
            <p className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wider">HR 의도 분석</p>
            {hrIntents.map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 rounded-full bg-green-600 text-white px-2 py-0.5 text-[10px] font-bold shrink-0">
                  {INTENT_LABELS[h.intent] || h.intent}
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs text-green-900/80 dark:text-green-200/80 leading-relaxed">{h.reason}</p>
                  {h.confidence !== undefined && (
                    <span className={cn(
                      'inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      h.confidence >= 80 ? 'bg-green-200 text-green-800' : h.confidence >= 60 ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'
                    )}>신뢰도 {h.confidence}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 전략 + 문항 요약 */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-4 space-y-2">
              <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">작성 전략</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-600 text-white px-3 py-0.5 text-xs font-bold capitalize">{strategy}</span>
                {strategyConfidence !== null && strategyConfidence !== undefined && (
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    strategyConfidence >= 80 ? 'bg-green-100 text-green-700' : strategyConfidence >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  )}>신뢰도 {strategyConfidence}%</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 size={12} /> 작성 예정 문항
              </p>
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 text-primary w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                  <span className="text-foreground/70 truncate">{q.question.slice(0, 40)}{q.question.length > 40 ? '...' : ''}</span>
                  {q.charLimit ? <span className="ml-auto text-muted-foreground shrink-0">{q.charLimit}자</span> : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* L3 게이트 경고 */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>L3 필수 확인 게이트</strong> — 이 분석은 모든 문항에 적용됩니다. 전략이 잘못되면 전체 자소서를 다시 작성해야 합니다. 위 내용이 맞는지 확인 후 진행하세요.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onConfirm}
          className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <Target size={16} />
          분석 확인 완료 — 자소서 작성 시작
          <ChevronRight size={16} />
        </button>
        <p className="text-center text-[10px] text-muted-foreground">
          돌아가서 수정하려면 Step 0 탭을 클릭하면 됩니다.
        </p>
      </div>
    </div>
  )
}

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
    applicationId,
    recruitmentContext,
    setQuestionAnalysis,
    setActiveQuestion,
    setQuestionStep,
    reopenQuestion,
    getState: getWizardState,
  } = useWizardStore()
  const { profile } = useProfileStore()

  const [step0GateConfirmed, setStep0GateConfirmed] = useState(false)
  const { saveSnapshot, clearSnapshots } = useSnapshotStore()

  // 지원서가 바뀌면 게이트·스냅샷 초기화 (이어쓰기 복원 시 이미 확인됐다고 간주)
  useEffect(() => {
    setStep0GateConfirmed(step0Completed)
    if (!step0Completed) clearSnapshots()
  }, [applicationId])

  const allCompleted = questions.length > 0 && questions.every((q) => q.status === 'completed')

  const prefetchQuestionAnalysis = useCallback(async (index: number) => {
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
  }, [questions, companyName, jobTitle, jobPosting, hrIntents, strategy, profile])

  // [v2] 게이트 통과 시점에 스냅샷 저장 + prefetch 시작
  const handleStep0GateConfirm = useCallback(() => {
    setStep0GateConfirmed(true)
    // L3 게이트 통과 — Step 0 상태 스냅샷 저장
    saveSnapshot('Step 0: 기업 분석 완료', getWizardState())
    // 게이트 확인 후 백그라운드 병렬 prefetch 시작
    questions.forEach((q, idx) => {
      if (q.currentStep === 0 || !q.analysisResult) {
        prefetchQuestionAnalysis(idx)
      }
    })
  }, [questions, prefetchQuestionAnalysis, saveSnapshot])

  const activeQuestion = questions[activeQuestionIndex]
  if (!activeQuestion && questions.length > 0) return null

  // 수정 모드: 이미 진행된 스텝까지 자유롭게 왕래 가능하도록 최대 해제 스텝 계산
  const getMaxUnlockedStep = (): number | undefined => {
    if (!activeQuestion) return undefined
    if (activeQuestion.verificationResult || activeQuestion.generatedText) return 8
    if ((activeQuestion.approvedEpisodes?.length ?? 0) > 0) return 5
    if (activeQuestion.analysisResult) return 2
    return undefined
  }
  const maxUnlockedStep = getMaxUnlockedStep()

  // 아직 지원서 정보가 입력되지 않은 상태 → 독립 라우트로 이동
  if (!companyName) {
    return <Navigate to="/wizard/setup" replace />
  }

  const handleExit = () => {
    // 나가기 전 즉시 저장 (30초 주기 외 명시적 트리거)
    if (applicationId) {
      window.api.draftSave(applicationId, {
        applicationId,
        companyName,
        jobTitle,
        jobPosting,
        strategy,
        hrIntents,
        recruitmentContext,
        questions,
        activeQuestionIndex,
        step0Completed
      })
    }
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
          <ArrowLeft size={14} />
          임시저장 후 나가기
        </button>
      </div>

      {!step0Completed ? (
        <div className="flex-1 overflow-y-auto p-8">
          <Step0_Analysis />
        </div>
      ) : step0Completed && !step0GateConfirmed ? (
        <Step0GateScreen onConfirm={handleStep0GateConfirm} />
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
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <WizardStepper
                currentStep={activeQuestion.currentStep}
                step0Completed={step0Completed}
                maxUnlockedStep={maxUnlockedStep}
                onStepClick={(step) => {
                  setQuestionStep(activeQuestionIndex, step)
                  // completed 상태인 문항을 step으로 돌아가면 수정 모드로 전환
                  if (activeQuestion.status === 'completed') {
                    reopenQuestion(activeQuestionIndex)
                  }
                }}
              />
              <DecisionTimeline />
            </div>
            {allCompleted && (
              <div className="p-4 border-t bg-card animate-in slide-in-from-bottom duration-500">
                <button
                  onClick={() => navigate('/review')}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  <PartyPopper size={18} />
                  전체 검토 화면으로 →
                </button>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">모든 문항 완료!</p>
              </div>
            )}
          </div>

          {/* Right Side: Step Content */}
          <div className="flex-1 overflow-y-auto bg-background p-10">
            {activeQuestion.status === 'completed' ? (
              <FinalResult />
            ) : (
              <>
                {activeQuestion.currentStep === 1 && <Step1_Reframe />}
                {activeQuestion.currentStep === 2 && <Step2_EpisodeApproval />}
                {(activeQuestion.currentStep >= 3 && activeQuestion.currentStep <= 5) && <Step3to5_Generation />}
                {(activeQuestion.currentStep >= 6 && activeQuestion.currentStep <= 8) && <Step6to8_Verification />}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
