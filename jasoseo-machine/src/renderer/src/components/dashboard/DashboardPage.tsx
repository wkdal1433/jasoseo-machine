import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEpisodeStore } from '@/stores/episodeStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useWizardStore } from '@/stores/wizardStore'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import { 
  Rocket, 
  Pause, 
  Eraser, 
  X, 
  Puzzle, 
  Wand2, 
  Sparkles 
} from 'lucide-react'

import type { DraftItem } from '@/stores/historyStore'

export function DashboardPage() {
  const navigate = useNavigate()
  const { episodes, loadEpisodes } = useEpisodeStore()
  const { applications, loadApplications, drafts, loadDrafts, deleteDraft: deleteDraftFromStore } = useHistoryStore()
  const wizardStore = useWizardStore()
  const { projectDir, isLoaded } = useSettingsStore()
  const [oldTrashCount, setOldTrashCount] = useState(0)
  const [hideTrashAlert, setHideTrashAlert] = useState(false)
  const [hasPendingOnboarding, setHasPendingOnboarding] = useState(false)
  const [emptyFieldsReport, setEmptyFieldsReport] = useState<{ fields: string[]; url: string } | null>(null)

  useEffect(() => {
    loadEpisodes()
    loadApplications()
    loadDrafts()
    checkMaintenance()
    checkPendingOnboarding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // 확장 프로그램이 보고한 미완성 필드 주기적 확인 (5초 간격)
    const pollTimer = setInterval(async () => {
      try {
        const report = await window.api.bridgeGetEmptyFields()
        if (report) setEmptyFieldsReport(report)
      } catch { /* ignore */ }
    }, 5000)
    return () => clearInterval(pollTimer)
  }, [])

  const checkPendingOnboarding = async () => {
    try {
      const draft = await window.api.draftGet('__onboarding_pending__')
      setHasPendingOnboarding(!!draft)
    } catch { /* ignore */ }
  }

  const checkMaintenance = async () => {
    const count = await (window.api as any).checkTrash()
    setOldTrashCount(count)
  }

  const handleEmptyTrash = async () => {
    if (confirm(`휴지통에 30일이 지난 파일 ${oldTrashCount}개가 있습니다. 영구 삭제하시겠습니까?`)) {
      await (window.api as any).emptyTrash()
      setOldTrashCount(0)
    }
  }

  const resumeDraft = async (draft: DraftItem) => {
    try {
      // draftGet으로 전체 wizardState 가져오기 (listDrafts 형식 변환 이슈 방지)
      const raw = await window.api.draftGet(draft.applicationId) as { wizardState: string } | undefined
      if (!raw?.wizardState) return
      const state = JSON.parse(raw.wizardState)
      wizardStore.restoreFromDraft({
        applicationId: state.applicationId,
        companyName: state.companyName,
        jobTitle: state.jobTitle,
        jobPosting: state.jobPosting,
        strategy: state.strategy || null,
        hrIntents: state.hrIntents || null,
        recruitmentContext: state.recruitmentContext || null,
        questions: state.questions || [],
        activeQuestionIndex: state.activeQuestionIndex ?? 0,
        step0Completed: state.step0Completed ?? false,
        isGenerating: false,
        isVerifying: false
      })
      // 저장된 타임라인 스냅샷 복원
      if (Array.isArray(state.snapshots) && state.snapshots.length > 0) {
        useSnapshotStore.getState().restoreSnapshots(state.snapshots)
      }
      navigate('/wizard')
    } catch { /* ignore */ }
  }

  const deleteDraft = async (appId: string) => {
    if (!confirm('임시저장을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return
    await deleteDraftFromStore(appId)
  }

  const recentApps = applications.slice(0, 5)

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      completed: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
      passed: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
      failed: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
    }
    const labels: Record<string, string> = {
      draft: '작성중',
      completed: '완료',
      passed: '합격',
      failed: '불합격'
    }
    return (
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', colors[status])}>
        {labels[status] || status}
      </span>
    )
  }

  const handleStartWizard = () => {
    if (episodes.length === 0) {
      navigate('/onboarding')
    } else {
      navigate('/wizard/setup')  // 항상 새 지원서 설정 화면으로 (이전 상태 무관)
    }
  }

  return (
    <div className="p-8">
      {/* Setup Required Banner — 프로젝트 디렉토리 미설정 시 */}
      {isLoaded && !projectDir && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950 animate-in slide-in-from-top duration-500">
          <div className="flex items-start gap-4">
            <Rocket size={32} className="text-blue-600" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-blue-800 dark:text-blue-200">처음 시작하는 분이시군요! 아래 순서로 진행해주세요.</h3>
              <ol className="mt-3 space-y-1.5 text-sm text-blue-700 dark:text-blue-300">
                <li><span className="font-bold">① 설정</span> → 프로젝트 디렉토리 선택 (에피소드가 저장될 폴더)</li>
                <li><span className="font-bold">② 매직 온보딩</span> → 이력서/자소서 PDF 업로드 → AI가 에피소드 자동 추출</li>
                <li><span className="font-bold">③ 새 지원서 작성</span> → 위저드로 자소서 생성 시작</li>
              </ol>
              <button
                onClick={() => navigate('/settings')}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                설정으로 이동 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미완성 온보딩 복원 배너 */}
      {hasPendingOnboarding && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950 animate-in slide-in-from-top duration-500">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Pause size={24} className="text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">저장되지 않은 온보딩 결과가 있습니다</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">AI가 분석한 프로필과 에피소드를 이어서 검토하고 저장하세요.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setHasPendingOnboarding(false); window.api.draftDelete('__onboarding_pending__') }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
              >
                무시
              </button>
              <button
                onClick={() => navigate('/onboarding', { state: { restoreOnboarding: true } })}
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
              >
                이어서 검토하기 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Alert */}
      {(oldTrashCount > 0 && !hideTrashAlert) && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-orange-50 border border-orange-100 p-4 animate-in slide-in-from-right-4 duration-500">
          <div className="flex items-center gap-3 text-orange-800">
            <Eraser size={20} className="text-orange-600" />
            <p className="text-sm font-medium">휴지통에 30일이 지난 오래된 파일 <strong>{oldTrashCount}개</strong>가 있습니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleEmptyTrash}
              className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-700 transition-colors shadow-sm"
            >
              지금 비우기
            </button>
            <button 
              onClick={() => setHideTrashAlert(true)}
              className="text-orange-400 hover:text-orange-600 p-1 transition-colors"
              title="닫기"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 확장 프로그램: 미완성 프로필 필드 알림 */}
      {emptyFieldsReport && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950 animate-in slide-in-from-top duration-500">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Puzzle size={24} className="text-violet-600" />
              <div>
                <p className="text-sm font-bold text-violet-800 dark:text-violet-200">확장 프로그램이 미완성 필드를 발견했습니다</p>
                <p className="text-xs text-violet-700 dark:text-violet-300 mt-0.5">
                  채용 사이트에서 자동 입력되지 않은 항목: <strong>{emptyFieldsReport.fields.join(', ')}</strong>
                </p>
                <p className="text-xs text-violet-500 mt-1 truncate max-w-xs">{emptyFieldsReport.url}</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => { navigate('/settings'); setEmptyFieldsReport(null) }} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700">
                프로필 보완하기
              </button>
              <button onClick={() => setEmptyFieldsReport(null)} className="text-violet-400 hover:text-violet-600 text-lg leading-none px-1">×</button>
            </div>
          </div>
        </div>
      )}

      {/* Magic Onboarding Banner */}
      {(episodes.length === 0 && drafts.length === 0) && (
        <div className="mb-10 overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 p-8 shadow-sm animate-in slide-in-from-top duration-700">
          <div className="flex items-center justify-between">
            <div className="max-w-2xl">
              <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                <Wand2 size={24} /> 매직 온보딩으로 1분 만에 시작하기
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                기존에 작성했던 자기소개서나 이력서 파일(PDF/MD)을 업로드해보세요.<br/>
                AI가 12개 섹션 프로필과 고품질 에피소드를 자동으로 세팅해 드립니다.
              </p>
              <button 
                onClick={() => navigate('/onboarding')}
                className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105"
              >
                마법 시작하기 →
              </button>
            </div>
            <div className="hidden lg:block text-8xl opacity-20 select-none">
              <Sparkles size={96} />
            </div>
          </div>
        </div>
      )}

      {/* Quick Start */}
      <div className="mb-10 flex flex-col items-center">
        <h2 className="mb-4 text-2xl font-bold">자소서 머신</h2>
        <p className="mb-6 text-muted-foreground">
          AI 기반 S급 자기소개서 생성 시스템
        </p>
        <button
          onClick={handleStartWizard}
          className="rounded-xl bg-primary px-10 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        >
          {episodes.length === 0 ? '에피소드 등록 후 시작하기 →' : '새 지원서 작성'}
        </button>
        {episodes.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">에피소드가 없습니다. 온보딩으로 이동합니다.</p>
        )}
      </div>

      {/* Drafts */}
      {drafts.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold">임시 저장된 작업</h3>
          <div className="space-y-2">
            {drafts.map((draft) => {
              const getDraftProgress = () => {
                if (!draft.step0Completed) return { label: 'Step 0: 기업 분석 전', color: 'text-orange-600' }
                if (draft.questionCount === 0) return null
                return { label: `${draft.questionCount}문항`, color: 'text-blue-600' }
              }
              const progress = getDraftProgress()
              return (
              <div
                key={draft.applicationId}
                className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{draft.companyName || '(기업명 없음)'}</span>
                    {draft.jobTitle && <span className="text-sm text-muted-foreground">· {draft.jobTitle}</span>}
                    {progress && (
                      <span className={`text-xs font-semibold ${progress.color}`}>
                        [{progress.label}]
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(draft.savedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resumeDraft(draft)}
                    className="rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
                  >
                    이어서 작성
                  </button>
                  <button
                    onClick={() => deleteDraft(draft.applicationId)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    삭제
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Episode Grid */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Episode 현황</h3>
          <button 
            onClick={() => navigate('/onboarding')}
            className="text-xs font-bold text-primary hover:underline"
          >
            + 기존 자소서로 추가하기
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="rounded-lg border border-border bg-card p-3"
            >
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {ep.id.toUpperCase()}
              </div>
              <div className="mb-2 truncate text-sm font-medium">{ep.title}</div>
              <div className="flex flex-wrap gap-1">
                {ep.hrIntents.map((intent) => (
                  <span
                    key={intent}
                    className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                  >
                    {intent}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {episodes.length === 0 && (
            <div className="col-span-4 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              에피소드가 로드되지 않았습니다. 설정에서 프로젝트 디렉토리를 확인해주세요.
            </div>
          )}
        </div>
      </div>

      {/* Recent History */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">최근 작성 이력</h3>
          {applications.length > 5 && (
            <button onClick={() => navigate('/history')} className="text-xs font-bold text-primary hover:underline">
              전체 보기 →
            </button>
          )}
        </div>
        {recentApps.length > 0 ? (
          <div className="space-y-2">
            {recentApps.map((app) => (
              <button
                key={app.id}
                onClick={() => navigate(`/history/${app.id}`)}
                className="w-full flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-muted/30 transition-all text-left"
              >
                <div>
                  <span className="font-medium">{app.companyName}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{app.jobTitle}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {app.question_count}문항
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(app.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                  {statusBadge(app.status)}
                  <span className="text-xs text-muted-foreground">→</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            작성 이력이 없습니다. 새 지원서 작성해보세요.
          </div>
        )}
      </div>
    </div>
  )
}
