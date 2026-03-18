import { useState, useRef, useEffect, useCallback } from 'react'
import type { Episode } from '@/types/episode'
import { ClipboardList, Sparkles, CheckCircle2 } from 'lucide-react'

const STATUS_CONFIG = {
  ready:        { label: '완성', className: 'bg-green-100 text-green-700 border-green-200' },
  needs_review: { label: '초안', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  draft:        { label: '미완성', className: 'bg-gray-100 text-gray-500 border-gray-200' },
} as const

const HR_INTENT_COLORS: Record<string, string> = {
  Execution:    'bg-blue-50 text-blue-700 border-blue-200',
  Growth:       'bg-purple-50 text-purple-700 border-purple-200',
  Stability:    'bg-green-50 text-green-700 border-green-200',
  Communication:'bg-orange-50 text-orange-700 border-orange-200',
}

interface Props {
  episode: Episode
  onClose: () => void
  onUpdated: () => void
}

type EditState = 'idle' | 'running' | 'done' | 'error'

export function EpisodeDetailModal({ episode, onClose, onUpdated }: Props) {
  const [instruction, setInstruction] = useState('')
  const [editState, setEditState] = useState<EditState>('idle')
  const [aiLog, setAiLog] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [rawView, setRawView] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const processIdRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => { isMountedRef.current = false }  // 언마운트 시 저장 차단 플래그
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [aiLog])

  // 닫기 — AI 실행 중이면 해당 프로세스만 취소 후 닫기
  const handleClose = useCallback(async () => {
    // pid를 confirm() 이전에 캡처 — confirm 블록 중 AI가 완료되어 ref가 null이 되는 경쟁 조건 방지
    const pid = processIdRef.current
    if (editState === 'running' && pid) {
      if (!confirm('AI 수정이 진행 중입니다. 취소하고 닫을까요?')) return
      try {
        await window.api.claudeCancelById(pid)
      } catch {
        // 취소 실패(이미 완료됐거나 IPC 오류)해도 닫기는 반드시 진행
      }
      processIdRef.current = null
    }
    onClose()
  }, [editState, onClose])

  // 백드롭 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose()
  }

  const handleAiEdit = async () => {
    if (!instruction.trim() || editState === 'running') return
    const pid = `proc_ep_edit_${Date.now()}`
    processIdRef.current = pid
    setEditState('running')
    setAiLog('AI에게 요청 중...\n')

    try {
      const prompt = `당신은 S급 자소서 에피소드 편집 전문가입니다.

다음 에피소드 마크다운 파일을 아래 수정 지시에 따라 정확히 편집해주세요.

# 편집 원칙 (절대 준수)
- Episode에 이미 명시된 사실만 사용합니다. 없는 정보를 추가하거나 추론하지 않습니다.
- 수치, 고유명사, 기간은 원본 그대로 유지합니다.
- S-P-A-A-R-L 구조(상황-문제-행동-결과-배움)를 유지합니다.
- 수정 지시에서 요청한 부분만 변경하고, 나머지는 원본을 그대로 보존합니다.

# 현재 에피소드 (파일명: ${episode.fileName})
\`\`\`markdown
${episode.rawContent}
\`\`\`

# 수정 지시
${instruction.trim()}

# 출력 형식
수정된 마크다운 전문만 출력하세요. 설명이나 주석을 추가하지 마세요.
출력은 반드시 \`# Episode\`로 시작하는 마크다운이어야 합니다.`

      const result = await window.api.claudeExecute({
        prompt,
        outputFormat: 'text',
        maxTurns: 3,
        processId: pid,
      })

      if (!result || typeof result !== 'string') throw new Error('AI 응답이 비어있습니다.')

      // 마크다운 코드블록 unwrap
      const cleaned = result.replace(/^```(?:markdown)?\n?/, '').replace(/\n?```$/, '').trim()

      if (!cleaned.includes('#') || cleaned.length < 50) {
        throw new Error('AI 응답이 올바른 마크다운 형식이 아닙니다.')
      }

      // 사용자가 취소하고 모달을 닫은 경우 파일 저장 차단
      if (!isMountedRef.current) return

      setAiLog(prev => prev + '\n수정 완료! 파일 저장 중...')
      const success = await window.api.episodeSaveFile(episode.fileName, cleaned)
      if (!success) throw new Error('파일 저장에 실패했습니다.')

      setAiLog(prev => prev + '\n✅ 저장 완료!')
      setEditState('done')
      setInstruction('')
      onUpdated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setAiLog(prev => prev + `\n❌ 오류: ${msg}`)
      setEditState('error')
    } finally {
      processIdRef.current = null
    }
  }

  const handleRetry = () => {
    setEditState('idle')
    setAiLog('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-background border shadow-2xl overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b bg-muted/30">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold tracking-wider text-primary uppercase">{episode.id}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CONFIG[episode.status].className}`}>
                {STATUS_CONFIG[episode.status].label}
              </span>
              {episode.hrIntents.map(intent => (
                <span key={intent} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${HR_INTENT_COLORS[intent] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {intent}
                </span>
              ))}
            </div>
            <h2 className="text-lg font-bold leading-tight">{episode.title}</h2>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
              <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>
            </svg>
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto">

          {/* 메타 정보 */}
          <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">기간</p>
              <p className="text-sm">{episode.period || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">역할</p>
              <p className="text-sm">{episode.role || '—'}</p>
            </div>
            {episode.techStack.length > 0 && (
              <div className="col-span-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">기술 스택</p>
                <div className="flex flex-wrap gap-1.5">
                  {episode.techStack.map(t => (
                    <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 에피소드 내용 (마크다운 원문) */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">에피소드 내용</p>
              <button
                onClick={() => setRawView(v => !v)}
                className="text-[11px] text-primary hover:underline"
              >
                {rawView ? '미리보기' : '원문 보기'}
              </button>
            </div>
            {rawView ? (
              <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono bg-muted/40 rounded-lg p-3 max-h-52 overflow-y-auto text-foreground/80">
                {episode.rawContent}
              </pre>
            ) : (
              <div className="text-sm leading-relaxed bg-muted/40 rounded-lg p-3 max-h-52 overflow-y-auto">
                {episode.rawContent.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) return <p key={i} className="font-bold text-primary mt-3 mb-1 text-sm">{line.replace(/^##\s+/, '')}</p>
                  if (line.startsWith('# ')) return <p key={i} className="font-bold text-base mt-2 mb-1">{line.replace(/^#\s+/, '')}</p>
                  if (line.startsWith('- ')) return <p key={i} className="ml-3 text-muted-foreground text-xs">• {line.replace(/^-\s+/, '')}</p>
                  if (line.trim() === '') return <div key={i} className="h-1" />
                  return <p key={i} className="text-xs text-muted-foreground">{line}</p>
                })}
              </div>
            )}
          </div>

          {/* AI 수정 요청 섹션 */}
          <div className="px-6 py-4">
            {/* 직접 편집 불가 안내 */}
            <div className="flex items-start gap-2 mb-3">
              <p className="text-sm font-semibold">AI에게 수정 요청</p>
              <button
                onClick={() => setShowGuide(v => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline"
              >
                왜 직접 편집이 안 되나요?
              </button>
            </div>

            {showGuide && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800 space-y-1.5">
                <p className="font-semibold text-amber-900 flex items-center gap-1"><ClipboardList size={16} /> 에피소드 무결성 보호 정책</p>
                <p>이 시스템은 <strong>S급 합격 자소서</strong>를 만들기 위해 설계되었습니다. 에피소드는 자소서의 유일한 사실 원천이므로, 임의 편집 시 다음 문제가 발생합니다:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>수치·기간·성과를 실수로 바꾸면 면접에서 검증 불가능한 내용이 됩니다</li>
                  <li>S-P-A-A-R-L 구조가 무너지면 AI가 자소서 생성 시 올바른 맥락을 파악하지 못합니다</li>
                  <li>에피소드 간 일관성이 깨져 다중 문항 작성 시 앞뒤가 맞지 않게 됩니다</li>
                </ul>
                <p className="mt-1 text-amber-700">AI를 통한 수정은 이 원칙을 지키면서 수행됩니다. 구체적으로 바꾸고 싶은 내용을 지시어로 전달하면 최소한의 변경만 이루어집니다.</p>
                <p className="text-amber-600 text-[11px]">예: "결과 섹션에서 개선율을 30%에서 28%로 수정해줘" / "역할 설명에서 팀장이라는 표현을 '기술 리드'로 바꿔줘"</p>
              </div>
            )}

            {editState === 'idle' || editState === 'error' ? (
              <div className="space-y-2">
                <textarea
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  placeholder="수정하고 싶은 내용을 구체적으로 알려주세요.&#10;예: '결과 섹션에서 개선율 수치를 30%로 수정해줘' / '기술 스택에 Docker 추가해줘'"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAiEdit() }}
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">Ctrl+Enter로 전송</p>
                  <button
                    onClick={handleAiEdit}
                    disabled={!instruction.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    <Sparkles size={14} className="inline mr-1" /> AI에게 수정 요청
                  </button>
                </div>
                {editState === 'error' && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-destructive">오류가 발생했습니다.</p>
                    <button onClick={handleRetry} className="text-xs text-primary underline">다시 시도</button>
                  </div>
                )}
              </div>
            ) : editState === 'running' ? (
              <div
                ref={logRef}
                className="rounded-lg bg-black/80 p-3 h-28 overflow-y-auto font-mono text-xs text-green-400 whitespace-pre-wrap"
              >
                <span className="animate-pulse">▍ </span>{aiLog}
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                <span>수정이 완료되었습니다. 에피소드 목록이 자동으로 갱신됩니다.</span>
                <button onClick={handleRetry} className="ml-auto text-xs text-green-700 underline">추가 수정</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
