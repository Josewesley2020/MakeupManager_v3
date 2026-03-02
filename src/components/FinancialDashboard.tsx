import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Container } from './Container'

interface FinancialDashboardProps {
  user: any
  onBack: () => void
}

interface FinancialData {
  // Valores Totais
  totalReceivable: number // Total a receber (pendente)
  totalReceived: number // Total já recebido
  totalRevenue: number // Receita total (recebido + a receber)
  
  // Por Período
  monthReceivable: number
  monthReceived: number
  monthRevenue: number
  
  weekReceivable: number
  weekReceived: number
  weekRevenue: number
  
  todayReceivable: number
  todayReceived: number
  todayRevenue: number
  
  // Estatísticas
  overdueAmount: number // Atendimentos atrasados não pagos
  customPriceCount: number // Quantidade de valores personalizados
  averageTicket: number // Ticket médio
  
  // Detalhes
  appointmentsByStatus: {
    pending: number
    confirmed: number
    completed: number
    cancelled: number
  }
  
  appointmentsByPayment: {
    pending: number
    paid: number
    partial: number
  }
}

interface AppointmentDetail {
  id: string
  scheduled_date: string
  scheduled_time: string | null
  status: string
  payment_status: string
  payment_total_appointment: number
  total_amount_paid: number
  is_custom_price: boolean
  client: {
    name: string
    phone?: string
  }
}

