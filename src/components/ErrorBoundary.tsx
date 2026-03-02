import React from 'react'

interface State {
  hasError: boolean
  error?: Error | null
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: {}) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Algo deu errado</h2>
            <p className="text-sm text-gray-600 mt-2">Ocorreu um erro ao carregar esta seção. Veja o console para detalhes.</p>
            <pre className="mt-3 text-xs text-red-600">{this.state.error?.message}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
