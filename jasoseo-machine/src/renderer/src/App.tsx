import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { WizardPage } from './components/wizard/WizardPage'
import { ApplicationSetup } from './components/wizard/ApplicationSetup'
import { EpisodeListPage } from './components/episodes/EpisodeListPage'
import { HistoryPage } from './components/history/HistoryPage'
import { ProfilePage } from './components/profile/ProfilePage'
import { SettingsPage } from './components/settings/SettingsPage'
import { GuidePage } from './components/guide/GuidePage'
import { MagicOnboarding } from './components/dashboard/MagicOnboarding'
import { FullReview } from './components/wizard/FullReview'
import { useSettingsStore } from './stores/settingsStore'
import { useAutoSave } from './hooks/useAutoSave'

function App() {
  const { theme, loadSettings } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useAutoSave()

  return (
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
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
