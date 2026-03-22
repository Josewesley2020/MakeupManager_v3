import Partners from './Partners'
import ErrorBoundary from './ErrorBoundary'
import { Container } from './Container'

interface PartnersPageProps {
  onBack: () => void
  user: any
}

export default function PartnersPage({ onBack, user }: PartnersPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-purple-50 py-2">
      <Container className="space-y-3">
        <div className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white p-3 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="text-cyan-100 hover:text-white transition-colors">← Voltar</button>
            <h1 className="text-xl font-bold">🤝 Parceiros</h1>
            <div></div>
          </div>
        </div>

        <ErrorBoundary>
          <Partners user={user} />
        </ErrorBoundary>
      </Container>
    </div>
  )
}
