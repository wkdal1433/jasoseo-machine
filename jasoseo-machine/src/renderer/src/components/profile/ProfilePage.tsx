import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useProfileStore } from '../../stores/profileStore'
import { 
  UserProfile, 
  EducationItem, 
  ExperienceItem, 
  LanguageItem, 
  CertificateItem, 
  ActivityItem,
  TrainingItem,
  AwardItem,
  OverseasItem,
  PortfolioItem,
  DEFAULT_PROFILE
} from '../../types/profile'
import { cn } from '@/lib/utils'

export function ProfilePage() {
  const { 
    profile, 
    profiles, 
    loadProfile, 
    loadProfilesList,
    saveProfile, 
    switchProfile, 
    createProfile, 
    deleteProfile, 
    isLoaded 
  } = useProfileStore()
  const [activeTab, setActiveTab] = useState('basic')
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (isCreatingProfile) {
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [isCreatingProfile])

  useEffect(() => {
    if (isLoaded && profile) {
      const mergedProfile = {
        ...DEFAULT_PROFILE,
        ...profile,
        personal: { ...DEFAULT_PROFILE.personal, ...profile.personal },
        desiredJob: { ...DEFAULT_PROFILE.desiredJob, ...profile.desiredJob },
        preferences: { 
          ...DEFAULT_PROFILE.preferences, 
          ...profile.preferences,
          military: { ...DEFAULT_PROFILE.preferences.military, ...profile.preferences?.military }
        },
        education: profile.education || [],
        experience: profile.experience || [],
        activities: profile.activities || [],
        training: profile.training || [],
        certificates: profile.certificates || [],
        languages: profile.languages || [],
        awards: profile.awards || [],
        overseas: profile.overseas || [],
        portfolio: profile.portfolio || [],
        skills: profile.skills || []
      }
      setLocalProfile(mergedProfile)
    }
  }, [isLoaded, profile])

  if (!localProfile) return <div className="p-8 text-center animate-pulse text-muted-foreground">프로필 데이터를 불러오는 중...</div>

  const handleSave = async () => {
    setIsSaving(true)
    await saveProfile(localProfile)
    setIsSaving(false)
    alert('프로필이 성공적으로 저장되었습니다.')
  }

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return
    await createProfile(newProfileName.trim())
    await loadProfilesList()
    setNewProfileName('')
    setIsCreatingProfile(false)
  }

  const handleSwitch = async (id: string) => {
    await switchProfile(id)
    window.location.reload()
  }

  const handleDeleteProfile = async () => {
    if (profiles.length <= 1) {
      alert('최소 하나의 프로필은 유지되어야 합니다.')
      return
    }
    if (confirm(`'${localProfile.personal?.name || '알 수 없음'}' 프로필을 정말 삭제하시겠습니까?`)) {
      await deleteProfile((profile as any).id)
      window.location.reload()
    }
  }

  const updatePersonal = (updates: Partial<UserProfile['personal']>) => {
    setLocalProfile({ ...localProfile!, personal: { ...localProfile!.personal, ...updates } })
  }

  const tabs = [
    { id: 'basic', label: '기본정보/직무' },
    { id: 'edu_exp', label: '학력/경력' },
    { id: 'activities', label: '대외활동/교육' },
    { id: 'skills_lang', label: '자격/어학/수상' },
    { id: 'etc', label: '포트폴리오/우대' }
  ]

  return (
    <div className="flex h-full flex-col p-6">
      {/* Profile Selector & Actions */}
      <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Active Profile</span>
            <select 
              value={(profile as any).id} 
              onChange={(e) => handleSwitch(e.target.value)}
              className="bg-transparent font-bold text-lg outline-none cursor-pointer hover:text-primary transition-colors"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="h-8 w-px bg-primary/20 mx-2"></div>
          {isCreatingProfile ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProfile()
                  if (e.key === 'Escape') { setIsCreatingProfile(false); setNewProfileName('') }
                }}
                placeholder="프로필 이름"
                className="rounded-lg border border-primary/50 bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary w-32"
              />
              <button
                onClick={handleCreateProfile}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                생성
              </button>
              <button
                onClick={() => { setIsCreatingProfile(false); setNewProfileName('') }}
                className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingProfile(true)}
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-all"
            >
              <span>+</span> 새 프로필 추가
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDeleteProfile}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            현재 프로필 삭제
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg hover:scale-105 transition-all disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '💾 프로필 전체 저장'}
          </button>
        </div>
      </div>

      <div className="mb-6 flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {activeTab === 'basic' && (
          <div className="space-y-8 pb-8">
            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">1. 인적사항</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">이름 *</label><input type="text" value={localProfile.personal?.name || ''} onChange={(e) => updatePersonal({ name: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">이메일 *</label><input type="email" value={localProfile.personal?.email || ''} onChange={(e) => updatePersonal({ email: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">휴대폰 *</label><input type="text" value={localProfile.personal?.mobile || ''} onChange={(e) => updatePersonal({ mobile: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">주소</label><input type="text" value={localProfile.personal?.address || ''} onChange={(e) => updatePersonal({ address: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              </div>
            </section>
            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">2. 스킬</h3>
              <div className="flex flex-wrap gap-2 rounded-md border border-input p-3 bg-accent/10">
                {(localProfile.skills || []).map((skill, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 border border-green-500/20">
                    {skill}
                    <button onClick={() => { const s = localProfile.skills.filter((_, idx) => idx !== i); setLocalProfile({ ...localProfile, skills: s }) }} className="hover:text-destructive">×</button>
                  </span>
                ))}
                <input type="text" placeholder="추가 (엔터)" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value) { const s = [...(localProfile.skills || []), e.currentTarget.value]; setLocalProfile({ ...localProfile, skills: s }); e.currentTarget.value = '' } }} className="flex-1 min-w-[150px] bg-transparent outline-none text-sm" />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'edu_exp' && (
          <div className="space-y-12 pb-8">
            <ItemList title="4. 학력사항" items={localProfile.education || []} 
              onAdd={() => { const n: EducationItem = { id: uuidv4(), type: 'university', name: '', startDate: '', endDate: '', status: '', major: '' }; setLocalProfile({ ...localProfile, education: [...(localProfile.education || []), n] }) }}
              onRemove={(id) => setLocalProfile({ ...localProfile, education: (localProfile.education || []).filter(i => i.id !== id) })}
              renderItem={(item, index) => (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <input className="col-span-2 p-2 border rounded" placeholder="학교명" value={item.name} onChange={(e) => { const next = [...localProfile.education]; next[index].name = e.target.value; setLocalProfile({...localProfile, education: next}) }}/>
                  <input className="p-2 border rounded" placeholder="전공" value={item.major} onChange={(e) => { const next = [...localProfile.education]; next[index].major = e.target.value; setLocalProfile({...localProfile, education: next}) }}/>
                  <input className="p-2 border rounded" placeholder="졸업상태" value={item.status} onChange={(e) => { const next = [...localProfile.education]; next[index].status = e.target.value; setLocalProfile({...localProfile, education: next}) }}/>
                </div>
              )}
            />
            <ItemList title="5. 경력사항" items={localProfile.experience || []}
              onAdd={() => { const n: ExperienceItem = { id: uuidv4(), companyName: '', dept: '', startDate: '', endDate: '', rank: '', jobCategory: '', description: '', isPublic: { salary: true, description: true, companyName: true } }; setLocalProfile({ ...localProfile, experience: [...(localProfile.experience || []), n] }) }}
              onRemove={(id) => setLocalProfile({ ...localProfile, experience: (localProfile.experience || []).filter(i => i.id !== id) })}
              renderItem={(item, index) => (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <input className="p-2 border rounded" placeholder="회사명" value={item.companyName} onChange={(e) => { const next = [...localProfile.experience]; next[index].companyName = e.target.value; setLocalProfile({...localProfile, experience: next}) }}/>
                  <input className="p-2 border rounded" placeholder="직무" value={item.jobCategory} onChange={(e) => { const next = [...localProfile.experience]; next[index].jobCategory = e.target.value; setLocalProfile({...localProfile, experience: next}) }}/>
                  <textarea className="col-span-2 p-2 border rounded" placeholder="내용" value={item.description} onChange={(e) => { const next = [...localProfile.experience]; next[index].description = e.target.value; setLocalProfile({...localProfile, experience: next}) }}/>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-12 pb-8">
            <ItemList title="6. 인턴·대외활동" items={localProfile.activities || []}
              onAdd={() => { const n: ActivityItem = { id: uuidv4(), type: 'social', organization: '', startDate: '', endDate: '', description: '' }; setLocalProfile({ ...localProfile, activities: [...(localProfile.activities || []), n] }) }}
              onRemove={(id) => setLocalProfile({ ...localProfile, activities: (localProfile.activities || []).filter(i => i.id !== id) })}
              renderItem={(item, index) => (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <input className="p-2 border rounded" placeholder="기관명" value={item.organization} onChange={(e) => { const next = [...localProfile.activities]; next[index].organization = e.target.value; setLocalProfile({...localProfile, activities: next}) }}/>
                  <div className="flex gap-2">
                    <input className="flex-1 p-2 border rounded" placeholder="시작" value={item.startDate} onChange={(e) => { const next = [...localProfile.activities]; next[index].startDate = e.target.value; setLocalProfile({...localProfile, activities: next}) }}/>
                    <input className="flex-1 p-2 border rounded" placeholder="종료" value={item.endDate} onChange={(e) => { const next = [...localProfile.activities]; next[index].endDate = e.target.value; setLocalProfile({...localProfile, activities: next}) }}/>
                  </div>
                  <textarea className="col-span-2 p-2 border rounded" placeholder="활동 내용" value={item.description} onChange={(e) => { const next = [...localProfile.activities]; next[index].description = e.target.value; setLocalProfile({...localProfile, activities: next}) }}/>
                </div>
              )}
            />
            <ItemList title="7. 교육사항" items={localProfile.training || []}
              onAdd={() => { const n: TrainingItem = { id: uuidv4(), name: '', organization: '', startDate: '', endDate: '', description: '' }; setLocalProfile({ ...localProfile, training: [...(localProfile.training || []), n] }) }}
              onRemove={(id) => setLocalProfile({ ...localProfile, training: (localProfile.training || []).filter(i => i.id !== id) })}
              renderItem={(item, index) => (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <input className="col-span-2 p-2 border rounded" placeholder="교육명" value={item.name} onChange={(e) => { const next = [...localProfile.training]; next[index].name = e.target.value; setLocalProfile({...localProfile, training: next}) }}/>
                  <textarea className="col-span-2 p-2 border rounded" placeholder="교육 내용" value={item.description} onChange={(e) => { const next = [...localProfile.training]; next[index].description = e.target.value; setLocalProfile({...localProfile, training: next}) }}/>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === 'skills_lang' && (
          <div className="space-y-12 pb-8">
            <ItemList title="8. 자격증" items={localProfile.certificates || []}
              onAdd={() => { const n: CertificateItem = { id: uuidv4(), name: '', issuer: '', date: '' }; setLocalProfile({ ...localProfile, certificates: [...(localProfile.certificates || []), n] }) }}
              onRemove={(id) => setLocalProfile({ ...localProfile, certificates: (localProfile.certificates || []).filter(i => i.id !== id) })}
              renderItem={(item, index) => (
                <div className="flex gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <input className="flex-1 p-2 border rounded" placeholder="자격증명" value={item.name} onChange={(e) => { const next = [...localProfile.certificates]; next[index].name = e.target.value; setLocalProfile({...localProfile, certificates: next}) }}/>
                  <input className="w-32 p-2 border rounded" placeholder="취득일" value={item.date} onChange={(e) => { const next = [...localProfile.certificates]; next[index].date = e.target.value; setLocalProfile({...localProfile, certificates: next}) }}/>
                </div>
              )}
            />
            <ItemList title="10. 어학사항" items={localProfile.languages || []}
              onAdd={() => { const n: LanguageItem = { id: uuidv4(), category: '', language: '', testName: '', grade: '', date: '' }; setLocalProfile({ ...localProfile, languages: [...(localProfile.languages || []), n] }) }}
              onRemove={(id) => setLocalProfile({ ...localProfile, languages: (localProfile.languages || []).filter(i => i.id !== id) })}
              renderItem={(item, index) => (
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <input className="p-2 border rounded" placeholder="언어" value={item.language} onChange={(e) => { const next = [...localProfile.languages]; next[index].language = e.target.value; setLocalProfile({...localProfile, languages: next}) }}/>
                  <input className="p-2 border rounded" placeholder="시험명" value={item.testName} onChange={(e) => { const next = [...localProfile.languages]; next[index].testName = e.target.value; setLocalProfile({...localProfile, languages: next}) }}/>
                  <input className="p-2 border rounded" placeholder="점수/급수" value={item.grade} onChange={(e) => { const next = [...localProfile.languages]; next[index].grade = e.target.value; setLocalProfile({...localProfile, languages: next}) }}/>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === 'etc' && (
          <div className="space-y-8 pb-8">
            <ItemList title="11. 포트폴리오" items={localProfile.portfolio || []}
              onAdd={() => { const n: PortfolioItem = { id: uuidv4(), type: 'url', label: '', path: '' }; setLocalProfile({ ...localProfile, portfolio: [...(localProfile.portfolio || []), n] }) }}
              onRemove={(id) => setLocalProfile({ ...localProfile, portfolio: (localProfile.portfolio || []).filter(i => i.id !== id) })}
              renderItem={(item, index) => (
                <div className="flex gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <input className="w-32 p-2 border rounded" placeholder="라벨" value={item.label} onChange={(e) => { const next = [...localProfile.portfolio]; next[index].label = e.target.value; setLocalProfile({...localProfile, portfolio: next}) }}/>
                  <input className="flex-1 p-2 border rounded" placeholder="링크/경로" value={item.path} onChange={(e) => { const next = [...localProfile.portfolio]; next[index].path = e.target.value; setLocalProfile({...localProfile, portfolio: next}) }}/>
                </div>
              )}
            />
            <section className="p-6 border rounded-3xl bg-muted/20">
              <h3 className="mb-4 font-bold">12. 취업우대</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={localProfile.preferences?.isVeteran} onChange={(e) => setLocalProfile({...localProfile, preferences: {...localProfile.preferences, isVeteran: e.target.checked}})} /> 보훈대상</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={localProfile.preferences?.isDisabled} onChange={(e) => setLocalProfile({...localProfile, preferences: {...localProfile.preferences, isDisabled: e.target.checked}})} /> 장애여부</label>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

interface ItemListProps<T> {
  title: string
  items: T[]
  onAdd: () => void
  onRemove: (id: string) => void
  renderItem: (item: T, index: number) => React.ReactNode
}

function ItemList<T extends { id: string }>({ title, items, onAdd, onRemove, renderItem }: ItemListProps<T>) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <button onClick={onAdd} className="text-sm font-medium text-primary hover:underline bg-primary/10 px-3 py-1 rounded-full">+ 추가</button>
      </div>
      {items.length === 0 ? (
        <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-accent/10 text-muted-foreground text-sm">정보가 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="group relative">
              {renderItem(item, index)}
              <button onClick={() => onRemove(item.id)} className="absolute right-[-10px] top-[-10px] rounded-full bg-destructive p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
