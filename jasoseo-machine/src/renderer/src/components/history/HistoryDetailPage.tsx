import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHistoryStore } from '@/stores/historyStore'
import { useWizardStore } from '@/stores/wizardStore'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { CopyButton } from '@/components/common/CopyButton'
import { cn } from '@/lib/utils'

interface CoverLetter {
  id: string
  applicationId: string
  questionNumber: number
  question: string
  charLimit: number | null
  finalText: string
  status: string
}

interface AppDetail {
  id: string
  companyName: string
  jobTitle: string
  jobPosting: string
  strategy: string | null
  hrIntents: string | null
  status: string
  createdAt: string
  updatedAt: string
  feedbackNote: string | null
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  completed: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  passed: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  failed: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
}
const statusLabels: Record<string, string> = {
  draft: '작성중', completed: '완료', passed: '합격', failed: '불합격'
}

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { updateStatus, deleteApplication } = useHistoryStore()
  const { initWizard } = useWizardStore()

  const [app, setApp] = useState<AppDetail | null>(null)
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [localTexts, setLocalTexts] = useState<string[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const detail = await window.api.appGet(id) as { application: AppDetail; coverLetters: CoverLetter[] }
      if (detail?.application) {
        setApp(detail.application)
        setCoverLetters(detail.coverLetters)
        setLocalTexts(detail.coverLetters.map((cl) => cl.finalText))
      }
      setIsLoading(false)
    }
    load()
  }, [id])

  const handleSaveEdit = async (index: number) => {
    if (!id) return
    setIsSaving(true)
    try {
      const cl = coverLetters[index]
      await window.api.clUpdate(cl.id, { finalText: localTexts[index] })
      // updatedAt 갱신
      await window.api.appSave({ ...app!, updatedAt: new Date().toISOString() })
      const updated = [...coverLetters]
      updated[index] = { ...cl, finalText: localTexts[index] }
      setCoverLetters(updated)
      setEditingIndex(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!id) return
    await updateStatus(id, status)
    setApp((prev) => prev ? { ...prev, status } : prev)
  }

  const handleDelete = async () => {
    if (!id || !confirm(`"${app?.companyName}" 지원서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
    await deleteApplication(id)
    navigate('/history')
  }

  const handleSendToExtension = async () => {
    setIsSending(true)
    try {
      const texts = localTexts.filter(Boolean)
      const script = `(function() {
  var texts = ${JSON.stringify(texts)};
  var areas = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]')).filter(function(el) {
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 30;
  });
  if (areas.length === 0) { alert('자소서 입력창을 찾을 수 없습니다.'); return; }
  var filled = 0;
  texts.forEach(function(text, i) {
    var el = areas[i];
    if (!el) return;
    if (el.tagName === 'TEXTAREA') {
      var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      if (setter) setter.set.call(el, text); else el.value = text;
    } else { el.textContent = text; }
    ['input','change','keyup'].forEach(function(evt) { el.dispatchEvent(new Event(evt, { bubbles: true })); });
    filled++;
  });
  alert('✅ ' + filled + '개 문항이 자동 입력되었습니다!');
})()`
      await window.api.bridgeSetScript(script)
      alert(`${texts.length}개 문항 데이터가 전송되었습니다.\n브라우저에서 [✨ 자동 입력] 버튼을 눌러주세요!`)
    } finally {
      setIsSending(false)
    }
  }

  const handleReuseAsNew = () => {
    if (!app || coverLetters.length === 0) return
    const questions = coverLetters.map((cl) => ({
      question: cl.question,
      charLimit: cl.charLimit || 800
    }))
    initWizard(app.companyName, app.jobTitle, app.jobPosting || '', questions, (app.strategy as any) || 'Balanced')
    navigate('/wizard')
  }

  if (isLoading) return (
    <div className="flex h-full items-center justify-center text-muted-foreground">로딩 중...</div>
  )
  if (!app) return (
    <div className="flex h-full items-center justify-center text-muted-foreground">이력을 찾을 수 없습니다.</div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/history')} className="text-muted-foreground hover:text-foreground text-lg">←</button>
          <div>
            <h2 className="text-xl font-bold">{app.companyName} · {app.jobTitle}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(app.createdAt).toLocaleDateString('ko-KR')} 작성 · {coverLetters.length}문항
              · <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[app.status])}>{statusLabels[app.status] || app.status}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* 상태 변경 */}
          {app.status !== 'passed' && (
            <button onClick={() => handleStatusChange('passed')} className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:border-green-700 dark:hover:bg-green-950">합격</button>
          )}
          {app.status !== 'failed' && (
            <button onClick={() => handleStatusChange('failed')} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950">불합격</button>
          )}
          <button
            onClick={handleReuseAsNew}
            className="rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
          >
            🔄 새 지원서로 재활용
          </button>
          <button
            onClick={handleSendToExtension}
            disabled={isSending}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {isSending ? '전송 중...' : '🧩 확장 프로그램으로 전송'}
          </button>
          <button onClick={handleDelete} className="rounded-lg border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">삭제</button>
        </div>
      </div>

      {/* Cover Letter List */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {coverLetters.map((cl, i) => (
          <div key={cl.id} className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary uppercase tracking-tighter">문항 {i + 1}</span>
                <CharacterCounter current={localTexts[i]?.length ?? 0} limit={cl.charLimit} />
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={localTexts[i]} />
                {editingIndex === i ? (
                  <>
                    <button
                      onClick={() => handleSaveEdit(i)}
                      disabled={isSaving}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {isSaving ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={() => { setLocalTexts((prev) => { const n = [...prev]; n[i] = cl.finalText; return n }); setEditingIndex(null) }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingIndex(i)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    ✏️ 수정
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="mb-3 text-sm font-bold text-foreground leading-relaxed">Q. {cl.question}</p>
              {editingIndex === i ? (
                <textarea
                  value={localTexts[i]}
                  onChange={(e) => setLocalTexts((prev) => { const n = [...prev]; n[i] = e.target.value; return n })}
                  className="w-full rounded-xl border-2 border-primary/30 bg-muted/30 p-4 text-sm leading-relaxed outline-none focus:border-primary/50 transition-all min-h-[200px] resize-none"
                  autoFocus
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 bg-muted/20 rounded-xl p-4 min-h-[80px]">
                  {localTexts[i] || '내용 없음'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
