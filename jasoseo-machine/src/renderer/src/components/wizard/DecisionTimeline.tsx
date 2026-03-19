/**
 * DecisionTimeline.tsx — AI 자동 결정 타임라인 뷰
 *
 * 스냅샷 히스토리를 타임라인으로 시각화.
 * "이 시점으로 되돌리기" 버튼으로 복원 가능.
 * R3-2: 생성 중 복원 버튼 비활성화
 */
import { useState } from 'react'
import { useSnapshotStore, type WizardSnapshot } from '@/stores/snapshotStore'
import { useWizardStore } from '@/stores/wizardStore'
import { cn } from '@/lib/utils'
import { Clock, RotateCcw, ChevronDown, CheckCircle2, Sparkles, Shield, X, FileText } from 'lucide-react'

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}초 전`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function stepIcon(label: string) {
  if (label.includes('분석') || label.includes('Step 0')) return <CheckCircle2 size={12} className="text-green-500" />
  if (label.includes('생성') || label.includes('초안') || label.includes('축약')) return <Sparkles size={12} className="text-blue-500" />
  if (label.includes('검증')) return <Shield size={12} className="text-purple-500" />
  return <Clock size={12} className="text-muted-foreground" />
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: '완료', cls: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
    pending: { label: '대기', cls: 'bg-muted text-muted-foreground' },
    generating: { label: '생성중', cls: 'bg-blue-100 text-blue-700' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', s.cls)}>{s.label}</span>
  )
}

// ── 상세 모달 ──────────────────────────────────────────────────────────────
function SnapshotDetailModal({
  snapshot,
  onClose,
  onRestore,
  isGenerating,
}: {
  snapshot: WizardSnapshot
  onClose: () => void
  onRestore: (id: string) => void
  isGenerating: boolean
}) {
  const s = snapshot.state

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-background shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            {stepIcon(snapshot.stepLabel)}
            <div>
              <h2 className="text-sm font-bold leading-tight">{snapshot.stepLabel}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{formatRelativeTime(snapshot.timestamp)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* 메타 정보 */}
        {(s.hrIntents || s.strategy) && (
          <div className="flex flex-wrap gap-2 px-5 pt-3">
            {s.hrIntents && (
              <div className="rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                HR: {s.hrIntents.map((h) => h.intent).join(', ')}
              </div>
            )}
            {s.strategy && (
              <div className="rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-3 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                전략: {s.strategy}
              </div>
            )}
          </div>
        )}

        {/* 문항별 상태 + 내용 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {s.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">기업 분석 완료 시점 — 아직 문항 없음</p>
          ) : (
            s.questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/10 overflow-hidden">
                {/* 문항 헤더 */}
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={12} className="shrink-0 text-muted-foreground" />
                    <span className="text-xs font-bold truncate">
                      문항 {i + 1}{q.question ? `: ${q.question.slice(0, 40)}${q.question.length > 40 ? '...' : ''}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {q.charLimit && q.generatedText && (
                      <span className={cn(
                        'text-[10px] font-mono',
                        q.generatedText.length > q.charLimit ? 'text-red-500' : 'text-muted-foreground'
                      )}>
                        {q.generatedText.length}/{q.charLimit}자
                      </span>
                    )}
                    {statusBadge(q.status)}
                  </div>
                </div>

                {/* 생성된 글 */}
                {q.generatedText ? (
                  <div className="px-4 py-3 max-h-48 overflow-y-auto">
                    <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{q.generatedText}</p>
                  </div>
                ) : (
                  <div className="px-4 py-3 text-[11px] text-muted-foreground italic">
                    이 시점에서는 아직 생성된 글이 없습니다.
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="flex gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            닫기
          </button>
          <button
            onClick={() => { onRestore(snapshot.id); onClose() }}
            disabled={isGenerating}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors',
              isGenerating
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
            title={isGenerating ? '생성 중에는 복원할 수 없습니다' : undefined}
          >
            <RotateCcw size={14} />
            이 시점으로 되돌리기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 카드 ──────────────────────────────────────────────────────────────────
function SnapshotCard({
  snapshot,
  onRestore,
  onDetail,
  isRestoring,
  isGenerating,
}: {
  snapshot: WizardSnapshot
  onRestore: (id: string) => void
  onDetail: (snapshot: WizardSnapshot) => void
  isRestoring: boolean
  isGenerating: boolean
}) {
  const s = snapshot.state

  const summary = [
    s.hrIntents ? `HR: ${s.hrIntents.map((h) => h.intent).join(', ')}` : null,
    s.strategy ? `전략: ${s.strategy}` : null,
    s.questions.length > 0
      ? `문항 ${s.questions.filter((q) => q.status === 'completed').length}/${s.questions.length} 완료`
      : null,
  ].filter(Boolean).join(' · ')

  return (
    <div
      className="rounded-xl border border-border bg-background p-3 space-y-2 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
      onClick={() => onDetail(snapshot)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {stepIcon(snapshot.stepLabel)}
          <span className="text-xs font-medium truncate">{snapshot.stepLabel}</span>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(snapshot.timestamp)}</span>
      </div>

      {summary && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">{summary}</p>
      )}

      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onRestore(snapshot.id)}
          disabled={isRestoring || isGenerating}
          title={isGenerating ? '생성 중에는 복원할 수 없습니다' : '이 시점으로 되돌리기'}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors',
            isGenerating
              ? 'opacity-30 cursor-not-allowed bg-muted text-muted-foreground'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          )}
        >
          <RotateCcw size={10} />
          되돌리기
        </button>
        <button
          onClick={() => onDetail(snapshot)}
          className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown size={10} />
          상세
        </button>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export function DecisionTimeline() {
  const { snapshots } = useSnapshotStore()
  const { isGenerating, restoreFromDraft } = useWizardStore()
  const [isRestoring, setIsRestoring] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [detailSnapshot, setDetailSnapshot] = useState<WizardSnapshot | null>(null)

  if (snapshots.length === 0) return null

  const handleRestore = (id: string) => {
    const snap = snapshots.find((s) => s.id === id)
    if (!snap) return
    setIsRestoring(true)
    try {
      restoreFromDraft(snap.state)
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <>
      <div className="border-t border-border pt-4">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center gap-1.5 px-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <Clock size={12} />
          결정 타임라인 ({snapshots.length})
          <ChevronDown size={11} className={cn('ml-auto transition-transform', collapsed && 'rotate-180')} />
        </button>

        {!collapsed && (
          <div className="space-y-2">
            {snapshots.map((snap) => (
              <SnapshotCard
                key={snap.id}
                snapshot={snap}
                onRestore={handleRestore}
                onDetail={setDetailSnapshot}
                isRestoring={isRestoring}
                isGenerating={isGenerating}
              />
            ))}
          </div>
        )}
      </div>

      {detailSnapshot && (
        <SnapshotDetailModal
          snapshot={detailSnapshot}
          onClose={() => setDetailSnapshot(null)}
          onRestore={handleRestore}
          isGenerating={isGenerating}
        />
      )}
    </>
  )
}
