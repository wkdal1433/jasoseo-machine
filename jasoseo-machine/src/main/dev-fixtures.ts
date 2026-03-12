/**
 * 개발/테스트용 픽스처 데이터
 * 실제 AI 호출 없이 UX 플로우를 빠르게 검증할 수 있습니다.
 */

export const FIXTURE_PROFILE = {
  id: 'fixture-profile',
  personal: {
    name: '김테스트',
    birthDate: '1998-05-15',
    email: 'test@example.com',
    mobile: '010-1234-5678',
    address: '서울시 강남구',
    gender: 'male' as const
  },
  education: [{
    name: '한국대학교',
    major: '컴퓨터공학과',
    startDate: '2017-03',
    endDate: '2023-02',
    status: '졸업',
    gpa: '3.8/4.5'
  }],
  experience: [{
    companyName: '테크스타트업',
    jobCategory: '백엔드 개발',
    startDate: '2022-07',
    endDate: '2022-12',
    description: '사용자 인증 API 설계 및 구현, MySQL 쿼리 최적화로 응답시간 40% 단축'
  }],
  skills: ['Python', 'TypeScript', 'React', 'Node.js', 'MySQL', 'Docker', 'Git'],
  activities: [{
    organization: '교내 AI 동아리',
    startDate: '2021-03',
    endDate: '2022-12',
    description: '주간 논문 스터디 운영, 머신러닝 프로젝트 3건 완료'
  }],
  training: [],
  certificates: [{
    name: '정보처리기사',
    issuer: '한국산업인력공단',
    date: '2022-11'
  }],
  languages: [{
    language: '영어',
    testName: 'TOEIC',
    grade: '875',
    date: '2023-01'
  }],
  awards: [],
  overseas: [],
  portfolio: [{
    label: 'GitHub',
    path: 'https://github.com/fixture-user'
  }],
  preferences: {
    isVeteran: false,
    isDisabled: false,
    military: { status: '군필', branch: '육군', rank: '병장', startDate: '2019-03', endDate: '2020-12' }
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
