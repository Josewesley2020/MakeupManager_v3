import React, { useState, useEffect } from 'react'
import { supabase, formatDuration, formatDate, formatDateTime } from '../lib/supabase'
import PaymentService from '../lib/PaymentService'
import { WhatsAppButton } from './WhatsAppButton'
import { Settings } from './Settings'
import { PriceCalculator } from './PriceCalculator'
import ClientsPage from './ClientsPage'
import AppointmentsPage from './AppointmentsPage'
import CalendarPage from './CalendarPage'
import FinancialDashboard from './FinancialDashboard'
import { Container } from './Container'

interface DashboardProps {
  user: any
  onLogout: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'calculator' | 'clients' | 'appointments' | 'calendar' | 'financial'>('dashboard')
  
  // Estados para dados do agendamento rápido (vindo do calendário)
  const [quickAppointmentData, setQuickAppointmentData] = useState<{
    date?: string
    time?: string
    status?: 'pending' | 'confirmed'
  }>({})
  
  // Estado para filtros de agendamento
  const [appointmentFilters, setAppointmentFilters] = useState<{
    status: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'overdue' | null
    paymentStatus: 'all' | 'pending' | 'paid' | 'partial' | null
  }>({ status: null, paymentStatus: null })
  
  // Estados para dados reais do dashboard
  const [dashboardData, setDashboardData] = useState({
    todayAppointments: 0,
    todayRevenue: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0,
    completedAppointments: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    overdueAppointments: 0,
    upcomingAppointments: [] as any[]
  })
  const [loading, setLoading] = useState(true)

