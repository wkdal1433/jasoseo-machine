import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: '대시보드', icon: '🏠' },
  { path: '/wizard', label: '새 지원서', icon: '✍️' },
  { path: '/episodes', label: '에피소드', icon: '📋' },
  { path: '/history', label: '작성 이력', icon: '📁' },
  { path: '/guide', label: '사용 가이드', icon: '📖' },
  { path: '/settings', label: '설정', icon: '⚙️' }
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <h1 className="text-lg font-bold text-primary">자소서 머신</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <p className="text-xs text-muted-foreground">v1.0.0 MVP</p>
      </div>
    </aside>
  )
}
