import { useEffect } from 'react'
import { useEpisodeStore } from '@/stores/episodeStore'

export function EpisodeListPage() {
  const { episodes, loadEpisodes, isLoading } = useEpisodeStore()

  useEffect(() => {
    loadEpisodes()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">에피소드 로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-bold">에피소드 관리</h2>
      <div className="grid grid-cols-2 gap-4">
        {episodes.map((ep) => (
          <div key={ep.id} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-1 text-xs font-medium text-primary">
              {ep.id.toUpperCase()}
            </div>
            <h3 className="mb-2 text-base font-semibold">{ep.title}</h3>
            <p className="mb-2 text-xs text-muted-foreground">{ep.period}</p>
            <p className="mb-3 text-sm text-muted-foreground">{ep.role}</p>
            <div className="flex flex-wrap gap-1">
              {ep.hrIntents.map((intent) => (
                <span
                  key={intent}
                  className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {intent}
                </span>
              ))}
            </div>
            {ep.techStack.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {ep.techStack.slice(0, 5).map((tech) => (
                  <span
                    key={tech}
                    className="rounded border border-border px-1.5 py-0.5 text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {episodes.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          에피소드가 로드되지 않았습니다.
          <br />
          설정에서 프로젝트 디렉토리를 확인해주세요.
        </div>
      )}
    </div>
  )
}
