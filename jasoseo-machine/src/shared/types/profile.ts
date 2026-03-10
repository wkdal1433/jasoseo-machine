export interface PersonalInfo {
  name: string
  birthDate: string
  gender: 'male' | 'female' | ''
  email: string
  phone: string
  mobile: string
  address: string
}

export interface DesiredJobInfo {
  keywords: string[]
}

export interface EducationItem {
  id: string
  type: 'university' | 'graduate' | 'highschool' | ''
  name: string
  startDate: string
  endDate: string
  status: 'graduated' | 'expected' | 'attending' | 'dropout' | ''
  major: string
  isTransfer?: boolean
  isUnderHighSchool?: boolean
  gpa?: string
  gpaScale?: string
}

export interface ExperienceItem {
  id: string
  companyName: string
  dept: string
  startDate: string
  endDate: string
  isCurrent?: boolean
  rank: string
  jobCategory: string
  description: string
  salary?: string
  isPublic: {
    salary: boolean
    description: boolean
    companyName: boolean
  }
}

export interface ActivityItem {
  id: string
  type: 'campus' | 'social' | 'club' | 'etc' | ''
  organization: string
  startDate: string
  endDate: string
  description: string
}

export interface TrainingItem {
  id: string
  name: string
  organization: string
  startDate: string
  endDate: string
  description: string
}

export interface CertificateItem {
  id: string
  name: string
  issuer: string
  date: string
}

export interface AwardItem {
  id: string
  name: string
  issuer: string
  date: string
  description: string
}

export interface OverseasItem {
  id: string
  country: string
  startDate: string
  endDate: string
  description: string
}

export interface LanguageItem {
  id: string
  category: string
  language: string
  testName: string
  grade: string
  date: string
}

export interface PortfolioItem {
  id: string
  type: 'url' | 'pc' | 'cloud' | ''
  label: string
  path: string
}

export interface UserProfile {
  id?: string
  personal: PersonalInfo
  desiredJob: DesiredJobInfo
  skills: string[]
  education: EducationItem[]
  experience: ExperienceItem[]
  activities: ActivityItem[]
  training: TrainingItem[]
  certificates: CertificateItem[]
  awards: AwardItem[]
  overseas: OverseasItem[]
  languages: LanguageItem[]
  portfolio: PortfolioItem[]
  preferences: {
    isVeteran: boolean
    isProtection: boolean
    isSubsidy: boolean
    isDisabled: boolean
    military: {
      status: 'fulfilled' | 'exempted' | 'serving' | 'not_applicable' | ''
      branch?: string
      rank?: string
      startDate?: string
      endDate?: string
    }
  }
}
