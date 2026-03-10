import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEpisodeStore } from '@/stores/episodeStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useWizardStore } from '@/stores/wizardStore'
import { cn } from '@/lib/utils'
import { MagicOnboarding } from './MagicOnboarding'

interface DraftItem {
  applicationId: string
  wizardState: string
  savedAt: string
  company_name: string
  job_title: string
}
export function DashboardPage() {
  const navigate = useNavigate()
  const { episodes, loadEpisodes } = useEpisodeStore()
  const { applications, loadApplications } = useHistoryStore()
  const wizardStore = useWizardStore()
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [isMagicOnboardingOpen, setIsMagicOnboardingOpen] = useState(false)
  const [oldTrashCount, setOldTrashCount] = useState(0)

  useEffect(() => {
    loadEpisodes()
    loadApplications()
    loadDrafts()
    checkMaintenance()
  }, [])

  const checkMaintenance = async () => {
    const count = await (window.api as any).checkTrash()
    setOldTrashCount(count)
  }

  const handleEmptyTrash = async () => {
    if (confirm(`휴지통에 30일이 지난 파일 \${oldTrashCount}개가 있습니다. 영구 삭제하시겠습니까?`)) {
      await (window.api as any).emptyTrash()
      setOldTrashCount(0)
    }
  }
...
  return (
    <div className="p-8">
      {/* Maintenance Alert */}
      {oldTrashCount > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-orange-50 border border-orange-100 p-4 animate-in slide-in-from-right-4 duration-500">
          <div className="flex items-center gap-3 text-orange-800">
            <span className="text-xl">🧹</span>
            <p className="text-sm font-medium">휴지통에 30일이 지난 오래된 파일 <strong>{oldTrashCount}개</strong>가 있습니다.</p>
          </div>
          <button 
            onClick={handleEmptyTrash}
            className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-700 transition-colors"
          >
            지금 비우기
          </button>
        </div>
      )}

      const result = await window.api.draftList()
      setDrafts((result || []) as DraftItem[])
    } catch {
      // ignore
    }
  }

  const resumeDraft = async (draft: DraftItem) => {
    try {
      const state = JSON.parse(draft.wizardState)
      // Restore wizard state
      wizardStore.initWizard(
        state.companyName,
        state.jobTitle,
        state.jobPosting,
        state.questions?.map((q: { question: string; charLimit: number }) => ({
          question: q.question,
          charLimit: q.charLimit
        })) || [],
        state.strategy
      )
      navigate('/wizard')
    } catch {
      // ignore
    }
  }

  const deleteDraft = async (appId: string) => {
    await window.api.draftDelete(appId)
    loadDrafts()
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

  return (
    <div className="p-8">
      {/* Magic Onboarding Banner */}
      {(episodes.length === 0 && drafts.length === 0) && (
        <div className="mb-10 overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 p-8 shadow-sm animate-in slide-in-from-top duration-700">
          <div className="flex items-center justify-between">
            <div className="max-w-2xl">
              <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                <span>🧙‍♂️</span> 매직 온보딩으로 1분 만에 시작하기
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                기존에 작성했던 자기소개서나 이력서 파일(PDF/MD)을 업로드해보세요.<br/>
                AI가 12개 섹션 프로필과 고품질 에피소드를 자동으로 세팅해 드립니다.
              </p>
              <button 
                onClick={() => setIsMagicOnboardingOpen(true)}
                className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105"
              >
                마법 시작하기 →
              </button>
            </div>
            <div className="hidden lg:block text-8xl opacity-20 select-none">
              ✨
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
          onClick={() => navigate('/wizard')}
          className="rounded-xl bg-primary px-10 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        >
          새 지원서 작성
        </button>
      </div>

      {/* Drafts */}
      {drafts.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold">임시 저장된 작업</h3>
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={draft.applicationId}
                className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950"
              >
                <div>
                  <span className="font-medium">{draft.company_name || '(기업명 없음)'}</span>
                  {draft.job_title && (
                    <>
                      <span className="mx-2 text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{draft.job_title}</span>
                    </>
                  )}
                  <span className="mx-2 text-muted-foreground">·</span>
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
            ))}
          </div>
        </div>
      )}

      {/* Episode Grid */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Episode 현황</h3>
          <button 
            onClick={() => setIsMagicOnboardingOpen(true)}
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
        <h3 className="mb-4 text-lg font-semibold">최근 작성 이력</h3>
        {recentApps.length > 0 ? (
          <div className="space-y-2">
            {recentApps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            작성 이력이 없습니다. 새 지원서를 작성해보세요.
          </div>
        )}
      </div>

      {/* Magic Onboarding Modal */}
      {isMagicOnboardingOpen && (
        <MagicOnboarding onClose={() => {
          setIsMagicOnboardingOpen(false)
          loadEpisodes()
        }} />
      )}
    </div>
  )
}
