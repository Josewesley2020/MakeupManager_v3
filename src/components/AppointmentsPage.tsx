import React, { useState, useEffect } from 'react'
import { supabase, formatDuration, formatDate, formatDateTime } from '../lib/supabase'
import PaymentService from '../lib/PaymentService'
import { Container } from './Container'

interface AppointmentsPageProps {
  user: any
  onBack: () => void
  initialFilter?: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'overdue'
  initialPaymentFilter?: 'all' | 'pending' | 'paid'
}

interface Appointment {
  id: string
  created_at: string
  scheduled_date: string | null
  scheduled_time: string | null
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  appointment_address: string | null
  payment_total_service: number
  travel_fee: number
  payment_total_appointment: number
  payment_status: 'pending' | 'paid'
  total_amount_paid: number
  total_duration_minutes: number
  is_custom_price: boolean
  notes: string | null
  client: any // Simplificar para any por enquanto
  service_area: any // Simplificar para any por enquanto
  appointment_services: any[] // Simplificar para any por enquanto
}

export default function AppointmentsPage({ user, onBack, initialFilter = 'all', initialPaymentFilter = 'all' }: AppointmentsPageProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'overdue'>(initialFilter)
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid'>(initialPaymentFilter)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [editForm, setEditForm] = useState({
    status: 'pending' as 'pending' | 'confirmed' | 'completed' | 'cancelled',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
    payment_status: 'pending' as 'pending' | 'paid',
    total_amount_paid: 0,
    payment_total_service: 0,
    travel_fee: 0
  })

  useEffect(() => {
    loadAppointments()
  }, [user])

  // Função para garantir que o campo total_duration_minutes existe
  const ensureTotalDurationField = async () => {
    try {
      // Tentar fazer uma query que usa o campo
      const { data, error } = await supabase
        .from('appointments')
        .select('id, total_duration_minutes')
        .limit(1)

      if (error && error.message.includes('total_duration_minutes')) {
        console.warn('Campo total_duration_minutes não encontrado no banco de dados')
        console.warn('Por favor, execute a migração: database/add-total-duration-field.sql no Supabase Dashboard')
        // Não bloquear o carregamento, apenas mostrar aviso
      }
    } catch (err) {
      console.warn('Erro ao verificar campo total_duration_minutes:', err)
    }
  }

  // Função helper para verificar se agendamento está atrasado
  const isAppointmentOverdue = (appointment: any) => {
    if (!appointment.scheduled_date) return false
    
    const appointmentDate = new Date(appointment.scheduled_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Zera horas para comparar apenas datas
    
    // Se a data já passou e o status ainda é confirmado ou pendente
    return appointmentDate < today && (appointment.status === 'confirmed' || appointment.status === 'pending')
  }

  // Função helper para verificar se agendamento está próximo (menos de 7 dias)
  const isAppointmentUpcoming = (appointment: any) => {
    if (!appointment.scheduled_date) return false
    
    const appointmentDate = new Date(appointment.scheduled_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Zera horas para comparar apenas datas
    
    // Calcula diferença em dias
    const diffTime = appointmentDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Está próximo se for hoje ou nos próximos 7 dias (incluindo hoje)
    return diffDays >= 0 && diffDays <= 7 && (appointment.status === 'confirmed' || appointment.status === 'pending')
  }

  const loadAppointments = async () => {
    if (!user || !user.id) return

    setLoading(true)
    setError(null)

    try {
      // Primeiro, garantir que a migração do campo total_duration_minutes foi executada
      await ensureTotalDurationField()

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          created_at,
          scheduled_date,
          scheduled_time,
          status,
          appointment_address,
          payment_total_service,
          travel_fee,
          payment_total_appointment,
          payment_status,
          total_amount_paid,
          total_duration_minutes,
          is_custom_price,
          notes,
          client:clients(id, name, phone),
          service_area:service_areas(id, name),
          appointment_services(
            quantity,
            unit_price,
            total_price,
            service:services(id, name)
          )
        `)
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })

      if (error) throw error

      setAppointments(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar agendamentos:', err)
      setError(err.message || 'Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  const filteredAppointments = appointments.filter(appointment => {
    // Filtro especial para agendamentos atrasados
    if (filter === 'overdue') {
      // Apenas agendamentos confirmados que já passaram da data
      if (appointment.status !== 'confirmed') return false
      if (!isAppointmentOverdue(appointment)) return false
    } else {
      // Filtro normal por status
      if (filter !== 'all' && appointment.status !== filter) return false
    }

    // Filtro por status de pagamento
    if (paymentFilter !== 'all' && appointment.payment_status !== paymentFilter) return false

    // Filtro por busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const clientName = appointment.client?.name?.toLowerCase() || ''
      const servicesText = appointment.appointment_services
        ?.map(as => as.service?.name?.toLowerCase())
        .join(' ') || ''

      if (!clientName.includes(searchLower) && !servicesText.includes(searchLower)) {
        return false
      }
    }

    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return ''
    return timeString
  }

  const toggleCardExpansion = (appointmentId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(appointmentId)) {
      newExpanded.delete(appointmentId)
    } else {
      newExpanded.add(appointmentId)
    }
    setExpandedCards(newExpanded)
  }

  const openInMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    window.open(mapsUrl, '_blank')
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Poderia adicionar um toast de sucesso aqui
    } catch (err) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  const startEditing = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setEditForm({
      status: appointment.status,
      scheduled_date: appointment.scheduled_date || '',
      scheduled_time: appointment.scheduled_time || '',
      notes: appointment.notes || '',
      payment_status: appointment.payment_status,
      total_amount_paid: appointment.total_amount_paid || 0,
      payment_total_service: appointment.payment_total_service,
      travel_fee: appointment.travel_fee
    })
  }

  const cancelEditing = () => {
    setEditingAppointment(null)
    setEditForm({
      status: 'pending',
      scheduled_date: '',
      scheduled_time: '',
      notes: '',
      payment_status: 'pending',
      total_amount_paid: 0,
      payment_total_service: 0,
      travel_fee: 0
    })
  }

  const saveAppointment = async () => {
    if (!editingAppointment || !user?.id) return

    try {
      // Verificar se os valores financeiros foram editados
      const wasServiceValueEdited = editForm.payment_total_service !== editingAppointment.payment_total_service
      const wasTravelFeeEdited = editForm.travel_fee !== editingAppointment.travel_fee
      const wasFinancialDataEdited = wasServiceValueEdited || wasTravelFeeEdited

      // Calcular novo valor total do atendimento
      const newTotalAppointment = editForm.payment_total_service + editForm.travel_fee

      const { error } = await supabase
        .from('appointments')
        .update({
          status: editForm.status,
          scheduled_date: editForm.scheduled_date || null,
          scheduled_time: editForm.scheduled_time || null,
          notes: editForm.notes || null,
          total_amount_paid: editForm.total_amount_paid,
          payment_status: editForm.payment_status,
          payment_total_service: editForm.payment_total_service,
          travel_fee: editForm.travel_fee,
          payment_total_appointment: newTotalAppointment,
          is_custom_price: wasFinancialDataEdited ? true : editingAppointment.is_custom_price || false
        })
        .eq('id', editingAppointment.id)
        .eq('user_id', user.id)

      if (error) throw error

      // Recarregar agendamentos
      await loadAppointments()
      cancelEditing()
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err)
      alert(`Erro ao salvar: ${err.message}`)
    }
  }

  const sendReminder = async (appointment: Appointment) => {
    if (!appointment.client?.phone) {
      alert('Cliente não possui telefone cadastrado')
      return
    }

    try {
      // Formatar número do WhatsApp
      const cleanNumber = appointment.client.phone.replace(/\D/g, '')
      const whatsappNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`

      // Calcular dias até o agendamento
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const appointmentDate = new Date(appointment.scheduled_date)
      const diffTime = appointmentDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // Criar mensagem de lembrete
      const reminderMessage = `*LEMBRETE DE AGENDAMENTO*

Ola ${appointment.client.name}!

Seu agendamento esta chegando!
Data: ${appointment.scheduled_date ? formatDate(appointment.scheduled_date) : 'Nao definida'}
Horario: ${appointment.scheduled_time || 'Nao definido'}
Local: ${appointment.appointment_address || 'A combinar'}

Servicos:
${appointment.appointment_services?.length > 0
  ? appointment.appointment_services.map(s => `• ${s.service?.name} (${s.quantity}x)`).join('\n')
  : 'Servicos a confirmar'}

Valor Total: R$ ${appointment.payment_total_appointment.toFixed(2)}
Valor Pago: R$ ${appointment.total_amount_paid.toFixed(2)}
Valor Pendente: R$ ${(appointment.payment_total_appointment - appointment.total_amount_paid).toFixed(2)}

${diffDays === 0 ? 'HOJE!' : diffDays === 1 ? 'AMANHA!' : `Em ${diffDays} dias!`}

Por favor, confirme sua presenca ou entre em contato se precisar reagendar.

Enviado via MakeUp Manager`

      // Codificar mensagem para URL
      const encodedMessage = encodeURIComponent(reminderMessage)
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`

      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank')

      // Atualizar status do lembrete no banco (opcional)
      await supabase
        .from('appointments')
        .update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString(),
          reminder_message: reminderMessage
        })
        .eq('id', appointment.id)
        .eq('user_id', user.id)

    } catch (err: any) {
      console.error('Erro ao enviar lembrete:', err)
      alert(`Erro ao enviar lembrete: ${err.message}`)
    }
  }

  const sendWhatsApp = async (appointment: Appointment) => {
    if (!appointment.client?.phone) {
      alert('Cliente não possui telefone cadastrado')
      return
    }

    try {
      // Formatar número do WhatsApp
      const cleanNumber = appointment.client.phone.replace(/\D/g, '')
      const whatsappNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`

      // Criar mensagem
      const message = `*🎨 AGENDAMENTO ATUALIZADO*

👤 *Cliente:* ${appointment.client.name}
💄 *Serviço:* ${appointment.appointment_services?.length > 0
  ? appointment.appointment_services.map(s => `${s.service?.name} (${s.quantity}x)`).join(', ')
  : appointment.is_custom_price
    ? 'Valor Personalizado'
    : 'Serviços'}
📅 *Data:* ${appointment.scheduled_date ? formatDate(appointment.scheduled_date) : 'Não definida'}
⏰ *Horário:* ${appointment.scheduled_time || 'Não definido'}
📍 *Local:* ${appointment.appointment_address || 'A combinar'}
💰 *Valor Total:* R$ ${appointment.payment_total_appointment.toFixed(2)}
💰 *Valor Pago:* R$ ${appointment.total_amount_paid.toFixed(2)}
💰 *Valor Pendente:* R$ ${(appointment.payment_total_appointment - appointment.total_amount_paid).toFixed(2)}

📊 *Status:* ${appointment.status === 'confirmed' ? 'Confirmado' : appointment.status === 'pending' ? 'Aguardando Confirmação' : appointment.status === 'completed' ? 'Realizado' : 'Cancelado'}
💳 *Pagamento:* ${appointment.payment_status === 'paid' ? 'Pago' : 'Pendente'}

${appointment.notes ? `📝 *Observações:* ${appointment.notes}` : ''}

✨ _Enviado via MakeUp Manager_`

      // Codificar mensagem para URL
      const encodedMessage = encodeURIComponent(message)
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`

      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank')

      // Atualizar status do WhatsApp no banco (opcional)
      await supabase
        .from('appointments')
        .update({
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString(),
          whatsapp_message: message
        })
        .eq('id', appointment.id)
        .eq('user_id', user.id)

    } catch (err: any) {
      console.error('Erro ao enviar WhatsApp:', err)
      alert(`Erro ao enviar WhatsApp: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-2 sm:py-4">
        <Container className="space-y-3 sm:space-y-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <button
                onClick={onBack}
                className="text-blue-100 hover:text-white transition-colors p-1"
              >
                ← Voltar
              </button>
              <h1 className="text-base sm:text-lg font-bold truncate mx-2">
                📋 Carregando...
              </h1>
              <div></div>
            </div>
          </div>
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
          </div>
        </Container>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-2 sm:py-4">
        <Container className="space-y-3 sm:space-y-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <button
                onClick={onBack}
                className="text-blue-100 hover:text-white transition-colors p-1"
              >
                ← Voltar
              </button>
              <h1 className="text-base sm:text-lg font-bold">
                📋 Agendamentos
              </h1>
              <div></div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="text-red-800 text-sm sm:text-base">
              <strong>Erro:</strong> {error}
            </div>
            <button
              onClick={loadAppointments}
              className="mt-2 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base"
            >
              Tentar novamente
            </button>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-2 sm:py-4">
      <Container className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="text-blue-100 hover:text-white transition-colors p-1"
            >
              ← Voltar
            </button>
            <h1 className="text-base sm:text-lg font-bold truncate mx-2">
              📋 Agendamentos
            </h1>
            <div className="text-sm opacity-90 bg-blue-400 px-2 py-1 rounded-full">
              {filteredAppointments.length}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-lg space-y-3 sm:space-y-4">
          {/* Busca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome do cliente ou serviço..."
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Status do Agendamento
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="all">Todos</option>
                <option value="pending">Aguardando Confirmação</option>
                <option value="confirmed">Confirmado</option>
                <option value="overdue">Atrasados</option>
                <option value="completed">Realizado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💰 Status do Pagamento
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Agendamentos */}
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center">
              <div className="text-3xl sm:text-4xl mb-4">📋</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Nenhum agendamento encontrado
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                {searchTerm || filter !== 'all' || paymentFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Crie seu primeiro agendamento usando a calculadora!'}
              </p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => {
              const isExpanded = expandedCards.has(appointment.id)

              // Define cores baseadas no status
              const getCardStyle = (status: string, paymentStatus: string, appointment: any) => {
                // Primeiro verifica se está próximo (menos de 7 dias) - prioridade máxima
                if (isAppointmentUpcoming(appointment)) {
                  return 'bg-gradient-to-r from-purple-100 to-pink-100 border-l-4 border-purple-500 shadow-lg' // Roxo/rosa para próximos
                }
                
                if (status === 'completed') {
                  return 'bg-blue-50 border-l-4 border-blue-500' // Azul para realizado
                } else if (status === 'cancelled') {
                  return 'bg-red-50 border-l-4 border-red-500' // Vermelho para cancelado
                } else if (status === 'confirmed') {
                  return 'bg-green-50 border-l-4 border-green-500' // Verde para confirmado
                } else if (paymentStatus === 'paid') {
                  return 'bg-emerald-50 border-l-4 border-emerald-500' // Verde escuro para pago
                } else {
                  return 'bg-orange-50 border-l-4 border-orange-500' // Laranja para pendente
                }
              }

              return (
                <div key={appointment.id} className={`${getCardStyle(appointment.status, appointment.payment_status, appointment)} rounded-xl shadow-lg overflow-hidden`}>
                  {/* Card Principal - Sempre Visível */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 text-base truncate">
                              {appointment.client?.name || 'Cliente não informado'}
                            </h3>
                            {isAppointmentOverdue(appointment) && (
                              <span className="text-orange-500 text-sm animate-pulse flex-shrink-0" title="Agendamento atrasado - atualizar status">
                                ⚠️
                              </span>
                            )}
                            {isAppointmentUpcoming(appointment) && (
                              <span className="text-purple-600 text-sm animate-pulse flex-shrink-0" title="Próximo">
                                🔥
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-sm text-gray-600 mb-1 sm:mb-0">
                            📅 {formatDateTime(appointment.scheduled_date, appointment.scheduled_time)}
                            {appointment.total_duration_minutes !== undefined && appointment.total_duration_minutes !== null && (
                              <span className="ml-2 text-blue-600 font-medium">
                                ⏱️ {formatDuration(appointment.total_duration_minutes)}
                              </span>
                            )}
                            {isAppointmentUpcoming(appointment) && (
                              <div className="text-xs text-purple-600 font-semibold mt-1 animate-pulse">
                                🔥 AGENDAMENTO PRÓXIMO
                              </div>
                            )}
                            {appointment.appointment_address && (
                              <div className="flex items-center space-x-1 mt-1">
                                <button
                                  onClick={() => openInMaps(appointment.appointment_address)}
                                  className="text-xs text-blue-600 hover:text-blue-700 underline truncate max-w-xs"
                                  title="Abrir no Google Maps"
                                >
                                  📍 {appointment.appointment_address}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(appointment.appointment_address)}
                                  className="text-xs text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                                  title="Copiar endereço"
                                >
                                  📋
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="text-right sm:text-right">
                            {appointment.status === 'completed' ? (
                              <div className="text-sm font-semibold text-blue-600">
                                atendimento realizado
                              </div>
                            ) : appointment.payment_status === 'paid' ? (
                              <>
                                <div className="text-lg font-bold text-green-600">
                                  R$ 0,00
                                </div>
                                <div className="text-xs text-gray-500">
                                  Pendente
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-lg font-bold text-orange-600">
                                  R$ {(appointment.payment_total_appointment - appointment.total_amount_paid).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Pendente
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Expandir */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <button
                        onClick={() => toggleCardExpansion(appointment.id)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors py-1"
                      >
                        <span className="text-xs font-medium">
                          {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                        </span>
                        <svg
                          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <div className="flex space-x-1">
                        <button 
                          onClick={() => startEditing(appointment)}
                          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        {isAppointmentUpcoming(appointment) && (
                          <button 
                            onClick={() => sendReminder(appointment)}
                            className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium transition-colors"
                          >
                            🔔 Lembrete
                          </button>
                        )}
                        <button 
                          onClick={() => sendWhatsApp(appointment)}
                          className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
                        >
                          📱 WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Expandidos */}
                  {isExpanded && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100 bg-gray-50">
                      {/* Valor Total */}
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide">💰 Valor Total:</div>
                        <div className="bg-white px-3 py-2 rounded border border-gray-200">
                          <div className="text-sm font-semibold text-green-600">
                            R$ {appointment.payment_total_appointment.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Informações de Pagamento Detalhadas */}
                      {appointment.payment_total_appointment !== null && 
                       appointment.payment_total_appointment !== undefined && 
                       appointment.payment_total_appointment > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">💳 Detalhes de Pagamento:</div>
                          <div className="space-y-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            {/* Badge de Valor Diferenciado */}
                            {appointment.is_custom_price && (
                              <div className="mb-2 pb-2 border-b border-green-200">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                  💎 Valor Personalizado
                                </span>
                              </div>
                            )}

                            {/* Para agendamentos personalizados, mostrar apenas o valor total */}
                            {appointment.is_custom_price ? (
                              <div className="text-center py-2">
                                <div className="text-sm text-gray-600 mb-1">Valor Total do Atendimento:</div>
                                <div className="text-xl font-bold text-purple-600">
                                  R$ {appointment.payment_total_appointment.toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Valor dos Serviços (apenas para agendamentos calculados) */}
                                {appointment.payment_total_service && 
                                 appointment.payment_total_service !== appointment.payment_total_appointment && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 flex items-center">
                                      <span className="mr-2">💄</span>
                                      Serviços:
                                    </span>
                                    <span className="text-gray-700 font-medium">
                                      R$ {appointment.payment_total_service.toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                {/* Taxa de Deslocamento (apenas para agendamentos calculados) */}
                                {appointment.travel_fee !== undefined && 
                                 appointment.travel_fee > 0 && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 flex items-center">
                                      <span className="mr-2">🚗</span>
                                      Taxa de Deslocamento:
                                    </span>
                                    <span className="text-orange-600 font-medium">
                                      R$ {appointment.travel_fee.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Total Já Pago e Restante */}
                            {appointment.total_amount_paid > 0 && (
                              <div className="flex items-center justify-between text-sm pt-2 border-t border-green-200">
                                <span className="text-gray-600 flex items-center">
                                  <span className="mr-2">💰</span>
                                  Pago:
                                </span>
                                <span className="text-green-600 font-bold">
                                  {PaymentService.formatCurrency(PaymentService.getTotalPaid(appointment))}
                                  <span className="text-gray-500 ml-1">
                                    / {PaymentService.formatCurrency(PaymentService.getTotalAmount(appointment))}
                                  </span>
                                </span>
                              </div>
                            )}

                            {/* Valor Restante */}
                            {PaymentService.getRemainingAmount(appointment) > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 flex items-center">
                                  <span className="mr-2">📌</span>
                                  Restante:
                                </span>
                                <span className="text-orange-600 font-bold">
                                  {PaymentService.formatCurrency(PaymentService.getRemainingAmount(appointment))}
                                </span>
                              </div>
                            )}

                            {/* Valor Pendente */}
                            {appointment.payment_total_appointment && 
                             appointment.total_amount_paid !== undefined && (
                              <div className="flex items-center justify-between pt-2 border-t border-green-200">
                                <span className="text-gray-700 font-semibold flex items-center">
                                  <span className="mr-2">⏳</span>
                                  Saldo Pendente:
                                </span>
                                <span className={`font-bold ${
                                  appointment.payment_total_appointment - appointment.total_amount_paid > 0
                                    ? 'text-orange-600'
                                    : 'text-green-600'
                                }`}>
                                  R$ {(appointment.payment_total_appointment - appointment.total_amount_paid).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Serviços */}
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide flex items-start">
                          <span className="mr-2 flex-shrink-0">💄</span>
                          <span>Serviços:</span>
                        </div>
                        <div className="space-y-2">
                          {appointment.appointment_services?.length > 0 ? (
                            appointment.appointment_services.map((service, index) => (
                              <div key={index} className="bg-white px-3 py-2 rounded border border-gray-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-900">
                                    {service.service?.name} ({service.quantity}x)
                                  </span>
                                  <span className="text-sm font-semibold text-green-600">
                                    R$ {service.total_price.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : appointment.is_custom_price ? (
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-2 rounded border border-purple-200">
                              <div className="text-sm text-purple-800 font-medium">
                                💎 Valor Personalizado
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic bg-white px-3 py-2 rounded border border-gray-200">
                              Nenhum serviço informado
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Local */}
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide">📍 Local:</div>
                        <div className="bg-white px-3 py-2 rounded border border-gray-200">
                          <div className="text-sm text-gray-900">
                            {appointment.service_area?.name || 'Local não definido'}
                          </div>
                        </div>
                      </div>

                      {/* Observações */}
                      {appointment.notes && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide">📝 Observações:</div>
                          <div className="bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
                            <div className="text-sm text-gray-900">
                              {appointment.notes}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Informações Adicionais */}
                      <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded border border-gray-200">
                        Criado em {formatDate(appointment.created_at)} às {new Date(appointment.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </Container>

      {/* Modal de Edição */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-xl">✏️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      Editar Agendamento
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {editingAppointment.client?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancelEditing}
                  className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <span className="text-white text-lg">×</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Status do Agendamento */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2">📅</span>
                  Status do Agendamento
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as any
                    // Se o status for alterado para "completed", perguntar se deseja marcar como pago
                    if (newStatus === 'completed' && editForm.payment_status !== 'paid') {
                      const shouldMarkAsPaid = window.confirm(
                        '💰 Deseja marcar este agendamento como PAGO ao concluí-lo?\n\n' +
                        `Valor total: R$ ${editingAppointment.payment_total_service.toFixed(2)}\n` +
                        `Valor já pago: R$ ${editForm.total_amount_paid.toFixed(2)}\n\n` +
                        'Clique "OK" para marcar como pago ou "Cancelar" para manter o status de pagamento atual.'
                      )
                      if (shouldMarkAsPaid) {
                        setEditForm({
                          ...editForm,
                          status: newStatus,
                          payment_status: 'paid',
                          total_amount_paid: editingAppointment.payment_total_service
                        })
                      } else {
                        setEditForm({...editForm, status: newStatus})
                      }
                    } else {
                      setEditForm({...editForm, status: newStatus})
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900"
                >
                  <option value="pending">⏳ Aguardando Confirmação</option>
                  <option value="confirmed">✅ Agendamento Confirmado</option>
                  <option value="completed">🎉 Serviço Realizado</option>
                  <option value="cancelled">❌ Agendamento Cancelado</option>
                </select>
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">📅</span>
                    Data
                  </label>
                  <input
                    type="date"
                    value={editForm.scheduled_date}
                    onChange={(e) => setEditForm({...editForm, scheduled_date: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-900"
                  />
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-2xl border border-purple-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">⏰</span>
                    Horário
                  </label>
                  <input
                    type="time"
                    value={editForm.scheduled_time}
                    onChange={(e) => setEditForm({...editForm, scheduled_time: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Status do Pagamento */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-2xl border border-yellow-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2">💰</span>
                  Situação do Pagamento
                </label>
                <select
                  value={editForm.payment_status}
                  onChange={(e) => setEditForm({...editForm, payment_status: e.target.value as any})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 bg-white text-gray-900"
                >
                  <option value="pending">⏳ Pagamento Pendente</option>
                  <option value="paid">✅ Pagamento Completo</option>
                </select>
              </div>

              {/* Valores Financeiros - Valor do Serviço, Taxa de Deslocamento e Entrada */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-2xl border-2 border-indigo-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="mr-2">💰</span>
                    Valores Financeiros
                  </label>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                    {editingAppointment.is_custom_price ? '💎 Valor Personalizado' : '📋 Valor Calculado'}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Valor do Serviço */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      💄 Valor do Serviço (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                      <input
                        type="number"
                        step="10"
                        value={editForm.payment_total_service}
                        onChange={(e) => setEditForm({...editForm, payment_total_service: parseFloat(e.target.value) || 0})}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-gray-900 font-medium"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Taxa de Deslocamento */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      🚗 Taxa de Deslocamento (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                      <input
                        type="number"
                        step="10"
                        value={editForm.travel_fee}
                        onChange={(e) => setEditForm({...editForm, travel_fee: parseFloat(e.target.value) || 0})}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-gray-900 font-medium"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Total Calculado */}
                  <div className="pt-3 border-t border-indigo-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">💰 Total do Atendimento:</span>
                      <span className="text-lg font-bold text-indigo-600">
                        R$ {(editForm.payment_total_service + editForm.travel_fee).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Entrada (Valor Já Recebido) */}
                  <div className="pt-3 border-t border-indigo-200">
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      💵 Entrada (Valor Já Recebido)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                      <input
                        type="number"
                        step="10"
                        value={editForm.total_amount_paid}
                        onChange={(e) => setEditForm({...editForm, total_amount_paid: parseFloat(e.target.value) || 0})}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-gray-900 font-medium"
                        placeholder="0.00"
                      />
                    </div>
                    {/* Valor Pendente */}
                    <div className="mt-3 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
                      <span className="text-sm font-semibold text-gray-700">💳 Valor Pendente:</span>
                      <span className="text-lg font-bold text-orange-600">
                        {PaymentService.formatCurrency(
                          (editForm.payment_total_service + editForm.travel_fee) - editForm.total_amount_paid
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    ⚠️ <strong>Atenção:</strong> Ao editar esses valores, o agendamento será marcado como "Valor Personalizado".
                  </p>
                </div>
              </div>

              {/* Observações */}
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-2xl border border-pink-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2">📝</span>
                  Observações
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white text-gray-900 resize-none"
                  placeholder="Adicione observações sobre o agendamento..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-3xl border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={cancelEditing}
                  className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={saveAppointment}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                >
                  💾 Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}