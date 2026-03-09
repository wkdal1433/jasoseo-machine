import { useState, useEffect } from 'react'
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
  PortfolioItem 
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

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (isLoaded) {
      setLocalProfile(profile)
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
    const name = prompt('새 프로필의 이름을 입력하세요:')
    if (name && name.trim()) {
      await createProfile(name.trim())
    }
  }

  const handleDeleteProfile = async () => {
    if (profiles.length <= 1) {
      alert('최소 하나의 프로필은 유지되어야 합니다.')
      return
    }
    if (confirm(`'${profile.personal.name}' 프로필을 정말 삭제하시겠습니까? 관련 데이터가 모두 사라집니다.`)) {
      await deleteProfile((profile as any).id)
    }
  }

  const tabs = [
    { id: 'basic', label: '기본정보/스킬' },
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
              onChange={(e) => switchProfile(e.target.value)}
              className="bg-transparent font-bold text-lg outline-none cursor-pointer hover:text-primary transition-colors"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="h-8 w-px bg-primary/20 mx-2"></div>
          <button 
            onClick={handleCreateProfile}
            className="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-all"
          >
            <span>+</span> 새 프로필 추가
          </button>
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

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">인적사항 상세 관리</h2>
          <p className="text-muted-foreground">채용 사이트 항목별 데이터 자산화</p>
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
        {/* 1. 기본정보 / 2. 희망직무 / 3. 스킬 */}
        {activeTab === 'basic' && (
          <div className="space-y-8 pb-8">
            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">1. 인적사항</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">이름 *</label>
                  <input
                    type="text"
                    value={localProfile.personal.name}
                    onChange={(e) => updatePersonal({ name: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">생년월일 * (YYYY.MM.DD)</label>
                  <input
                    type="text"
                    value={localProfile.personal.birthDate}
                    onChange={(e) => updatePersonal({ birthDate: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">성별 *</label>
                  <select
                    value={localProfile.personal.gender}
                    onChange={(e) => updatePersonal({ gender: e.target.value as any })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">선택</option>
                    <option value="male">남자</option>
                    <option value="female">여자</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">이메일 *</label>
                  <input
                    type="email"
                    value={localProfile.personal.email}
                    onChange={(e) => updatePersonal({ email: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">휴대폰번호 *</label>
                  <input
                    type="text"
                    value={localProfile.personal.mobile}
                    onChange={(e) => updatePersonal({ mobile: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">전화번호 (선택)</label>
                  <input
                    type="text"
                    value={localProfile.personal.phone}
                    onChange={(e) => updatePersonal({ phone: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">주소</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localProfile.personal.address}
                      onChange={(e) => updatePersonal({ address: e.target.value })}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="돋보기 아이콘 연동 검색 지원 예정"
                    />
                    <button className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">🔍 검색</button>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">2. 희망직무</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">희망직무 키워드 (태그)</label>
                <div className="flex flex-wrap gap-2 rounded-md border border-input p-3 bg-accent/10">
                  {localProfile.desiredJob.keywords.map((kw, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                      {kw}
                      <button onClick={() => {
                        const newKw = localProfile.desiredJob.keywords.filter((_, idx) => idx !== i)
                        setLocalProfile({ ...localProfile, desiredJob: { keywords: newKw } })
                      }} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder="엔터로 추가"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        const val = e.currentTarget.value
                        if (!localProfile.desiredJob.keywords.includes(val)) {
                          setLocalProfile({ ...localProfile, desiredJob: { keywords: [...localProfile.desiredJob.keywords, val] } })
                        }
                        e.currentTarget.value = ''
                      }
                    }}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">3. 스킬 (최대 20개)</h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 rounded-md border border-input p-3 bg-accent/10">
                  {localProfile.skills.map((skill, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 border border-green-500/20">
                      {skill}
                      <button onClick={() => {
                        const newSkills = localProfile.skills.filter((_, idx) => idx !== i)
                        setLocalProfile({ ...localProfile, skills: newSkills })
                      }} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                  {localProfile.skills.length < 20 && (
                    <input 
                      type="text" 
                      placeholder="스킬 추가 (예: React, Python)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          const val = e.currentTarget.value
                          if (!localProfile.skills.includes(val)) {
                            setLocalProfile({ ...localProfile, skills: [...localProfile.skills, val] })
                          }
                          e.currentTarget.value = ''
                        }
                      }}
                      className="flex-1 min-w-[150px] bg-transparent outline-none text-sm"
                    />
                  )}
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{localProfile.skills.length}/20 선택됨</span>
                  <button 
                    onClick={() => setLocalProfile({ ...localProfile, skills: [] })}
                    className="text-destructive hover:underline"
                  >초기화</button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 4. 학력 / 5. 경력 */}
        {activeTab === 'edu_exp' && (
          <div className="space-y-12 pb-8">
            <ItemList
              title="4. 학력사항"
              items={localProfile.education}
              onAdd={() => {
                const newItem: EducationItem = {
                  id: uuidv4(),
                  type: 'university',
                  name: '',
                  startDate: '',
                  endDate: '',
                  status: '',
                  major: ''
                }
                setLocalProfile({ ...localProfile, education: [...localProfile.education, newItem] })
              }}
              onRemove={(id) => {
                setLocalProfile({ ...localProfile, education: localProfile.education.filter(i => i.id !== id) })
              }}
              renderItem={(item, index) => (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <div className="flex items-center gap-2 col-span-2 mb-2">
                    <input 
                      type="checkbox" 
                      checked={item.isUnderHighSchool}
                      onChange={(e) => {
                        const newEdu = [...localProfile.education]
                        newEdu[index] = { ...item, isUnderHighSchool: e.target.checked }
                        setLocalProfile({ ...localProfile, education: newEdu })
                      }}
                    />
                    <label className="text-xs">고등학교 미만 졸업 여부</label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">학교구분</label>
                    <select
                      value={item.type}
                      onChange={(e) => {
                        const newEdu = [...localProfile.education]
                        newEdu[index] = { ...item, type: e.target.value as any }
                        setLocalProfile({ ...localProfile, education: newEdu })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="university">대학교</option>
                      <option value="graduate">대학원</option>
                      <option value="highschool">고등학교</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">학교명 *</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const newEdu = [...localProfile.education]
                        newEdu[index] = { ...item, name: e.target.value }
                        setLocalProfile({ ...localProfile, education: newEdu })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">재학기간 *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.startDate}
                        onChange={(e) => {
                          const newEdu = [...localProfile.education]
                          newEdu[index] = { ...item, startDate: e.target.value }
                          setLocalProfile({ ...localProfile, education: newEdu })
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="입학년월"
                      />
                      <span>~</span>
                      <input
                        type="text"
                        value={item.endDate}
                        onChange={(e) => {
                          const newEdu = [...localProfile.education]
                          newEdu[index] = { ...item, endDate: e.target.value }
                          setLocalProfile({ ...localProfile, education: newEdu })
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="졸업년월"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">졸업상태</label>
                    <select
                      value={item.status}
                      onChange={(e) => {
                        const newEdu = [...localProfile.education]
                        newEdu[index] = { ...item, status: e.target.value as any }
                        setLocalProfile({ ...localProfile, education: newEdu })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">선택</option>
                      <option value="graduated">졸업</option>
                      <option value="expected">졸업예정</option>
                      <option value="attending">재학</option>
                      <option value="dropout">중퇴</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={item.isTransfer}
                      onChange={(e) => {
                        const newEdu = [...localProfile.education]
                        newEdu[index] = { ...item, isTransfer: e.target.checked }
                        setLocalProfile({ ...localProfile, education: newEdu })
                      }}
                    />
                    <label className="text-xs">편입 여부</label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">전공명 *</label>
                    <input
                      type="text"
                      value={item.major}
                      onChange={(e) => {
                        const newEdu = [...localProfile.education]
                        newEdu[index] = { ...item, major: e.target.value }
                        setLocalProfile({ ...localProfile, education: newEdu })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">학점</label>
                      <input
                        type="text"
                        value={item.gpa || ''}
                        onChange={(e) => {
                          const newEdu = [...localProfile.education]
                          newEdu[index] = { ...item, gpa: e.target.value }
                          setLocalProfile({ ...localProfile, education: newEdu })
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="4.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">총점</label>
                      <input
                        type="text"
                        value={item.gpaScale || ''}
                        onChange={(e) => {
                          const newEdu = [...localProfile.education]
                          newEdu[index] = { ...item, gpaScale: e.target.value }
                          setLocalProfile({ ...localProfile, education: newEdu })
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="4.5"
                      />
                    </div>
                  </div>
                </div>
              )}
            />

            <ItemList
              title="5. 경력사항"
              items={localProfile.experience}
              onAdd={() => {
                const newItem: ExperienceItem = {
                  id: uuidv4(),
                  companyName: '',
                  dept: '',
                  startDate: '',
                  endDate: '',
                  rank: '',
                  jobCategory: '',
                  description: '',
                  isPublic: { salary: true, description: true, companyName: true }
                }
                setLocalProfile({ ...localProfile, experience: [...localProfile.experience, newItem] })
              }}
              onRemove={(id) => {
                setLocalProfile({ ...localProfile, experience: localProfile.experience.filter(i => i.id !== id) })
              }}
              renderItem={(item, index) => (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">회사명 *</label>
                    <input
                      type="text"
                      value={item.companyName}
                      onChange={(e) => {
                        const newExp = [...localProfile.experience]
                        newExp[index] = { ...item, companyName: e.target.value }
                        setLocalProfile({ ...localProfile, experience: newExp })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">부서명</label>
                    <input
                      type="text"
                      value={item.dept}
                      onChange={(e) => {
                        const newExp = [...localProfile.experience]
                        newExp[index] = { ...item, dept: e.target.value }
                        setLocalProfile({ ...localProfile, experience: newExp })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">근무기간 *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.startDate}
                        onChange={(e) => {
                          const newExp = [...localProfile.experience]
                          newExp[index] = { ...item, startDate: e.target.value }
                          setLocalProfile({ ...localProfile, experience: newExp })
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="입사년월"
                      />
                      {!item.isCurrent && (
                        <>
                          <span>~</span>
                          <input
                            type="text"
                            value={item.endDate}
                            onChange={(e) => {
                              const newExp = [...localProfile.experience]
                              newExp[index] = { ...item, endDate: e.target.value }
                              setLocalProfile({ ...localProfile, experience: newExp })
                            }}
                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="퇴사년월"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={item.isCurrent}
                      onChange={(e) => {
                        const newExp = [...localProfile.experience]
                        newExp[index] = { ...item, isCurrent: e.target.checked }
                        setLocalProfile({ ...localProfile, experience: newExp })
                      }}
                    />
                    <label className="text-xs">재직중</label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">직급/직책</label>
                    <input
                      type="text"
                      value={item.rank}
                      onChange={(e) => {
                        const newExp = [...localProfile.experience]
                        newExp[index] = { ...item, rank: e.target.value }
                        setLocalProfile({ ...localProfile, experience: newExp })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">담당직무 *</label>
                    <input
                      type="text"
                      value={item.jobCategory}
                      onChange={(e) => {
                        const newExp = [...localProfile.experience]
                        newExp[index] = { ...item, jobCategory: e.target.value }
                        setLocalProfile({ ...localProfile, experience: newExp })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">연봉 (만원)</label>
                    <input
                      type="text"
                      value={item.salary || ''}
                      onChange={(e) => {
                        const newExp = [...localProfile.experience]
                        newExp[index] = { ...item, salary: e.target.value }
                        setLocalProfile({ ...localProfile, experience: newExp })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">담당업무 *</label>
                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        const newExp = [...localProfile.experience]
                        newExp[index] = { ...item, description: e.target.value }
                        setLocalProfile({ ...localProfile, experience: newExp })
                      }}
                      className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* 6. 인턴/대외활동 / 7. 교육 */}
        {activeTab === 'activities' && (
          <div className="space-y-12 pb-8">
            <ItemList
              title="6. 인턴·대외활동"
              items={localProfile.activities}
              onAdd={() => {
                const newItem: ActivityItem = {
                  id: uuidv4(),
                  type: '',
                  organization: '',
                  startDate: '',
                  endDate: '',
                  description: ''
                }
                setLocalProfile({ ...localProfile, activities: [...localProfile.activities, newItem] })
              }}
              onRemove={(id) => {
                setLocalProfile({ ...localProfile, activities: localProfile.activities.filter(i => i.id !== id) })
              }}
              renderItem={(item, index) => (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">활동구분</label>
                    <select
                      value={item.type}
                      onChange={(e) => {
                        const newAct = [...localProfile.activities]
                        newAct[index] = { ...item, type: e.target.value as any }
                        setLocalProfile({ ...localProfile, activities: newAct })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">선택</option>
                      <option value="campus">교내활동</option>
                      <option value="social">사회활동</option>
                      <option value="club">동아리</option>
                      <option value="etc">기타</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">회사/기관/단체명 *</label>
                    <input
                      type="text"
                      value={item.organization}
                      onChange={(e) => {
                        const newAct = [...localProfile.activities]
                        newAct[index] = { ...item, organization: e.target.value }
                        setLocalProfile({ ...localProfile, activities: newAct })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">활동기간</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.startDate}
                        onChange={(e) => {
                          const newAct = [...localProfile.activities]
                          newAct[index] = { ...item, startDate: e.target.value }
                          setLocalProfile({ ...localProfile, activities: newAct })
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="시작년월"
                      />
                      <span>~</span>
                      <input
                        type="text"
                        value={item.endDate}
                        onChange={(e) => {
                          const newAct = [...localProfile.activities]
                          newAct[index] = { ...item, endDate: e.target.value }
                          setLocalProfile({ ...localProfile, activities: newAct })
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="종료년월"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">활동내용</label>
                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        const newAct = [...localProfile.activities]
                        newAct[index] = { ...item, description: e.target.value }
                        setLocalProfile({ ...localProfile, activities: newAct })
                      }}
                      className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            />

            <ItemList
              title="7. 교육사항"
              items={localProfile.training}
              onAdd={() => {
                const newItem: TrainingItem = {
                  id: uuidv4(),
                  name: '',
                  organization: '',
                  startDate: '',
                  endDate: '',
                  description: ''
                }
                setLocalProfile({ ...localProfile, training: [...localProfile.training, newItem] })
              }}
              onRemove={(id) => {
                setLocalProfile({ ...localProfile, training: localProfile.training.filter(i => i.id !== id) })
              }}
              renderItem={(item, index) => (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">교육명 *</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const newTr = [...localProfile.training]
                        newTr[index] = { ...item, name: e.target.value }
                        setLocalProfile({ ...localProfile, training: newTr })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">교육기관</label>
                    <input
                      type="text"
                      value={item.organization}
                      onChange={(e) => {
                        const newTr = [...localProfile.training]
                        newTr[index] = { ...item, organization: e.target.value }
                        setLocalProfile({ ...localProfile, training: newTr })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">교육기간</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.startDate}
                        onChange={(e) => {
                          const newTr = [...localProfile.training]
                          newTr[index] = { ...item, startDate: e.target.value }
                          setLocalProfile({ ...localProfile, training: newTr })
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="시작년월"
                      />
                      <span>~</span>
                      <input
                        type="text"
                        value={item.endDate}
                        onChange={(e) => {
                          const newTr = [...localProfile.training]
                          newTr[index] = { ...item, endDate: e.target.value }
                          setLocalProfile({ ...localProfile, training: newTr })
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="종료년월"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">내용</label>
                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        const newTr = [...localProfile.training]
                        newTr[index] = { ...item, description: e.target.value }
                        setLocalProfile({ ...localProfile, training: newTr })
                      }}
                      className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* 8. 자격증 / 9. 수상/해외경험 / 10. 어학 */}
        {activeTab === 'skills_lang' && (
          <div className="space-y-12 pb-8">
            <ItemList
              title="8. 자격증"
              items={localProfile.certificates}
              onAdd={() => {
                const newItem: CertificateItem = { id: uuidv4(), name: '', issuer: '', date: '' }
                setLocalProfile({ ...localProfile, certificates: [...localProfile.certificates, newItem] })
              }}
              onRemove={(id) => {
                setLocalProfile({ ...localProfile, certificates: localProfile.certificates.filter(i => i.id !== id) })
              }}
              renderItem={(item, index) => (
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">자격증 명 *</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const newCert = [...localProfile.certificates]
                        newCert[index] = { ...item, name: e.target.value }
                        setLocalProfile({ ...localProfile, certificates: newCert })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">발행처</label>
                    <input
                      type="text"
                      value={item.issuer}
                      onChange={(e) => {
                        const newCert = [...localProfile.certificates]
                        newCert[index] = { ...item, issuer: e.target.value }
                        setLocalProfile({ ...localProfile, certificates: newCert })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">취득월</label>
                    <input
                      type="text"
                      value={item.date}
                      onChange={(e) => {
                        const newCert = [...localProfile.certificates]
                        newCert[index] = { ...item, date: e.target.value }
                        setLocalProfile({ ...localProfile, certificates: newCert })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="YYYY.MM"
                    />
                  </div>
                </div>
              )}
            />

            <div className="grid grid-cols-2 gap-8">
              <ItemList
                title="9-1. 수상"
                items={localProfile.awards}
                onAdd={() => {
                  const newItem: AwardItem = { id: uuidv4(), name: '', issuer: '', date: '', description: '' }
                  setLocalProfile({ ...localProfile, awards: [...localProfile.awards, newItem] })
                }}
                onRemove={(id) => {
                  setLocalProfile({ ...localProfile, awards: localProfile.awards.filter(i => i.id !== id) })
                }}
                renderItem={(item, index) => (
                  <div className="space-y-2 p-4 border rounded-md mb-4 bg-accent/30">
                    <input
                      type="text"
                      value={item.name}
                      placeholder="수상명 *"
                      onChange={(e) => {
                        const newAwards = [...localProfile.awards]
                        newAwards[index] = { ...item, name: e.target.value }
                        setLocalProfile({ ...localProfile, awards: newAwards })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.issuer}
                        placeholder="수여기관"
                        onChange={(e) => {
                          const newAwards = [...localProfile.awards]
                          newAwards[index] = { ...item, issuer: e.target.value }
                          setLocalProfile({ ...localProfile, awards: newAwards })
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={item.date}
                        placeholder="수상연도"
                        onChange={(e) => {
                          const newAwards = [...localProfile.awards]
                          newAwards[index] = { ...item, date: e.target.value }
                          setLocalProfile({ ...localProfile, awards: newAwards })
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <textarea
                      value={item.description}
                      placeholder="수여내용"
                      onChange={(e) => {
                        const newAwards = [...localProfile.awards]
                        newAwards[index] = { ...item, description: e.target.value }
                        setLocalProfile({ ...localProfile, awards: newAwards })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs h-20"
                    />
                  </div>
                )}
              />
              <ItemList
                title="9-2. 해외경험"
                items={localProfile.overseas}
                onAdd={() => {
                  const newItem: OverseasItem = { id: uuidv4(), country: '', startDate: '', endDate: '', description: '' }
                  setLocalProfile({ ...localProfile, overseas: [...localProfile.overseas, newItem] })
                }}
                onRemove={(id) => {
                  setLocalProfile({ ...localProfile, overseas: localProfile.overseas.filter(i => i.id !== id) })
                }}
                renderItem={(item, index) => (
                  <div className="space-y-2 p-4 border rounded-md mb-4 bg-accent/30">
                    <input
                      type="text"
                      value={item.country}
                      placeholder="국가명 *"
                      onChange={(e) => {
                        const newOverseas = [...localProfile.overseas]
                        newOverseas[index] = { ...item, country: e.target.value }
                        setLocalProfile({ ...localProfile, overseas: newOverseas })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.startDate}
                        placeholder="시작년월"
                        onChange={(e) => {
                          const newOverseas = [...localProfile.overseas]
                          newOverseas[index] = { ...item, startDate: e.target.value }
                          setLocalProfile({ ...localProfile, overseas: newOverseas })
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={item.endDate}
                        placeholder="종료년월"
                        onChange={(e) => {
                          const newOverseas = [...localProfile.overseas]
                          newOverseas[index] = { ...item, endDate: e.target.value }
                          setLocalProfile({ ...localProfile, overseas: newOverseas })
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <textarea
                      value={item.description}
                      placeholder="내용"
                      onChange={(e) => {
                        const newOverseas = [...localProfile.overseas]
                        newOverseas[index] = { ...item, description: e.target.value }
                        setLocalProfile({ ...localProfile, overseas: newOverseas })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs h-20"
                    />
                  </div>
                )}
              />
            </div>

            <ItemList
              title="10. 어학사항"
              items={localProfile.languages}
              onAdd={() => {
                const newItem: LanguageItem = { id: uuidv4(), category: '', language: '', testName: '', grade: '', date: '' }
                setLocalProfile({ ...localProfile, languages: [...localProfile.languages, newItem] })
              }}
              onRemove={(id) => {
                setLocalProfile({ ...localProfile, languages: localProfile.languages.filter(i => i.id !== id) })
              }}
              renderItem={(item, index) => (
                <div className="grid grid-cols-5 gap-2 p-4 border rounded-md mb-4 bg-accent/30">
                  <input
                    type="text"
                    placeholder="구분"
                    value={item.category}
                    onChange={(e) => {
                      const newL = [...localProfile.languages]
                      newL[index] = { ...item, category: e.target.value }
                      setLocalProfile({ ...localProfile, languages: newL })
                    }}
                    className="rounded-md border border-input bg-background px-2 py-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="외국어명"
                    value={item.language}
                    onChange={(e) => {
                      const newL = [...localProfile.languages]
                      newL[index] = { ...item, language: e.target.value }
                      setLocalProfile({ ...localProfile, languages: newL })
                    }}
                    className="rounded-md border border-input bg-background px-2 py-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="공인시험"
                    value={item.testName}
                    onChange={(e) => {
                      const newL = [...localProfile.languages]
                      newL[index] = { ...item, testName: e.target.value }
                      setLocalProfile({ ...localProfile, languages: newL })
                    }}
                    className="rounded-md border border-input bg-background px-2 py-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="급수/점수"
                    value={item.grade}
                    onChange={(e) => {
                      const newL = [...localProfile.languages]
                      newL[index] = { ...item, grade: e.target.value }
                      setLocalProfile({ ...localProfile, languages: newL })
                    }}
                    className="rounded-md border border-input bg-background px-2 py-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="취득년월"
                    value={item.date}
                    onChange={(e) => {
                      const newL = [...localProfile.languages]
                      newL[index] = { ...item, date: e.target.value }
                      setLocalProfile({ ...localProfile, languages: newL })
                    }}
                    className="rounded-md border border-input bg-background px-2 py-2 text-xs"
                  />
                </div>
              )}
            />
          </div>
        )}

        {/* 11. 포트폴리오 / 12. 우대/병역 */}
        {activeTab === 'etc' && (
          <div className="space-y-12 pb-8">
            <ItemList
              title="11. 포트폴리오"
              items={localProfile.portfolio}
              onAdd={() => {
                const newItem: PortfolioItem = { id: uuidv4(), type: '', label: '', path: '' }
                setLocalProfile({ ...localProfile, portfolio: [...localProfile.portfolio, newItem] })
              }}
              onRemove={(id) => {
                setLocalProfile({ ...localProfile, portfolio: localProfile.portfolio.filter(i => i.id !== id) })
              }}
              renderItem={(item, index) => (
                <div className="grid grid-cols-4 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <select
                    value={item.type}
                    onChange={(e) => {
                      const newP = [...localProfile.portfolio]
                      newP[index] = { ...item, type: e.target.value as any }
                      setLocalProfile({ ...localProfile, portfolio: newP })
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">유형 선택</option>
                    <option value="url">URL 추가</option>
                    <option value="pc">내 PC 파일</option>
                    <option value="cloud">내 파일함</option>
                  </select>
                  <input
                    type="text"
                    placeholder="라벨 (예: 기타)"
                    value={item.label}
                    onChange={(e) => {
                      const newP = [...localProfile.portfolio]
                      newP[index] = { ...item, label: e.target.value }
                      setLocalProfile({ ...localProfile, portfolio: newP })
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="링크/파일 경로"
                    value={item.path}
                    onChange={(e) => {
                      const newP = [...localProfile.portfolio]
                      newP[index] = { ...item, path: e.target.value }
                      setLocalProfile({ ...localProfile, portfolio: newP })
                    }}
                    className="col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}
            />

            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">12. 취업우대·병역</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 rounded-md border p-4 bg-accent/10">
                  <div className="flex items-center justify-between p-2 border-b">
                    <span className="text-sm">보훈 대상</span>
                    <input type="checkbox" checked={localProfile.preferences.isVeteran} onChange={(e) => updatePreferences({ isVeteran: e.target.checked })} />
                  </div>
                  <div className="flex items-center justify-between p-2 border-b">
                    <span className="text-sm">취업보호 대상</span>
                    <input type="checkbox" checked={localProfile.preferences.isProtection} onChange={(e) => updatePreferences({ isProtection: e.target.checked })} />
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm">고용지원금 대상</span>
                    <input type="checkbox" checked={localProfile.preferences.isSubsidy} onChange={(e) => updatePreferences({ isSubsidy: e.target.checked })} />
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm">장애 여부</span>
                    <input type="checkbox" checked={localProfile.preferences.isDisabled} onChange={(e) => updatePreferences({ isDisabled: e.target.checked })} />
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-md">
                  <h4 className="text-sm font-semibold">병역 사항</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">병역 상태</label>
                      <select
                        value={localProfile.preferences.military.status}
                        onChange={(e) => updateMilitary({ status: e.target.value as any })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">선택</option>
                        <option value="fulfilled">군필</option>
                        <option value="exempted">면제</option>
                        <option value="serving">복무중</option>
                        <option value="not_applicable">비대상</option>
                      </select>
                    </div>
                    {localProfile.preferences.military.status === 'fulfilled' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">군별/계급</label>
                          <div className="flex gap-2">
                            <input type="text" placeholder="군별" value={localProfile.preferences.military.branch || ''} onChange={(e) => updateMilitary({ branch: e.target.value })} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            <input type="text" placeholder="계급" value={localProfile.preferences.military.rank || ''} onChange={(e) => updateMilitary({ rank: e.target.value })} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">복무 기간</label>
                          <div className="flex items-center gap-2">
                            <input type="text" placeholder="입대일" value={localProfile.preferences.military.startDate || ''} onChange={(e) => updateMilitary({ startDate: e.target.value })} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            <span>~</span>
                            <input type="text" placeholder="제대일" value={localProfile.preferences.military.endDate || ''} onChange={(e) => updateMilitary({ endDate: e.target.value })} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
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
        <button
          onClick={onAdd}
          className="text-sm font-medium text-primary hover:underline bg-primary/10 px-3 py-1 rounded-full"
        >
          + 추가하기
        </button>
      </div>
      {items.length === 0 ? (
        <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-accent/10 text-muted-foreground text-sm">
          등록된 정보가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="group relative">
              {renderItem(item, index)}
              <button
                onClick={() => onRemove(item.id)}
                className="absolute right-[-12px] top-[-12px] rounded-full bg-destructive p-1.5 text-destructive-foreground opacity-0 shadow-lg transition-opacity hover:scale-110 group-hover:opacity-100 z-10"
                title="삭제"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
