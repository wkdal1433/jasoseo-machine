import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/layout/Layout'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { WizardPage } from './components/wizard/WizardPage'
import { ApplicationSetup } from './components/wizard/ApplicationSetup'
import { EpisodeListPage } from './components/episodes/EpisodeListPage'
import { HistoryPage } from './components/history/HistoryPage'
import { HistoryDetailPage } from './components/history/HistoryDetailPage'
import { ProfilePage } from './components/profile/ProfilePage'
import { SettingsPage } from './components/settings/SettingsPage'
import { GuidePage } from './components/guide/GuidePage'
import { MagicOnboarding } from './components/dashboard/MagicOnboarding'
import { FullReview } from './components/wizard/FullReview'
import { PatternPage } from './components/patterns/PatternPage'
import { useSettingsStore } from './stores/settingsStore'
import { useAutoSave } from './hooks/useAutoSave'

function App() {
  const { theme, loadSettings } = useSettingsStore()
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useAutoSave()

  // 종료 전 저장 확인 (Word 스타일)
  useEffect(() => {
    const cleanup = window.api.onBeforeClose(() => setShowCloseDialog(true))
    return cleanup
  }, [])

  const handleConfirmClose = async () => {
    setIsClosing(true)
    // 마운트된 컴포넌트(ProfilePage 등)에 저장 기회 부여
    window.dispatchEvent(new Event('jasoseo:save-all'))
    // 비동기 저장 완료 대기
    await new Promise((r) => setTimeout(r, 600))
    window.api.replyClose(true)
  }

  const handleCancelClose = () => {
    setShowCloseDialog(false)
    window.api.replyClose(false)
  }

  return (
    <ErrorBoundary>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/wizard" element={<WizardPage />} />
          <Route path="/wizard/setup" element={<ApplicationSetup />} />
          <Route path="/onboarding" element={<MagicOnboarding onClose={() => window.location.hash = '#/'} />} />
          <Route path="/review" element={<FullReview />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/episodes" element={<EpisodeListPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<HistoryDetailPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/patterns" element={<PatternPage />} />
        </Route>
      </Routes>
    </HashRouter>

    {/* 종료 전 저장 확인 다이얼로그 */}
    {showCloseDialog && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Save size={28} />
            </div>
            <h3 className="text-lg font-bold text-foreground">종료하기 전에</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              지금까지의 변경사항을 모두<br />저장하고 종료할까요?
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancelClose}
              disabled={isClosing}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleConfirmClose}
              disabled={isClosing}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-60"
            >
              {isClosing ? '저장 중...' : '저장하고 종료'}
            </button>
          </div>
        </div>
      </div>
    )}
    </ErrorBoundary>
  )
}

export default App
