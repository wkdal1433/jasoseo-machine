import { useState } from 'react'
import { Lightbulb } from 'lucide-react'

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
        <h3 className="mb-3 text-sm font-bold text-muted-foreground">자소서 머신 v2.0</h3>
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
      <SectionTitle>자소서 머신 v2.0 사용 가이드</SectionTitle>
      <Paragraph>
        자소서 머신은 당신의 실제 경험(에피소드)을 기반으로 S급 합격 자소서를 자동 생성하는 AI 플랫폼입니다.
        기업 공고를 자동 수집하고, 9단계 파이프라인을 통해 맞춤형 자소서를 실시간으로 완성합니다.
      </Paragraph>
      <SubTitle>4대 핵심 기능</SubTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-bold text-primary">매직 온보딩</p>
          <p className="text-xs text-muted-foreground">PDF/DOCX 업로드 → AI가 에피소드 자동 추출 및 S-P-A-A-R-L 구조화</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-bold text-primary">스마트 URL 모드</p>
          <p className="text-xs text-muted-foreground">채용 사이트 URL 입력 → 공고·문항·인재상 자동 수집</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-bold text-primary">9단계 AI 파이프라인</p>
          <p className="text-xs text-muted-foreground">기업 리서치 → 질문 재해석 → 에피소드 매칭 → 실시간 생성 → 3중 검증</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-bold text-primary">Chrome 확장 자동 입력</p>
          <p className="text-xs text-muted-foreground">완성된 자소서를 채용 사이트에 원클릭으로 자동 입력</p>
        </div>
      </div>
    </div>
  )
}

function ProfileSection() {
  return (
    <div>
      <SectionTitle>내 라이브러리 — 프로필 & 에피소드 & 패턴</SectionTitle>
      <Paragraph>
        사이드바의 <strong>내 라이브러리</strong>에서 프로필, 에피소드, 패턴 강화를 탭으로 관리합니다.
        최초 1회 설정 후 모든 지원서에 자동으로 활용됩니다.
      </Paragraph>
      <div className="space-y-2">
        <StepCard step="프로필" title="인적사항 & 학력 & 경력" description="채용 사이트 자동 입력에 사용되는 기본 정보. PDF 업로드로 자동 추출 가능." />
        <StepCard step="에피소드" title="경험 에피소드 관리" description="모든 자소서의 유일한 사실 원천. AI 인터뷰로 S-P-A-A-R-L 구조로 완성." />
        <StepCard step="패턴 강화" title="합격 자소서 패턴 학습" description="합격한 자소서를 패턴 데이터로 추가하면 AI가 문체·구조를 분석해 품질을 개선." />
      </div>
    </div>
  )
}

function AnalysisSection() {
  return (
    <div>
      <SectionTitle>Step 0: 기업 리서치 & 전략 수립</SectionTitle>
      <Paragraph>
        AI가 실시간으로 기업 정보를 수집하고 HR 의도를 분석합니다. 결과를 확인 후 "기업 분석 확정"을 누르면 이후 모든 단계에 반영됩니다.
      </Paragraph>
      <div className="space-y-3">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-bold">스마트 URL 모드 (권장)</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>1. 채용 사이트 자소서 작성 페이지 URL 입력</li>
            <li>2. AI가 공고 내용, 자소서 문항, 인재상을 자동 파악</li>
            <li>3. "이 내용으로 시작할까요?" 확인 후 위자드 진입</li>
          </ul>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-bold">직접 입력 모드</p>
          <p className="text-xs text-muted-foreground mt-1">인터넷 없거나 비공개 공고인 경우 채용공고 텍스트를 직접 붙여넣을 수 있습니다.</p>
        </div>
      </div>
    </div>
  )
}

function WorkflowSection() {
  return (
    <div>
      <SectionTitle>9단계 AI 파이프라인 — 자소서 생성</SectionTitle>
      <Paragraph>
        기업 분석이 완료되면 문항별로 9단계 파이프라인이 실행됩니다. 각 단계는 순서대로 진행되며 중간에 수정이 가능합니다.
      </Paragraph>
      <div className="space-y-2">
        <StepCard step="Step 0" title="기업 리서치" description="HR 의도 파악 + 작성 전략 수립 (Conservative / Balanced / Aggressive)" />
        <StepCard step="Step 1-2" title="질문 재해석 & 에피소드 매칭" description="질문의 숨은 의도를 파악하고 최적의 에피소드를 추천합니다." />
        <StepCard step="Step 3-5" title="실시간 스트리밍 생성" description="두괄식 도입 → S-P-A-A-R-L 본문 → 역량 마무리 순으로 실시간 생성됩니다." />
        <StepCard step="Step 6-8" title="3중 검증" description="할루시네이션 방지, 탈락 패턴 제거, 이중 코딩 최종 검증을 자동 수행합니다." />
        <StepCard step="Surgical Edit" title="인라인 편집" description="특정 문장만 지정하여 AI에게 Surgical Edit 요청이 가능합니다." />
      </div>
    </div>
  )
}

function AutomationSection() {
  return (
    <div>
      <SectionTitle>Chrome 확장 자동 입력</SectionTitle>
      <Paragraph>
        완성된 자소서를 복사 붙여넣기 없이, Chrome 확장 프로그램이 채용 사이트 폼에 자동으로 채워줍니다.
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
          description="위자드 최종 단계(Full Review)에서 [확장 프로그램으로 전송] 버튼을 클릭하세요."
        />
        <StepCard 
          step="STEP 4" 
          title="원클릭 주입" 
          description="채용 사이트 화면에 나타난 우리 앱 로고 버튼을 누르면 모든 칸이 순식간에 채워집니다." 
        />
      </div>

      <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-bold text-primary mb-1 text-center flex items-center justify-center gap-1"><Lightbulb size={14} /> 하이브리드 방식의 강점</p>
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
