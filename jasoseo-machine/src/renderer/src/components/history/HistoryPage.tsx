import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHistoryStore } from '@/stores/historyStore'
import { useWizardStore } from '@/stores/wizardStore'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface CoverLetterRecord {
  id: string
  applicationId: string
  questionNumber: number
  question: string
  finalText: string | null
}

interface PassedModalState {
  appId: string
  companyName: string
}

export function HistoryPage() {
  const navigate = useNavigate()
  const { applications, drafts, loadApplications, loadDrafts, deleteDraft, updateStatus, deleteApplication } = useHistoryStore()
  const { restoreFromDraft } = useWizardStore()
  const [passedModal, setPassedModal] = useState<PassedModalState | null>(null)
  const [isAddingPattern, setIsAddingPattern] = useState(false)

  useEffect(() => {
    loadApplications()
    loadDrafts()
  }, [])

  const handlePassedClick = async (appId: string, companyName: string) => {
    await updateStatus(appId, 'passed')
    setPassedModal({ appId, companyName })
  }

  const handleAddToPattern = async () => {
    if (!passedModal) return
    setIsAddingPattern(true)
    try {
      const cls = await window.api.clListByApp(passedModal.appId) as CoverLetterRecord[]
      const text = cls
        .filter((cl) => cl.finalText?.trim())
        .sort((a, b) => a.questionNumber - b.questionNumber)
        .map((cl) => `[문항 ${cl.questionNumber}] ${cl.question}\n${cl.finalText}`)
        .join('\n\n')

      if (!text.trim()) {
        alert('저장된 자소서 내용이 없습니다.')
        setPassedModal(null)
        return
      }

      const id = `pat_${Date.now()}`
      const newPattern = {
        id,
        name: `${passedModal.companyName} 합격 자소서`,
        source: 'history' as const,
        applicationId: passedModal.appId,
        isActive: true,
        analysisStatus: 'analyzing' as const,
        extractedPattern: null,
        createdAt: new Date().toISOString()
      }
      await window.api.patternSave(newPattern)
      setPassedModal(null)

      // 백그라운드 AI 분석 (non-blocking)
      window.api.patternAnalyze(id, text).catch(() => {/* 실패해도 무시 */})
      alert(`"${passedModal.companyName}" 자소서가 패턴 강화 데이터로 추가되었습니다.\n패턴 강화 페이지에서 분석 결과를 확인하세요.`)
    } catch (err: any) {
      alert('패턴 추가 실패: ' + err.message)
    } finally {
      setIsAddingPattern(false)
    }
  }

  const handleResumeDraft = async (applicationId: string) => {
    const raw = await window.api.draftGet(applicationId) as { wizardState: string } | undefined
    if (!raw?.wizardState) return
    try {
      const state = JSON.parse(raw.wizardState)
      restoreFromDraft(state)
      // 저장된 타임라인 스냅샷 복원
      if (Array.isArray(state.snapshots) && state.snapshots.length > 0) {
        useSnapshotStore.getState().restoreSnapshots(state.snapshots)
      }
      navigate('/wizard')
    } catch { /* ignore */ }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    completed: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    passed: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    failed: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
  }
  const statusLabels: Record<string, string> = {
    draft: '작성중',
    completed: '완료',
    passed: '합격',
    failed: '불합격'
  }

  const isEmpty = applications.length === 0 && drafts.length === 0

  return (
    <div className="p-8">
      <h2 className="mb-2 text-xl font-bold">작성 이력</h2>
      <p className="mb-6 text-sm text-muted-foreground">클릭하면 작성 내용을 확인하고 수정할 수 있습니다.</p>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          작성 이력이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {/* 임시저장 항목 (작성 중) */}
          {drafts.map((draft) => (
            <div
              key={draft.applicationId}
              onClick={() => handleResumeDraft(draft.applicationId)}
              className="group rounded-xl border-2 p-4 cursor-pointer hover:shadow-md transition-all status-draft"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold transition-colors">
                    {draft.companyName || '(회사명 없음)'}
                  </span>
                  {draft.jobTitle && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{draft.jobTitle}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{draft.questionCount}문항</span>
                  {draft.step0Completed && (
                    <span className="status-success rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                      기업분석 완료
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(draft.savedAt).toLocaleDateString('ko-KR')}
                  </span>
                  <span className="status-draft rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    작성중
                  </span>
                  <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{color: 'hsl(var(--status-draft-text))'}}>이어 작성 →</span>
                </div>
              </div>
              <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => confirm('임시저장을 삭제할까요? 이 작업은 되돌릴 수 없습니다.') && deleteDraft(draft.applicationId)}
                  className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}

          {/* 저장된 완성 이력 */}
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => navigate(`/history/${app.id}`)}
              className={cn(
                'group rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all',
                app.status === 'completed'
                  ? 'border-green-200 bg-green-50/40 hover:border-green-400 dark:border-green-800 dark:bg-green-950/20 dark:hover:border-green-600'
                  : app.status === 'passed'
                  ? 'border-green-300 bg-green-50/60 hover:border-green-500 dark:border-green-700 dark:bg-green-950/30 dark:hover:border-green-500'
                  : app.status === 'failed'
                  ? 'border-red-200 bg-red-50/30 hover:border-red-300 dark:border-red-900 dark:bg-red-950/20'
                  : 'border-border bg-card hover:border-primary/40'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={cn(
                    'text-base font-semibold transition-colors',
                    app.status === 'completed' ? 'group-hover:text-green-700 dark:group-hover:text-green-400'
                    : app.status === 'passed' ? 'group-hover:text-green-700 dark:group-hover:text-green-400'
                    : 'group-hover:text-primary'
                  )}>{app.companyName}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{app.jobTitle}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{app.question_count}문항</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(app.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      statusColors[app.status]
                    )}
                  >
                    {statusLabels[app.status] || app.status}
                  </span>
                  <span className={cn(
                    'text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity',
                    app.status === 'completed' || app.status === 'passed'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-primary'
                  )}>내용 보기 →</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                {app.status === 'completed' && (
                  <>
                    <button
                      onClick={() => handlePassedClick(app.id, app.companyName)}
                      className="rounded border border-green-300 px-2.5 py-1 text-xs text-green-600 hover:bg-green-50 dark:border-green-700 dark:hover:bg-green-950"
                    >
                      합격
                    </button>
                    <button
                      onClick={() => updateStatus(app.id, 'failed')}
                      className="rounded border border-red-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950"
                    >
                      불합격
                    </button>
                  </>
                )}
                <button
                  onClick={() => confirm(`"${app.companyName}" 지원서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`) && deleteApplication(app.id)}
                  className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 합격 → 패턴 추가 모달 */}
      {passedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl">
            <h3 className="font-bold text-base mb-2 flex items-center gap-1.5"><Sparkles size={18} className="text-yellow-500" /> 합격을 축하합니다!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-semibold text-foreground">{passedModal.companyName}</span> 합격 자소서를
              패턴 강화 데이터로 추가하시겠습니까?<br />
              <span className="text-xs mt-1 block">AI가 문체·구조를 분석해 향후 자소서 생성 품질을 높여드립니다.</span>
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPassedModal(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                나중에
              </button>
              <button
                onClick={handleAddToPattern}
                disabled={isAddingPattern}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isAddingPattern ? '추가 중...' : '패턴으로 추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
