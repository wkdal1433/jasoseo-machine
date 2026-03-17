export interface UserProfile {
  personal: PersonalInfo
  desiredJob: DesiredJobInfo
  skills: string[]
  education: EducationItem[]
  experience: ExperienceItem[]
  projects: ProjectItem[]
  activities: ActivityItem[]
  training: TrainingItem[]
  certificates: CertificateItem[]
  awards: AwardItem[]
  overseas: OverseasItem[]
  languages: LanguageItem[]
  computerSkills: ComputerSkillItem[]
  portfolio: PortfolioItem[]
  preferences: PreferenceInfo
}

export interface PersonalInfo {
  name: string
  nameEn?: string      // 영문명 (여권 기준, e.g. KIM GILDONG)
  nameHanja?: string   // 한자명
  birthDate: string    // YYYY-MM-DD
  gender: 'male' | 'female' | ''
  email: string
  phone: string        // 집전화
  mobile: string       // 휴대폰
  address: string
  postalCode?: string  // 우편번호
  nationality?: string // 국적 (default: 대한민국)
  photoPath?: string   // 사진 파일 경로
}

export interface DesiredJobInfo {
  keywords: string[]   // 희망직종 태그
  regions?: string[]   // 희망지역
  salary?: string      // 희망연봉 (만원)
  employmentTypes?: string[] // 고용형태 (정규직/계약직 등)
}

export interface EducationItem {
  id: string
  isUnderHighSchool?: boolean
  type: 'highschool' | 'university' | 'graduate'
  name: string
  startDate: string
  endDate: string
  status: 'graduated' | 'expected' | 'attending' | 'dropout' | ''
  isTransfer?: boolean
  major: string
  otherMajor?: string  // 복수전공/부전공명
  gpa?: string
  gpaScale?: string
  hasOtherMajor?: boolean
  thesis?: string
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
  employmentType?: string
  resignReason?: string
  salary?: string
  description: string
  isPublic: {
    salary: boolean
    description: boolean
    companyName: boolean
  }
  careerStatementUrl?: string
}

export interface ProjectItem {
  id: string
  name: string
  client: string       // 발주처/고객사
  startDate: string
  endDate: string
  isCurrent?: boolean
  participation?: string // 참여도 (%)
  role: string           // 담당역할
  description: string
}

export interface ActivityItem {
  id: string
  type: 'campus' | 'social' | 'club' | 'etc' | ''
  organization: string
  role?: string        // 직책/역할
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
  number?: string
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
  type?: string        // 방문목적: 어학연수/취업/여행/기타
  startDate: string
  endDate: string
  description: string
}

export interface LanguageItem {
  id: string
  category: string
  language: string
  testName: string
  grade: string        // 점수/급수
  level?: string       // 능숙도: 상/중/하
  date: string
}

export interface ComputerSkillItem {
  id: string
  program: string
  level: string        // 상/중/하
  period?: string      // 활용기간
}

export interface PortfolioItem {
  id: string
  type: 'url' | 'pc' | 'cloud' | ''
  label: string
  path: string
}

export interface PreferenceInfo {
  isVeteran: boolean
  veteranType?: string      // 보훈 구분
  isProtection: boolean
  isSubsidy: boolean
  isDisabled: boolean
  disabledGrade?: string    // 장애 등급
  hasDriverLicense?: boolean
  driverLicenseType?: string // 1종 보통/2종 보통 등
  isVulnerable?: boolean    // 취약계층
  vulnerableClass?: string  // 취약계층 구분
  applicationChannel?: string // 지원경로
  military: MilitaryInfo
}

export interface MilitaryInfo {
  status: 'fulfilled' | 'exempted' | 'serving' | 'not_applicable' | ''
  branch?: string
  rank?: string
  startDate?: string
  endDate?: string
  exemptReason?: string  // 면제사유
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
    keywords: [],
    regions: [],
    employmentTypes: []
  },
  skills: [],
  education: [],
  experience: [],
  projects: [],
  activities: [],
  training: [],
  certificates: [],
  awards: [],
  overseas: [],
  languages: [],
  computerSkills: [],
  portfolio: [],
  preferences: {
    isVeteran: false,
    isProtection: false,
    isSubsidy: false,
    isDisabled: false,
    hasDriverLicense: false,
    military: {
      status: ''
    }
  }
}
