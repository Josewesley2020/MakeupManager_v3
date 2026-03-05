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

interface DashboardProps {
  user: any
  onLogout: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'calculator' | 'clients' | 'appointments' | 'calendar' | 'financial'>('dashboard')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })
  
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

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('darkMode', newMode.toString())
  }

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
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-pink-50 via-white to-purple-50'
    }`}>
      {/* 
        ===== GUIA DE AJUSTE DE ALTURA VERTICAL =====
        
        1. HEADER (linha ~275):           py-1.5    → py-2 ou py-3 para mais altura
        2. MAIN CONTENT (linha ~309):     py-1.5 sm:py-2  → py-2 sm:py-3 para mais espaço
        3. ESPAÇO ENTRE SEÇÕES (linha ~309): space-y-1.5 sm:space-y-2  → space-y-2 sm:space-y-3
        4. GAP ENTRE COLUNAS (linha ~413): gap-1.5 sm:gap-2  → gap-2 sm:gap-3
        5. ESPAÇO ENTRE CARDS (linha ~417): space-y-1.5 sm:space-y-2  → space-y-2 sm:space-y-3
        6. PADDING CARDS HOJE/RECEITA (linha ~422): p-1.5 sm:p-2  → p-2 sm:p-3
        7. PADDING PENDÊNCIAS (linha ~451): p-1.5 sm:p-2  → p-2 sm:p-3
        8. PADDING MÉTRICAS MÊS (linha ~486): p-1.5 sm:p-2  → p-2 sm:p-3
        9. HEADER AGENDAMENTOS (linha ~527): p-1.5 sm:p-2  → p-2 sm:p-3
        10. ITEMS AGENDAMENTOS (linha ~551): p-1.5 sm:p-2  → p-2 sm:p-3
        
        REGRA: Valores menores = mais compacto | Valores maiores = mais espaçado
      */}
      {/* Header - ALTURA: py-1.5 (aumentar para py-2 ou py-3 se quiser mais espaço) */}
      <div className={`sticky top-0 z-30 shadow-lg transition-colors duration-300 ${
        darkMode
          ? 'bg-gradient-to-r from-gray-800 to-gray-900'
          : 'bg-gradient-to-r from-pink-500 to-purple-600'
      } text-white`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-base sm:text-lg font-bold flex items-center">
                💄 <span className="ml-2">Dashboard</span>
              </h1>
              <p className={`text-xs mt-0.5 ${
                darkMode ? 'text-gray-300' : 'text-pink-100'
              }`}>
                Bem-vinda, <span className="font-semibold">{user?.email?.split('@')[0]}</span>!
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className="flex items-center space-x-1.5 px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm border border-white/20"
                title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
              >
                <span className="text-base">{darkMode ? '☀️' : '🌙'}</span>
                <span className="hidden lg:inline text-xs font-medium">{darkMode ? 'Claro' : 'Escuro'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm border border-white/20"
              >
                <span className="hidden sm:inline text-xs font-medium">Sair</span>
                <span className="text-base">🚪</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - ALTURA VERTICAL: py-1.5 sm:py-2 (ajustar aqui para mais/menos espaço geral) */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2 space-y-1.5 sm:space-y-2">
        
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            onClick={() => setCurrentView('calculator')}
            className={`group p-2 sm:p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent transform hover:scale-105 ${
              darkMode
                ? 'bg-gray-800 hover:bg-gradient-to-br hover:from-green-500 hover:to-green-700 hover:border-green-400'
                : 'bg-white hover:bg-gradient-to-br hover:from-green-400 hover:to-green-600 hover:border-green-500'
            }`}
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🧮</div>
            <div className={`text-xs font-semibold transition-colors ${
              darkMode ? 'text-gray-200 group-hover:text-white' : 'text-gray-700 group-hover:text-white'
            }`}>
              Calculadora
            </div>
          </button>
          
          <button
            onClick={() => setCurrentView('clients')}
            className={`group p-2 sm:p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent transform hover:scale-105 ${
              darkMode
                ? 'bg-gray-800 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-700 hover:border-blue-400'
                : 'bg-white hover:bg-gradient-to-br hover:from-blue-400 hover:to-blue-600 hover:border-blue-500'
            }`}
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">👥</div>
            <div className={`text-xs font-semibold transition-colors ${
              darkMode ? 'text-gray-200 group-hover:text-white' : 'text-gray-700 group-hover:text-white'
            }`}>
              Clientes
            </div>
          </button>
          
          <button
            onClick={() => setCurrentView('appointments')}
            className={`group p-2 sm:p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent transform hover:scale-105 ${
              darkMode
                ? 'bg-gray-800 hover:bg-gradient-to-br hover:from-orange-500 hover:to-red-600 hover:border-red-400'
                : 'bg-white hover:bg-gradient-to-br hover:from-orange-400 hover:to-red-500 hover:border-red-500'
            }`}
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📅</div>
            <div className={`text-xs font-semibold transition-colors ${
              darkMode ? 'text-gray-200 group-hover:text-white' : 'text-gray-700 group-hover:text-white'
            }`}>
              Agendamentos
            </div>
          </button>
          
          <button
            onClick={() => setCurrentView('calendar')}
            className={`group p-2 sm:p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent transform hover:scale-105 ${
              darkMode
                ? 'bg-gray-800 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-blue-700 hover:border-blue-400'
                : 'bg-white hover:bg-gradient-to-br hover:from-cyan-400 hover:to-blue-600 hover:border-blue-500'
            }`}
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📆</div>
            <div className={`text-xs font-semibold transition-colors ${
              darkMode ? 'text-gray-200 group-hover:text-white' : 'text-gray-700 group-hover:text-white'
            }`}>
              Calendário
            </div>
          </button>
          
          <button
            onClick={() => setCurrentView('financial')}
            className={`group p-2 sm:p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent transform hover:scale-105 ${
              darkMode
                ? 'bg-gray-800 hover:bg-gradient-to-br hover:from-green-500 hover:to-emerald-700 hover:border-emerald-400'
                : 'bg-white hover:bg-gradient-to-br hover:from-green-400 hover:to-emerald-600 hover:border-emerald-500'
            }`}
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">💰</div>
            <div className={`text-xs font-semibold transition-colors ${
              darkMode ? 'text-gray-200 group-hover:text-white' : 'text-gray-700 group-hover:text-white'
            }`}>
              Financeiro
            </div>
          </button>
          
          <button
            onClick={() => setCurrentView('settings')}
            className={`group p-2 sm:p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent transform hover:scale-105 ${
              darkMode
                ? 'bg-gray-800 hover:bg-gradient-to-br hover:from-gray-600 hover:to-gray-700 hover:border-gray-500'
                : 'bg-white hover:bg-gradient-to-br hover:from-gray-400 hover:to-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">⚙️</div>
            <div className={`text-xs font-semibold transition-colors ${
              darkMode ? 'text-gray-200 group-hover:text-white' : 'text-gray-700 group-hover:text-white'
            }`}>
              Configurações
            </div>
          </button>
        </div>

        {/* Desktop: 3 Column Layout XL | 2 Column LG | Mobile: Stack */}
        {/* GAP ENTRE COLUNAS: gap-2 sm:gap-3 (ajustar para mais/menos espaço entre colunas) */}
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-2">
          
          {/* Left Column - Métricas */}
          {/* ESPAÇO ENTRE CARDS: space-y-1.5 sm:space-y-2 (ajustar para mais/menos espaço entre cards) */}
          <div className="space-y-1.5 sm:space-y-2">
            
            {/*Hoje - Cards Principais */}
            {/* PADDING DOS CARDS: p-2 sm:p-3 (ajustar para mais/menos altura nos cards) */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-1.5 sm:p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 border-pink-500 ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-lg sm:text-xl">📅</div>
                  {loading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-pink-500"></div>}
                </div>
                <div className={`text-xs font-medium mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Hoje</div>
                <div className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>
                  {loading ? '...' : dashboardData.todayAppointments}
                </div>
                <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>agendamentos</div>
              </div>
              
              <div className={`p-1.5 sm:p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 border-green-500 ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-lg sm:text-xl">💰</div>
                  {loading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-500"></div>}
                </div>
                <div className={`text-xs font-medium mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Receita Hoje</div>
                <div className={`text-base sm:text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {loading ? '...' : `R$ ${dashboardData.todayRevenue.toFixed(2)}`}
                </div>
                <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>a receber</div>
              </div>
            </div>

            {/* Status Cards - Pendências */}
            {/* PADDING DOS BOTÕES: p-1.5 sm:p-2 (ajustar altura dos botões de pendências) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={navigateToPendingConfirmation}
                className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-1.5 sm:p-2 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
              >
                <div className="text-lg sm:text-xl font-bold mb-0.5">
                  {loading ? '...' : dashboardData.pendingAppointments}
                </div>
                <div className="text-xs font-medium opacity-90">
                  Aguardando Confirmação
                </div>
              </button>
              
              <button
                onClick={navigateToPendingPayments}
                className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white p-1.5 sm:p-2 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
              >
                <div className="text-lg sm:text-xl font-bold mb-0.5">
                  {loading ? '...' : dashboardData.pendingPayments}
                </div>
                <div className="text-xs font-medium opacity-90">
                  Pagamentos Pendentes
                </div>
              </button>
              
              <button
                onClick={navigateToOverdue}
                className="bg-gradient-to-br from-red-400 to-pink-500 text-white p-1.5 sm:p-2 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
              >
                <div className="text-lg sm:text-xl font-bold mb-0.5">
                  {loading ? '...' : dashboardData.overdueAppointments}
                </div>
                <div className="text-xs font-medium opacity-90">
                  Pendências Atrasadas
                </div>
              </button>
            </div>

            {/* Métricas do Mês */}
            {/* PADDING: p-2 sm:p-3 (ajustar altura do card de métricas) */}
            <div className={`p-1.5 sm:p-2 rounded-lg shadow-md ${
              darkMode 
                ? 'bg-gradient-to-br from-purple-600 to-indigo-700' 
                : 'bg-gradient-to-br from-purple-500 to-indigo-600'
            } text-white`}>
              <h3 className="text-xs sm:text-sm font-bold mb-1 flex items-center">
                <span className="text-base sm:text-lg mr-1.5">📊</span>
                Métricas do Mês
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-white/10 backdrop-blur-sm p-1.5 sm:p-2 rounded-lg">
                  <div className="text-xs opacity-80 mb-0.5">Confirmados</div>
                  <div className="text-base sm:text-lg font-bold">
                    {loading ? '...' : dashboardData.confirmedAppointments}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-1.5 sm:p-2 rounded-lg">
                  <div className="text-xs opacity-80 mb-0.5">Concluídos</div>
                  <div className="text-base sm:text-lg font-bold">
                    {loading ? '...' : dashboardData.completedAppointments}
                  </div>
                </div>
                <div className="col-span-2 bg-white/10 backdrop-blur-sm p-1.5 sm:p-2 rounded-lg">
                  <div className="text-xs opacity-80 mb-0.5">Receita do Mês</div>
                  <div className="text-lg sm:text-xl font-bold">
                    {loading ? '...' : `R$ ${dashboardData.monthlyRevenue.toFixed(2)}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Próximos Agendamentos */}
          <div className="lg:row-span-2">{/* Próximos Agendamentos */}
        <div className={`rounded-lg shadow-md overflow-hidden h-full flex flex-col ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* HEADER PADDING: p-1.5 sm:p-2 (ajustar altura do header) */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-1.5 sm:p-2">
            <h2 className="text-sm sm:text-base font-bold flex items-center">
              <span className="text-base sm:text-lg mr-1.5">📋</span>
              Próximos Agendamentos
            </h2>
          </div>
          
          <div className={`flex-1 overflow-auto ${darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}`}>
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-pink-500 border-t-transparent mx-auto mb-2"></div>
                <p className={`font-medium text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Carregando agendamentos...</p>
              </div>
            ) : dashboardData.upcomingAppointments.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-3xl mb-2">📅</div>
                <p className={`font-medium text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nenhum agendamento futuro</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Crie um novo agendamento para começar</p>
              </div>
            ) : (
              /* PADDING DOS ITEMS: p-1.5 sm:p-2 (ajustar altura de cada agendamento na lista) */
              dashboardData.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className={`p-1.5 sm:p-2 transition-colors cursor-pointer group ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-pink-50'
                }`}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className={`font-bold text-xs sm:text-sm group-hover:text-pink-600 transition-colors ${
                        darkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {appointment.clients?.name || 'Cliente não informado'}
                      </div>
                      <div className={`text-xs mt-0.5 flex items-center ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span className="mr-1">💄</span>
                        {getMainServiceName(appointment)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${getStatusColor(appointment.status)}`}>
                        {appointment.status === 'confirmed' ? 'Confirmado' : 
                         appointment.status === 'pending' ? 'Pendente' :
                         appointment.status === 'completed' ? 'Concluído' : 'Cancelado'}
                      </span>
                      {isAppointmentOverdue(appointment) && (
                        <span className="text-orange-500 text-xs flex items-center animate-pulse" title="Agendamento atrasado">
                          <span className="mr-0.5">⚠️</span>
                          <span className="text-xs font-medium">Atrasado</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={`flex flex-wrap items-center gap-1.5 text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div className="flex items-center">
                      <span className="mr-0.5">🕐</span>
                      <span className="font-medium">
                        {appointment.scheduled_date ? 
                          formatDateTime(appointment.scheduled_date, appointment.scheduled_time) : 
                          'Data não definida'
                        }
                      </span>
                    </div>
                    {appointment.total_duration_minutes && (
                      <div className={`flex items-center ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        <span className="mr-0.5">⏱️</span>
                        <span className="font-medium">{formatDuration(appointment.total_duration_minutes)}</span>
                      </div>
                    )}
                    <div className={`flex items-center font-bold ml-auto ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      <span className="mr-0.5">💰</span>
                      <span>R$ {calculateAppointmentTotal(appointment).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className={`p-2 border-t ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <button 
              onClick={() => {
                setAppointmentFilters({ status: 'confirmed', paymentStatus: null })
                setCurrentView('appointments')
              }}
              className={`w-full py-1.5 text-xs font-bold rounded-lg transition-all ${
                darkMode 
                  ? 'text-pink-400 hover:text-pink-300 hover:bg-gray-600' 
                  : 'text-pink-600 hover:text-pink-700 hover:bg-pink-50'
              }`}
            >
              Ver todos os agendamentos →
            </button>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}