import { useState } from 'react'

type Section = 'overview' | 'setup' | 'workflow' | 'episodes' | 'tips' | 'faq'

const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: '개요' },
  { id: 'setup', label: '초기 설정' },
  { id: 'workflow', label: '9-Step 작성 과정' },
  { id: 'episodes', label: '에피소드 관리' },
  { id: 'tips', label: '합격 팁' },
  { id: 'faq', label: 'FAQ' }
]

export function GuidePage() {
  const [active, setActive] = useState<Section>('overview')

  return (
    <div className="flex h-full">
      {/* Side Navigation */}
      <div className="w-48 shrink-0 border-r border-border p-4">
        <h3 className="mb-3 text-sm font-bold text-muted-foreground">사용 가이드</h3>
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
          {active === 'setup' && <SetupSection />}
          {active === 'workflow' && <WorkflowSection />}
          {active === 'episodes' && <EpisodeSection />}
          {active === 'tips' && <TipsSection />}
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
      <SectionTitle>자소서 머신이란?</SectionTitle>

      <Paragraph>
        자소서 머신은 S급 합격 자소서 패턴을 기반으로 서류 합격률을 최적화하는 AI 자소서 작성 도구입니다.
        Claude Code CLI를 활용하여 채용공고를 분석하고, 당신의 실제 경험(Episode)을 기반으로
        합격 가능성이 높은 자기소개서를 자동 생성합니다.
      </Paragraph>

      <SubTitle>핵심 원칙</SubTitle>
      <div className="space-y-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium">Episode = 유일한 사실 원천</p>
          <p className="text-xs text-muted-foreground">
            에피소드에 존재하지 않는 경험은 절대 사용하지 않습니다. 추론, 유추, 맥락 보완 전면 금지.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium">S-P-A-A-R-L 구조</p>
          <p className="text-xs text-muted-foreground">
            Situation(상황) - Problem(문제) - Analysis(분석) - Action(행동) - Result(결과) -
            Learning(교훈) 구조로 경험을 서술합니다.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium">3중 검증 시스템</p>
          <p className="text-xs text-muted-foreground">
            할루시네이션 방지 + 탈락 패턴 제거 + 이중 코딩 검증으로 품질을 보장합니다.
          </p>
        </div>
      </div>

      <SubTitle>전체 흐름</SubTitle>
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex flex-col gap-1 text-sm">
          <span>1. 지원서 정보 입력 (기업명, 직무, 채용공고, 문항)</span>
          <span className="text-muted-foreground">↓</span>
          <span>2. AI가 기업 전략 해석 (Step 0)</span>
          <span className="text-muted-foreground">↓</span>
          <span>3. 문항별 질문 재해석 + Episode 선정 (Step 1-2)</span>
          <span className="text-muted-foreground">↓</span>
          <span>4. 자소서 자동 생성 (Step 3-5, 실시간 스트리밍)</span>
          <span className="text-muted-foreground">↓</span>
          <span>5. 3중 검증 (Step 6-8)</span>
          <span className="text-muted-foreground">↓</span>
          <span>6. 최종 결과 확인 + 이력 저장</span>
        </div>
      </div>
    </div>
  )
}

function SetupSection() {
  return (
    <div>
      <SectionTitle>초기 설정</SectionTitle>

      <SubTitle>1. Claude Code CLI 설치</SubTitle>
      <Paragraph>
        자소서 머신은 Claude Code CLI를 통해 AI를 호출합니다. 먼저 Claude Code가 설치되어 있어야 합니다.
      </Paragraph>
      <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
        <code className="text-xs">npm install -g @anthropic-ai/claude-code</code>
      </div>
      <Paragraph>
        설치 후 터미널에서 <code className="rounded bg-muted px-1 text-xs">claude</code> 명령이 실행되는지
        확인하세요. Pro 구독 계정으로 로그인이 필요합니다.
      </Paragraph>

      <SubTitle>2. 설정 페이지 구성</SubTitle>
      <Paragraph>
        앱 좌측 사이드바에서 "설정"을 클릭하면 다음 항목을 설정할 수 있습니다:
      </Paragraph>
      <div className="space-y-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">CLI 경로</p>
          <p className="text-xs text-muted-foreground">
            기본값은 <code className="rounded bg-muted px-1">claude</code>입니다. PATH에 등록되지 않은
            경우 전체 경로를 입력하세요.
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">프로젝트 디렉토리</p>
          <p className="text-xs text-muted-foreground">
            CLAUDE.md와 episodes/ 폴더가 있는 디렉토리입니다. "폴더 선택" 버튼으로 지정하세요.
            이 경로의 CLAUDE.md 파일이 AI의 작성 규칙으로 자동 로드됩니다.
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">모델 선택</p>
          <p className="text-xs text-muted-foreground">
            Opus: 최고 품질, 속도 느림 / Sonnet: 빠른 속도, 약간 낮은 품질. 중요한 지원서에는 Opus 추천.
          </p>
        </div>
      </div>

      <SubTitle>3. 연결 테스트</SubTitle>
      <Paragraph>
        설정 페이지의 "연결 테스트" 버튼을 클릭하여 Claude CLI가 정상 작동하는지 확인하세요.
        "연결 성공" 메시지가 나오면 자소서 작성을 시작할 수 있습니다.
      </Paragraph>
    </div>
  )
}

