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
import { Clock, RotateCcw, ChevronDown, CheckCircle2, Sparkles, Shield } from 'lucide-react'

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
  if (label.includes('생성') || label.includes('초안')) return <Sparkles size={12} className="text-blue-500" />
  if (label.includes('검증')) return <Shield size={12} className="text-purple-500" />
  return <Clock size={12} className="text-muted-foreground" />
}

function SnapshotCard({
  snapshot,
  onRestore,
  isRestoring,
  isGenerating,
}: {
  snapshot: WizardSnapshot
  onRestore: (id: string) => void
  isRestoring: boolean
  isGenerating: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const s = snapshot.state

  const summary = [
    s.hrIntents ? `HR: ${s.hrIntents.map((h) => h.intent).join(', ')}` : null,
    s.strategy ? `전략: ${s.strategy}` : null,
    s.questions.length > 0
      ? `문항 ${s.questions.filter((q) => q.status === 'completed').length}/${s.questions.length} 완료`
      : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="rounded-xl border border-border bg-background p-3 space-y-2">
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

      <div className="flex items-center gap-1">
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
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown size={10} className={cn('transition-transform', expanded && 'rotate-180')} />
          상세
        </button>
      </div>

      {expanded && (
        <div className="rounded-lg bg-muted/30 p-2 space-y-1 text-[10px] text-muted-foreground">
          {s.hrIntents && (
            <div>
              <span className="font-bold">HR 의도:</span>{' '}
              {s.hrIntents.map((h) => `${h.intent}${h.confidence !== undefined ? ` (${h.confidence}%)` : ''}`).join(', ')}
            </div>
          )}
          {s.strategy && <div><span className="font-bold">전략:</span> {s.strategy}</div>}
          {s.questions.length > 0 && (
            <div>
              <span className="font-bold">문항:</span>{' '}
              {s.questions.map((q, i) => `Q${i + 1}(${q.status})`).join(', ')}
            </div>
          )}
          {snapshot.questionIndex !== null && (
            <div><span className="font-bold">대상 문항:</span> {snapshot.questionIndex + 1}번</div>
          )}
        </div>
      )}
    </div>
  )
}

export function DecisionTimeline() {
  const { snapshots, deleteSnapshot } = useSnapshotStore()
  const { isGenerating, restoreFromDraft } = useWizardStore()
  const [isRestoring, setIsRestoring] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  if (snapshots.length === 0) return null

  const handleRestore = (id: string) => {
    const snap = snapshots.find((s) => s.id === id)
    if (!snap) return
    // R3-2: 생성 중 복원 금지는 버튼 disabled로 이미 처리됨
    setIsRestoring(true)
    try {
      restoreFromDraft(snap.state)
    } finally {
      setIsRestoring(false)
    }
  }

  return (
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
              isRestoring={isRestoring}
              isGenerating={isGenerating}
            />
          ))}
        </div>
      )}
    </div>
  )
}
