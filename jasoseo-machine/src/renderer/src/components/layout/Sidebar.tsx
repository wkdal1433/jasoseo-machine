import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/stores/profileStore'

const navItems = [
  { path: '/', label: '대시보드', icon: '🏠' },
  { path: '/wizard/setup', label: '새 지원서', icon: '✍️' },
  { path: '/onboarding', label: '매직 온보딩', icon: '🧙‍♂️' },
  { path: '/profile', label: '내 프로필', icon: '👤' },
  { path: '/episodes', label: '에피소드', icon: '📋' },
  { path: '/history', label: '작성 이력', icon: '📁' },
  { path: '/patterns', label: '패턴 강화', icon: '🧬' },
  { path: '/guide', label: '사용 가이드', icon: '📖' },
  { path: '/settings', label: '설정', icon: '⚙️' }
]

export function Sidebar() {
  const { isLocked } = useProfileStore()
  const location = useLocation()

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <h1 className="text-lg font-bold text-primary">자소서 머신</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActivePath = location.pathname === item.path
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
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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
        })}
      </nav>
      <div className="border-t border-border p-3">
        <p className="text-xs text-muted-foreground text-center font-bold">v20.0.0 Stable</p>
      </div>
    </aside>
  )
}
