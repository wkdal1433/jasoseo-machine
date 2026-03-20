import { useEffect, useState } from 'react'
import { useEpisodeStore } from '@/stores/episodeStore'
import { EpisodeDiscoveryWizard } from './EpisodeDiscoveryWizard'
import { EpisodeDetailModal } from './EpisodeDetailModal'
import type { Episode, EpisodeStatus } from '@/types/episode'
import { Sparkles, Calendar, User, Pencil, FileText } from 'lucide-react'

const STATUS_CONFIG: Record<EpisodeStatus, { label: string; className: string }> = {
  ready:        { label: '완성', className: 'bg-green-100 text-green-700 border-green-200' },
  needs_review: { label: '초안', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  draft:        { label: '미완성', className: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export function EpisodeListPage() {
  const { episodes, loadEpisodes, isLoading } = useEpisodeStore()
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [refineEpisode, setRefineEpisode] = useState<Episode | null>(null) // 보강 모드
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [mdImportStatus, setMdImportStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [mdImportCount, setMdImportCount] = useState(0)

  useEffect(() => {
    loadEpisodes()

    // [v8.0 Hot-Reload] 파일 시스템 변경 감지 시 자동 갱신
    const unsubscribe = window.api.onEpisodesChanged(() => {
      loadEpisodes()
    })
    return () => { if (unsubscribe) unsubscribe() }
  }, [])

  const handleDelete = async (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation() // 카드 클릭과 분리
    if (confirm('정말 이 에피소드를 삭제하시겠습니까? 관련 파일이 영구 삭제됩니다.')) {
      const success = await window.api.episodeDelete(fileName)
      if (success) {
        loadEpisodes()
      } else {
        alert('삭제에 실패했습니다.')
      }
    }
  }

  const handleMdImport = async () => {
    const filePath = await window.api.selectFile([{ name: 'Markdown 파일', extensions: ['md'] }])
    if (!filePath) return
    const content = await window.api.readMd(filePath as string)
    if (!content) { alert('파일을 읽을 수 없습니다.'); return }
    setMdImportStatus('loading')
    try {
      const response = await window.api.onboardingParseFile(content)
      if (!response.success || !response.data?.episodes?.length) throw new Error('에피소드 추출 실패')
      const result = response.data
      for (let i = 0; i < result.episodes.length; i++) {
        const ep = result.episodes[i]
        const slug = (ep.title || '').replace(/[^\w가-힣\s]/g, '').replace(/\s+/g, '_').slice(0, 30) || `ep${i + 1}`
        const fileName = `ep_md_${Date.now()}_${i}_${slug}.md`
        const metaLines: string[] = []
        if ((ep as any).organization) metaLines.push(`| **조직** | ${(ep as any).organization} |`)
        if ((ep as any).period)       metaLines.push(`| **기간** | ${(ep as any).period} |`)
        if ((ep as any).role)         metaLines.push(`| **역할** | ${(ep as any).role} |`)
        const metaTable = metaLines.length > 0 ? `\n| 항목 | 내용 |\n|------|------|\n${metaLines.join('\n')}\n` : ''
        await window.api.episodeSaveFile(fileName, `# Episode ${i + 1}. ${ep.title || slug}\n${metaTable}\n${ep.content}`)
      }
      setMdImportCount(result.episodes.length)
      setMdImportStatus('done')
      loadEpisodes()
      setTimeout(() => setMdImportStatus('idle'), 4000)
    } catch {
      setMdImportStatus('error')
      setTimeout(() => setMdImportStatus('idle'), 3000)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">에피소드 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">당신의 경험을 자산화하여 AI에게 학습시키세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMdImport}
            disabled={mdImportStatus === 'loading'}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center gap-2 disabled:opacity-50"
            title="MD 파일에서 에피소드 가져오기"
          >
            <FileText size={15} />
            {mdImportStatus === 'loading' ? 'AI 분석 중...' :
             mdImportStatus === 'done' ? `✓ ${mdImportCount}개 저장됨` :
             mdImportStatus === 'error' ? '오류 발생' :
             'MD로 가져오기'}
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles size={16} className="inline mr-1" /> 새 에피소드 발굴하기
          </button>
        </div>
      </div>

      {/* 카드 목록 영역 — isLoading 전환 시 마법사/모달이 unmount되지 않도록 분리 */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground animate-pulse">에피소드 엔진 가동 중...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {episodes.map((ep) => (
              <div
                key={ep.id}
                onClick={() => setSelectedEpisode(ep)}
                className={`group relative rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md cursor-pointer ${ep.status === 'ready' ? 'border-green-200 hover:border-green-400' : ep.status === 'needs_review' ? 'border-yellow-200 hover:border-yellow-400' : 'border-border hover:border-primary/30'}`}
              >
                <button
                  onClick={(e) => handleDelete(e, ep.fileName)}
                  className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  title="삭제"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
                </button>

                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-primary uppercase">{ep.id}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CONFIG[ep.status].className}`}>
                    {STATUS_CONFIG[ep.status].label}
                  </span>
                </div>
                <h3 className="mb-2 text-base font-bold line-clamp-1">{ep.title}</h3>
                <div className="mb-4 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={12} /> {ep.period || '기간 미입력'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><User size={12} /> {ep.role || '역할 미입력'}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {ep.hrIntents.map((intent) => (
                    <span key={intent} className="rounded-full bg-primary/5 border border-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {intent}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  {ep.status !== 'ready' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRefineEpisode(ep) }}
                      className="rounded-lg border border-dashed border-yellow-400 px-3 py-1.5 text-xs font-medium text-yellow-600 hover:bg-yellow-50 transition-colors"
                    >
                      <Pencil size={12} className="inline mr-1" /> 인터뷰로 완성하기 →
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className="text-[10px] text-muted-foreground">클릭하여 상세 보기</span>
                </div>
              </div>
            ))}
          </div>

          {episodes.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border p-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Sparkles size={24} className="mx-auto" />
              </div>
              <p className="text-base font-medium">아직 등록된 에피소드가 없습니다.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                AI와 함께 당신의 숨겨진 보석 같은 경험을 찾아보세요.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  onClick={() => setIsWizardOpen(true)}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  첫 에피소드 발굴하기 →
                </button>
                <button
                  onClick={() => window.location.hash = '#/onboarding'}
                  className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  ✨ 매직 온보딩으로 에피소드 추가
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 새 에피소드 발굴 마법사 — isLoading과 무관하게 항상 렌더링 유지 */}
      {isWizardOpen && (
        <EpisodeDiscoveryWizard
          onClose={() => { setIsWizardOpen(false); loadEpisodes() }}
        />
      )}

      {/* 기존 에피소드 보강 인터뷰 — isLoading과 무관하게 항상 렌더링 유지 */}
      {refineEpisode && (
        <EpisodeDiscoveryWizard
          initialEpisode={refineEpisode}
          onClose={() => { setRefineEpisode(null); loadEpisodes() }}
        />
      )}

      {/* 에피소드 상세 보기 + AI 수정 모달 */}
      {selectedEpisode && (
        <EpisodeDetailModal
          episode={selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
          onUpdated={() => {
            loadEpisodes()
            setSelectedEpisode(null)
          }}
        />
      )}
    </div>
  )
}
