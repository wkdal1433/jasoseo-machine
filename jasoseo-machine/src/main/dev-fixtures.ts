/**
 * 개발/테스트용 픽스처 데이터
 * 실제 AI 호출 없이 UX 플로우를 빠르게 검증할 수 있습니다.
 */

export const FIXTURE_PROFILE = {
  id: 'fixture-profile',
  personal: {
    name: '김테스트',
    nameEn: 'KIM TEST',           // 영문명 (여권 기준)
    nameHanja: '金테스트',          // 한자명
    birthDate: '1998-05-15',
    gender: 'male' as const,
    email: 'test@example.com',
    mobile: '010-1234-5678',
    phone: '02-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    postalCode: '06234',
    nationality: '대한민국',
  },
  education: [
    {
      id: 'edu-1',
      type: 'highschool' as const,
      name: '서울고등학교',
      major: '',
      startDate: '2014-03',
      endDate: '2017-02',
      status: 'graduated' as const,
      gpa: '',
      gpaScale: ''
    },
    {
      id: 'edu-2',
      type: 'university' as const,
      name: '한국대학교',
      major: '컴퓨터공학과',
      startDate: '2017-03',
      endDate: '2023-02',
      status: 'graduated' as const,
      gpa: '3.8',
      gpaScale: '4.5'
    }
  ],
  experience: [
    {
      id: 'exp-1',
      companyName: '테크스타트업',
      dept: '개발팀',
      rank: '인턴',
      jobCategory: '백엔드 개발',
      employmentType: '인턴',
      startDate: '2022-07',
      endDate: '2022-12',
      isCurrent: false,
      description: '사용자 인증 API 설계 및 구현, MySQL 쿼리 최적화로 응답시간 40% 단축',
      resignReason: '인턴십 계약 만료',
      salary: '',
      isPublic: { salary: false, description: true, companyName: true }
    },
    {
      id: 'exp-2',
      companyName: '핀테크코리아',
      dept: '플랫폼개발팀',
      rank: '사원',
      jobCategory: '백엔드 개발',
      employmentType: '정규직',
      startDate: '2023-09',
      endDate: '2024-08',
      isCurrent: false,
      description: '결제 API 신규 개발 및 운영, 트랜잭션 처리 안정성 99.9% 달성',
      resignReason: '이직',
      salary: '',
      isPublic: { salary: false, description: true, companyName: true }
    }
  ],
  projects: [
    {
      id: 'proj-1',
      name: '일정 자동화 SaaS 개발',
      client: '개인 프로젝트',
      startDate: '2023-03',
      endDate: '2023-08',
      participation: '100',
      role: '기획/개발/배포 전담',
      description: 'Next.js + Supabase 기반 1인 개발, DAU 12명 달성'
    },
    {
      id: 'proj-2',
      name: '교내 학점 관리 앱',
      client: '한국대학교',
      startDate: '2022-03',
      endDate: '2022-08',
      participation: '50',
      role: '백엔드 개발',
      description: 'Spring Boot + MySQL 기반 학점 관리 웹앱, 재학생 200명 사용'
    }
  ],
  skills: ['Python', 'TypeScript', 'React', 'Node.js', 'MySQL', 'Docker', 'Git'],
  computerSkills: [
    {
      id: 'cs-1',
      program: 'Microsoft Excel',
      level: '상',
      period: '3년'
    },
    {
      id: 'cs-2',
      program: 'Python',
      level: '고급',
      period: '4년'
    }
  ],
  activities: [
    {
      id: 'act-1',
      type: 'club' as const,
      organization: '교내 AI 동아리',
      role: '스터디 운영진',
      startDate: '2021-03',
      endDate: '2022-12',
      description: '주간 논문 스터디 운영, 머신러닝 프로젝트 3건 완료'
    },
    {
      id: 'act-2',
      type: 'volunteer' as const,
      organization: '강남구 IT 봉사단',
      role: '팀원',
      startDate: '2022-01',
      endDate: '2022-06',
      description: '시니어 대상 스마트폰 활용 교육 진행, 월 2회 정기 활동'
    }
  ],
  training: [
    {
      id: 'tr-1',
      name: 'AWS Solutions Architect 교육',
      organization: 'AWS Korea',
      startDate: '2023-06',
      endDate: '2023-06',
      description: '클라우드 아키텍처 설계 실습 과정'
    },
    {
      id: 'tr-2',
      name: '데이터 엔지니어링 부트캠프',
      organization: '패스트캠퍼스',
      startDate: '2023-09',
      endDate: '2023-11',
      description: 'Spark, Kafka, Airflow 기반 데이터 파이프라인 구축 실습'
    }
  ],
  certificates: [
    {
      id: 'cert-1',
      name: '정보처리기사',
      issuer: '한국산업인력공단',
      number: '23-12345678',
      date: '2022-11'
    },
    {
      id: 'cert-2',
      name: 'AWS Certified Developer',
      issuer: 'Amazon Web Services',
      number: 'AWS-DEV-2023-9876',
      date: '2023-07'
    }
  ],
  languages: [
    {
      id: 'lang-1',
      category: '영어',
      language: '영어',
      testName: 'TOEIC',
      grade: '875',
      level: '상',
      date: '2023-01'
    },
    {
      id: 'lang-2',
      category: '일본어',
      language: '일본어',
      testName: 'JLPT',
      grade: 'N2',
      level: '중',
      date: '2022-07'
    }
  ],
  awards: [
    {
      id: 'award-1',
      name: '우수 졸업논문상',
      issuer: '한국대학교 컴퓨터공학과',
      date: '2023-02',
      description: '분산 시스템 성능 최적화 연구'
    },
    {
      id: 'award-2',
      name: '교내 해커톤 최우수상',
      issuer: '한국대학교',
      date: '2022-11',
      description: '24시간 해커톤 AI 트랙 1위, 실시간 이상탐지 시스템 구현'
    }
  ],
  overseas: [
    {
      id: 'overseas-1',
      country: '미국',
      startDate: '2020-07',
      endDate: '2020-08',
      purpose: '어학연수',
      description: '캘리포니아 어학원 2개월 연수'
    }
  ],
  portfolio: [
    { id: 'port-1', type: 'url' as const, label: 'GitHub', path: 'https://github.com/fixture-user' },
    { id: 'port-2', type: 'url' as const, label: '블로그', path: 'https://blog.fixture-user.dev' }
  ],
  preferences: {
    isVeteran: false,
    isDisabled: false,
    isProtection: false,
    isSubsidy: false,
    isVulnerable: false,           // 취약계층 여부
    vulnerableClass: '',           // 취약계층 구분
    hasDriverLicense: true,        // 운전면허 보유
    applicationChannel: '채용 홈페이지', // 지원경로
    military: {
      status: 'fulfilled' as const,
      branch: '육군',
      rank: '병장',
      startDate: '2019-03',
      endDate: '2020-12'
    }
  }
}

