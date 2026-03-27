import React, { useState, useMemo, useEffect, useRef } from 'react'
import { formatDate } from '../lib/supabase'
import { AppointmentListCard } from './AppointmentListCard'

interface Partner {
  id: string
  name: string
  phone: string
}

interface Client {
  id: string
  name: string
  phone: string
}

interface Appointment {
  id: string
  scheduled_date: string
  scheduled_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  total_duration_minutes: number
  payment_total_appointment: number
  payment_total_service?: number
  travel_fee?: number
  total_amount_paid?: number
  payment_status?: 'pending' | 'paid'
  client?: Client
  partner_id?: string
  partner?: Partner
  user_id: string
  appointment_address?: string
  notes?: string
  service_area?: {
    id: string
    name: string
  }
  appointment_services?: Array<{
    id: string
    quantity: number
    unit_price: number
    total_price: number
    services?: {
      id: string
      name: string
    }
  }>
}

interface WeeklyScheduleViewProps {
  user: any
  partners: Partner[]
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment) => void
  onTimeSlotClick?: (date: string, time: string, prestadorId: string) => void
}

export function WeeklyScheduleView({
  user,
  partners,
  appointments,
  onAppointmentClick,
  onTimeSlotClick
}: WeeklyScheduleViewProps) {
  // Detectar se é mobile
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Estado
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = domingo
    const diff = dayOfWeek // Dias desde domingo
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - diff)
    sunday.setHours(0, 0, 0, 0)
    return sunday
  })

  // Mobile: apenas um prestador selecionado por vez
  const [selectedPrestadorMobile, setSelectedPrestadorMobile] = useState<string>(user.id)

  // Desktop: múltiplos prestadores selecionados
  const [selectedPrestadores, setSelectedPrestadores] = useState<Set<string>>(() => {
    // Iniciar com todos selecionados
    const allIds = new Set<string>()
    allIds.add(user.id) // Owner sempre incluído
    partners.forEach(p => allIds.add(p.id))
    return allIds
  })

  // Estados para highlight e expansão
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null)
  const [expandedAppointmentIds, setExpandedAppointmentIds] = useState<Set<string>>(new Set())
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [hideEmptyPrestadores, setHideEmptyPrestadores] = useState(false)

  // Refs para scroll sincronizado
  const calendarCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const sidebarCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Funções de gerenciamento de estado
  const toggleExpand = (id: string) => {
    setExpandedAppointmentIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const setHighlight = (id: string | null, scrollToCalendar = false, scrollToSidebar = false) => {
    setHighlightedAppointmentId(id)
    
    if (!id) return

    // Auto-clear após 3 segundos
    setTimeout(() => {
      setHighlightedAppointmentId(null)
    }, 3000)

    // Scroll para o card no calendário
    if (scrollToCalendar) {
      const calendarCard = calendarCardRefs.current.get(id)
      if (calendarCard) {
        calendarCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    // Scroll para o card na sidebar
    if (scrollToSidebar) {
      const sidebarCard = sidebarCardRefs.current.get(id)
      if (sidebarCard) {
        sidebarCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  // Calcular dias da semana atual
  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart)
      date.setDate(currentWeekStart.getDate() + i)
      days.push(date)
    }
    return days
  }, [currentWeekStart])

  // Prestadores ativos (filtrados pela seleção)
  const activePrestadores = useMemo(() => {
    const prestadores: Array<{ id: string; name: string; isOwner: boolean }> = []
    
    if (isMobile) {
      // Mobile: apenas o prestador selecionado
      if (selectedPrestadorMobile === user.id) {
        prestadores.push({ id: user.id, name: 'Você', isOwner: true })
      } else {
        const partner = partners.find(p => p.id === selectedPrestadorMobile)
        if (partner) {
          prestadores.push({ id: partner.id, name: partner.name, isOwner: false })
        }
      }
    } else {
      // Desktop: todos os prestadores selecionados
      // Owner sempre primeiro
      if (selectedPrestadores.has(user.id)) {
        prestadores.push({ id: user.id, name: 'Você', isOwner: true })
      }
      
      // Parceiros
      partners.forEach(partner => {
        if (selectedPrestadores.has(partner.id)) {
          prestadores.push({ id: partner.id, name: partner.name, isOwner: false })
        }
      })
    }
    
    return prestadores
  }, [user, partners, selectedPrestadores, selectedPrestadorMobile, isMobile])

  // Filtrar agendamentos pela semana atual (precisa vir antes de filteredPrestadores)
  const weekAppointments = useMemo(() => {
    const weekStart = new Date(currentWeekStart)
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    return appointments.filter(apt => {
      if (!apt.scheduled_date) return false
      const aptDate = new Date(apt.scheduled_date)
      return aptDate >= weekStart && aptDate < weekEnd
    })
  }, [appointments, currentWeekStart])

  // Filtrar prestadores que têm agendamentos na semana (quando hideEmptyPrestadores está ativo)
  const filteredPrestadores = useMemo(() => {
    if (!hideEmptyPrestadores) return activePrestadores

    return activePrestadores.filter(prestador => {
      // Verificar se este prestador tem pelo menos 1 agendamento na semana
      return weekAppointments.some(apt => {
        const isForThisPrestador = 
          (prestador.id === user.id && apt.user_id === user.id && !apt.partner_id) ||
          (apt.partner_id === prestador.id)
        return isForThisPrestador
      })
    })
  }, [activePrestadores, hideEmptyPrestadores, weekAppointments, user.id])

  // Navegação
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() - 7)
    setCurrentWeekStart(newStart)
  }

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + 7)
    setCurrentWeekStart(newStart)
  }

  const goToToday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - dayOfWeek)
    sunday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(sunday)
  }

  // Alternar seleção de prestador
  const togglePrestador = (prestadorId: string) => {
    const newSelection = new Set(selectedPrestadores)
    if (newSelection.has(prestadorId)) {
      // Não permitir desmarcar se é o único
      if (newSelection.size > 1) {
        newSelection.delete(prestadorId)
      }
    } else {
      newSelection.add(prestadorId)
    }
    setSelectedPrestadores(newSelection)
  }

  // Estilo de cor por status
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-blue-100 border-l-4 border-blue-500 text-blue-900'
      case 'cancelled':
        return 'bg-red-100 border-l-4 border-red-500 text-red-900'
      case 'confirmed':
        return 'bg-green-100 border-l-4 border-green-500 text-green-900'
      case 'pending':
      default:
        return 'bg-orange-100 border-l-4 border-orange-500 text-orange-900'
    }
  }

  // Renderizar appointment card
  const renderAppointmentCard = (appointment: Appointment, prestadorId: string, dayDate: Date, isMobile: boolean) => {
    // Verificar se o agendamento é para este prestador e dia
    const aptDate = new Date(appointment.scheduled_date)
    if (aptDate.toDateString() !== dayDate.toDateString()) return null
    
    const isForThisPrestador = 
      (prestadorId === user.id && appointment.user_id === user.id && !appointment.partner_id) ||
      (appointment.partner_id === prestadorId)
    
    if (!isForThisPrestador) return null

    // Calcular posição vertical baseada no horário
    const [hours, minutes] = appointment.scheduled_time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    const topPosition = (totalMinutes / 60) * 60 // 60px por hora
    
    // Calcular altura baseada na duração
    const durationMinutes = appointment.total_duration_minutes || 60
    const height = (durationMinutes / 60) * 60 // 60px por hora
    
    // Verificar se está highlighted
    const isHighlighted = highlightedAppointmentId === appointment.id
    
    // Ícone de status
    const getStatusIcon = () => {
      switch (appointment.status) {
        case 'pending': return '⏳'
        case 'confirmed': return '✓'
        case 'completed': return '✅'
        case 'cancelled': return '✕'
        default: return '•'
      }
    }

    // Informação de serviços
    const servicesInfo = appointment.appointment_services && appointment.appointment_services.length > 0
      ? appointment.appointment_services.length === 1
        ? appointment.appointment_services[0].services?.name || 'Serviço'
        : `${appointment.appointment_services.length} serviços`
      : 'Sem serviços'
    
    return (
      <div
        key={appointment.id}
        ref={(el) => {
          if (el) {
            calendarCardRefs.current.set(appointment.id, el)
          }
        }}
        onClick={() => {
          onAppointmentClick(appointment)
          setHighlight(appointment.id, false, true)
        }}
        onMouseEnter={() => setHighlightedAppointmentId(appointment.id)}
        onMouseLeave={() => setHighlightedAppointmentId(null)}
        className={`absolute left-0.5 right-0.5 ${getStatusStyle(appointment.status)} rounded-md cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden ${
          isHighlighted ? 'ring-4 ring-blue-400 scale-105 z-50 shadow-2xl' : ''
        }`}
        style={{
          top: `${topPosition}px`,
          height: `${Math.max(height, 30)}px`, // Mínimo 30px para legibilidade
          zIndex: isHighlighted ? 50 : 10,
          padding: height >= 60 ? '6px' : '4px',
          fontSize: isMobile ? '10px' : '11px'
        }}
        title={`${appointment.client?.name || 'Cliente'} - ${appointment.scheduled_time} - R$ ${(appointment.payment_total_appointment || 0).toFixed(2)}`}
      >
        {/* Layout para cards pequenos (< 60px) */}
        {height < 60 && (
          <>
            <div className="font-bold truncate leading-tight">
              {appointment.client?.name || 'Cliente'}
            </div>
            <div className="truncate leading-tight text-xs opacity-90 font-semibold">
              {appointment.scheduled_time}
            </div>
          </>
        )}

        {/* Layout para cards médios (60-100px) */}
        {height >= 60 && height < 100 && (
          <>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <div className="font-bold truncate leading-tight flex-1">
                {appointment.client?.name || 'Cliente'}
              </div>
              <span className="text-xs flex-shrink-0">{getStatusIcon()}</span>
            </div>
            <div className="truncate leading-tight text-xs font-semibold opacity-90">
              {appointment.scheduled_time} • {Math.round(durationMinutes / 60)}h
            </div>
            {appointment.service_area && (
              <div className="truncate leading-tight text-xs opacity-75 mt-0.5">
                📍 {appointment.service_area.name}
              </div>
            )}
            <div className="truncate leading-tight text-xs font-medium opacity-90 mt-0.5">
              💄 {servicesInfo}
            </div>
          </>
        )}

        {/* Layout para cards grandes (>= 100px) */}
        {height >= 100 && (
          <>
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="font-bold truncate leading-tight flex-1">
                {appointment.client?.name || 'Cliente'}
              </div>
              <span className="text-sm flex-shrink-0">{getStatusIcon()}</span>
            </div>
            <div className="truncate leading-tight text-xs font-semibold opacity-90">
              ⏰ {appointment.scheduled_time} • {Math.round(durationMinutes / 60)}h
            </div>
            <div className="grid grid-cols-1 gap-0.5 mt-1">
              {appointment.service_area && (
                <div className="truncate leading-tight text-xs opacity-75">
                  📍 {appointment.service_area.name}
                </div>
              )}
              <div className="truncate leading-tight text-xs font-medium opacity-90">
                💄 {servicesInfo}
              </div>
              {appointment.partner && (
                <div className="truncate leading-tight text-xs opacity-75">
                  👥 {appointment.partner.name}
                </div>
              )}
            </div>
            {appointment.appointment_address && height >= 140 && !isMobile && (
              <div className="truncate leading-tight text-xs opacity-70 mt-1 pt-1 border-t border-current">
                🏠 {appointment.appointment_address}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="flex flex-col flex-1 w-full bg-gray-50 overflow-hidden">
      {/* Header com navegação e filtros - FIXO */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-4 flex-shrink-0 z-30">
        {/* Navegação de semana */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousWeek}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← Semana Anterior
          </button>
          
          <div className="text-center">
            <button
              onClick={goToToday}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
            >
              📅 Hoje
            </button>
            <div className="text-sm text-gray-600 mt-1">
              {formatDate(weekDays[0].toISOString())} - {formatDate(weekDays[6].toISOString())}
            </div>
          </div>
          
          <button
            onClick={goToNextWeek}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Próxima Semana →
          </button>
        </div>

        {/* Filtro de prestadores */}
        {isMobile ? (
          // Mobile: dropdown para selecionar um prestador + botão lista
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Agenda de:</span>
              <select
                value={selectedPrestadorMobile}
                onChange={(e) => setSelectedPrestadorMobile(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium"
              >
                <option value={user.id}>✨ Você</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>👥 {partner.name}</option>
                ))}
              </select>
            </div>
            {/* Botão para abrir drawer mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 flex-shrink-0"
              title="Ver lista de agendamentos"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {weekAppointments.length}
              </span>
            </button>
          </div>
        ) : (
          // Desktop: checkboxes para múltiplos prestadores
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Mostrar:</span>
            
            {/* Owner */}
            <button
              onClick={() => togglePrestador(user.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedPrestadores.has(user.id)
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              ✨ Você
            </button>
            
            {/* Parceiros */}
            {partners.map(partner => (
              <button
                key={partner.id}
                onClick={() => togglePrestador(partner.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedPrestadores.has(partner.id)
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                👥 {partner.name}
              </button>
            ))}
            
            {activePrestadores.length > 1 && (
              <span className="text-xs text-gray-500 ml-2">
                ({activePrestadores.length} selecionado{activePrestadores.length > 1 ? 's' : ''})
              </span>
            )}

            {/* Toggle para ocultar prestadores sem agendamentos */}
            {activePrestadores.length > 1 && (
              <div className="ml-4 pl-4 border-l border-gray-300">
                <button
                  onClick={() => setHideEmptyPrestadores(!hideEmptyPrestadores)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    hideEmptyPrestadores
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title="Ocultar profissionais sem agendamentos nesta semana"
                >
                  {hideEmptyPrestadores ? '👁️' : '👁️‍🗨️'}
                  <span>Ocultar vazios</span>
                  {hideEmptyPrestadores && filteredPrestadores.length < activePrestadores.length && (
                    <span className="bg-white text-orange-600 px-1.5 py-0.5 rounded-full text-xs font-bold">
                      {activePrestadores.length - filteredPrestadores.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid da agenda */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex">
        {/* Container do Calendário */}
        <div className="flex-1 flex w-full overflow-y-auto">
          <div className="flex w-full">
            {/* Coluna de horários (sidebar) */}
            <div className={`${isMobile ? 'w-12' : 'w-16'} bg-gray-100 border-r border-gray-300 flex-shrink-0 sticky left-0 z-20`}>
              {/* Header vazio alinhado com dias da semana - STICKY */}
              <div className="sticky top-0 bg-gray-100 z-10 border-b border-gray-300">
                <div className="h-16"></div>
                {/* Espaço extra quando há múltiplos prestadores para alinhar com sub-header */}
                {filteredPrestadores.length > 1 && (
                  <div className="h-[36px] border-t border-gray-300"></div>
                )}
              </div>
              
              {/* Horários (00:00 - 23:00) */}
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  className="h-[60px] border-b border-gray-200 flex items-start justify-center pt-1"
                >
                  <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-600`}>
                    {i.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Colunas de dias */}
            {weekDays.map((dayDate, dayIndex) => (
              <div key={dayIndex} className="flex-1 border-r border-gray-200">
                {/* Header do dia - STICKY */}
                <div className="sticky top-0 z-10">
                  <div className={`h-16 border-b border-gray-300 p-2 text-center ${
                    dayDate.toDateString() === today.toDateString() 
                      ? 'bg-blue-50 border-b-2 border-blue-500' 
                      : 'bg-white'
                  }`}>
                    <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-600`}>
                      {isMobile ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][dayDate.getDay()] : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayDate.getDay()]}
                    </div>
                    <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold ${
                      dayDate.toDateString() === today.toDateString() ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {dayDate.getDate()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][dayDate.getMonth()]}
                    </div>
                  </div>

                  {/* Sub-header com nomes dos prestadores (só aparece quando há múltiplos) */}
                  {filteredPrestadores.length > 1 && (
                    <div className="flex bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-300">
                      {filteredPrestadores.map((prestador, idx) => (
                        <div 
                          key={prestador.id}
                          className={`flex-1 text-center py-2 border-r border-gray-200 last:border-r-0 ${
                            idx % 2 === 0 ? 'bg-purple-50' : 'bg-blue-50'
                          }`}
                        >
                          <div className="text-xs font-bold text-gray-700 truncate px-1">
                            {prestador.id === user.id ? '✨ Você' : `👥 ${prestador.name}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Grid de horários do dia - uma coluna por prestador */}
                <div className="flex">
                  {filteredPrestadores.map((prestador, prestadorIndex) => {
                    // Cores alternadas para diferenciar colunas
                    const bgColorClass = prestadorIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    const hoverBgClass = prestadorIndex % 2 === 0 ? 'hover:bg-blue-50' : 'hover:bg-purple-50'
                    
                    return (
                      <div
                        key={prestador.id}
                        className={`flex-1 border-r ${prestadorIndex % 2 === 0 ? 'border-gray-200' : 'border-purple-200'} relative ${bgColorClass}`}
                      >
                      {/* Linhas de horário */}
                      {Array.from({ length: 24 }, (_, hour) => (
                        <div
                          key={hour}
                          className={`h-[60px] border-b border-gray-100 ${hoverBgClass} transition-colors cursor-pointer`}
                          onClick={() => {
                            if (onTimeSlotClick) {
                              const dateStr = dayDate.toISOString().split('T')[0]
                              const timeStr = `${hour.toString().padStart(2, '0')}:00`
                              onTimeSlotClick(dateStr, timeStr, prestador.id)
                            }
                          }}
                        >
                          {/* Subdivisão de 30min */}
                          <div className="h-1/2 border-b border-gray-50"></div>
                        </div>
                      ))}

                      {/* Appointments renderizados com position absolute */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="relative h-full pointer-events-auto">
                          {weekAppointments.map(apt => 
                            renderAppointmentCard(apt, prestador.id, dayDate, isMobile)
                          )}
                        </div>
                      </div>
                    </div>
                  )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Lateral - Lista de Agendamentos */}
        {!isMobile && isSidebarOpen && (
          <div className="w-80 border-l border-gray-200 bg-white flex-shrink-0 overflow-y-auto">
            {/* Header da Sidebar */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">Agendamentos</h3>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Fechar lista"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {weekAppointments.filter(apt => {
                  const prestadorId = apt.partner_id || apt.user_id
                  return isMobile 
                    ? prestadorId === selectedPrestadorMobile
                    : selectedPrestadores.has(prestadorId)
                }).length} agendamento(s) esta semana
              </p>
            </div>

            {/* Lista de Agendamentos */}
            <div className="p-4 space-y-3">
              {weekAppointments
                .filter(apt => {
                  const prestadorId = apt.partner_id || apt.user_id
                  return isMobile 
                    ? prestadorId === selectedPrestadorMobile
                    : selectedPrestadores.has(prestadorId)
                })
                .sort((a, b) => {
                  const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`)
                  const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`)
                  return dateA.getTime() - dateB.getTime()
                })
                .map((apt, index, array) => {
                  // Verificar se é um novo dia (para adicionar header)
                  const showDayHeader = index === 0 || 
                    apt.scheduled_date !== array[index - 1].scheduled_date
                  
                  return (
                    <React.Fragment key={apt.id}>
                      {/* Header do Dia */}
                      {showDayHeader && (
                        <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                          <div className="h-px flex-1 bg-gray-200"></div>
                          <span className="text-sm font-bold text-gray-700">
                            {formatDate(apt.scheduled_date, { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <div className="h-px flex-1 bg-gray-200"></div>
                        </div>
                      )}
                      
                      {/* Card do Agendamento */}
                      <div
                        ref={(el) => {
                          if (el) {
                            sidebarCardRefs.current.set(apt.id, el)
                          }
                        }}
                      >
                        <AppointmentListCard
                          appointment={apt}
                          isExpanded={expandedAppointmentIds.has(apt.id)}
                          isHighlighted={highlightedAppointmentId === apt.id}
                          onToggleExpand={() => toggleExpand(apt.id)}
                          onClick={() => {
                            setHighlight(apt.id, true, false)
                            onAppointmentClick(apt)
                          }}
                          onMouseEnter={() => setHighlightedAppointmentId(apt.id)}
                          onMouseLeave={() => setHighlightedAppointmentId(null)}
                        />
                      </div>
                    </React.Fragment>
                  )
                })}

              {/* Empty State */}
              {weekAppointments.filter(apt => {
                const prestadorId = apt.partner_id || apt.user_id
                return isMobile 
                  ? prestadorId === selectedPrestadorMobile
                  : selectedPrestadores.has(prestadorId)
              }).length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-4xl mb-3">📅</div>
                  <p className="text-gray-600 font-medium">Nenhum agendamento</p>
                  <p className="text-sm text-gray-500 mt-1">Nesta semana</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão para abrir sidebar (quando está fechada) */}
        {!isMobile && !isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute right-4 top-20 bg-blue-500 text-white px-3 py-2 rounded-l-lg shadow-lg hover:bg-blue-600 transition-colors z-30 flex items-center gap-2"
            title="Abrir lista de agendamentos"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-sm font-medium">Lista</span>
            <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {weekAppointments.length}
            </span>
          </button>
        )}

        {/* Drawer Mobile - Overlay */}
        {isMobile && isSidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Drawer Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col">
              {/* Header do Drawer */}
              <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">Agendamentos</h3>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Fechar"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  {weekAppointments.filter(apt => {
                    const prestadorId = apt.partner_id || apt.user_id
                    return prestadorId === selectedPrestadorMobile
                  }).length} agendamento(s) esta semana
                </p>
              </div>

              {/* Lista de Agendamentos - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {weekAppointments
                  .filter(apt => {
                    const prestadorId = apt.partner_id || apt.user_id
                    return prestadorId === selectedPrestadorMobile
                  })
                  .sort((a, b) => {
                    const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`)
                    const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`)
                    return dateA.getTime() - dateB.getTime()
                  })
                  .map((apt, index, array) => {
                    // Verificar se é um novo dia (para adicionar header)
                    const showDayHeader = index === 0 || 
                      apt.scheduled_date !== array[index - 1].scheduled_date
                    
                    return (
                      <React.Fragment key={apt.id}>
                        {/* Header do Dia */}
                        {showDayHeader && (
                          <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                            <div className="h-px flex-1 bg-gray-200"></div>
                            <span className="text-sm font-bold text-gray-700">
                              {formatDate(apt.scheduled_date, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            <div className="h-px flex-1 bg-gray-200"></div>
                          </div>
                        )}
                        
                        {/* Card do Agendamento */}
                        <AppointmentListCard
                          appointment={apt}
                          isExpanded={expandedAppointmentIds.has(apt.id)}
                          isHighlighted={highlightedAppointmentId === apt.id}
                          onToggleExpand={() => toggleExpand(apt.id)}
                          onClick={() => {
                            setHighlight(apt.id, true, false)
                            setIsSidebarOpen(false) // Fechar drawer ao clicar
                            onAppointmentClick(apt)
                          }}
                          onMouseEnter={() => setHighlightedAppointmentId(apt.id)}
                          onMouseLeave={() => setHighlightedAppointmentId(null)}
                        />
                      </React.Fragment>
                    )
                  })}

                {/* Empty State */}
                {weekAppointments.filter(apt => {
                  const prestadorId = apt.partner_id || apt.user_id
                  return prestadorId === selectedPrestadorMobile
                }).length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-4xl mb-3">📅</div>
                    <p className="text-gray-600 font-medium">Nenhum agendamento</p>
                    <p className="text-sm text-gray-500 mt-1">Nesta semana</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
