import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useProfileStore } from '../../stores/profileStore'
import {
  UserProfile,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  LanguageItem,
  CertificateItem,
  ActivityItem,
  TrainingItem,
  AwardItem,
  OverseasItem,
  ComputerSkillItem,
  PortfolioItem,
  DEFAULT_PROFILE
} from '../../types/profile'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, Save, Download, Upload, RotateCcw, Copy, UserMinus, ChevronDown, Check } from 'lucide-react'

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
    renameProfile,
    duplicateProfile,
    isLoaded
  } = useProfileStore()
  const [activeTab, setActiveTab] = useState('basic')
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const localProfileRef = useRef<UserProfile | null>(null)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [isRenamingProfile, setIsRenamingProfile] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadProfile() }, [])

  // 앱 종료 직전 save-all 이벤트에 응답
  useEffect(() => {
    const handler = () => {
      if (localProfileRef.current) saveProfile(localProfileRef.current)
    }
    window.addEventListener('jasoseo:save-all', handler)
    return () => window.removeEventListener('jasoseo:save-all', handler)
  }, [])

  useEffect(() => {
    if (isCreatingProfile) setTimeout(() => nameInputRef.current?.focus(), 150)
  }, [isCreatingProfile])

  useEffect(() => {
    if (isRenamingProfile) setTimeout(() => renameInputRef.current?.focus(), 150)
  }, [isRenamingProfile])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (isLoaded && profile) {
      const p = profile as any
      const merged: UserProfile = {
        ...DEFAULT_PROFILE,
        ...p,
        personal: { ...DEFAULT_PROFILE.personal, ...p.personal },
        desiredJob: { ...DEFAULT_PROFILE.desiredJob, ...p.desiredJob },
        preferences: {
          ...DEFAULT_PROFILE.preferences,
          ...p.preferences,
          military: { ...DEFAULT_PROFILE.preferences.military, ...p.preferences?.military }
        },
        education: p.education || [],
        experience: p.experience || [],
        projects: p.projects || [],
        activities: p.activities || [],
        training: p.training || [],
        certificates: p.certificates || [],
        languages: p.languages || [],
        computerSkills: p.computerSkills || [],
        awards: p.awards || [],
        overseas: p.overseas || [],
        portfolio: p.portfolio || [],
        skills: p.skills || []
      }
      setLocalProfile(merged)
    }
  }, [isLoaded, profile])

  // ref 동기화: 이벤트 핸들러에서 최신 localProfile 접근용
  useEffect(() => { localProfileRef.current = localProfile }, [localProfile])

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
    if (profiles.length <= 1) { alert('최소 하나의 프로필은 유지되어야 합니다.'); return }
    if (confirm(`'${localProfile.personal?.name || '알 수 없음'}' 프로필을 정말 삭제하시겠습니까?`)) {
      await deleteProfile((profile as any).id)
      window.location.reload()
    }
  }

  const handleStartRename = () => {
    setRenameValue(localProfile.personal?.name || '')
    setIsRenamingProfile(true)
  }

  const handleConfirmRename = async () => {
    if (!renameValue.trim()) return
    await renameProfile((profile as any).id, renameValue.trim())
    await loadProfilesList()
    setLocalProfile(prev => prev ? { ...prev, personal: { ...prev.personal, name: renameValue.trim() } } : prev)
    setIsRenamingProfile(false)
  }

  const handleDuplicateProfile = async () => {
    if (!confirm(`'${localProfile.personal?.name || '알 수 없음'}' 프로필을 복제하시겠습니까?`)) return
    await duplicateProfile((profile as any).id)
    alert('복제 완료! 드롭다운에서 새 프로필을 선택할 수 있습니다.')
  }

  const handleExportProfile = () => {
    const json = JSON.stringify(localProfile, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profile_${localProfile.personal?.name || 'export'}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportProfile = async () => {
    const filePath = await window.api.selectFile([{ name: 'JSON 프로필', extensions: ['json'] }])
    if (!filePath) return
    const content = await window.api.readMd(filePath as string)
    if (!content) { alert('파일을 읽을 수 없습니다.'); return }
    try {
      const imported = JSON.parse(content)
      const p = profile as any
      if (!confirm('가져온 데이터로 현재 프로필을 덮어쓰시겠습니까?\n(저장하기 전까지는 되돌리기로 복구 가능합니다.)')) return
      setLocalProfile({ ...imported, id: p.id })
    } catch {
      alert('유효하지 않은 JSON 파일입니다.')
    }
  }

  const handleRevertProfile = () => {
    if (!confirm('마지막으로 저장된 상태로 되돌리시겠습니까?\n저장하지 않은 변경 내용이 모두 사라집니다.')) return
    const p = profile as any
    setLocalProfile({
      ...DEFAULT_PROFILE, ...p,
      personal: { ...DEFAULT_PROFILE.personal, ...p.personal },
      desiredJob: { ...DEFAULT_PROFILE.desiredJob, ...p.desiredJob },
      preferences: { ...DEFAULT_PROFILE.preferences, ...p.preferences, military: { ...DEFAULT_PROFILE.preferences.military, ...p.preferences?.military } },
      education: p.education || [], experience: p.experience || [], projects: p.projects || [],
      activities: p.activities || [], training: p.training || [], certificates: p.certificates || [],
      languages: p.languages || [], computerSkills: p.computerSkills || [], awards: p.awards || [],
      overseas: p.overseas || [], portfolio: p.portfolio || [], skills: p.skills || []
    })
  }

  const handleResetProfile = () => {
    if (!confirm('프로필의 모든 데이터를 초기화하시겠습니까?\n이름을 제외한 모든 내용이 지워집니다.\n(저장하기 전까지는 \'되돌리기\'로 복구할 수 있습니다.)')) return
    const p = profile as any
    setLocalProfile({ ...DEFAULT_PROFILE, id: p.id, personal: { ...DEFAULT_PROFILE.personal, name: p.personal?.name || '' } })
  }

  const updatePersonal = (updates: Partial<UserProfile['personal']>) =>
    setLocalProfile({ ...localProfile!, personal: { ...localProfile!.personal, ...updates } })

  const updateDesiredJob = (updates: Partial<UserProfile['desiredJob']>) =>
    setLocalProfile({ ...localProfile!, desiredJob: { ...localProfile!.desiredJob, ...updates } })

  const updatePreferences = (updates: Partial<UserProfile['preferences']>) =>
    setLocalProfile({ ...localProfile!, preferences: { ...localProfile!.preferences, ...updates } })

  const inp = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
  const sel = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

  const tabs = [
    { id: 'basic',      label: '기본정보' },
    { id: 'edu_exp',    label: '학력/경력/프로젝트' },
    { id: 'activities', label: '활동/교육/해외' },
    { id: 'skills_lang',label: '자격/어학/수상/컴퓨터' },
    { id: 'etc',        label: '포트폴리오/우대' }
  ]

  return (
    <div className="flex h-full flex-col p-6">
      {/* Profile Selector */}
      <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm">
        {/* Row 1: Active profile selector + Save CTA */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: profile name + new profile */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Active Profile</span>
              {isRenamingProfile ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input ref={renameInputRef} type="text" value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onClick={e => (e.target as HTMLInputElement).focus()}
                    onKeyDown={e => { if (e.key === 'Enter') handleConfirmRename(); if (e.key === 'Escape') setIsRenamingProfile(false) }}
                    className="rounded-md border border-primary/50 bg-background px-2 py-1 text-sm font-bold outline-none focus:ring-1 focus:ring-primary w-32" />
                  <button onClick={handleConfirmRename} className="rounded px-2 py-1 bg-primary text-[10px] font-bold text-primary-foreground">확인</button>
                  <button onClick={() => setIsRenamingProfile(false)} className="rounded px-2 py-1 border text-[10px] text-muted-foreground">취소</button>
                </div>
              ) : (
                <div ref={profileDropdownRef} className="relative flex items-center gap-1.5 min-w-0">
                  {/* 커스텀 드롭다운 트리거 */}
                  <button
                    onClick={() => setIsProfileDropdownOpen(o => !o)}
                    className="flex items-center gap-1 font-bold text-base hover:text-primary transition-colors max-w-[160px]"
                  >
                    <span className="truncate">{profiles.find(p => p.id === (profile as any).id)?.name ?? ''}</span>
                    <ChevronDown size={14} className={cn('shrink-0 transition-transform', isProfileDropdownOpen && 'rotate-180')} />
                  </button>
                  <button onClick={handleStartRename} title="이름 변경"
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"><Pencil size={12} /></button>

                  {/* 커스텀 드롭다운 목록 — 앱 내부에서만 렌더링 */}
                  {isProfileDropdownOpen && (
                    <div className="absolute top-full left-0 z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-150">
                      <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
                        프로필 선택
                      </p>
                      {profiles.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setIsProfileDropdownOpen(false); if (p.id !== (profile as any).id) handleSwitch(p.id) }}
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted',
                            p.id === (profile as any).id ? 'font-bold text-primary' : 'text-foreground'
                          )}
                        >
                          <span className="truncate">{p.name}</span>
                          {p.id === (profile as any).id && <Check size={13} className="text-primary shrink-0 ml-2" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-primary/20 shrink-0" />
            {isCreatingProfile ? (
              <div className="flex items-center gap-1.5">
                <input ref={nameInputRef} type="text" value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onClick={(e) => (e.target as HTMLInputElement).focus()}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProfile(); if (e.key === 'Escape') { setIsCreatingProfile(false); setNewProfileName('') } }}
                  placeholder="프로필 이름"
                  className="rounded-lg border border-primary/50 bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary w-28" />
                <button onClick={handleCreateProfile} className="rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">생성</button>
                <button onClick={() => { setIsCreatingProfile(false); setNewProfileName('') }} className="rounded-lg border px-2.5 py-1 text-xs text-muted-foreground">취소</button>
              </div>
            ) : (
              <button onClick={() => setIsCreatingProfile(true)}
                className="shrink-0 flex items-center gap-1 rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-all">
                + 새 프로필
              </button>
            )}
          </div>

          {/* Right: Save button */}
          <button onClick={handleSave} disabled={isSaving}
            className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5">
            <Save size={14} />
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>

        {/* Row 2: Action buttons (icon + label, compact) */}
        <div className="mt-3 pt-3 border-t border-primary/10 flex items-center gap-1 flex-wrap">
          <button onClick={handleExportProfile} title="JSON으로 내보내기"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950 transition-all">
            <Download size={12} /> 내보내기
          </button>
          <button onClick={handleImportProfile} title="JSON에서 가져오기"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950 transition-all">
            <Upload size={12} /> 가져오기
          </button>
          <div className="h-4 w-px bg-border mx-0.5" />
          <button onClick={handleRevertProfile} title="마지막 저장 상태로 되돌리기"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-yellow-50 hover:text-yellow-700 dark:hover:bg-yellow-950 transition-all">
            <RotateCcw size={12} /> 되돌리기
          </button>
          <button onClick={handleResetProfile} title="모든 데이터 초기화"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950 transition-all">
            <Trash2 size={12} /> 초기화
          </button>
          <button onClick={handleDuplicateProfile} title="현재 프로필 복제"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 transition-all">
            <Copy size={12} /> 복제
          </button>
          <div className="h-4 w-px bg-border mx-0.5" />
          <button onClick={handleDeleteProfile} title="현재 프로필 삭제"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
            <UserMinus size={12} /> 프로필 삭제
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-border">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('px-4 py-2 text-sm font-medium transition-colors border-b-2',
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2">

        {/* ── 기본정보 탭 ── */}
        {activeTab === 'basic' && (
          <div className="space-y-8 pb-8">
            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">1. 인적사항</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="이름 *"><input className={inp} value={localProfile.personal.name} onChange={e => updatePersonal({ name: e.target.value })} /></Field>
                <Field label="영문명 (여권 기준)"><input className={inp} placeholder="KIM GILDONG" value={localProfile.personal.nameEn || ''} onChange={e => updatePersonal({ nameEn: e.target.value })} /></Field>
                <Field label="한자명"><input className={inp} placeholder="金吉童" value={localProfile.personal.nameHanja || ''} onChange={e => updatePersonal({ nameHanja: e.target.value })} /></Field>
                <Field label="생년월일"><input className={inp} placeholder="1998-05-15" value={localProfile.personal.birthDate} onChange={e => updatePersonal({ birthDate: e.target.value })} /></Field>
                <Field label="성별">
                  <select className={sel} value={localProfile.personal.gender} onChange={e => updatePersonal({ gender: e.target.value as any })}>
                    <option value="">선택</option>
                    <option value="male">남</option>
                    <option value="female">여</option>
                  </select>
                </Field>
                <Field label="국적"><input className={inp} placeholder="대한민국" value={localProfile.personal.nationality || ''} onChange={e => updatePersonal({ nationality: e.target.value })} /></Field>
                <Field label="이메일 *"><input className={inp} type="email" value={localProfile.personal.email} onChange={e => updatePersonal({ email: e.target.value })} /></Field>
                <Field label="휴대폰 *"><input className={inp} placeholder="010-0000-0000" value={localProfile.personal.mobile} onChange={e => updatePersonal({ mobile: e.target.value })} /></Field>
                <Field label="집전화"><input className={inp} placeholder="02-0000-0000" value={localProfile.personal.phone} onChange={e => updatePersonal({ phone: e.target.value })} /></Field>
                <Field label="우편번호"><input className={inp} placeholder="06234" value={localProfile.personal.postalCode || ''} onChange={e => updatePersonal({ postalCode: e.target.value })} /></Field>
                <div className="col-span-2"><Field label="주소"><input className={inp} value={localProfile.personal.address} onChange={e => updatePersonal({ address: e.target.value })} /></Field></div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">2. 희망사항</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="희망연봉 (만원)"><input className={inp} placeholder="4000" value={localProfile.desiredJob.salary || ''} onChange={e => updateDesiredJob({ salary: e.target.value })} /></Field>
                <Field label="지원경로">
                  <input className={inp} placeholder="채용 홈페이지" value={localProfile.preferences.applicationChannel || ''} onChange={e => updatePreferences({ applicationChannel: e.target.value })} />
                </Field>
                <div className="col-span-2">
                  <Field label="희망직종 (엔터로 추가)">
                    <TagInput
                      tags={localProfile.desiredJob.keywords}
                      onChange={tags => updateDesiredJob({ keywords: tags })}
                      placeholder="백엔드 개발자"
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="희망지역 (엔터로 추가)">
                    <TagInput
                      tags={localProfile.desiredJob.regions || []}
                      onChange={tags => updateDesiredJob({ regions: tags })}
                      placeholder="서울 / 경기"
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="희망 고용형태 (엔터로 추가)">
                    <TagInput
                      tags={localProfile.desiredJob.employmentTypes || []}
                      onChange={tags => updateDesiredJob({ employmentTypes: tags })}
                      placeholder="정규직"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">3. 보유 스킬</h3>
              <TagInput
                tags={localProfile.skills}
                onChange={tags => setLocalProfile({ ...localProfile, skills: tags })}
                placeholder="Python, TypeScript, React..."
              />
            </section>
          </div>
        )}

        {/* ── 학력/경력/프로젝트 탭 ── */}
        {activeTab === 'edu_exp' && (
          <div className="space-y-12 pb-8">
            <ItemList title="4. 학력사항" items={localProfile.education}
              onAdd={() => { const n: EducationItem = { id: uuidv4(), type: 'university', name: '', startDate: '', endDate: '', status: '', major: '' }; setLocalProfile({ ...localProfile, education: [...localProfile.education, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, education: localProfile.education.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<EducationItem>) => { const next = [...localProfile.education]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, education: next }) }
                return (
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-accent/20">
                    <Field label="학교유형">
                      <select className={sel} value={item.type} onChange={e => update({ type: e.target.value as any })}>
                        <option value="highschool">고등학교</option>
                        <option value="university">대학교(4년)</option>
                        <option value="graduate">대학원</option>
                      </select>
                    </Field>
                    <Field label="학교명"><input className={inp} placeholder="한국대학교" value={item.name} onChange={e => update({ name: e.target.value })} /></Field>
                    <Field label="전공"><input className={inp} placeholder="컴퓨터공학과" value={item.major} onChange={e => update({ major: e.target.value })} /></Field>
                    <Field label="복수전공/부전공"><input className={inp} placeholder="경영학과" value={item.otherMajor || ''} onChange={e => update({ otherMajor: e.target.value })} /></Field>
                    <Field label="입학일"><input className={inp} placeholder="2017-03" value={item.startDate} onChange={e => update({ startDate: e.target.value })} /></Field>
                    <Field label="졸업일">
                      <input className={inp} placeholder="2023-02" value={item.endDate} onChange={e => update({ endDate: e.target.value })} />
                    </Field>
                    <Field label="졸업구분">
                      <select className={sel} value={item.status} onChange={e => update({ status: e.target.value as any })}>
                        <option value="">선택</option>
                        <option value="graduated">졸업</option>
                        <option value="expected">졸업예정</option>
                        <option value="attending">재학중</option>
                        <option value="dropout">중퇴</option>
                      </select>
                    </Field>
                    <Field label="편입여부">
                      <select className={sel} value={item.isTransfer ? 'yes' : 'no'} onChange={e => update({ isTransfer: e.target.value === 'yes' })}>
                        <option value="no">해당없음</option>
                        <option value="yes">편입</option>
                      </select>
                    </Field>
                    <Field label="학점"><input className={inp} placeholder="3.8" value={item.gpa || ''} onChange={e => update({ gpa: e.target.value })} /></Field>
                    <Field label="만점기준"><input className={inp} placeholder="4.5" value={item.gpaScale || ''} onChange={e => update({ gpaScale: e.target.value })} /></Field>
                  </div>
                )
              }}
            </ItemList>

            <ItemList title="5. 경력사항" items={localProfile.experience}
              onAdd={() => { const n: ExperienceItem = { id: uuidv4(), companyName: '', dept: '', startDate: '', endDate: '', rank: '', jobCategory: '', description: '', isPublic: { salary: true, description: true, companyName: true } }; setLocalProfile({ ...localProfile, experience: [...localProfile.experience, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, experience: localProfile.experience.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<ExperienceItem>) => { const next = [...localProfile.experience]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, experience: next }) }
                return (
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-accent/20">
                    <Field label="회사명"><input className={inp} value={item.companyName} onChange={e => update({ companyName: e.target.value })} /></Field>
                    <Field label="부서"><input className={inp} value={item.dept} onChange={e => update({ dept: e.target.value })} /></Field>
                    <Field label="직위/직급"><input className={inp} placeholder="인턴" value={item.rank} onChange={e => update({ rank: e.target.value })} /></Field>
                    <Field label="담당직무"><input className={inp} placeholder="백엔드 개발" value={item.jobCategory} onChange={e => update({ jobCategory: e.target.value })} /></Field>
                    <Field label="고용형태">
                      <select className={sel} value={item.employmentType || ''} onChange={e => update({ employmentType: e.target.value })}>
                        <option value="">선택</option>
                        <option value="정규직">정규직</option>
                        <option value="계약직">계약직</option>
                        <option value="인턴">인턴</option>
                        <option value="아르바이트">아르바이트</option>
                        <option value="프리랜서">프리랜서</option>
                      </select>
                    </Field>
                    <Field label="퇴직사유"><input className={inp} placeholder="계약 만료" value={item.resignReason || ''} onChange={e => update({ resignReason: e.target.value })} /></Field>
                    <Field label="입사일"><input className={inp} placeholder="2022-07" value={item.startDate} onChange={e => update({ startDate: e.target.value })} /></Field>
                    <Field label="퇴사일 (재직중이면 비워두기)"><input className={inp} placeholder="2022-12" value={item.endDate} onChange={e => update({ endDate: e.target.value })} /></Field>
                    <Field label="연봉 (만원)"><input className={inp} placeholder="3500" value={item.salary || ''} onChange={e => update({ salary: e.target.value })} /></Field>
                    <div className="col-span-2"><Field label="담당업무 내용"><textarea className={inp} rows={3} value={item.description} onChange={e => update({ description: e.target.value })} /></Field></div>
                  </div>
                )
              }}
            </ItemList>

            <ItemList title="6. 프로젝트" items={localProfile.projects}
              onAdd={() => { const n: ProjectItem = { id: uuidv4(), name: '', client: '', startDate: '', endDate: '', participation: '', role: '', description: '' }; setLocalProfile({ ...localProfile, projects: [...localProfile.projects, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, projects: localProfile.projects.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<ProjectItem>) => { const next = [...localProfile.projects]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, projects: next }) }
                return (
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-accent/20">
                    <div className="col-span-2"><Field label="프로젝트명"><input className={inp} value={item.name} onChange={e => update({ name: e.target.value })} /></Field></div>
                    <Field label="발주처/고객사"><input className={inp} placeholder="개인 프로젝트" value={item.client} onChange={e => update({ client: e.target.value })} /></Field>
                    <Field label="참여도 (%)"><input className={inp} placeholder="100" value={item.participation || ''} onChange={e => update({ participation: e.target.value })} /></Field>
                    <Field label="시작일"><input className={inp} placeholder="2023-03" value={item.startDate} onChange={e => update({ startDate: e.target.value })} /></Field>
                    <Field label="종료일"><input className={inp} placeholder="2023-08" value={item.endDate} onChange={e => update({ endDate: e.target.value })} /></Field>
                    <div className="col-span-2"><Field label="담당역할"><input className={inp} value={item.role} onChange={e => update({ role: e.target.value })} /></Field></div>
                    <div className="col-span-2"><Field label="프로젝트 내용"><textarea className={inp} rows={3} value={item.description} onChange={e => update({ description: e.target.value })} /></Field></div>
                  </div>
                )
              }}
            </ItemList>
          </div>
        )}

        {/* ── 활동/교육/해외 탭 ── */}
        {activeTab === 'activities' && (
          <div className="space-y-12 pb-8">
            <ItemList title="7. 인턴·대외활동" items={localProfile.activities}
              onAdd={() => { const n: ActivityItem = { id: uuidv4(), type: '', organization: '', startDate: '', endDate: '', description: '' }; setLocalProfile({ ...localProfile, activities: [...localProfile.activities, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, activities: localProfile.activities.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<ActivityItem>) => { const next = [...localProfile.activities]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, activities: next }) }
                return (
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-accent/20">
                    <Field label="활동구분">
                      <select className={sel} value={item.type} onChange={e => update({ type: e.target.value as any })}>
                        <option value="">선택</option>
                        <option value="campus">교내활동</option>
                        <option value="social">사회활동</option>
                        <option value="club">동아리</option>
                        <option value="etc">기타</option>
                      </select>
                    </Field>
                    <Field label="기관/단체명"><input className={inp} value={item.organization} onChange={e => update({ organization: e.target.value })} /></Field>
                    <Field label="직책/역할"><input className={inp} placeholder="부회장" value={item.role || ''} onChange={e => update({ role: e.target.value })} /></Field>
                    <Field label="기간">
                      <div className="flex gap-2">
                        <input className={inp} placeholder="2021-03" value={item.startDate} onChange={e => update({ startDate: e.target.value })} />
                        <input className={inp} placeholder="2022-12" value={item.endDate} onChange={e => update({ endDate: e.target.value })} />
                      </div>
                    </Field>
                    <div className="col-span-2"><Field label="활동 내용"><textarea className={inp} rows={3} value={item.description} onChange={e => update({ description: e.target.value })} /></Field></div>
                  </div>
                )
              }}
            </ItemList>

            <ItemList title="8. 교육이수" items={localProfile.training}
              onAdd={() => { const n: TrainingItem = { id: uuidv4(), name: '', organization: '', startDate: '', endDate: '', description: '' }; setLocalProfile({ ...localProfile, training: [...localProfile.training, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, training: localProfile.training.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<TrainingItem>) => { const next = [...localProfile.training]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, training: next }) }
                return (
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-accent/20">
                    <div className="col-span-2"><Field label="교육명"><input className={inp} value={item.name} onChange={e => update({ name: e.target.value })} /></Field></div>
                    <Field label="교육기관"><input className={inp} value={item.organization} onChange={e => update({ organization: e.target.value })} /></Field>
                    <Field label="기간">
                      <div className="flex gap-2">
                        <input className={inp} placeholder="2023-06" value={item.startDate} onChange={e => update({ startDate: e.target.value })} />
                        <input className={inp} placeholder="2023-06" value={item.endDate} onChange={e => update({ endDate: e.target.value })} />
                      </div>
                    </Field>
                    <div className="col-span-2"><Field label="교육 내용"><textarea className={inp} rows={2} value={item.description} onChange={e => update({ description: e.target.value })} /></Field></div>
                  </div>
                )
              }}
            </ItemList>

            <ItemList title="9. 해외경험" items={localProfile.overseas}
              onAdd={() => { const n: OverseasItem = { id: uuidv4(), country: '', type: '', startDate: '', endDate: '', description: '' }; setLocalProfile({ ...localProfile, overseas: [...localProfile.overseas, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, overseas: localProfile.overseas.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<OverseasItem>) => { const next = [...localProfile.overseas]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, overseas: next }) }
                return (
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-accent/20">
                    <Field label="국가"><input className={inp} value={item.country} onChange={e => update({ country: e.target.value })} /></Field>
                    <Field label="방문목적">
                      <select className={sel} value={item.type || ''} onChange={e => update({ type: e.target.value })}>
                        <option value="">선택</option>
                        <option value="어학연수">어학연수</option>
                        <option value="취업">취업/인턴</option>
                        <option value="교환학생">교환학생</option>
                        <option value="여행">여행</option>
                        <option value="기타">기타</option>
                      </select>
                    </Field>
                    <Field label="시작일"><input className={inp} placeholder="2022-06" value={item.startDate} onChange={e => update({ startDate: e.target.value })} /></Field>
                    <Field label="종료일"><input className={inp} placeholder="2022-08" value={item.endDate} onChange={e => update({ endDate: e.target.value })} /></Field>
                    <div className="col-span-2"><Field label="내용"><textarea className={inp} rows={2} value={item.description} onChange={e => update({ description: e.target.value })} /></Field></div>
                  </div>
                )
              }}
            </ItemList>
          </div>
        )}

        {/* ── 자격/어학/수상/컴퓨터 탭 ── */}
        {activeTab === 'skills_lang' && (
          <div className="space-y-12 pb-8">
            <ItemList title="10. 자격증" items={localProfile.certificates}
              onAdd={() => { const n: CertificateItem = { id: uuidv4(), name: '', issuer: '', date: '' }; setLocalProfile({ ...localProfile, certificates: [...localProfile.certificates, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, certificates: localProfile.certificates.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<CertificateItem>) => { const next = [...localProfile.certificates]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, certificates: next }) }
                return (
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-accent/20">
                    <Field label="자격증명"><input className={inp} value={item.name} onChange={e => update({ name: e.target.value })} /></Field>
                    <Field label="발행기관"><input className={inp} value={item.issuer} onChange={e => update({ issuer: e.target.value })} /></Field>
                    <Field label="자격증 번호"><input className={inp} placeholder="23-12345678" value={item.number || ''} onChange={e => update({ number: e.target.value })} /></Field>
                    <Field label="취득일"><input className={inp} placeholder="2022-11" value={item.date} onChange={e => update({ date: e.target.value })} /></Field>
                  </div>
                )
              }}
            </ItemList>

            <ItemList title="11. 어학사항" items={localProfile.languages}
              onAdd={() => { const n: LanguageItem = { id: uuidv4(), category: '', language: '', testName: '', grade: '', date: '' }; setLocalProfile({ ...localProfile, languages: [...localProfile.languages, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, languages: localProfile.languages.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<LanguageItem>) => { const next = [...localProfile.languages]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, languages: next }) }
                return (
                  <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg bg-accent/20">
                    <Field label="언어"><input className={inp} placeholder="영어" value={item.language} onChange={e => update({ language: e.target.value })} /></Field>
                    <Field label="시험명"><input className={inp} placeholder="TOEIC" value={item.testName} onChange={e => update({ testName: e.target.value })} /></Field>
                    <Field label="점수/급수"><input className={inp} placeholder="875" value={item.grade} onChange={e => update({ grade: e.target.value })} /></Field>
                    <Field label="능숙도">
                      <select className={sel} value={item.level || ''} onChange={e => update({ level: e.target.value })}>
                        <option value="">선택</option>
                        <option value="상">상</option>
                        <option value="중">중</option>
                        <option value="하">하</option>
                      </select>
                    </Field>
                    <Field label="취득일"><input className={inp} placeholder="2023-01" value={item.date} onChange={e => update({ date: e.target.value })} /></Field>
                  </div>
                )
              }}
            </ItemList>

            <ItemList title="12. 수상내역" items={localProfile.awards}
              onAdd={() => { const n: AwardItem = { id: uuidv4(), name: '', issuer: '', date: '', description: '' }; setLocalProfile({ ...localProfile, awards: [...localProfile.awards, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, awards: localProfile.awards.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<AwardItem>) => { const next = [...localProfile.awards]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, awards: next }) }
                return (
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-accent/20">
                    <Field label="수상명"><input className={inp} value={item.name} onChange={e => update({ name: e.target.value })} /></Field>
                    <Field label="수여기관"><input className={inp} value={item.issuer} onChange={e => update({ issuer: e.target.value })} /></Field>
                    <Field label="수상일"><input className={inp} placeholder="2023-02" value={item.date} onChange={e => update({ date: e.target.value })} /></Field>
                    <div className="col-span-2"><Field label="수상 내용"><textarea className={inp} rows={2} value={item.description} onChange={e => update({ description: e.target.value })} /></Field></div>
                  </div>
                )
              }}
            </ItemList>

            <ItemList title="13. 컴퓨터 활용" items={localProfile.computerSkills}
              onAdd={() => { const n: ComputerSkillItem = { id: uuidv4(), program: '', level: '' }; setLocalProfile({ ...localProfile, computerSkills: [...localProfile.computerSkills, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, computerSkills: localProfile.computerSkills.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<ComputerSkillItem>) => { const next = [...localProfile.computerSkills]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, computerSkills: next }) }
                return (
                  <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg bg-accent/20">
                    <div className="col-span-1"><Field label="프로그램명"><input className={inp} placeholder="Microsoft Excel" value={item.program} onChange={e => update({ program: e.target.value })} /></Field></div>
                    <Field label="활용수준">
                      <select className={sel} value={item.level} onChange={e => update({ level: e.target.value })}>
                        <option value="">선택</option>
                        <option value="상">상</option>
                        <option value="중">중</option>
                        <option value="하">하</option>
                      </select>
                    </Field>
                    <Field label="활용기간"><input className={inp} placeholder="3년" value={item.period || ''} onChange={e => update({ period: e.target.value })} /></Field>
                  </div>
                )
              }}
            </ItemList>
          </div>
        )}

        {/* ── 포트폴리오/우대 탭 ── */}
        {activeTab === 'etc' && (
          <div className="space-y-8 pb-8">
            <ItemList title="14. 포트폴리오" items={localProfile.portfolio}
              onAdd={() => { const n: PortfolioItem = { id: uuidv4(), type: 'url', label: '', path: '' }; setLocalProfile({ ...localProfile, portfolio: [...localProfile.portfolio, n] }) }}
              onRemove={id => setLocalProfile({ ...localProfile, portfolio: localProfile.portfolio.filter(i => i.id !== id) })}>
              {(item, index) => {
                const update = (updates: Partial<PortfolioItem>) => { const next = [...localProfile.portfolio]; next[index] = { ...next[index], ...updates }; setLocalProfile({ ...localProfile, portfolio: next }) }
                return (
                  <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg bg-accent/20">
                    <Field label="유형">
                      <select className={sel} value={item.type} onChange={e => update({ type: e.target.value as any })}>
                        <option value="url">URL</option>
                        <option value="pc">PC 파일</option>
                        <option value="cloud">클라우드</option>
                      </select>
                    </Field>
                    <Field label="라벨"><input className={inp} placeholder="GitHub" value={item.label} onChange={e => update({ label: e.target.value })} /></Field>
                    <Field label="링크/경로"><input className={inp} placeholder="https://..." value={item.path} onChange={e => update({ path: e.target.value })} /></Field>
                  </div>
                )
              }}
            </ItemList>

            {/* 병역 */}
            <section className="p-5 border rounded-2xl bg-muted/20 space-y-4">
              <h3 className="font-bold text-primary">15. 병역사항</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="병역구분">
                  <select className={sel} value={localProfile.preferences.military.status}
                    onChange={e => updatePreferences({ military: { ...localProfile.preferences.military, status: e.target.value as any } })}>
                    <option value="">선택</option>
                    <option value="fulfilled">군필</option>
                    <option value="exempted">면제</option>
                    <option value="serving">복무중</option>
                    <option value="not_applicable">해당없음</option>
                  </select>
                </Field>
                <Field label="군별"><input className={inp} placeholder="육군" value={localProfile.preferences.military.branch || ''} onChange={e => updatePreferences({ military: { ...localProfile.preferences.military, branch: e.target.value } })} /></Field>
                <Field label="계급"><input className={inp} placeholder="병장" value={localProfile.preferences.military.rank || ''} onChange={e => updatePreferences({ military: { ...localProfile.preferences.military, rank: e.target.value } })} /></Field>
                <Field label="면제사유"><input className={inp} value={localProfile.preferences.military.exemptReason || ''} onChange={e => updatePreferences({ military: { ...localProfile.preferences.military, exemptReason: e.target.value } })} /></Field>
                <Field label="입대일"><input className={inp} placeholder="2019-03" value={localProfile.preferences.military.startDate || ''} onChange={e => updatePreferences({ military: { ...localProfile.preferences.military, startDate: e.target.value } })} /></Field>
                <Field label="전역일"><input className={inp} placeholder="2020-12" value={localProfile.preferences.military.endDate || ''} onChange={e => updatePreferences({ military: { ...localProfile.preferences.military, endDate: e.target.value } })} /></Field>
              </div>
            </section>

            {/* 운전면허 */}
            <section className="p-5 border rounded-2xl bg-muted/20 space-y-4">
              <h3 className="font-bold text-primary">16. 운전면허</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="운전면허 보유">
                  <select className={sel} value={localProfile.preferences.hasDriverLicense ? 'yes' : 'no'}
                    onChange={e => updatePreferences({ hasDriverLicense: e.target.value === 'yes' })}>
                    <option value="no">없음</option>
                    <option value="yes">있음</option>
                  </select>
                </Field>
                {localProfile.preferences.hasDriverLicense && (
                  <Field label="면허종류">
                    <select className={sel} value={localProfile.preferences.driverLicenseType || ''}
                      onChange={e => updatePreferences({ driverLicenseType: e.target.value })}>
                      <option value="">선택</option>
                      <option value="1종 대형">1종 대형</option>
                      <option value="1종 보통">1종 보통</option>
                      <option value="2종 보통">2종 보통</option>
                      <option value="2종 소형">2종 소형</option>
                    </select>
                  </Field>
                )}
              </div>
            </section>

            {/* 취업우대 */}
            <section className="p-5 border rounded-2xl bg-muted/20 space-y-4">
              <h3 className="font-bold text-primary">17. 취업우대사항</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <CheckField label="보훈대상" checked={localProfile.preferences.isVeteran} onChange={v => updatePreferences({ isVeteran: v })} />
                <Field label="보훈구분"><input className={inp} placeholder="국가유공자 본인" value={localProfile.preferences.veteranType || ''} onChange={e => updatePreferences({ veteranType: e.target.value })} /></Field>
                <CheckField label="장애여부" checked={localProfile.preferences.isDisabled} onChange={v => updatePreferences({ isDisabled: v })} />
                <Field label="장애등급"><input className={inp} placeholder="3급" value={localProfile.preferences.disabledGrade || ''} onChange={e => updatePreferences({ disabledGrade: e.target.value })} /></Field>
                <CheckField label="취업보호대상" checked={localProfile.preferences.isProtection} onChange={v => updatePreferences({ isProtection: v })} />
                <CheckField label="고용지원금 대상" checked={localProfile.preferences.isSubsidy} onChange={v => updatePreferences({ isSubsidy: v })} />
                <CheckField label="취약계층" checked={!!localProfile.preferences.isVulnerable} onChange={v => updatePreferences({ isVulnerable: v })} />
                <Field label="취약계층 구분"><input className={inp} value={localProfile.preferences.vulnerableClass || ''} onChange={e => updatePreferences({ vulnerableClass: e.target.value })} /></Field>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 rounded" />
      <span className="text-sm">{label}</span>
    </label>
  )
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-md border border-input p-2 bg-accent/10 min-h-[42px]">
      {tags.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((_, idx) => idx !== i))} className="hover:text-destructive ml-1">×</button>
        </span>
      ))}
      <input type="text" placeholder={placeholder} className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
        onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { onChange([...tags, e.currentTarget.value.trim()]); e.currentTarget.value = '' } }} />
    </div>
  )
}

interface ItemListProps<T> {
  title: string
  items: T[]
  onAdd: () => void
  onRemove: (id: string) => void
  children: (item: T, index: number) => React.ReactNode
}

function ItemList<T extends { id: string }>({ title, items, onAdd, onRemove, children }: ItemListProps<T>) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <button onClick={onAdd} className="text-sm font-medium text-primary hover:underline bg-primary/10 px-3 py-1 rounded-full">+ 추가</button>
      </div>
      {items.length === 0 ? (
        <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-accent/10 text-muted-foreground text-sm">
          정보가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="group relative">
              {children(item, index)}
              <button onClick={() => onRemove(item.id)}
                className="absolute right-[-8px] top-[-8px] h-5 w-5 rounded-full bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