export default function FinancialDashboard({ user, onBack }: FinancialDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalReceivable: 0,
    totalReceived: 0,
    totalRevenue: 0,
    monthReceivable: 0,
    monthReceived: 0,
    monthRevenue: 0,
    weekReceivable: 0,
    weekReceived: 0,
    weekRevenue: 0,
    todayReceivable: 0,
    todayReceived: 0,
    todayRevenue: 0,
    overdueAmount: 0,
    customPriceCount: 0,
    averageTicket: 0,
    appointmentsByStatus: { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
    appointmentsByPayment: { pending: 0, paid: 0, partial: 0 }
  })
  
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month')
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentDetail[]>([])
  const [overdueAppointments, setOverdueAppointments] = useState<AppointmentDetail[]>([])
  const [showDetails, setShowDetails] = useState<'pending' | 'overdue' | null>(null)

  useEffect(() => {
    loadFinancialData()
  }, [user])

  const loadFinancialData = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Calcular datas
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Buscar todos os agendamentos
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          status,
          payment_status,
          payment_total_appointment,
          total_amount_paid,
          is_custom_price,
          clients!inner (
            name,
            phone
          )
        `)
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: false })

      if (error) throw error

      const allAppointments = appointments || []

      // Calcular métricas
      let totalReceivable = 0
      let totalReceived = 0
      let monthReceivable = 0
      let monthReceived = 0
      let weekReceivable = 0
      let weekReceived = 0
      let todayReceivable = 0
      let todayReceived = 0
      let overdueAmount = 0
      let customPriceCount = 0
      let totalCompletedValue = 0
      let completedCount = 0

      const pendingList: AppointmentDetail[] = []
      const overdueList: AppointmentDetail[] = []

      const statusCount = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
      const paymentCount = { pending: 0, paid: 0, partial: 0 }

      allAppointments.forEach((apt: any) => {
        const appointmentDate = new Date(apt.scheduled_date + 'T00:00:00')
        const totalValue = apt.payment_total_appointment || 0
        const paidValue = apt.total_amount_paid || 0
        const pendingValue = totalValue - paidValue
        const isOverdue = appointmentDate < today && (apt.status === 'confirmed' || apt.status === 'pending')
        
        // Acessar dados do cliente corretamente
        const clientData = Array.isArray(apt.clients) ? apt.clients[0] : apt.clients

        // Contadores de status
        statusCount[apt.status as keyof typeof statusCount]++
        
        // Contadores de pagamento
        if (apt.payment_status === 'paid') {
          paymentCount.paid++
        } else if (paidValue > 0 && paidValue < totalValue) {
          paymentCount.partial++
        } else {
          paymentCount.pending++
        }

        // Valores personalizados
        if (apt.is_custom_price) customPriceCount++

        // Apenas considerar agendamentos confirmados ou concluídos (não cancelados e não pendentes)
        if (apt.status !== 'cancelled' && apt.status !== 'pending') {
          // Total geral
          totalReceived += paidValue
          if (pendingValue > 0) {
            totalReceivable += pendingValue
          }

          // Mês atual
          if (appointmentDate >= monthStart) {
            monthReceived += paidValue
            if (pendingValue > 0) monthReceivable += pendingValue
          }

          // Última semana
          if (appointmentDate >= weekAgo) {
            weekReceived += paidValue
            if (pendingValue > 0) weekReceivable += pendingValue
          }

          // Hoje
          if (appointmentDate.toDateString() === today.toDateString()) {
            todayReceived += paidValue
            if (pendingValue > 0) todayReceivable += pendingValue
          }

          // Atrasados (apenas confirmados que estão atrasados)
          if (isOverdue && pendingValue > 0 && apt.status === 'confirmed') {
            overdueAmount += pendingValue
            overdueList.push({
              id: apt.id,
              scheduled_date: apt.scheduled_date,
              scheduled_time: apt.scheduled_time,
              status: apt.status,
              payment_status: apt.payment_status,
              payment_total_appointment: totalValue,
              total_amount_paid: paidValue,
              is_custom_price: apt.is_custom_price || false,
              client: {
                name: clientData?.name || 'Cliente não informado',
                phone: clientData?.phone
              }
            })
          }

          // Pendentes (futuros ou atuais - apenas confirmados)
          if (!isOverdue && pendingValue > 0 && apt.status === 'confirmed') {
            pendingList.push({
              id: apt.id,
              scheduled_date: apt.scheduled_date,
              scheduled_time: apt.scheduled_time,
              status: apt.status,
              payment_status: apt.payment_status,
              payment_total_appointment: totalValue,
              total_amount_paid: paidValue,
              is_custom_price: apt.is_custom_price || false,
              client: {
                name: clientData?.name || 'Cliente não informado',
                phone: clientData?.phone
              }
            })
          }

          // Ticket médio (apenas completados)
          if (apt.status === 'completed') {
            totalCompletedValue += totalValue
            completedCount++
          }
        }
      })

      const averageTicket = completedCount > 0 ? totalCompletedValue / completedCount : 0

      setFinancialData({
        totalReceivable,
        totalReceived,
        totalRevenue: totalReceived + totalReceivable,
        monthReceivable,
        monthReceived,
        monthRevenue: monthReceived + monthReceivable,
        weekReceivable,
        weekReceived,
        weekRevenue: weekReceived + weekReceivable,
        todayReceivable,
        todayReceived,
        todayRevenue: todayReceived + todayReceivable,
        overdueAmount,
        customPriceCount,
        averageTicket,
        appointmentsByStatus: statusCount,
        appointmentsByPayment: paymentCount
      })

      setPendingAppointments(pendingList)
      setOverdueAppointments(overdueList)

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
      alert('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  // Selecionar dados baseado no período
  const getPeriodData = () => {
    switch (selectedPeriod) {
      case 'today':
        return {
          receivable: financialData.todayReceivable,
          received: financialData.todayReceived,
          revenue: financialData.todayRevenue
        }
      case 'week':
        return {
          receivable: financialData.weekReceivable,
          received: financialData.weekReceived,
          revenue: financialData.weekRevenue
        }
      case 'month':
        return {
          receivable: financialData.monthReceivable,
          received: financialData.monthReceived,
          revenue: financialData.monthRevenue
        }
      case 'all':
      default:
        return {
          receivable: financialData.totalReceivable,
          received: financialData.totalReceived,
          revenue: financialData.totalRevenue
        }
    }
  }

  const periodData = getPeriodData()

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados financeiros...</p>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white p-6 rounded-2xl shadow-xl mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="text-white hover:text-green-100 transition-colors"
            >
              ← Voltar
            </button>
            <h1 className="text-2xl font-bold flex items-center">
              <span className="mr-2">💰</span>
              Dashboard Financeiro
            </h1>
            <button
              onClick={loadFinancialData}
              className="text-white hover:text-green-100 transition-colors"
              title="Atualizar dados"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Seletor de Período */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedPeriod('today')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === 'today'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📅 Hoje
            </button>
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === 'week'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Última Semana
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === 'month'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📈 Mês Atual
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === 'all'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌍 Todos os Períodos
            </button>
          </div>
        </div>

        {/* Cards Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Receita Total */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4 sm:p-6 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold truncate">💵 Receita Total</h3>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">📊</span>
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 break-words">{formatCurrency(periodData.revenue)}</p>
            <p className="text-blue-100 text-xs">Recebido + A Receber</p>
          </div>

          {/* Já Recebido */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 sm:p-6 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold truncate">✅ Já Recebido</h3>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">💰</span>
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 break-words">{formatCurrency(periodData.received)}</p>
            <p className="text-green-100 text-xs">
              {periodData.revenue > 0 
                ? `${((periodData.received / periodData.revenue) * 100).toFixed(1)}% do total`
                : 'Nenhuma receita'}
            </p>
          </div>

          {/* A Receber */}
          <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 sm:p-6 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold truncate">⏳ A Receber</h3>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">💳</span>
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 break-words">{formatCurrency(periodData.receivable)}</p>
            <p className="text-orange-100 text-xs">
              {periodData.revenue > 0
                ? `${((periodData.receivable / periodData.revenue) * 100).toFixed(1)}% do total`
                : 'Nenhum valor pendente'}
            </p>
          </div>
        </div>

        {/* Cards Secundários */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Atrasados */}
          <div 
            className="bg-white p-3 sm:p-4 rounded-xl shadow-md border-l-4 border-red-500 cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
            onClick={() => setShowDetails('overdue')}
          >
            <div className="text-center">
              <div className="text-3xl sm:text-4xl mb-2">⚠️</div>
              <p className="text-xs text-gray-600 mb-1 truncate">Atrasados</p>
              <p className="text-base sm:text-lg font-bold text-red-600 break-words">{formatCurrency(financialData.overdueAmount)}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">{overdueAppointments.length} atend.</p>
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-md border-l-4 border-purple-500 overflow-hidden">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl mb-2">📈</div>
              <p className="text-xs text-gray-600 mb-1 truncate">Ticket Médio</p>
              <p className="text-base sm:text-lg font-bold text-purple-600 break-words">{formatCurrency(financialData.averageTicket)}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">Média por atend.</p>
            </div>
          </div>

          {/* Valores Personalizados */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-md border-l-4 border-indigo-500 overflow-hidden">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl mb-2">✨</div>
              <p className="text-xs text-gray-600 mb-1 truncate">Personalizados</p>
              <p className="text-base sm:text-lg font-bold text-indigo-600">{financialData.customPriceCount}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">Valores difer.</p>
            </div>
          </div>

          {/* Pendentes */}
          <div 
            className="bg-white p-3 sm:p-4 rounded-xl shadow-md border-l-4 border-yellow-500 cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
            onClick={() => setShowDetails('pending')}
          >
            <div className="text-center">
              <div className="text-3xl sm:text-4xl mb-2">⏰</div>
              <p className="text-xs text-gray-600 mb-1 truncate">Pendentes</p>
              <p className="text-base sm:text-lg font-bold text-yellow-600 break-words">{formatCurrency(periodData.receivable - financialData.overdueAmount)}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">{pendingAppointments.length} atend.</p>
            </div>
          </div>
        </div>

        {/* Gráficos de Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Status dos Agendamentos */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md overflow-hidden">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center truncate">
              <span className="mr-2">📊</span>
              Status dos Agendamentos
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-gray-600 truncate">⏳ Aguardando</span>
                <span className="text-sm sm:text-base font-bold text-yellow-600 flex-shrink-0">{financialData.appointmentsByStatus.pending}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-gray-600 truncate">✅ Confirmados</span>
                <span className="text-sm sm:text-base font-bold text-green-600 flex-shrink-0">{financialData.appointmentsByStatus.confirmed}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-gray-600 truncate">🎉 Concluídos</span>
                <span className="text-sm sm:text-base font-bold text-blue-600 flex-shrink-0">{financialData.appointmentsByStatus.completed}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-gray-600 truncate">❌ Cancelados</span>
                <span className="text-sm sm:text-base font-bold text-red-600 flex-shrink-0">{financialData.appointmentsByStatus.cancelled}</span>
              </div>
            </div>
          </div>

          {/* Status de Pagamento */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md overflow-hidden">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center truncate">
              <span className="mr-2">💳</span>
              Status de Pagamento
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-gray-600 truncate">⏳ Pendente</span>
                <span className="text-sm sm:text-base font-bold text-orange-600 flex-shrink-0">{financialData.appointmentsByPayment.pending}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-gray-600 truncate">✅ Pago</span>
                <span className="text-sm sm:text-base font-bold text-green-600 flex-shrink-0">{financialData.appointmentsByPayment.paid}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Detalhes */}
        {showDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className={`${showDetails === 'overdue' ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'} text-white p-6`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">
                    {showDetails === 'overdue' ? '🚨 Atendimentos Atrasados' : '📋 Atendimentos Pendentes'}
                  </h3>
                  <button
                    onClick={() => setShowDetails(null)}
                    className="text-white hover:text-gray-200 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6">
                {(showDetails === 'overdue' ? overdueAppointments : pendingAppointments).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-gray-500">
                      {showDetails === 'overdue' 
                        ? 'Nenhum atendimento atrasado!' 
                        : 'Nenhum pagamento pendente!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(showDetails === 'overdue' ? overdueAppointments : pendingAppointments).map((apt) => (
                      <div key={apt.id} className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-gray-900">{apt.client.name}</p>
                            {apt.client.phone && (
                              <p className="text-sm text-gray-600">📞 {apt.client.phone}</p>
                            )}
                          </div>
                          {apt.is_custom_price && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                              💎 Personalizado
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">📅 Data:</span>
                            <p className="font-semibold">{formatDate(apt.scheduled_date)}</p>
                          </div>
                          {apt.scheduled_time && (
                            <div>
                              <span className="text-gray-600">⏰ Horário:</span>
                              <p className="font-semibold">{apt.scheduled_time}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">💰 Total:</span>
                            <p className="font-semibold text-blue-600">{formatCurrency(apt.payment_total_appointment)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">✅ Pago:</span>
                            <p className="font-semibold text-green-600">{formatCurrency(apt.total_amount_paid)}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700">💳 Pendente:</span>
                            <span className="text-lg font-bold text-orange-600">
                              {formatCurrency(apt.payment_total_appointment - apt.total_amount_paid)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
