import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHistoryStore } from '@/stores/historyStore'
import { cn } from '@/lib/utils'

export function HistoryPage() {
  const navigate = useNavigate()
  const { applications, loadApplications, updateStatus, deleteApplication } = useHistoryStore()

  useEffect(() => {
    loadApplications()
  }, [])

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

  return (
    <div className="p-8">
      <h2 className="mb-2 text-xl font-bold">작성 이력</h2>
      <p className="mb-6 text-sm text-muted-foreground">클릭하면 작성 내용을 확인하고 수정할 수 있습니다.</p>

      {applications.length > 0 ? (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => navigate(`/history/${app.id}`)}
              className="group rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base font-semibold group-hover:text-primary transition-colors">{app.companyName}</span>
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
                  <span className="text-xs text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">내용 보기 →</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                {app.status === 'completed' && (
                  <>
                    <button
                      onClick={() => updateStatus(app.id, 'passed')}
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
                  onClick={() => deleteApplication(app.id)}
                  className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          작성 이력이 없습니다.
        </div>
      )}
    </div>
  )
}
