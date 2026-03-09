import { useEffect, useState } from 'react'
import { useEpisodeStore } from '@/stores/episodeStore'
import { EpisodeDiscoveryWizard } from './EpisodeDiscoveryWizard'

export function EpisodeListPage() {
  const { episodes, loadEpisodes, isLoading } = useEpisodeStore()
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  useEffect(() => {
    loadEpisodes()
  }, [])

  const handleDelete = async (fileName: string) => {
    if (confirm('정말 이 에피소드를 삭제하시겠습니까? 관련 파일이 영구 삭제됩니다.')) {
      const success = await window.api.episodeDelete(fileName)
      if (success) {
        loadEpisodes()
      } else {
        alert('삭제에 실패했습니다.')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground animate-pulse">에피소드 엔진 가동 중...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">에피소드 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">당신의 경험을 자산화하여 AI에게 학습시키세요.</p>
        </div>
        <button 
          onClick={() => setIsWizardOpen(true)}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          ✨ AI와 함께 새 에피소드 발굴
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {episodes.map((ep) => (
          <div key={ep.id} className="group relative rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
            <button 
              onClick={() => handleDelete(ep.fileName)}
              className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              title="삭제"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
            </button>

            <div className="mb-2 text-[10px] font-bold tracking-wider text-primary uppercase">
              {ep.id}
            </div>
            <h3 className="mb-2 text-base font-bold line-clamp-1">{ep.title}</h3>
            <div className="mb-4 space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                📅 {ep.period}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                👤 {ep.role}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {ep.hrIntents.map((intent) => (
                <span
                  key={intent}
                  className="rounded-full bg-primary/5 border border-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {intent}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {episodes.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            ✨
          </div>
          <p className="text-base font-medium">아직 등록된 에피소드가 없습니다.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            AI와 함께 당신의 숨겨진 보석 같은 경험을 찾아보세요.
          </p>
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="mt-6 text-sm font-bold text-primary hover:underline"
          >
            첫 에피소드 발굴하기 →
          </button>
        </div>
      )}

      {/* 에피소드 발굴 마법사 모달 */}
      {isWizardOpen && (
        <EpisodeDiscoveryWizard 
          onClose={() => {
            setIsWizardOpen(false)
            loadEpisodes() // 새 에피소드 저장 후 목록 갱신
          }} 
        />
      )}
    </div>
  )
}
