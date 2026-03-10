import { useState } from 'react'

type Section = 'overview' | 'profile' | 'analysis' | 'workflow' | 'automation' | 'episodes' | 'faq'

const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: '개요' },
  { id: 'profile', label: 'Core 1: 프로필 관리' },
  { id: 'analysis', label: 'Core 2: 기업 분석' },
  { id: 'workflow', label: 'Core 3: 자소서 생성' },
  { id: 'automation', label: 'Core 4: 하이브리드 자동 주입' },
  { id: 'episodes', label: '에피소드 관리' },
  { id: 'faq', label: 'FAQ' }
]

export function GuidePage() {
  const [active, setActive] = useState<Section>('overview')

  return (
    <div className="flex h-full">
      {/* Side Navigation */}
      <div className="w-56 shrink-0 border-r border-border p-4">
        <h3 className="mb-3 text-sm font-bold text-muted-foreground">Jasoseo Machine v20.0</h3>
        <nav className="space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                active === s.id
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          {active === 'overview' && <OverviewSection />}
          {active === 'profile' && <ProfileSection />}
          {active === 'analysis' && <AnalysisSection />}
          {active === 'workflow' && <WorkflowSection />}
          {active === 'automation' && <AutomationSection />}
          {active === 'episodes' && <EpisodeSection />}
          {active === 'faq' && <FaqSection />}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-xl font-bold">{children}</h2>
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 text-base font-semibold">{children}</h3>
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-foreground/80">{children}</p>
}

function StepCard({
  step,
  title,
  description,
  detail
}: {
  step: string
  title: string
  description: string
  detail?: string
}) {
  return (
    <div className="mb-3 rounded-lg border border-border p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
          {step}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground/70">{detail}</p>}
    </div>
  )
}

function OverviewSection() {
  return (
    <div>
      <SectionTitle>AI 자소서 자동화 머신 (v20.0 "Hands of God")</SectionTitle>
      <Paragraph>
        본 앱은 2026년 공채 시즌의 압도적인 생산성을 위해 설계된 **'하이브리드 자동화 플랫폼'**입니다. 
        단순히 글을 써주는 단계를 넘어, 기업 정보를 스스로 사냥하고 수십 개의 입력 칸을 클릭 한 번으로 채워주는 
        지능형 에이전트 시스템을 지향합니다.
      </Paragraph>
      <SubTitle>4대 핵심 자동화 엔진</SubTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-bold text-primary">Core 1: 12-Section Profile</p>
          <p className="text-xs text-muted-foreground">병역부터 기술 스택까지 채용 사이트 모든 항목 자산화</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-bold text-primary">Core 2: Intelligent Analyst</p>
          <p className="text-xs text-muted-foreground">2026년 실시간 공고 사냥 및 우대사항(JD) 분석</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-bold text-primary">Core 3: A4 Real-time Preview</p>
          <p className="text-xs text-muted-foreground">수정과 동시에 확인하는 실제 서류 양식 프리뷰</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-bold text-primary">Core 4: Hybrid Extension</p>
          <p className="text-xs text-muted-foreground">브라우저 확장 프로그램을 통한 클릭 한 번의 일괄 주입</p>
        </div>
      </div>
    </div>
  )
}

function ProfileSection() {
  return (
    <div>
      <SectionTitle>Core 1: 12개 섹션 프로필 관리</SectionTitle>
      <Paragraph>
        공채 시즌에는 매일 수십 번씩 같은 정보를 입력해야 합니다. 자소서 머신은 이 모든 데이터를 
        단 한 번의 입력으로 관리할 수 있도록 12개 섹션의 방대한 프로필 시스템을 제공합니다.
      </Paragraph>
      <div className="space-y-2">
        <StepCard step="필수 정보" title="인적사항 & 학력" description="성별, 거주지, 편입 여부, 졸업 상태 등 기본 데이터" />
        <StepCard step="경력/활동" title="경력 & 인턴 & 대외활동" description="부서, 담당 업무, 직급, 연봉 정보(퇴사 사유 포함)" />
        <StepCard step="역량" title="어학 & 자격증 & 수상" description="시험 종류, 점수, 발행 기관, 수상 내역" />
        <StepCard step="특수" title="병역 & 기술 스택 & 포트폴리오" description="군별, 계급, 기술 스택 태그, GitHub/Blog 링크" />
      </div>
    </div>
  )
}

function AnalysisSection() {
  return (
    <div>
      <SectionTitle>Core 2: 지능형 기업 분석 (2026-Anchored)</SectionTitle>
      <Paragraph>
        AI가 인터넷을 직접 뒤져 지원하려는 기업의 가장 최신 정보를 사냥해옵니다. 
        사용자님은 AI가 제안한 링크와 정보를 '컨펌'하기만 하면 됩니다.
      </Paragraph>
      <div className="space-y-3">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-bold">작동 원리</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>1. 회사명 입력 시 작성 시점(Target Date)을 기준으로 쿼리 자동 생성</li>
            <li>2. 실시간 웹 검색을 통해 인재상(Talent) 및 모집요강(JD) 수집</li>
            <li>3. AI가 우대사항을 분석하여 사용자 에피소드와의 매칭 가능성 평가</li>
            <li>4. 유저가 제안된 링크와 가치를 선택하여 작성 컨텍스트로 확정</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function WorkflowSection() {
  return (
    <div>
      <SectionTitle>Core 3: 9-Step 작성 과정 & 프리뷰</SectionTitle>
      <Paragraph>
        AI가 수집한 기업 정보와 당신의 에피소드를 결합하여 완벽한 자소서를 생성합니다.
      </Paragraph>
      <div className="space-y-2">
        <StepCard step="Step 1-2" title="질문 재해석 & 에피소드 매칭" description="질문의 숨은 의도를 파악하고 최적의 경험을 추천합니다." />
        <StepCard step="Step 3-5" title="자소서 자동 생성" description="도입-본문-마무리 구조로 실시간 스트리밍 생성합니다." />
        <StepCard step="Step 6-8" title="3중 검증" description="할루시네이션, 탈락 패턴, 이중 코딩 여부를 최종 검검합니다." />
        <StepCard step="Final" title="A4 Split-View 프리뷰" description="좌측에서 수정하고 우측에서 실제 서류 양식을 실시간으로 확인합니다." />
      </div>
    </div>
  )
}

function AutomationSection() {
  return (
    <div>
      <SectionTitle>Core 4: 하이브리드 자동 주입 (v20.0)</SectionTitle>
      <Paragraph>
        "복사 붙여넣기조차 번거롭다"는 철학을 반영했습니다. 
        브라우저 확장 프로그램과 연동하여 클릭 한 번으로 모든 칸을 채웁니다.
      </Paragraph>
      
      <SubTitle>확장 프로그램 설치 및 연동 방법</SubTitle>
      <div className="space-y-4">
        <StepCard 
          step="STEP 1" 
          title="확장 프로그램 로드" 
          description="크롬 브라우저에서 'chrome://extensions' 접속 후 [압축해제된 확장 프로그램 로드]를 통해 프로젝트 내 'extension' 폴더를 선택하세요." 
        />
        <StepCard 
          step="STEP 2" 
          title="보안 키 등록" 
          description="앱의 [설정] 페이지에서 확인한 '브릿지 포트'와 '보안 시크릿 키'를 확장 프로그램 팝업창에 입력하세요." 
        />
        <StepCard 
          step="STEP 3" 
          title="데이터 전송" 
          description="위자드 최종 단계(Full Review)에서 [🧩 확장 프로그램으로 전송] 버튼을 클릭하세요." 
        />
        <StepCard 
          step="STEP 4" 
          title="원클릭 주입" 
          description="채용 사이트 화면에 나타난 우리 앱 로고 버튼을 누르면 모든 칸이 순식간에 채워집니다." 
        />
      </div>

      <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-bold text-primary mb-1 text-center">💡 하이브리드 방식의 강점</p>
        <p className="text-[10px] text-muted-foreground text-center">
          보안이 강력한 아이프레임(Iframe) 및 섀도우 돔(Shadow DOM) 영역까지 완벽하게 침투하여 주입합니다.
        </p>
      </div>
    </div>
  )
}

function EpisodeSection() {
  return (
    <div>
      <SectionTitle>에피소드 관리</SectionTitle>
      <Paragraph>
        에피소드는 자소서의 유일한 사실 원천입니다. 모든 경험은 S-P-A-A-R-L 구조로 정리되어야 합니다.
      </Paragraph>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-border p-2">S: Situation (상황)</div>
        <div className="rounded border border-border p-2">P: Problem (문제)</div>
        <div className="rounded border border-border p-2">A: Analysis (분석)</div>
        <div className="rounded border border-border p-2">A: Action (행동)</div>
        <div className="rounded border border-border p-2">R: Result (결과)</div>
        <div className="rounded border border-border p-2">L: Learning (교훈)</div>
      </div>
    </div>
  )
}

function FaqSection() {
  return (
    <div>
      <SectionTitle>FAQ</SectionTitle>
      <div className="space-y-3">
        <div className="rounded-lg border border-border p-4">
          <p className="mb-1 text-sm font-semibold">Q. 보안 시크릿 키는 왜 필요한가요?</p>
          <p className="text-sm text-muted-foreground">A. 앱 본체와 확장 프로그램 사이의 통신을 암호화하여 외부 웹사이트가 당신의 정보를 훔쳐가지 못하도록 보호하는 3중 방어막입니다.</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="mb-1 text-sm font-semibold">Q. 확장 프로그램을 꼭 써야 하나요?</p>
          <p className="text-sm text-muted-foreground">A. 아니요, 기존처럼 '콘솔 주입 스크립트'를 복사해서 사용하는 방식도 여전히 지원하므로 편하신 방법을 선택하시면 됩니다.</p>
        </div>
      </div>
    </div>
  )
}
