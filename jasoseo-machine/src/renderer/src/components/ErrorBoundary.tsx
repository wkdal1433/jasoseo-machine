import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] React render error:', error, info.componentStack)
  }

  handleReset = () => {
    // Clear wizard state via localStorage reset (Zustand no-persist)
    // Just reload the page to get a fresh React tree
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
          <div className="text-5xl">⚠️</div>
          <div>
            <h2 className="text-xl font-bold text-destructive">앱 오류가 발생했습니다</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              화면을 렌더링하는 중 예기치 않은 오류가 발생했습니다.
              아래 버튼을 눌러 앱을 초기화하세요.
            </p>
            {this.state.error && (
              <pre className="mt-3 rounded-lg bg-muted p-3 text-xs text-left text-muted-foreground max-w-md overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            앱 초기화 및 재시작
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
