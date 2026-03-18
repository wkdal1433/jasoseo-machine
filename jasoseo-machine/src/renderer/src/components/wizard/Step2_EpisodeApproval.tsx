import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '@/stores/wizardStore'
import { useEpisodeStore } from '@/stores/episodeStore'
import { cn } from '@/lib/utils'
import { AlertTriangle, BookOpen, UserCircle } from 'lucide-react'

export function Step2EpisodeApproval() {
  const {
    questions, activeQuestionIndex,
    approveEpisode, rejectEpisode, setQuestionStep
  } = useWizardStore()

  const { episodes } = useEpisodeStore()
  const [showManualPicker, setShowManualPicker] = useState(false)
  const navigate = useNavigate()

  const q = questions[activeQuestionIndex]
  if (!q?.analysisResult) return null

  const { suggestedEpisodes } = q.analysisResult

  // Check which episodes are used in other questions of this application
  const episodeUsageMap: Record<string, number[]> = {}
  questions.forEach((otherQ, idx) => {
    if (idx === activeQuestionIndex) return
    otherQ.approvedEpisodes.forEach((epId) => {
      if (!episodeUsageMap[epId]) episodeUsageMap[epId] = []
      episodeUsageMap[epId].push(otherQ.questionNumber)
    })
  })

  const hasApprovedEpisodes = q.approvedEpisodes.length > 0

  const proceedToGeneration = () => {
    if (hasApprovedEpisodes) {
      setQuestionStep(activeQuestionIndex, 3)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Step 2: Episode 승인</h3>
      <p className="text-sm text-muted-foreground">
        AI가 추천한 Episode를 검토하고 승인해주세요. 승인 없이는 자소서가 작성되지 않습니다.
      </p>

      {/* AI 추천 에피소드가 없을 때 수동 선택 탈출구 */}
      {suggestedEpisodes.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950">
          <p className="mb-1 text-sm font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1"><AlertTriangle size={14} /> AI가 추천한 에피소드가 없습니다.</p>
          <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">에피소드 라이브러리에서 직접 선택하거나, Step 1로 돌아가 재분석할 수 있습니다.</p>
          <button
            onClick={() => setShowManualPicker((v) => !v)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
          >
            {showManualPicker ? '닫기' : <span className="flex items-center gap-1"><BookOpen size={14} /> 에피소드 라이브러리에서 직접 선택</span>}
          </button>
        </div>
      )}

      {/* 수동 에피소드 선택기 */}
      {showManualPicker && episodes.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-6 text-center space-y-3">
          <UserCircle size={32} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm font-bold text-muted-foreground">에피소드 라이브러리가 비어있습니다</p>
          <p className="text-xs text-muted-foreground/70">프로필 설정에서 에피소드를 먼저 추가해주세요.</p>
          <button
            onClick={() => navigate('/profile')}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:opacity-90"
          >
            프로필 페이지로 이동
          </button>
        </div>
      )}
      {showManualPicker && episodes.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-muted/10 p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">전체 에피소드 라이브러리</p>
          {episodes.map((ep) => {
            const isApproved = q.approvedEpisodes.includes(ep.id)
            return (
              <div
                key={ep.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3 transition-colors',
                  isApproved ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950' : 'border-border bg-card'
                )}
              >
                <div>
                  <span className="text-xs font-bold text-primary mr-2">{ep.id.toUpperCase()}</span>
                  <span className="text-sm">{ep.title}</span>
                </div>
                <button
                  onClick={() => isApproved ? rejectEpisode(activeQuestionIndex, ep.id) : approveEpisode(activeQuestionIndex, ep.id)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    isApproved ? 'bg-green-600 text-white hover:bg-green-700' : 'border border-border hover:bg-accent'
                  )}
                >
                  {isApproved ? '승인됨 ✓' : '선택'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="space-y-3">
        {suggestedEpisodes.map((ep) => {
          const isApproved = q.approvedEpisodes.includes(ep.episodeId)
          const usedInQuestions = episodeUsageMap[ep.episodeId] || []
          const totalUsage = usedInQuestions.length + (isApproved ? 1 : 0)
          const isOverLimit = totalUsage > 2

          return (
            <div
              key={ep.episodeId}
              className={cn(
                'rounded-lg border p-4 transition-colors',
                isApproved ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950' : 'border-border'
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold">{ep.episodeId}</span>
                {usedInQuestions.length > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      isOverLimit
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    )}
                  >
                    문항 {usedInQuestions.join(',')}에서 사용 중 ({totalUsage}/2)
                  </span>
                )}
              </div>
              <p className="mb-1 text-xs text-muted-foreground">추천 이유</p>
              <p className="mb-2 text-sm">{ep.reason}</p>
              <p className="mb-1 text-xs text-muted-foreground">앵글</p>
              <p className="mb-3 text-sm">{ep.angle}</p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    isApproved
                      ? rejectEpisode(activeQuestionIndex, ep.episodeId)
                      : approveEpisode(activeQuestionIndex, ep.episodeId)
                  }
                  disabled={isOverLimit && !isApproved}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    isApproved
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'border border-border hover:bg-accent'
                  )}
                >
                  {isApproved ? '승인됨 (취소하려면 클릭)' : '승인'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={proceedToGeneration}
        disabled={!hasApprovedEpisodes}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {hasApprovedEpisodes
          ? `승인 완료 — 자소서 작성 시작 (${q.approvedEpisodes.length}개 Episode)`
          : 'Episode를 하나 이상 승인해주세요'
        }
      </button>
    </div>
  )
}
