import React, { useState, useEffect } from 'react'
import { supabase, formatDuration, formatDate, formatDateTime } from '../lib/supabase'
import PaymentService from '../lib/PaymentService'
import { Container } from './Container'

interface CalendarPageProps {
  user: any
  onBack: () => void
  onCreateAppointment?: (date: string, time: string) => void
}

interface CalendarAppointment {
  id: string
  scheduled_date: string
  scheduled_time: string | null
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  appointment_address: string | null
  clients: any
  appointment_services: any[]
  total_duration_minutes: number | null
  payment_total_service: number | null
  travel_fee: number | null
  payment_total_appointment: number | null
  total_amount_paid: number | null
  is_custom_price: boolean | null
  payment_status: 'pending' | 'paid' | null
  notes: string | null
}

export default function CalendarPage({ user, onBack, onCreateAppointment }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<CalendarAppointment[]>([])
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month')
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [editingAppointment, setEditingAppointment] = useState<CalendarAppointment | null>(null)
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

  // Carregar agendamentos do mês atual
  useEffect(() => {
    loadMonthAppointments()
  }, [currentDate, user])

  const loadMonthAppointments = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Calcular primeiro e último dia do mês
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          status,
          appointment_address,
          total_duration_minutes,
          payment_total_service,
          travel_fee,
          payment_total_appointment,
          total_amount_paid,
          is_custom_price,
          payment_status,
          notes,
          clients!inner (
            name,
            phone
          ),
          appointment_services (
            quantity,
            services (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'cancelled')
        .gte('scheduled_date', firstDay.toLocaleDateString('sv-SE'))
        .lte('scheduled_date', lastDay.toLocaleDateString('sv-SE'))
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })

      if (error) throw error

      setAppointments(data || [])
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Navegação entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  // Ir para mês atual
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Funções de edição de agendamento
  const startEditing = (appointment: CalendarAppointment) => {
    setEditingAppointment(appointment)
    setEditForm({
      status: appointment.status,
      scheduled_date: appointment.scheduled_date || '',
      scheduled_time: appointment.scheduled_time || '',
      notes: appointment.notes || '',
      payment_status: appointment.payment_status || 'pending',
      total_amount_paid: appointment.total_amount_paid || 0,
      payment_total_service: appointment.payment_total_service || 0,
      travel_fee: appointment.travel_fee || 0
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
      // Verificar se valores financeiros foram editados
      const wasServiceValueEdited = editForm.payment_total_service !== editingAppointment.payment_total_service
      const wasTravelFeeEdited = editForm.travel_fee !== editingAppointment.travel_fee
      const wasFinancialDataEdited = wasServiceValueEdited || wasTravelFeeEdited

      // Calcular novo total
      // Para valores personalizados, o total é apenas o valor do serviço (sem taxa)
      const isCustomPrice = wasFinancialDataEdited ? true : editingAppointment.is_custom_price || false
      const newTotalAppointment = isCustomPrice ? 
        editForm.payment_total_service : 
        (editForm.payment_total_service + editForm.travel_fee)

      const { error } = await supabase
        .from('appointments')
        .update({
          status: editForm.status,
          scheduled_date: editForm.scheduled_date || null,
          scheduled_time: editForm.scheduled_time || null,
          notes: editForm.notes || null,
          payment_status: editForm.payment_status,
          total_amount_paid: editForm.total_amount_paid,
          payment_total_service: editForm.payment_total_service,
          travel_fee: editForm.travel_fee,
          payment_total_appointment: newTotalAppointment,
          is_custom_price: wasFinancialDataEdited ? true : editingAppointment.is_custom_price || false,
        })
        .eq('id', editingAppointment.id)

      if (error) throw error

      alert('✅ Agendamento atualizado com sucesso!')
      cancelEditing()
      loadMonthAppointments() // Recarregar appointments
    } catch (error: any) {
      console.error('Erro ao atualizar agendamento:', error)
      alert(`❌ Erro ao atualizar agendamento: ${error.message}`)
    }
  }

  // Navegação entre dias (para visualização diária)
  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDay(prev => {
      if (!prev) return new Date()
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 1)
      } else {
        newDate.setDate(newDate.getDate() + 1)
      }
      return newDate
    })
  }

  // Selecionar dia para visualização diária
  const selectDayForView = (date: Date) => {
    setSelectedDay(date)
    setViewMode('day')
  }

  // Gerar dias do mês para o grid
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // Começar no domingo

    const days = []
    const current = new Date(startDate)

    // Gerar 42 dias (6 semanas x 7 dias)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  // Obter agendamentos de um dia específico
  const getDayAppointments = (date: Date) => {
    const dateStr = date.toLocaleDateString('sv-SE')
    return appointments.filter(apt => apt.scheduled_date === dateStr)
  }

  // Cores por status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Gerar horas do dia para timeline (0h às 23h)
  const generateDayHours = () => {
    const hours = []
    for (let i = 0; i <= 23; i++) {
      hours.push(i)
    }
    return hours
  }

  // Obter agendamentos de uma hora específica
  const getHourAppointments = (date: Date, hour: number) => {
    const dateStr = date.toLocaleDateString('sv-SE')
    return appointments.filter(apt => {
      if (apt.scheduled_date !== dateStr || !apt.scheduled_time) return false
      
      const [hours, minutes] = apt.scheduled_time.split(':').map(Number)
      const startHour = hours
      const durationMinutes = apt.total_duration_minutes || 60 // Duração padrão: 1 hora
      const endHour = startHour + Math.ceil(durationMinutes / 60)
      
      // O agendamento aparece se a hora está no intervalo de duração
      return hour >= startHour && hour < endHour
    })
  }

  // Abrir modal com detalhes do dia
  const openDayDetails = (date: Date) => {
    const dayAppointments = getDayAppointments(date)
    setSelectedDate(date)
    setSelectedDateAppointments(dayAppointments)
  }

  const calendarDays = generateCalendarDays()
  const dayHours = generateDayHours()

  return (
    <Container>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span>←</span>
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">📅 Calendário</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full sm:w-auto">
          <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📅 Mês
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🕐 Dia
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm font-medium"
          >
            Hoje
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-2 sm:py-4">
          <Container className="space-y-3 sm:space-y-4">
            {/* Navegação do mês */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-3 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-lg group"
              >
                <span className="text-2xl group-hover:text-pink-600 transition-colors">‹</span>
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {formatDate(currentDate, { month: 'long', year: 'numeric' })}
              </h2>

              <button
                onClick={() => navigateMonth('next')}
                className="p-3 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-lg group"
              >
                <span className="text-2xl group-hover:text-pink-600 transition-colors">›</span>
              </button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-600">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                </div>
              ))}
            </div>

            {/* Grid do calendário */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 bg-white rounded-2xl border border-gray-200 p-2 sm:p-3 shadow-xl overflow-hidden">
              {calendarDays.map((date, index) => {
                const dayAppointments = getDayAppointments(date)
                const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                const isToday = date.toDateString() === new Date().toDateString()
                const hasAppointments = dayAppointments.length > 0

                return (
                  <div
                    key={index}
                    onClick={() => selectDayForView(date)}
                    className={`
                      min-h-[90px] sm:min-h-[120px] p-2 sm:p-3 border border-gray-200 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg relative overflow-hidden
                      ${!isCurrentMonth ? 'bg-gray-50 text-gray-400 opacity-60' : 'bg-gradient-to-br from-white to-gray-50'}
                      ${isToday ? 'ring-2 ring-pink-400 ring-inset shadow-pink-200 shadow-lg bg-gradient-to-br from-pink-50 to-purple-50' : ''}
                      ${hasAppointments ? 'hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50' : 'hover:bg-gradient-to-br hover:from-gray-100 hover:to-white'}
                    `}
                  >
                    {/* Indicador de hoje */}
                    {isToday && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                    )}

                    {/* Indicador de agendamentos */}
                    {hasAppointments && (
                      <div className="absolute top-1 left-1 flex space-x-0.5">
                        {dayAppointments.slice(0, 3).map((apt, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              apt.status === 'confirmed' ? 'bg-green-500' :
                              apt.status === 'pending' ? 'bg-yellow-500' :
                              apt.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                            }`}
                          ></div>
                        ))}
                      </div>
                    )}

                    <div className={`text-sm sm:text-lg font-bold mb-2 ${isToday ? 'text-pink-600' : 'text-gray-800'} relative z-10`}>
                      {date.getDate()}
                    </div>

                    {/* Atendimentos do dia */}
                    <div className="space-y-1 relative z-10">
                      {dayAppointments.slice(0, 2).map((appointment, aptIndex) => (
                        <div
                          key={appointment.id}
                          className={`text-xs p-1.5 rounded-lg border-2 shadow-sm transition-all duration-200 ${
                            appointment.status === 'confirmed'
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300 text-green-800'
                              : appointment.status === 'pending'
                              ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300 text-yellow-800'
                              : appointment.status === 'completed'
                              ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-300 text-blue-800'
                              : 'bg-gradient-to-r from-red-100 to-pink-100 border-red-300 text-red-800'
                          }`}
                          title={`${appointment.clients?.name || 'Cliente'} - ${appointment.scheduled_time || 'Horário não definido'}`}
                        >
                          <div className="hidden sm:block font-medium truncate">
                            {appointment.scheduled_time && (
                              <span className="font-bold">{appointment.scheduled_time} </span>
                            )}
                            {appointment.clients?.name || 'Cliente'}
                          </div>
                          <div className="sm:hidden font-medium truncate">
                            {appointment.clients?.name?.slice(0, 8) || 'Cliente'}
                          </div>
                        </div>
                      ))}

                      {/* Indicador de mais atendimentos */}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-gray-600 text-center bg-gray-200 bg-opacity-50 rounded-lg px-2 py-1 font-medium">
                          +{dayAppointments.length - 2} mais ✨
                        </div>
                      )}

                      {/* Placeholder para dias vazios */}
                      {dayAppointments.length === 0 && isCurrentMonth && (
                        <div className="text-xs text-gray-400 text-center opacity-50">
                          📅
                        </div>
                      )}
                    </div>

                    {/* Efeito de brilho para dias especiais */}
                    {isToday && (
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-400/10 to-purple-400/10 rounded-xl pointer-events-none"></div>
                    )}
                  </div>
                )
              })}
            </div>
          </Container>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-2 sm:py-4">
          <Container className="space-y-3 sm:space-y-4">
            {/* Visualização Diária com Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              {/* Header da visualização diária */}
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigateDay('prev')}
                    className="p-3 hover:bg-pink-600 rounded-xl transition-all duration-200 hover:scale-110 group"
                  >
                    <span className="text-2xl group-hover:text-pink-200 transition-colors">‹</span>
                  </button>

                  <h2 className="text-lg font-bold flex items-center">
                    <span className="mr-2">📅</span>
                    {selectedDay ? formatDate(selectedDay, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'Selecione um dia'}
                  </h2>

                  <button
                    onClick={() => navigateDay('next')}
                    className="p-3 hover:bg-pink-600 rounded-xl transition-all duration-200 hover:scale-110 group"
                  >
                    <span className="text-2xl group-hover:text-pink-200 transition-colors">›</span>
                  </button>
                </div>
              </div>

              {/* Timeline de horas */}
              <div className="max-h-[500px] sm:max-h-[600px] overflow-y-auto p-4 space-y-3">
                {dayHours.map(hour => {
                  const hourAppointments = selectedDay ? getHourAppointments(selectedDay, hour) : []
                  const isCurrentHour = new Date().getHours() === hour

                  return (
                    <div
                      key={hour}
                      className={`
                        flex items-center p-3 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-md relative overflow-hidden
                        ${hourAppointments.length > 0
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-sm'
                          : 'bg-gradient-to-r from-gray-50 to-white border-gray-200 hover:border-gray-300'
                        }
                        ${isCurrentHour ? 'ring-2 ring-pink-400 ring-inset bg-gradient-to-r from-pink-50 to-purple-50' : ''}
                      `}
                    >
                      {/* Indicador de hora atual */}
                      {isCurrentHour && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-purple-600 rounded-l-xl"></div>
                      )}

                      {/* Hora */}
                      <div className={`w-16 text-sm font-bold ${isCurrentHour ? 'text-pink-600' : 'text-gray-700'}`}>
                        {hour.toString().padStart(2, '0')}:00
                      </div>

                      {/* Conteúdo da hora */}
                      <div className="flex-1 ml-4">
                        {hourAppointments.length > 0 ? (
                          <div className="space-y-2">
                            {hourAppointments.map(appointment => {
                              // Verificar se é a hora inicial do atendimento
                              const [startHour] = appointment.scheduled_time?.split(':').map(Number) || [0]
                              const isStartHour = hour === startHour
                              const durationMinutes = appointment.total_duration_minutes || 60
                              const endHour = startHour + Math.ceil(durationMinutes / 60)
                              const isLastHour = hour === endHour - 1
                              
                              // Cores baseadas no status
                              const statusColors = {
                                confirmed: { bg: 'from-green-100 to-emerald-100', border: 'border-green-400', bar: 'bg-green-500', text: 'text-green-800' },
                                pending: { bg: 'from-yellow-100 to-orange-100', border: 'border-yellow-400', bar: 'bg-yellow-500', text: 'text-yellow-800' },
                                completed: { bg: 'from-blue-100 to-indigo-100', border: 'border-blue-400', bar: 'bg-blue-500', text: 'text-blue-800' },
                                cancelled: { bg: 'from-red-100 to-pink-100', border: 'border-red-400', bar: 'bg-red-500', text: 'text-red-800' }
                              }
                              const colors = statusColors[appointment.status] || statusColors.pending

                              return (
                                <div
                                  key={appointment.id}
                                  className={`
                                    relative p-3 rounded-lg border-l-4 border-2 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer
                                    bg-gradient-to-r ${colors.bg} ${colors.border} ${colors.text}
                                  `}
                                  onClick={() => openDayDetails(selectedDay!)}
                                >
                                  {/* Barra lateral grossa indicando continuação */}
                                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colors.bar}`}></div>
                                  
                                  {/* Indicador visual de continuação do atendimento */}
                                  {!isStartHour && (
                                    <div className={`absolute -top-3 left-0 right-0 h-3 ${colors.bar} opacity-30`}></div>
                                  )}
                                  {!isLastHour && (
                                    <div className={`absolute -bottom-3 left-0 right-0 h-3 ${colors.bar} opacity-30`}></div>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      {/* Mostrar informações completas apenas na primeira hora */}
                                      {isStartHour ? (
                                        <>
                                          <div className="font-bold text-sm flex items-center">
                                            <span className="mr-2">
                                              {appointment.status === 'confirmed' ? '✅' :
                                               appointment.status === 'pending' ? '⏳' :
                                               appointment.status === 'completed' ? '🎉' : '❌'}
                                            </span>
                                            {appointment.clients?.name || 'Cliente'}
                                          </div>
                                          <div className="text-xs text-gray-600 mt-1">
                                            📞 {appointment.clients?.phone || 'Sem telefone'}
                                          </div>
                                          <div className="text-xs text-gray-600 mt-1">
                                           💄 {appointment.appointment_services && appointment.appointment_services.length > 0
                                              ? appointment.appointment_services.length === 1
                                                ? appointment.appointment_services[0].services?.name
                                                : `${appointment.appointment_services.length} serviços`
                                              : appointment.is_custom_price
                                                ? 'Valor Personalizado'
                                                : 'Serviço não informado'}
                                            {appointment.total_duration_minutes && (
                                              <span className="ml-2 font-medium">
                                                ⏱️ {formatDuration(appointment.total_duration_minutes)}
                                              </span>
                                            )}
                                          </div>
                                          {appointment.payment_total_appointment && (
                                            <div className="text-xs mt-1 font-medium">
                                              💰 R$ {appointment.payment_total_appointment.toFixed(2)}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        /* Nas horas seguintes, mostrar indicador de continuação */
                                        <div className="flex items-center space-x-2">
                                          <div className="text-sm font-semibold opacity-75">
                                            ↓ {appointment.clients?.name || 'Atendimento'}
                                          </div>
                                          <div className="text-xs opacity-60">
                                            (em andamento)
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right ml-4">
                                      {isStartHour && (
                                        <div className="text-xs text-gray-500">
                                          {appointment.scheduled_time}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          /* Horário Disponível - Clicável para criar agendamento */
                          onCreateAppointment ? (
                            <button
                              onClick={() => {
                                const dateStr = selectedDay!.toISOString().split('T')[0]
                                const timeStr = `${String(hour).padStart(2, '0')}:00`
                                onCreateAppointment(dateStr, timeStr)
                              }}
                              className="w-full text-left text-gray-400 hover:text-blue-600 hover:bg-blue-50 text-sm italic flex items-center p-2 rounded transition-all group"
                            >
                              <span className="mr-2 group-hover:scale-110 transition-transform">➕</span>
                              <span className="group-hover:font-medium">Criar agendamento</span>
                            </button>
                          ) : (
                            <div className="text-gray-400 text-sm italic flex items-center">
                              <span className="mr-2">🕒</span>
                              Horário disponível
                            </div>
                          )
                        )}
                      </div>

                      {/* Efeito de brilho para hora atual */}
                      {isCurrentHour && (
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-400/5 to-purple-400/5 rounded-xl pointer-events-none"></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </Container>
        </div>
      )}

      {/* Modal de detalhes do dia */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm sm:max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold flex items-center">
                  <span className="mr-2">📅</span>
                  Atendimentos de {formatDate(selectedDate)}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-white hover:text-pink-200 flex-shrink-0 transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
              {selectedDateAppointments.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-4xl sm:text-5xl mb-4">📅</div>
                  <div className="text-gray-500 text-sm sm:text-base">
                    Nenhum atendimento agendado para este dia
                  </div>
                  <div className="text-gray-400 text-xs mt-2">
                    Que tal agendar o primeiro? ✨
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <div className="font-bold text-gray-900 text-base sm:text-lg flex items-center">
                          <span className="mr-2">
                            {appointment.status === 'confirmed' ? '✅' :
                             appointment.status === 'pending' ? '⏳' :
                             appointment.status === 'completed' ? '🎉' : '❌'}
                          </span>
                          {appointment.clients?.name || 'Cliente não informado'}
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full font-bold self-start sm:self-auto ${
                          appointment.status === 'confirmed'
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : appointment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : appointment.status === 'completed'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {appointment.status === 'confirmed' ? 'Confirmado' :
                           appointment.status === 'pending' ? 'Aguardando' :
                           appointment.status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center text-gray-700">
                            <span className="mr-2">📞</span>
                            <span className="font-medium">{appointment.clients?.phone || 'Telefone não informado'}</span>
                          </div>
                          {appointment.appointment_address && (
                            <div className="flex items-center text-gray-700">
                              <span className="mr-2">📍</span>
                              <button
                                onClick={() => {
                                  const encodedAddress = encodeURIComponent(appointment.appointment_address!)
                                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
                                }}
                                className="text-blue-600 hover:text-blue-800 underline font-medium text-left"
                                title="Abrir no Google Maps"
                              >
                                {appointment.appointment_address}
                              </button>
                            </div>
                          )}
                          <div className="flex items-center text-gray-700">
                            <span className="mr-2">🕐</span>
                            <span className="font-medium">{appointment.scheduled_time || 'Horário não definido'}</span>
                          </div>
                          <div className="flex items-center text-gray-700">
                            <span className="mr-2">⏱️</span>
                            <span>{appointment.total_duration_minutes ? formatDuration(appointment.total_duration_minutes) : 'Duração não definida'}</span>
                          </div>
                          
                          {/* Botões de Ação */}
                          <div className="flex gap-2 mt-2">
                            {/* Botão Editar */}
                            <button
                              onClick={() => startEditing(appointment)}
                              className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                              title="Editar Agendamento"
                            >
                              <span>✏️</span>
                              <span>Editar</span>
                            </button>
                            
                            {/* Botão WhatsApp */}
                            {appointment.clients?.phone && (
                              <button
                                onClick={() => {
                                  const cleanNumber = appointment.clients.phone.replace(/\D/g, '')
                                  const whatsappNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`
                                  window.open(`https://wa.me/${whatsappNumber}`, '_blank')
                                }}
                                className="flex-1 flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                                title="Abrir WhatsApp"
                              >
                                <span>📱</span>
                                <span>WhatsApp</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-gray-700">
                            <div className="flex items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium block mb-1">💄 Serviços:</span>
                                <div className="space-y-1">
                                  {appointment.appointment_services && appointment.appointment_services.length > 0 ? (
                                    appointment.appointment_services.map((service, index) => (
                                      <div key={index} className="text-sm text-gray-600 flex items-start">
                                        <span className="mr-1 flex-shrink-0">•</span>
                                        <span>{service.services?.name || 'Serviço'} ({service.quantity}x)</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-500">Nenhum serviço informado</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Informações de Pagamento */}
                          {appointment.payment_total_appointment !== null && 
                           appointment.payment_total_appointment !== undefined && 
                           appointment.payment_total_appointment > 0 && (
                            <div className="text-gray-700">
                              <div className="space-y-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                {/* Badge de Valor Diferenciado */}
                                {appointment.is_custom_price && (
                                  <div className="mb-2 pb-2 border-b border-green-200">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                      💎 Valor Personalizado
                                    </span>
                                  </div>
                                )}

                                {/* Valor Total do Atendimento */}
                                <div className="flex items-center justify-between">
                                  <span className="mr-2 text-gray-700 font-medium flex items-center">
                                    <span className="mr-2">💰</span>
                                    Valor Total:
                                  </span>
                                  <span className="font-bold text-green-600 text-lg">
                                    R$ {appointment.payment_total_appointment.toFixed(2)}
                                  </span>
                                </div>

                                {/* Valor dos Serviços (se diferente do total e não for personalizado) */}
                                {appointment.payment_total_service && 
                                 appointment.payment_total_service !== appointment.payment_total_appointment &&
                                 !appointment.is_custom_price && (
                                  <div className="flex items-center justify-between text-sm pt-2 border-t border-green-200">
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
                                {appointment.travel_fee !== null && 
                                 appointment.travel_fee !== undefined && 
                                 appointment.travel_fee > 0 &&
                                 !appointment.is_custom_price && (
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

                                {/* Entrada Esperada */}
                                {/* {appointment.payment_down_payment_expected && 
                                 appointment.payment_down_payment_expected > 0 && (
                                  <div className="flex items-center justify-between text-sm pt-2 border-t border-green-200">
                                    <span className="text-gray-600 flex items-center">
                                      <span className="mr-2">💵</span>
                                      Entrada Esperada:
                                    </span>
                                    <span className="text-blue-600 font-medium">
                                      R$ {appointment.payment_down_payment_expected.toFixed(2)}
                                    </span>
                                  </div>
                                )} */}

                                {/* Entrada Paga */}
                                {appointment.payment_down_payment_paid !== undefined && 
                                 appointment.payment_down_payment_paid > 0 && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 flex items-center">
                                      <span className="mr-2">💰</span>
                                      Entrada Paga:
                                    </span>
                                    <span className="text-blue-700 font-bold">
                                      R$ {appointment.payment_down_payment_paid.toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                {/* Total Já Pago */}
                                {/* {appointment.total_amount_paid !== undefined && 
                                 appointment.total_amount_paid > 0 && (
                                  <div className="flex items-center justify-between text-sm pt-2 border-t border-green-200">
                                    <span className="text-gray-600 flex items-center">
                                      <span className="mr-2">✅</span>
                                      Total Já Pago:
                                    </span>
                                    <span className="text-green-600 font-bold">
                                      R$ {appointment.total_amount_paid.toFixed(2)}
                                    </span>
                                  </div>
                                )} */}

                                {/* Valor Pendente */}
                                {appointment.payment_total_appointment && 
                                 appointment.total_amount_paid !== undefined && (
                                  <div className="flex items-center justify-between pt-2 border-t border-green-200">
                                    <span className="text-gray-700 font-semibold flex items-center">
                                      <span className="mr-2">⏳</span>
                                      Saldo Pendente:
                                    </span>
                                    <span className={`font-bold text-lg ${
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

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-blue-400/20 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 flex flex-col items-center space-y-4 shadow-2xl border border-white/20">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-pink-200"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-pink-500 border-t-transparent"></div>
            </div>
            <div className="text-center">
              <div className="text-sm sm:text-base font-semibold text-gray-800 mb-1">
                Carregando calendário...
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                ✨ Preparando seus agendamentos
              </div>
            </div>
          </div>
        </div>
      )}

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
                      {editingAppointment.clients?.name}
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
                        `Valor total: R$ ${(editingAppointment.payment_total_service || 0).toFixed(2)}\n` +
                        `Valor já pago: R$ ${editForm.total_amount_paid.toFixed(2)}\n\n` +
                        'Clique "OK" para marcar como pago ou "Cancelar" para manter o status de pagamento atual.'
                      )
                      if (shouldMarkAsPaid) {
                        setEditForm({
                          ...editForm,
                          status: newStatus,
                          payment_status: 'paid',
                          total_amount_paid: editingAppointment.payment_total_service || 0
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
                        R$ {((editForm.payment_total_service + editForm.travel_fee) - editForm.total_amount_paid).toFixed(2)}
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
    </Container>
  )
}