function WorkflowSection() {
  return (
    <div>
      <SectionTitle>9-Step 작성 과정</SectionTitle>

      <Paragraph>
        자소서 머신의 핵심 기능입니다. 좌측 메뉴에서 "새 지원서"를 클릭하면 위자드가 시작됩니다.
      </Paragraph>

      <SubTitle>지원서 정보 입력</SubTitle>
      <Paragraph>
        먼저 기업명, 직무명, 채용공고 전문을 입력합니다. 채용공고는 최대한 상세하게 붙여넣으세요.
        AI가 이 정보를 기반으로 HR의 의도를 분석합니다.
      </Paragraph>
      <Paragraph>
        자소서 문항을 1~N개 등록합니다. 각 문항별 글자수 제한도 설정하세요. 문항은 나중에 탭으로 전환하며
        개별 작업합니다.
      </Paragraph>
      <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">작성 전략 선택</p>
        <p className="text-xs text-yellow-700 dark:text-yellow-300">
          Conservative(보수적): 대기업/금융/SI — Balanced(균형): 중견 IT/일반 대기업 — Aggressive(공격적): 스타트업/R&D.
          지원 기업의 성격에 맞게 선택하세요.
        </p>
      </div>

      <SubTitle>Step 0: 기업 전략 해석</SubTitle>
      <StepCard
        step="Step 0"
        title="AI 기업 분석"
        description="채용공고를 분석하여 HR이 진짜 원하는 인재상을 파악합니다."
        detail="HR 의도 2개(Execution/Growth/Stability/Communication)를 도출하고, 이를 바탕으로 전체 작성 방향을 결정합니다. 지원서당 1회만 실행됩니다."
      />

      <SubTitle>문항별 작업 (Step 1~8)</SubTitle>
      <Paragraph>
        Step 0 완료 후, 각 문항별로 Step 1~8을 진행합니다. 상단 탭으로 문항을 전환할 수 있습니다.
      </Paragraph>

      <StepCard
        step="Step 1"
        title="질문 재해석"
        description="채용담당자의 진짜 의도를 파악하여 질문을 재정의합니다."
        detail="generic_storytelling_patterns.md의 §10 기법을 적용합니다."
      />

      <StepCard
        step="Step 2"
        title="Episode + 앵글 승인"
        description="AI가 추천한 Episode와 서술 앵글을 확인하고 승인합니다."
        detail="승인 없이는 작성이 시작되지 않습니다. 다른 문항에서 이미 사용 중인 Episode도 확인할 수 있어 중복을 방지합니다. 같은 지원서 내 Episode는 최대 2회까지 사용 가능합니다."
      />

      <StepCard
        step="Step 3~5"
        title="자소서 생성"
        description="승인된 Episode를 기반으로 자소서를 실시간 스트리밍으로 생성합니다."
        detail="Step 3(두괄식 도입부) → Step 4(본문 S-P-A-A-R-L) → Step 5(마무리)로 구성됩니다. 생성 중 '중단' 버튼으로 취소할 수 있으며, 완료 후 인라인 편집이 가능합니다."
      />

      <StepCard
        step="Step 6"
        title="할루시네이션 검증"
        description="Episode에 없는 정보가 자소서에 포함되지 않았는지 7개 항목을 검증합니다."
        detail="프로젝트명, 역할, 기간, 기술 스택, 정량 성과, 표현, S-P-A-A-R-L 구조를 확인합니다."
      />

      <StepCard
        step="Step 7"
        title="탈락 패턴 검증"
        description="S급 합격 자소서 분석에서 도출된 9개 탈락 패턴을 검증합니다."
        detail="추상적 표현, 기술 나열, 두괄식 미준수, 기업가치 미연결 등을 체크합니다."
      />

      <StepCard
        step="Step 8"
        title="이중 코딩 검증"
        description="소제목부터 마무리까지 '내 행동 + 회사 가치'가 이중으로 코딩되어 있는지 확인합니다."
        detail="§9 이중코딩 기법 적용 여부를 최종 점검합니다."
      />

      <SubTitle>검증 실패 시</SubTitle>
      <Paragraph>
        검증에서 실패한 항목이 있으면 두 가지 선택지가 있습니다:
      </Paragraph>
      <div className="space-y-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">돌아가서 편집</p>
          <p className="text-xs text-muted-foreground">
            생성 화면으로 돌아가 문제 부분을 직접 수정한 후 재검증합니다.
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">재생성</p>
          <p className="text-xs text-muted-foreground">
            AI에게 자소서를 다시 생성하도록 요청합니다.
          </p>
        </div>
      </div>

      <SubTitle>최종 결과 + 전체 리뷰</SubTitle>
      <Paragraph>
        모든 문항이 완료되면 전체 리뷰 화면에서 모든 자소서를 한눈에 확인할 수 있습니다.
        Episode 사용 현황 요약, 각 문항의 글자수 및 검증 결과를 확인하고,
        전체 복사 또는 이력에 저장할 수 있습니다.
      </Paragraph>
    </div>
  )
}