  // Função helper para verificar se agendamento está atrasado
  const isAppointmentOverdue = (appointment: any) => {
    if (!appointment.scheduled_date) return false
    
    const appointmentDate = new Date(appointment.scheduled_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Zera horas para comparar apenas datas
    
    // Se a data já passou e o status ainda é confirmado ou pendente
    return appointmentDate < today && (appointment.status === 'confirmed' || appointment.status === 'pending')
  }

  // Buscar dados reais do dashboard
  const fetchDashboardData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // OTIMIZAÇÃO: Consolidar 8 queries em 2 chamadas paralelas
      // Query 1: Métricas agregadas via RPC (1 table scan com FILTER clauses)
      // Query 2: Próximos agendamentos com detalhes (TOP 5)
      const [metricsResult, upcomingResult] = await Promise.all([
        supabase.rpc('get_dashboard_metrics', { p_user_id: user.id }),
        supabase
          .from('appointments')
          .select(`
            *,
            total_duration_minutes,
            clients (name, phone),
            appointment_services (
              quantity,
              unit_price,
              total_price,
              services (name)
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .gte('scheduled_date', new Date().toLocaleDateString('sv-SE'))
          .order('scheduled_date', { ascending: true })
          .order('scheduled_time', { ascending: true })
          .limit(5)
      ])

      if (metricsResult.error) {
        console.error('Erro ao buscar métricas:', metricsResult.error)
        throw metricsResult.error
      }

      if (upcomingResult.error) {
        console.error('Erro ao buscar próximos agendamentos:', upcomingResult.error)
        throw upcomingResult.error
      }

      const metrics = metricsResult.data
      const upcomingAppointments = upcomingResult.data

      // Atualizar estado com métricas agregadas + upcoming appointments
      setDashboardData({
        todayAppointments: metrics?.today_appointments_count || 0,
        todayRevenue: metrics?.today_revenue_pending || 0,
        pendingAppointments: metrics?.pending_appointments_count || 0,
        confirmedAppointments: metrics?.confirmed_appointments_month_count || 0,
        completedAppointments: metrics?.completed_appointments_month_count || 0,
        monthlyRevenue: metrics?.monthly_revenue_pending || 0,
        pendingPayments: metrics?.pending_payments_count || 0,
        overdueAppointments: metrics?.overdue_appointments_count || 0,
        upcomingAppointments: upcomingAppointments || []
      })

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user?.id])

  // Função helper para renderizar status do agendamento
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Função helper para calcular total do agendamento
  const calculateAppointmentTotal = (appointment: any) => {
    return appointment.appointment_services?.reduce((sum: number, service: any) => sum + service.total_price, 0) || 0
  }

  // Função helper para obter nome do serviço principal
  const getMainServiceName = (appointment: any) => {
    if (!appointment.appointment_services || appointment.appointment_services.length === 0) {
      return 'Serviço não especificado'
    }
    
    const firstService = appointment.appointment_services[0]
    if (appointment.appointment_services.length === 1) {
      return `${firstService.services?.name || 'Serviço'} (${firstService.quantity}x)`
    }
    
    return `${appointment.appointment_services.length} serviços`
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  const navigateToPendingConfirmation = () => {
    setCurrentView('appointments')
    // Passar filtros para agendamentos pendentes de confirmação
    setAppointmentFilters({ status: 'pending', paymentStatus: null })
  }

  const navigateToPendingPayments = () => {
    setCurrentView('appointments')
    // Passar filtros para agendamentos confirmados com pagamentos pendentes
    setAppointmentFilters({ status: 'confirmed', paymentStatus: 'pending' })
  }

  const navigateToOverdue = () => {
    setCurrentView('appointments')
    // Passar filtros para agendamentos atrasados (apenas confirmados que já passaram da data)
    setAppointmentFilters({ status: 'overdue', paymentStatus: null })
  }

  if (currentView === 'settings') {
    return <Settings user={user} onBack={() => setCurrentView('dashboard')} />
  }

  if (currentView === 'calculator') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-4">
        <Container className="space-y-4">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="text-green-100 hover:text-white transition-colors"
              >
                ← Voltar
              </button>
              <h1 className="text-xl font-bold">
                🧮 Calculadora
              </h1>
              <div></div>
            </div>
          </div>
          <PriceCalculator 
            user={user} 
            initialDate={quickAppointmentData.date}
            initialTime={quickAppointmentData.time}
            initialStatus={quickAppointmentData.status}
            onBackToCalendar={() => {
              setQuickAppointmentData({})
              setCurrentView('calendar')
            }}
          />
        </Container>
      </div>
    )
  }

  if (currentView === 'clients') {
    return <ClientsPage onBack={() => setCurrentView('dashboard')} user={user} />
  }

  if (currentView === 'appointments') {
    return <AppointmentsPage 
      onBack={() => setCurrentView('dashboard')} 
      user={user}
      initialFilter={appointmentFilters.status || 'all'}
      initialPaymentFilter={(appointmentFilters.paymentStatus === 'partial' ? 'pending' : appointmentFilters.paymentStatus) || 'all'}
    />
  }

  if (currentView === 'calendar') {
    return <CalendarPage 
      onBack={() => setCurrentView('dashboard')} 
      user={user} 
      onCreateAppointment={(date, time) => {
        setQuickAppointmentData({
          date,
          time,
          status: 'confirmed'
        })
        setCurrentView('calculator')
      }}
    />
  }

  if (currentView === 'financial') {
    return <FinancialDashboard onBack={() => setCurrentView('dashboard')} user={user} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-2">
      <Container className="space-y-3">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-3 rounded-2xl shadow-xl mb-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">
                💄 Dashboard
              </h1>
              <p className="text-pink-100 text-sm">
                Bem-vinda, {user?.email?.split('@')[0]}!
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-pink-100 hover:text-white transition-colors"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setCurrentView('calculator')}
            className="bg-gradient-to-br from-green-400 to-green-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <div className="text-2xl mb-1">🧮</div>
            <div className="text-xs font-semibold">Calculadora</div>
          </button>
          <button
            onClick={() => setCurrentView('clients')}
            className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <div className="text-2xl mb-1">👥</div>
            <div className="text-xs font-semibold">Clientes</div>
          </button>
          <button
            onClick={() => setCurrentView('appointments')}
            className="bg-gradient-to-br from-orange-400 to-red-500 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <div className="text-2xl mb-1">📅</div>
            <div className="text-xs font-semibold">Agendamentos</div>
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className="bg-gradient-to-br from-gray-400 to-gray-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <div className="text-2xl mb-1">⚙️</div>
            <div className="text-xs font-semibold">Config</div>
          </button>
          <button
            onClick={() => setCurrentView('calendar')}
            className="bg-gradient-to-br from-cyan-400 to-blue-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <div className="text-2xl mb-1">📅</div>
            <div className="text-xs font-semibold">Calendário</div>
          </button>
          <button
            onClick={() => setCurrentView('financial')}
            className="bg-gradient-to-br from-green-400 to-emerald-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <div className="text-2xl mb-1">💰</div>
            <div className="text-xs font-semibold">Financeiro</div>
          </button>
        </div>

        {/* Cards de Status */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white p-3 rounded-xl shadow-lg border-l-4 border-pink-500">
            <div className="text-center">
              <div className="text-sm text-gray-600 font-medium">Hoje</div>
              <div className="text-xl font-bold text-pink-600">
                {loading ? '...' : dashboardData.todayAppointments}
              </div>
              <div className="text-xs text-gray-500">agendamentos</div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-xl shadow-lg border-l-4 border-green-500">
            <div className="text-center">
              <div className="text-sm text-gray-600 font-medium">Pendente</div>
              <div className="text-base font-bold text-green-600">
                {loading ? '...' : `R$ ${dashboardData.todayRevenue.toFixed(2)}`}
              </div>
              <div className="text-xs text-gray-500">a receber hoje</div>
            </div>
          </div>
        </div>

        {/* Status Cards Adicionais */}
        <div className="grid grid-cols-3 gap-1 mb-4">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-2 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform" onClick={navigateToPendingConfirmation}>
            <div className="text-lg font-bold">
              {loading ? '...' : dashboardData.pendingAppointments}
            </div>
            <div className="text-xs opacity-90">Aguardando Confirmação</div>
          </div>
          <div className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white p-2 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform" onClick={navigateToPendingPayments}>
            <div className="text-lg font-bold">
              {loading ? '...' : dashboardData.pendingPayments}
            </div>
            <div className="text-xs opacity-90">Pendentes de Pagamento</div>
          </div>
          <div className="bg-gradient-to-br from-red-400 to-pink-500 text-white p-2 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform" onClick={navigateToOverdue}>
            <div className="text-lg font-bold">
              {loading ? '...' : dashboardData.overdueAppointments}
            </div>
            <div className="text-xs opacity-90">Pendências</div>
          </div>
        </div>

        {/* WhatsApp - Envio Rápido */}
        {/* <div className="bg-white p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            📱 Enviar WhatsApp
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📞 Número do Cliente
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="11987654321"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💬 Mensagem
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="space-y-2">
              <WhatsAppButton
                phoneNumber={phoneNumber}
                message={message}
                className="w-full"
              >
                📤 Enviar Mensagem
              </WhatsAppButton>

              <button
                onClick={() => {
                  setMessage(generateAppointmentMessage({
                    clientName: 'Cliente',
                    service: 'Maquiagem Profissional',
                    date: new Date().toLocaleDateString('pt-BR'),
                    time: '14:30',
                    location: 'A combinar',
                    price: 150.00,
                    notes: 'Agendamento confirmado'
                  }))
                }}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                📝 Usar Template de Agendamento
              </button>
            </div>
          </div>
        </div> */}

        {/* Próximos Agendamentos */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4">
            <h2 className="text-lg font-semibold flex items-center">
              📋 Próximos Agendamentos
            </h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
                Carregando agendamentos...
              </div>
            ) : dashboardData.upcomingAppointments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">📅</div>
                Nenhum agendamento futuro encontrado
              </div>
            ) : (
              dashboardData.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-900">
                      {appointment.clients?.name || 'Cliente não informado'}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status === 'confirmed' ? 'Confirmado' : 
                         appointment.status === 'pending' ? 'Aguardando Confirmação' :
                         appointment.status === 'completed' ? 'Concluído' : 'Cancelado'}
                      </span>
                      {isAppointmentOverdue(appointment) && (
                        <span className="text-orange-500 text-sm animate-pulse" title="Agendamento atrasado - atualizar status">
                          ⚠️
                        </span>
                      )}
                      <div className={`w-3 h-3 rounded-full ${
                        appointment.status === 'confirmed' ? 'bg-green-500' :
                        appointment.status === 'pending' ? 'bg-yellow-500' :
                        appointment.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                  💄 {getMainServiceName(appointment)}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>🕐 {appointment.scheduled_date ? 
                      formatDateTime(appointment.scheduled_date, appointment.scheduled_time) : 'Data não definida'
                    }</span>
                    <div className="flex items-center space-x-2">
                      {appointment.total_duration_minutes && (
                        <span className="text-blue-600">⏱️ {formatDuration(appointment.total_duration_minutes)}</span>
                      )}
                      <span className="font-semibold text-green-600">
                        R$ {calculateAppointmentTotal(appointment).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 bg-gray-50 border-t">
            <button 
              onClick={() => {
                setAppointmentFilters({ status: 'confirmed', paymentStatus: null })
                setCurrentView('appointments')
              }}
              className="w-full py-2 text-sm text-pink-600 font-semibold hover:text-pink-700 transition-colors"
            >
              Ver todos os agendamentos →
            </button>
          </div>
        </div>
      </Container>
    </div>
  )
}