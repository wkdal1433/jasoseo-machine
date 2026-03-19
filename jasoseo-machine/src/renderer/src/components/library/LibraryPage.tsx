import { useState } from 'react'
import { User, BookOpen, Dna } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProfilePage } from '../profile/ProfilePage'
import { EpisodeListPage } from '../episodes/EpisodeListPage'
import { PatternPage } from '../patterns/PatternPage'

type LibraryTab = 'profile' | 'episodes' | 'patterns'

const TABS: { id: LibraryTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: '내 프로필', icon: <User size={15} /> },
  { id: 'episodes', label: '에피소드', icon: <BookOpen size={15} /> },
  { id: 'patterns', label: '패턴 강화', icon: <Dna size={15} /> },
]

export function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('episodes')

  return (
    <div className="flex flex-col h-full">
      {/* 탭 헤더 */}
      <div className="border-b border-border bg-card px-6 pt-5 pb-0">
        <h2 className="text-lg font-bold mb-4">내 라이브러리</h2>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors',
                activeTab === tab.id
                  ? 'bg-background border-border text-foreground'
                  : 'bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/70'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'episodes' && <EpisodeListPage />}
        {activeTab === 'patterns' && <PatternPage />}
      </div>
    </div>
  )
}
