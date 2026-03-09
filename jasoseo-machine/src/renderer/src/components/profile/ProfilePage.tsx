import { useState, useEffect } from 'react'
import { useProfileStore } from '../../stores/profileStore'
import { UserProfile, EducationItem, ExperienceItem, LanguageItem, CertificateItem, ActivityItem } from '../../types/profile'
import { cn } from '@/lib/utils'

export function ProfilePage() {
  const { profile, loadProfile, saveProfile, isLoaded } = useProfileStore()
  const [activeTab, setActiveTab] = useState('personal')
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

  if (!localProfile) return <div className="p-8">로딩 중...</div>

  const handleSave = async () => {
    setIsSaving(true)
    await saveProfile(localProfile)
    setIsSaving(false)
  }

  const updatePersonal = (updates: Partial<UserProfile['personal']>) => {
    setLocalProfile({
      ...localProfile,
      personal: { ...localProfile.personal, ...updates }
    })
  }

  const updateMilitary = (updates: Partial<UserProfile['military']>) => {
    setLocalProfile({
      ...localProfile,
      military: { ...localProfile.military, ...updates }
    })
  }

  const tabs = [
    { id: 'personal', label: '인적사항/병역' },
    { id: 'education', label: '학력' },
    { id: 'experience', label: '경력' },
    { id: 'skills', label: '어학/자격증' },
    { id: 'activities', label: '기타활동' }
  ]

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">내 프로필</h2>
          <p className="text-muted-foreground">자소서 생성 및 지원서 자동 입력에 사용될 기본 정보를 관리합니다.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '전체 저장'}
        </button>
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
        {activeTab === 'personal' && (
          <div className="space-y-8">
            <section>
              <h3 className="mb-4 text-lg font-semibold">인적사항</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">이름</label>
                  <input
                    type="text"
                    value={localProfile.personal.name}
                    onChange={(e) => updatePersonal({ name: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">생년월일</label>
                  <input
                    type="text"
                    value={localProfile.personal.birthDate}
                    onChange={(e) => updatePersonal({ birthDate: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">전화번호</label>
                  <input
                    type="text"
                    value={localProfile.personal.phone}
                    onChange={(e) => updatePersonal({ phone: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="010-0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">이메일</label>
                  <input
                    type="email"
                    value={localProfile.personal.email}
                    onChange={(e) => updatePersonal({ email: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="example@email.com"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">주소</label>
                  <input
                    type="text"
                    value={localProfile.personal.address}
                    onChange={(e) => updatePersonal({ address: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="서울시 강남구..."
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-lg font-semibold">병역사항</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">구분</label>
                  <select
                    value={localProfile.military.status}
                    onChange={(e) => updateMilitary({ status: e.target.value as any })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="fulfilled">군필</option>
                    <option value="exempted">면제</option>
                    <option value="serving">복무중</option>
                    <option value="not_applicable">비대상</option>
                  </select>
                </div>
                {localProfile.military.status === 'fulfilled' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">군별</label>
                      <input
                        type="text"
                        value={localProfile.military.branch || ''}
                        onChange={(e) => updateMilitary({ branch: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="육군"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">계급</label>
                      <input
                        type="text"
                        value={localProfile.military.rank || ''}
                        onChange={(e) => updateMilitary({ rank: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="병장"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">복무기간</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={localProfile.military.startDate || ''}
                          onChange={(e) => updateMilitary({ startDate: e.target.value })}
                          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="YYYY-MM"
                        />
                        <span>~</span>
                        <input
                          type="text"
                          value={localProfile.military.endDate || ''}
                          onChange={(e) => updateMilitary({ endDate: e.target.value })}
                          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="YYYY-MM"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'education' && (
          <ItemList
            title="학력사항"
            items={localProfile.education}
            onAdd={() => {
              const newItem: EducationItem = {
                id: crypto.randomUUID(),
                type: 'university',
                name: '',
                startDate: '',
                endDate: ''
              }
              setLocalProfile({ ...localProfile, education: [...localProfile.education, newItem] })
            }}
            onRemove={(id) => {
              setLocalProfile({ ...localProfile, education: localProfile.education.filter(i => i.id !== id) })
            }}
            renderItem={(item, index) => (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                <div className="space-y-2">
                  <label className="text-sm font-medium">구분</label>
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
                  <label className="text-sm font-medium">학교명</label>
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
                {item.type !== 'highschool' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">전공</label>
                    <input
                      type="text"
                      value={item.major || ''}
                      onChange={(e) => {
                        const newEdu = [...localProfile.education]
                        newEdu[index] = { ...item, major: e.target.value }
                        setLocalProfile({ ...localProfile, education: newEdu })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">재학기간</label>
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
                      placeholder="YYYY-MM"
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
                      placeholder="YYYY-MM (혹은 졸업예정)"
                    />
                  </div>
                </div>
                {item.type !== 'highschool' && (
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
                      <label className="text-sm font-medium">기준학점</label>
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
                )}
              </div>
            )}
          />
        )}

        {activeTab === 'experience' && (
          <ItemList
            title="경력사항"
            items={localProfile.experience}
            onAdd={() => {
              const newItem: ExperienceItem = {
                id: crypto.randomUUID(),
                companyName: '',
                role: '',
                period: '',
                description: ''
              }
              setLocalProfile({ ...localProfile, experience: [...localProfile.experience, newItem] })
            }}
            onRemove={(id) => {
              setLocalProfile({ ...localProfile, experience: localProfile.experience.filter(i => i.id !== id) })
            }}
            renderItem={(item, index) => (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                <div className="space-y-2">
                  <label className="text-sm font-medium">회사명</label>
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
                  <label className="text-sm font-medium">직무/직위</label>
                  <input
                    type="text"
                    value={item.role}
                    onChange={(e) => {
                      const newExp = [...localProfile.experience]
                      newExp[index] = { ...item, role: e.target.value }
                      setLocalProfile({ ...localProfile, experience: newExp })
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">근무기간</label>
                  <input
                    type="text"
                    value={item.period}
                    onChange={(e) => {
                      const newExp = [...localProfile.experience]
                      newExp[index] = { ...item, period: e.target.value }
                      setLocalProfile({ ...localProfile, experience: newExp })
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="2023.01 ~ 2023.12"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">주요 업무 및 성과</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => {
                      const newExp = [...localProfile.experience]
                      newExp[index] = { ...item, description: e.target.value }
                      setLocalProfile({ ...localProfile, experience: newExp })
                    }}
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="- OOO 프로젝트 진행&#10;- 기술 스택: React, TypeScript&#10;- 성과: 빌드 속도 30% 개선"
                  />
                </div>
              </div>
            )}
          />
        )}

        {activeTab === 'skills' && (
          <div className="space-y-8">
            <ItemList
              title="어학성적"
              items={localProfile.languages}
              onAdd={() => {
                const newItem: LanguageItem = {
                  id: crypto.randomUUID(),
                  test: '',
                  score: '',
                  date: ''
                }
                setLocalProfile({ ...localProfile, languages: [...localProfile.languages, newItem] })
              }}
              onRemove={(id) => {
                setLocalProfile({ ...localProfile, languages: localProfile.languages.filter(i => i.id !== id) })
              }}
              renderItem={(item, index) => (
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">시험명</label>
                    <input
                      type="text"
                      value={item.test}
                      onChange={(e) => {
                        const newLang = [...localProfile.languages]
                        newLang[index] = { ...item, test: e.target.value }
                        setLocalProfile({ ...localProfile, languages: newLang })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="TOEIC"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">점수/급수</label>
                    <input
                      type="text"
                      value={item.score}
                      onChange={(e) => {
                        const newLang = [...localProfile.languages]
                        newLang[index] = { ...item, score: e.target.value }
                        setLocalProfile({ ...localProfile, languages: newLang })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">취득일</label>
                    <input
                      type="text"
                      value={item.date}
                      onChange={(e) => {
                        const newLang = [...localProfile.languages]
                        newLang[index] = { ...item, date: e.target.value }
                        setLocalProfile({ ...localProfile, languages: newLang })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>
              )}
            />

            <ItemList
              title="자격증"
              items={localProfile.certificates}
              onAdd={() => {
                const newItem: CertificateItem = {
                  id: crypto.randomUUID(),
                  name: '',
                  date: '',
                  issuer: ''
                }
                setLocalProfile({ ...localProfile, certificates: [...localProfile.certificates, newItem] })
              }}
              onRemove={(id) => {
                setLocalProfile({ ...localProfile, certificates: localProfile.certificates.filter(i => i.id !== id) })
              }}
              renderItem={(item, index) => (
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-md mb-4 bg-accent/30">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">자격증명</label>
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
                    <label className="text-sm font-medium">발급기관</label>
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
                    <label className="text-sm font-medium">취득일</label>
                    <input
                      type="text"
                      value={item.date}
                      onChange={(e) => {
                        const newCert = [...localProfile.certificates]
                        newCert[index] = { ...item, date: e.target.value }
                        setLocalProfile({ ...localProfile, certificates: newCert })
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {activeTab === 'activities' && (
          <ItemList
            title="기타활동 (대외활동/동아리/수상 등)"
            items={localProfile.activities}
            onAdd={() => {
              const newItem: ActivityItem = {
                id: crypto.randomUUID(),
                name: '',
                role: '',
                period: '',
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
                  <label className="text-sm font-medium">활동명</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const newAct = [...localProfile.activities]
                      newAct[index] = { ...item, name: e.target.value }
                      setLocalProfile({ ...localProfile, activities: newAct })
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">역할</label>
                  <input
                    type="text"
                    value={item.role}
                    onChange={(e) => {
                      const newAct = [...localProfile.activities]
                      newAct[index] = { ...item, role: e.target.value }
                      setLocalProfile({ ...localProfile, activities: newAct })
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">활동기간</label>
                  <input
                    type="text"
                    value={item.period}
                    onChange={(e) => {
                      const newAct = [...localProfile.activities]
                      newAct[index] = { ...item, period: e.target.value }
                      setLocalProfile({ ...localProfile, activities: newAct })
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="2023.01 ~ 2023.12"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">활동 내용</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => {
                      const newAct = [...localProfile.activities]
                      newAct[index] = { ...item, description: e.target.value }
                      setLocalProfile({ ...localProfile, activities: newAct })
                    }}
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          />
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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={onAdd}
          className="text-sm font-medium text-primary hover:underline"
        >
          + 추가하기
        </button>
      </div>
      {items.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border bg-accent/10 text-muted-foreground">
          등록된 정보가 없습니다.
        </div>
      ) : (
        items.map((item, index) => (
          <div key={item.id} className="group relative">
            {renderItem(item, index)}
            <button
              onClick={() => onRemove(item.id)}
              className="absolute right-2 top-2 rounded-md bg-destructive/10 p-1.5 text-destructive opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
              title="삭제"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        ))
      )}
    </section>
  )
}
