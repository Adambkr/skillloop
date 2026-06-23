import { Component, type ReactNode } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('SkillLoop error boundary caught:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="route-error">
          <span className="route-error-icon"><AlertCircle /></span>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message || 'An unexpected error occurred while loading this page.'}</p>
          <button className="button button-primary" onClick={this.handleReload}>
            <RotateCcw /> Reload SkillLoop
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