function EpisodeSection() {
  return (
    <div>
      <SectionTitle>에피소드 관리</SectionTitle>

      <Paragraph>
        에피소드(Episode)는 자소서의 유일한 사실 원천입니다. 각 에피소드는 하나의 핵심 경험을
        S-P-A-A-R-L 구조로 정리한 마크다운 파일입니다.
      </Paragraph>

      <SubTitle>에피소드 구조</SubTitle>
      <div className="space-y-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">S - Situation (상황)</p>
          <p className="text-xs text-muted-foreground">프로젝트/활동의 배경과 맥락</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">P - Problem (문제)</p>
          <p className="text-xs text-muted-foreground">직면한 핵심 문제나 과제</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">A - Analysis (분석)</p>
          <p className="text-xs text-muted-foreground">문제를 분석한 과정과 판단 근거</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">A - Action (행동)</p>
          <p className="text-xs text-muted-foreground">구체적으로 수행한 행동과 노력</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">R - Result (결과)</p>
          <p className="text-xs text-muted-foreground">정량적/정성적 성과</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">L - Learning (교훈)</p>
          <p className="text-xs text-muted-foreground">경험에서 얻은 교훈과 성장</p>
        </div>
      </div>

      <SubTitle>에피소드 보기</SubTitle>
      <Paragraph>
        좌측 메뉴의 "에피소드"를 클릭하면 현재 등록된 모든 에피소드를 카드 형태로 볼 수 있습니다.
        각 카드를 클릭하면 상세 내용을 마크다운으로 렌더링하여 보여줍니다.
      </Paragraph>

      <SubTitle>에피소드 추가/수정</SubTitle>
      <Paragraph>
        에피소드는 프로젝트 디렉토리의 <code className="rounded bg-muted px-1 text-xs">episodes/</code>
        폴더에 마크다운(.md) 파일로 관리됩니다. 새 경험을 추가하려면:
      </Paragraph>
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <p>1. episodes/ 폴더에 새 .md 파일 생성</p>
        <p>2. 기존 에피소드 파일의 형식을 참고하여 작성</p>
        <p>3. 앱이 자동으로 변경을 감지하여 목록을 갱신</p>
      </div>

      <SubTitle>Episode 사용 규칙</SubTitle>
      <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
        <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
          <li>- 같은 지원서 내 하나의 Episode는 최대 2개 문항까지 사용 가능</li>
          <li>- Episode에 없는 경험은 절대 사용 불가 (Zero-Assumption 원칙)</li>
          <li>- 고유명사, 수치, 기간은 Episode 원본과 글자 그대로 일치해야 함</li>
          <li>- 서로 다른 Episode를 합쳐서 하나의 경험처럼 서술 금지</li>
        </ul>
      </div>
    </div>
  )
}

