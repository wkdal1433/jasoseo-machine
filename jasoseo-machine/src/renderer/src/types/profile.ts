export interface UserProfile {
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
  preferences: PreferenceInfo
}

export interface PersonalInfo {
  name: string
  birthDate: string // YYYY.MM.DD
  gender: 'male' | 'female' | ''
  email: string
  phone: string // 집전화
  mobile: string // 휴대폰
  address: string
  photoPath?: string // 사진 파일 경로
}

export interface DesiredJobInfo {
  keywords: string[] // 태그형 키워드
}

export interface EducationItem {
  id: string
  isUnderHighSchool?: boolean // 고교 미만 졸업 여부
  type: 'highschool' | 'university' | 'graduate'
  name: string
  startDate: string
  endDate: string
  status: 'graduated' | 'expected' | 'attending' | 'dropout' | ''
  isTransfer?: boolean // 편입 여부
  major: string
  gpa?: string
  gpaScale?: string
  hasOtherMajor?: boolean // 다른 전공 여부
  thesis?: string // 논문/작품
}

export interface ExperienceItem {
  id: string
  companyName: string
  dept: string
  startDate: string
  endDate: string
  isCurrent?: boolean // 재직중 여부
  rank: string
  jobCategory: string // 담당직무
  salary?: string // 연봉 (만원 단위)
  description: string // 담당업무
  isPublic: {
    salary: boolean
    description: boolean
    companyName: boolean
  }
  careerStatementUrl?: string // 경력기술서 링크
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
  category: string // 구분 (영어, 일어 등)
  language: string // 외국어명
  testName: string // 공인시험
  grade: string // 급수/점수
  date: string
}

export interface PortfolioItem {
  id: string
  type: 'url' | 'pc' | 'cloud' | ''
  label: string // 유형 라벨 (예: 기타)
  path: string // 링크 혹은 파일 경로
}

export interface PreferenceInfo {
  isVeteran: boolean // 보훈
  isProtection: boolean // 취업보호
  isSubsidy: boolean // 고용지원금
  isDisabled: boolean // 장애
  military: MilitaryInfo
}

export interface MilitaryInfo {
  status: 'fulfilled' | 'exempted' | 'serving' | 'not_applicable' | ''
  branch?: string
  rank?: string
  startDate?: string
  endDate?: string
}

export const DEFAULT_PROFILE: UserProfile = {
  personal: {
    name: '',
    birthDate: '',
    gender: '',
    email: '',
    phone: '',
    mobile: '',
    address: ''
  },
  desiredJob: {
    keywords: []
  },
  skills: [],
  education: [],
  experience: [],
  activities: [],
  training: [],
  certificates: [],
  awards: [],
  overseas: [],
  languages: [],
  portfolio: [],
  preferences: {
    isVeteran: false,
    isProtection: false,
    isSubsidy: false,
    isDisabled: false,
    military: {
      status: ''
    }
  }
}
