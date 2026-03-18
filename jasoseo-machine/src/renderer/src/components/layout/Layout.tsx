import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ClipboardList } from 'lucide-react'

type PendingQuestion = { question: string; charLimit: number | null }

export function Layout() {
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[] | null>(null)
  const navigate = useNavigate()

  // 문항을 소비하고 setup 페이지로 이동
  const handleAccept = useCallback(async () => {
    if (!pendingQuestions) return
    await window.api.bridgeClearQuestions()
    setPendingQuestions(null)
    navigate('/wizard/setup', { state: { pendingQuestions } })
  }, [pendingQuestions, navigate])

  const handleDismiss = useCallback(async () => {
    await window.api.bridgeClearQuestions()
    setPendingQuestions(null)
  }, [])

  // 앱 시작 시 — 앱이 닫혀있는 동안 도착한 문항 체크
  // bridge 초기화 타이밍 레이스 대응: 즉시 + 1.5초 후 재시도
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const questions = await window.api.bridgePeekQuestions()
        if (!cancelled && questions && questions.length > 0) setPendingQuestions(questions)
      } catch { /* bridge 미시작 시 무시 */ }
    }
    check()
    const retry = setTimeout(check, 1500)
    return () => { cancelled = true; clearTimeout(retry) }
  }, [])

  // IPC push — 앱이 열려있는 동안 도착하는 문항 실시간 수신
  useEffect(() => {
    const unsub = window.api.onQuestionsExtracted((questions) => {
      if (questions && questions.length > 0) setPendingQuestions(questions)
    })
    return unsub
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {/* 문항 도착 알림 배너 */}
        {pendingQuestions && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 w-max max-w-[90%]
            flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/10
            px-5 py-3 shadow-xl backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
            <ClipboardList size={18} className="text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-primary">
                문항 {pendingQuestions.length}개가 도착했습니다
              </span>
              <span className="text-xs text-muted-foreground">
                확장 프로그램에서 추출한 자소서 문항입니다
              </span>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={handleAccept}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                새 지원서로 시작
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
