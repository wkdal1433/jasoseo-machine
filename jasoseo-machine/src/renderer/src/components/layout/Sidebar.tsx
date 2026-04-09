import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/stores/profileStore'
import {
  Home,
  PenTool,
  FolderOpen,
  History,
  BookOpen,
  Settings
} from 'lucide-react'

const mainNavItems = [
  { path: '/', label: '홈', icon: <Home size={18} /> },
  { path: '/library', label: '내 라이브러리', icon: <FolderOpen size={18} /> },
  { path: '/history', label: '작성 이력', icon: <History size={18} /> },
]

const utilNavItems = [
  { path: '/guide', label: '사용 가이드', icon: <BookOpen size={16} /> },
  { path: '/settings', label: '설정', icon: <Settings size={16} /> },
]

export function Sidebar() {
  const { isLocked } = useProfileStore()
  const location = useLocation()

  const makeNavLink = (item: { path: string; label: string; icon: React.ReactNode }, small = false) => {
    const isActivePath = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    const isDisabled = isLocked && !isActivePath

    return (
      <NavLink
        key={item.path}
        to={isDisabled ? location.pathname : item.path}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault()
            alert('현재 중요한 작업(온보딩/인터뷰)이 진행 중입니다. 작업 완료 후 메뉴를 이동해 주세요.')
          }
        }}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 transition-colors',
            small ? 'py-2 text-xs' : 'py-2.5 text-sm font-medium',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )
        }
      >
        <span>{item.icon}</span>
        <span>{item.label}</span>
      </NavLink>
    )
  }

  const isWizardDisabled = isLocked

  return (
    <aside className="flex h-full w-52 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <h1 className="text-base font-bold text-primary">자소서 머신</h1>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {/* 새 지원서 — Primary CTA */}
        <NavLink
          to={isWizardDisabled ? location.pathname : '/wizard/setup'}
          onClick={(e) => {
            if (isWizardDisabled) {
              e.preventDefault()
              alert('현재 중요한 작업(온보딩/인터뷰)이 진행 중입니다. 작업 완료 후 메뉴를 이동해 주세요.')
            }
          }}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-all mb-2',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-primary/10 text-primary hover:bg-primary/20',
              isWizardDisabled && 'opacity-50 cursor-not-allowed'
            )
          }
        >
          <PenTool size={18} />
          <span>새 지원서</span>
        </NavLink>

        {/* Main nav */}
        <div className="space-y-0.5">
          {mainNavItems.map((item) => makeNavLink(item))}
        </div>
      </nav>

      {/* Utility nav — bottom */}
      <div className="border-t border-border p-3 space-y-0.5">
        {utilNavItems.map((item) => makeNavLink(item, true))}
        <a
          href="https://github.com/wkdal1433/jasoseo-machine"
          target="_blank"
          rel="noopener noreferrer"
          className="block pt-2 text-[10px] text-muted-foreground/50 text-center hover:text-muted-foreground transition-colors"
        >
          v2.0.0 · GitHub ↗
        </a>
      </div>
    </aside>
  )
}
