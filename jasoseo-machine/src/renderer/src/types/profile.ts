export interface UserProfile {
  personal: PersonalInfo
  military: MilitaryInfo
  education: EducationItem[]
  experience: ExperienceItem[]
  languages: LanguageItem[]
  certificates: CertificateItem[]
  activities: ActivityItem[]
}

export interface PersonalInfo {
  name: string
  birthDate: string
  phone: string
  email: string
  address: string
}

export interface MilitaryInfo {
  status: 'fulfilled' | 'exempted' | 'serving' | 'not_applicable'
  branch?: string
  rank?: string
  startDate?: string
  endDate?: string
}

export interface EducationItem {
  id: string
  type: 'highschool' | 'university' | 'graduate'
  name: string
  major?: string
  startDate: string
  endDate: string
  gpa?: string
  gpaScale?: string
}

export interface ExperienceItem {
  id: string
  companyName: string
  role: string
  period: string
  description: string
}

export interface LanguageItem {
  id: string
  test: string
  score: string
  date: string
}

export interface CertificateItem {
  id: string
  name: string
  date: string
  issuer: string
}

export interface ActivityItem {
  id: string
  name: string
  role: string
  period: string
  description: string
}

export const DEFAULT_PROFILE: UserProfile = {
  personal: {
    name: '',
    birthDate: '',
    phone: '',
    email: '',
    address: ''
  },
  military: {
    status: 'not_applicable'
  },
  education: [],
  experience: [],
  languages: [],
  certificates: [],
  activities: []
}