function TipsSection() {
  return (
    <div>
      <SectionTitle>합격 팁</SectionTitle>

      <SubTitle>채용공고 분석 요령</SubTitle>
      <Paragraph>
        채용공고를 입력할 때 최대한 전문을 그대로 복사하세요. 우대사항, 자격요건뿐 아니라
        기업 소개, 팀 소개까지 포함하면 AI가 더 정확한 HR 의도를 파악합니다.
      </Paragraph>

      <SubTitle>작성 전략 선택 가이드</SubTitle>
      <div className="space-y-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Conservative (보수적)</p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            삼성, LG, 금융권, 보험, SI 등. 안정성과 체계를 중시하는 기업. 정량적 성과와 구조적 문제해결을
            강조합니다.
          </p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">Balanced (균형)</p>
          <p className="text-xs text-green-700 dark:text-green-300">
            중견 IT 기업, 일반 대기업. 실행력과 성장 가능성을 균형 있게 보여줍니다.
          </p>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950">
          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Aggressive (공격적)</p>
          <p className="text-xs text-purple-700 dark:text-purple-300">
            스타트업, 신사업, R&D 부서. 도전정신과 빠른 학습력을 전면에 내세웁니다.
          </p>
        </div>
      </div>

      <SubTitle>Episode 승인 시 주의사항</SubTitle>
      <div className="space-y-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">앵글을 확인하세요</p>
          <p className="text-xs text-muted-foreground">
            같은 Episode라도 앵글(서술 각도)에 따라 완전히 다른 자소서가 됩니다. AI가 제안한 앵글이
            해당 문항의 HR 의도와 맞는지 꼭 확인하세요.
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">중복 사용에 주의하세요</p>
          <p className="text-xs text-muted-foreground">
            같은 Episode를 여러 문항에 사용하면 경험 다양성이 떨어집니다. 가능하면 문항별로 다른
            Episode를 사용하세요.
          </p>
        </div>
      </div>

      <SubTitle>생성 후 편집</SubTitle>
      <Paragraph>
        AI가 생성한 자소서는 좋은 초안이지만, 반드시 본인만의 말투와 표현으로 다듬어야 합니다.
        특히 면접에서 자소서 내용을 질문받을 때 자연스럽게 대답할 수 있어야 합니다.
      </Paragraph>

      <SubTitle>글자수 관리</SubTitle>
      <Paragraph>
        AI는 글자수 제한을 고려하여 생성하지만, 편집 과정에서 글자수가 변할 수 있습니다.
        글자수 카운터를 확인하며 제한 내로 유지하세요. 90% 이상 채우는 것이 이상적입니다.
      </Paragraph>
    </div>
  )
}

function FaqSection() {
  const faqs = [
    {
      q: 'Claude Code CLI가 설치되어 있는데 연결 테스트가 실패합니다.',
      a: '설정 페이지에서 CLI 경로를 확인하세요. PATH에 등록되지 않은 경우 전체 경로(예: C:\\Users\\...\\claude.exe)를 입력해야 합니다. 또한 claude auth 명령으로 로그인이 되어 있는지 확인하세요.'
    },
    {
      q: '생성 중 "스트리밍 오류"가 발생합니다.',
      a: 'Claude Pro 구독의 토큰 한도를 초과했거나, 네트워크 문제일 수 있습니다. 잠시 후 다시 시도하세요. 채용공고가 매우 긴 경우에도 오류가 발생할 수 있으니, 핵심 내용만 발췌하여 입력해보세요.'
    },
    {
      q: '에피소드를 추가했는데 목록에 나타나지 않습니다.',
      a: '설정에서 프로젝트 디렉토리가 올바르게 지정되어 있는지 확인하세요. episodes/ 폴더 안에 .md 확장자로 저장해야 하며, 파일이 저장되면 자동으로 감지됩니다.'
    },
    {
      q: '검증에서 실패한 항목이 있으면 어떻게 해야 하나요?',
      a: '"돌아가서 편집" 버튼을 눌러 해당 부분을 직접 수정하거나, "재생성"으로 AI에게 다시 요청할 수 있습니다. 할루시네이션 실패(Episode에 없는 내용)는 반드시 수정해야 합니다.'
    },
    {
      q: '작성 중 앱을 종료해도 괜찮나요?',
      a: '네, 30초마다 자동 저장됩니다. 다시 앱을 실행하면 대시보드에서 "이어서 작성" 카드가 표시됩니다.'
    },
    {
      q: '이전에 작성한 자소서를 다시 보고 싶습니다.',
      a: '좌측 메뉴의 "작성 이력"에서 과거 지원서를 확인할 수 있습니다. 기업명으로 필터링하거나, 합격/불합격 상태를 기록해두면 나중에 참고할 수 있습니다.'
    },
    {
      q: 'Opus와 Sonnet 중 어떤 모델을 써야 하나요?',
      a: '중요한 지원서에는 Opus를 추천합니다. Opus가 더 정교하고 깊이 있는 분석과 글을 생성합니다. 빠른 초안 작성이나 연습용에는 Sonnet이 적합합니다.'
    }
  ]

  return (
    <div>
      <SectionTitle>자주 묻는 질문</SectionTitle>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <p className="mb-2 text-sm font-semibold">Q. {faq.q}</p>
            <p className="text-sm text-muted-foreground">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