export const FIXTURE_EPISODES = [
  {
    fileName: 'ep_fixture_01_api_performance.md',
    content: `# API 응답속도 40% 단축 프로젝트

## Situation
테크스타트업 인턴십 중, 사용자 급증(일 10만 → 50만 트래픽)으로 인해 사용자 프로필 API의 평균 응답시간이 1.2초까지 증가하는 장애가 발생했다.

## Problem
N+1 쿼리 문제: 사용자 목록 조회 시 각 사용자마다 개별 SQL이 발생해 총 200개 이상의 쿼리가 실행되고 있었다. MySQL EXPLAIN 분석 결과 풀스캔이 발생 중이었으며, 인덱스가 전혀 설계되지 않은 상태였다.

## Action
1. Django ORM의 select_related / prefetch_related 적용으로 N+1 쿼리를 JOIN 단일 쿼리로 변환
2. user_id, created_at 컬럼에 복합 인덱스 추가 (EXPLAIN 재분석으로 인덱스 히트 확인)
3. Redis 캐싱 레이어 추가 (TTL 5분, 캐시 히트율 73% 달성)

## Analysis
쿼리 수 200개 → 3개로 감소, 평균 응답시간 1.2초 → 0.7초(40% 단축)

## Result
해당 API SLA를 1초 이내로 복구, 팀장으로부터 공식 피드백 수령

## Learning
성능 문제는 측정 먼저, 코딩은 그 다음. EXPLAIN 분석 없이 최적화는 추측에 불과하다는 것을 배웠다.`
  },
  {
    fileName: 'ep_fixture_02_ai_club_leadership.md',
    content: `# AI 동아리 주간 논문 스터디 기획 및 운영

## Situation
교내 AI 동아리에서 부원 15명이 각자 다른 수준의 ML 지식을 보유해, 함께 공부하는 방식이 효과적이지 않았다.

## Problem
초심자와 심화 학습자가 같은 자료를 보며 진행하다 보니 양쪽 모두 만족도가 낮았고, 3개월 안에 동아리 활동 참여율이 60%에서 35%로 하락했다.

## Action
1. 설문을 통해 구성원을 초급/중급/심화 3트랙으로 분류
2. 트랙별 주 1회 논문 세션 운영 (Attention Is All You Need → ResNet → GPT 계열)
3. 심화 트랙은 Kaggle 대회 참가를 병행하여 실습과 이론을 연계

## Analysis
참여율 35% → 78%로 회복, 분기 내 Kaggle 상위 30% 입상 2건 달성

## Result
다음 학기 동아리 회장 선출, 운영 방식을 학교 공식 우수 동아리 사례로 공유

## Learning
학습 효율은 수준 맞춤에서 나온다. 획일적 커리큘럼보다 세분화된 트랙이 전체 만족도를 올린다.`
  },
  {
    fileName: 'ep_fixture_03_side_project.md',
    content: `# 1인 개발 SaaS 프로젝트 — 일정 자동화 툴

## Situation
팀 프로젝트 경험이 부족하다는 취업 불안감에서, 실제 사용자가 있는 사이드 프로젝트를 기획했다.

## Problem
기획부터 배포까지 혼자 진행하면서 기술 스택 선택 우선순위와 MVP 범위 설정에서 계속 방향을 바꾸어 3개월째 미완성 상태가 지속되었다.

## Action
1. "최소 기능 정의서" 작성: 핵심 기능 3개만 남기고 나머지 제거
2. Next.js + Supabase로 기술 스택 고정, 변경 금지 원칙 수립
3. 2주 스프린트 + 주간 회고 루틴 도입 (혼자지만 PR 리뷰 양식 사용)

## Analysis
2주 만에 베타 버전 배포, 커뮤니티 공유 후 첫 주 사용자 47명 가입

## Result
Google Analytics 기준 DAU 12명, 사용자 인터뷰 5건 진행 후 핵심 기능 개선 2회 반영

## Learning
완벽한 계획보다 빠른 출시와 피드백 루프가 더 많은 것을 가르쳐준다.`
  }
]
