import React, { useState, useEffect } from 'react'
import { supabase, formatDate } from '../lib/supabase'
import { Settings } from './Settings'
import { PriceCalculator } from './PriceCalculator'
import ClientsPage from './ClientsPage'
import AppointmentsPage from './AppointmentsPage'
import CalendarPage from './CalendarPage'
import FinancialDashboard from './FinancialDashboard'

interface DashboardV2Props {
  user: any
  onLogout: () => void
}

export function DashboardV2({ user, onLogout }: DashboardV2Props) {
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'calculator' | 'clients' | 'appointments' | 'calendar' | 'financial'>('dashboard')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })
  
  const [quickAppointmentData, setQuickAppointmentData] = useState<{ date?: string; time?: string; status?: 'pending' | 'confirmed' }>({})
  const [appointmentFilters, setAppointmentFilters] = useState<{ status: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'overdue' | null; paymentStatus: 'all' | 'pending' | 'paid' | 'partial' | null }>({ status: null, paymentStatus: null })
  
  const [dashboardData, setDashboardData] = useState({
    todayAppointments: 0, todayRevenue: 0, pendingAppointments: 0, confirmedAppointments: 0,
    completedAppointments: 0, monthlyRevenue: 0, pendingPayments: 0, overdueAppointments: 0, upcomingAppointments: [] as any[]
  })
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')

  const fetchDashboardData = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const [metricsResult, upcomingResult, profileResult] = await Promise.all([
        supabase.rpc('get_dashboard_metrics', { p_user_id: user.id }),
        supabase.from('appointments').select(`*, total_duration_minutes, clients (name, phone), appointment_services (quantity, unit_price, total_price, services (name))`)
          .eq('user_id', user.id).eq('status', 'confirmed').gte('scheduled_date', new Date().toLocaleDateString('sv-SE'))
          .order('scheduled_date', { ascending: true }).order('scheduled_time', { ascending: true }).limit(5),
        supabase.from('profiles').select('full_name').eq('id', user.id).single()
      ])
      if (metricsResult.error) throw metricsResult.error
      if (upcomingResult.error) throw upcomingResult.error
      const metrics = metricsResult.data
      if (profileResult.data?.full_name) setUserName(profileResult.data.full_name)
      setDashboardData({
        todayAppointments: metrics?.today_appointments_count || 0, todayRevenue: metrics?.today_revenue_pending ||  0,
        pendingAppointments: metrics?.pending_appointments_count || 0, confirmedAppointments: metrics?.confirmed_appointments_month_count || 0,
        completedAppointments: metrics?.completed_appointments_month_count || 0, monthlyRevenue: metrics?.monthly_revenue_pending || 0,
        pendingPayments: metrics?.pending_payments_count || 0, overdueAppointments: metrics?.overdue_appointments_count || 0,
        upcomingAppointments: upcomingResult.data || []
      })
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboardData() }, [user?.id])

  const toggleDarkMode = () => { const newMode = !darkMode; setDarkMode(newMode); localStorage.setItem('darkMode', newMode.toString()) }
  const handleLogout = async () => { await supabase.auth.signOut(); onLogout() }
  const navigateToPendingConfirmation = () => { setCurrentView('appointments'); setAppointmentFilters({ status: 'pending', paymentStatus: null }) }
  const navigateToOverdue = () => { setCurrentView('appointments'); setAppointmentFilters({ status: 'overdue', paymentStatus: null }) }
  const handlePartnersClick = () => { alert('🤝 Funcionalidade "Parceiros" em breve!\n\nEm desenvolvimento para gerenciar colaboradores e fornecedores.') }

  const getMainServiceName = (appointment: any) => {
    if (!appointment.appointment_services || appointment.appointment_services.length === 0) return 'Serviço não especificado'
    const firstService = appointment.appointment_services[0]
    if (appointment.appointment_services.length === 1) return `${firstService.services?.name || 'Serviço'} (${firstService.quantity}x)`
    return `${appointment.appointment_services.length} serviços`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (currentView === 'settings') return <Settings user={user} onBack={() => setCurrentView('dashboard')} />
  if (currentView === 'calculator') {
    return (
      <div className="min-h-[90vh] bg-gradient-to-br from-pink-50 via-white to-purple-50 py-4">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentView('dashboard')} className="text-green-100 hover:text-white">← Voltar</button>
              <h1 className="text-lg font-bold">🧮 Calculadora</h1>
              <div></div>
            </div>
          </div>
          <PriceCalculator user={user} initialDate={quickAppointmentData.date} initialTime={quickAppointmentData.time} initialStatus={quickAppointmentData.status}
            onBackToCalendar={() => { setQuickAppointmentData({}); setCurrentView('calendar') }} />
        </div>
      </div>
    )
  }
  if (currentView === 'clients') return <ClientsPage onBack={() => setCurrentView('dashboard')} user={user} />
  if (currentView === 'appointments') return <AppointmentsPage onBack={() => setCurrentView('dashboard')} user={user}
    initialFilter={appointmentFilters.status || 'all'} initialPaymentFilter={(appointmentFilters.paymentStatus === 'partial' ? 'pending' : appointmentFilters.paymentStatus) || 'all'} />
  if (currentView === 'calendar') return <CalendarPage onBack={() => setCurrentView('dashboard')} user={user} 
    onCreateAppointment={(date, time) => { setQuickAppointmentData({ date, time, status: 'confirmed' }); setCurrentView('calculator') }} />
  if (currentView === 'financial') return <FinancialDashboard onBack={() => setCurrentView('dashboard')} user={user} />

  // DASHBOARD V2 - COMPACTO
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 via-white to-purple-50'}`}>
      {/* Header Compacto */}
      <div className={`sticky top-0 z-30 shadow-md ${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-gradient-to-r from-pink-500 to-purple-600'} text-white`}>
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-base font-bold flex items-center">💄 <span className="ml-2">Dashboard V2</span></h1>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-pink-100'}`}>Bem-vinda, <span className="font-semibold">{userName || user?.email?.split('@')[0]}</span>!</p>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={toggleDarkMode} className="px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm">{darkMode ? '☀️' : '🌙'}</button>
              <button onClick={handleLogout} className="px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm">🚪</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
        {/* ALERTAS - Borda Lateral */}
        <div className="grid md:grid-cols-2 gap-2">
          <button onClick={navigateToPendingConfirmation} disabled={loading}
            className={`group rounded-lg shadow hover:shadow-md transition p-3 text-left border-l-4 ${
              darkMode ? 'bg-gray-800/70 border-yellow-500 hover:bg-gray-800' : 'bg-yellow-50/80 border-yellow-500 hover:bg-yellow-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">⏰</span>
                <div>
                  <h3 className={`text-sm font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>Aguardando Confirmação</h3>
                  <p className={`text-xs ${darkMode ? 'text-yellow-500/70' : 'text-yellow-700/70'}`}>
                    {dashboardData.pendingAppointments === 0 ? 'Tudo ok' : `${dashboardData.pendingAppointments} pendente${dashboardData.pendingAppointments > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              {loading ? <div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full"></div> :
                <div className={`text-xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{dashboardData.pendingAppointments}</div>}
            </div>
          </button>

          <button onClick={navigateToOverdue} disabled={loading}
            className={`group rounded-lg shadow hover:shadow-md transition p-3 text-left border-l-4 ${
              darkMode ? 'bg-gray-800/70 border-red-500 hover:bg-gray-800' : 'bg-red-50/80 border-red-500 hover:bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className={`text-sm font-bold ${darkMode ? 'text-red-300' : 'text-red-800'}`}>Aguardando Conclusão</h3>
                  <p className={`text-xs ${darkMode ? 'text-red-500/70' : 'text-red-700/70'}`}>
                    {dashboardData.overdueAppointments === 0 ? 'Tudo em dia' : `${dashboardData.overdueAppointments} atrasado${dashboardData.overdueAppointments > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              {loading ? <div className="animate-spin h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full"></div> :
                <div className={`text-xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{dashboardData.overdueAppointments}</div>}
            </div>
          </button>
        </div>

        {/* FERRAMENTAS */}
        <div>
          <h2 className={`text-xs font-semibold mb-2 uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>🛠️ Ferramentas</h2>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCurrentView('calculator')}
              className={`group rounded-lg shadow hover:shadow-lg transition p-4 text-center ${
                darkMode ? 'bg-gray-800 hover:bg-green-900/20 border border-gray-700' : 'bg-white hover:bg-green-50 border border-gray-200'}`}>
              <div className="text-3xl mb-1.5 transform group-hover:scale-110 transition-transform">🧮</div>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Calculadora</h3>
            </button>
            <button onClick={() => setCurrentView('calendar')}
              className={`group rounded-lg shadow hover:shadow-lg transition p-4 text-center ${
                darkMode ? 'bg-gray-800 hover:bg-blue-900/20 border border-gray-700' : 'bg-white hover:bg-blue-50 border border-gray-200'}`}>
              <div className="text-3xl mb-1.5 transform group-hover:scale-110 transition-transform">📆</div>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Agenda</h3>
            </button>
          </div>
        </div>

        {/* LAYOUT 2 COLUNAS */}
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-3">
            {/* MÉTRICAS HOJE */}
            <div>
              <h2 className={`text-xs font-semibold mb-2 uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>📊 Hoje</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-lg p-3 flex items-center space-x-2 ${darkMode ? 'bg-pink-900/20 border border-pink-800/30' : 'bg-pink-50 border border-pink-200'}`}>
                  <span className="text-xl">📅</span>
                  <div className="flex-1">
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Agendamentos</div>
                    <div className={`text-xl font-bold ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>{loading ? '...' : dashboardData.todayAppointments}</div>
                  </div>
                </div>
                <div className={`rounded-lg p-3 flex items-center space-x-2 ${darkMode ? 'bg-green-900/20 border border-green-800/30' : 'bg-green-50 border border-green-200'}`}>
                  <span className="text-xl">💰</span>
                  <div className="flex-1">
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Receita</div>
                    <div className={`text-base font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{loading ? '...' : `R$ ${dashboardData.todayRevenue.toFixed(2)}`}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PRÓXIMOS AGENDAMENTOS */}
            <div>
              <h2 className={`text-xs font-semibold mb-2 uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>📋 Próximos</h2>
              <div className={`rounded-lg overflow-hidden border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                {loading ? (
                  <div className="p-4 text-center"><div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div></div>
                ) : dashboardData.upcomingAppointments.length === 0 ? (
                  <div className="p-4 text-center">
                    <div className="text-2xl mb-1">📭</div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Nenhum agendamento</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {dashboardData.upcomingAppointments.map((apt: any) => (
                      <div key={apt.id} onClick={() => setCurrentView('appointments')} className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 mb-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(apt.status)}`}>✓</span>
                              <span className={`text-sm font-semibold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{apt.clients?.name || 'Cliente'}</span>
                            </div>
                            <div className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{getMainServiceName(apt)}</div>
                            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>📅 {formatDate(apt.scheduled_date)}{apt.scheduled_time && ` ${apt.scheduled_time}`}</div>
                          </div>
                          <div className={`text-sm font-bold ml-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>R$ {apt.payment_total_appointment?.toFixed(2) || '0'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MENUS */}
          <div className="space-y-3">
            <div>
              <h2 className={`text-xs font-semibold mb-2 uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>🔗 Acesso</h2>
              <div className="space-y-1.5">
                <button onClick={() => setCurrentView('clients')}
                  className={`w-full rounded-lg p-2.5 text-left flex items-center space-x-2 transition ${
                    darkMode ? 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700' : 'bg-white hover:bg-gray-50 border border-gray-200'}`}>
                  <span className="text-xl">👥</span>
                  <span className={`flex-1 text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Clientes</span>
                  <span className="text-gray-400 text-sm">→</span>
                </button>
                <button onClick={handlePartnersClick}
                  className={`w-full rounded-lg p-2.5 text-left flex items-center space-x-2 transition ${
                    darkMode ? 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700' : 'bg-white hover:bg-gray-50 border border-gray-200'}`}>
                  <span className="text-xl">🤝</span>
                  <span className={`flex-1 text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Parceiros <span className="text-xs bg-yellow-400 text-yellow-900 px-1 py-0.5 rounded">breve</span></span>
                  <span className="text-gray-400 text-sm">→</span>
                </button>
                <button onClick={() => setCurrentView('settings')}
                  className={`w-full rounded-lg p-2.5 text-left flex items-center space-x-2 transition ${
                    darkMode ? 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700' : 'bg-white hover:bg-gray-50 border border-gray-200'}`}>
                  <span className="text-xl">⚙️</span>
                  <span className={`flex-1 text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Configurações</span>
                  <span className="text-gray-400 text-sm">→</span>
                </button>
              </div>
            </div>

            <div>
              <h2 className={`text-xs font-semibold mb-2 uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>📈 Outros</h2>
              <div className="space-y-1.5">
                <button onClick={() => setCurrentView('appointments')}
                  className={`w-full rounded-lg p-2 text-left flex items-center space-x-2 transition ${
                    darkMode ? 'bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}>
                  <span className="text-lg">📅</span>
                  <span className={`flex-1 text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Agendamentos</span>
                  <span className="text-gray-400 text-xs">→</span>
                </button>
                <button onClick={() => setCurrentView('financial')}
                  className={`w-full rounded-lg p-2 text-left flex items-center space-x-2 transition ${
                    darkMode ? 'bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}>
                  <span className="text-lg">💰</span>
                  <span className={`flex-1 text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Relatório</span>
                  <span className="text-gray-400 text-xs">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
