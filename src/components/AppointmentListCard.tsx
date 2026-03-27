import React from 'react'
import { formatDate } from '../lib/supabase'

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

interface AppointmentListCardProps {
  appointment: Appointment
  isExpanded: boolean
  isHighlighted: boolean
  onToggleExpand: () => void
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function AppointmentListCard({
  appointment,
  isExpanded,
  isHighlighted,
  onToggleExpand,
  onClick,
  onMouseEnter,
  onMouseLeave
}: AppointmentListCardProps) {

  // Função para obter cores baseadas no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'completed': return 'bg-green-100 text-green-800 border-green-300'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'confirmed': return '✓'
      case 'completed': return '✅'
      case 'cancelled': return '✕'
      default: return '•'
    }
  }

  // Função para obter label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'confirmed': return 'Confirmado'
      case 'completed': return 'Realizado'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  // Formatar duração
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}min`
    if (hours > 0) return `${hours}h`
    return `${mins}min`
  }

  // Verificar se pagamento está pendente
  const isPendingPayment = appointment.payment_status === 'pending' || 
    (appointment.total_amount_paid || 0) < (appointment.payment_total_appointment || 0)

  return (
    <div
      className={`bg-white border-2 rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md ${
        isHighlighted 
          ? 'ring-4 ring-blue-400 border-blue-400 shadow-lg scale-[1.02]' 
          : 'border-gray-200'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header - Sempre Visível (Compacto) */}
      <div 
        className="p-3"
        onClick={onClick}
      >
        {/* Linha 1: Cliente e Valor */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate text-base">
              {appointment.client?.name || 'Cliente'}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
              <span className="font-semibold text-gray-900">
                {appointment.scheduled_time}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">
                {formatDuration(appointment.total_duration_minutes || 60)}
              </span>
            </div>
          </div>
          
          {/* Valor Total - Sempre Visível */}
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="text-lg font-bold text-green-600">
              R$ {(appointment.payment_total_appointment || 0).toFixed(2)}
            </span>
            {isPendingPayment && (
              <span className="text-xs text-orange-600 font-medium">
                -R$ {((appointment.payment_total_appointment || 0) - (appointment.total_amount_paid || 0)).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Linha 2: Ícones Informativos Rápidos */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          {appointment.appointment_address && (
            <div className="flex items-center gap-1" title={appointment.appointment_address}>
              <span>📍</span>
              <span className="truncate max-w-[150px]">{appointment.appointment_address}</span>
            </div>
          )}
          {appointment.client?.phone && (
            <div className="flex items-center gap-1">
              <span>📱</span>
              <span>{appointment.client.phone}</span>
            </div>
          )}
        </div>

        {/* Linha 3: Status e Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(appointment.status)} flex items-center gap-1`}>
              <span>{getStatusIcon(appointment.status)}</span>
              <span>{getStatusLabel(appointment.status)}</span>
            </span>
            
            {appointment.partner && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
                👥 {appointment.partner.name}
              </span>
            )}
          </div>

          {/* Botão Expandir/Colapsar */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
            title={isExpanded ? 'Colapsar detalhes' : 'Expandir detalhes'}
          >
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Conteúdo Expansível - Detalhes Completos */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Detalhes de Pagamento */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-gray-700">💰 Pagamento</span>
              {isPendingPayment && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                  Pendente
                </span>
              )}
            </div>
            
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Valor Total:</span>
                <span className="font-semibold text-gray-900 whitespace-nowrap">
                  R$ {(appointment.payment_total_appointment || 0).toFixed(2)}
                </span>
              </div>
              
              {appointment.payment_total_service && appointment.travel_fee && (
                <div className="flex justify-between text-xs text-gray-500 pl-3">
                  <span>└ Serviços:</span>
                  <span>R$ {(appointment.payment_total_service || 0).toFixed(2)}</span>
                </div>
              )}
              
              {appointment.travel_fee && (
                <div className="flex justify-between text-xs text-gray-500 pl-3">
                  <span>└ Deslocamento:</span>
                  <span>R$ {(appointment.travel_fee || 0).toFixed(2)}</span>
                </div>
              )}

              {appointment.total_amount_paid !== undefined && (
                <>
                  <div className="flex justify-between pt-1 border-t border-gray-200">
                    <span className="text-gray-600">Pago:</span>
                    <span className={`font-semibold ${
                      (appointment.total_amount_paid || 0) >= (appointment.payment_total_appointment || 0)
                        ? 'text-green-600'
                        : 'text-gray-900'
                    }`}>
                      R$ {(appointment.total_amount_paid || 0).toFixed(2)}
                    </span>
                  </div>

                  {isPendingPayment && (
                    <div className="flex justify-between font-bold text-orange-600">
                      <span>Restante:</span>
                      <span>
                        R$ {((appointment.payment_total_appointment || 0) - (appointment.total_amount_paid || 0)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Lista de Serviços */}
          {appointment.appointment_services && appointment.appointment_services.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-purple-700">💄 Serviços</span>
                <span className="text-xs text-purple-600">
                  {appointment.appointment_services.length} {appointment.appointment_services.length === 1 ? 'serviço' : 'serviços'}
                </span>
              </div>
              <div className="space-y-1.5">
                {appointment.appointment_services.map((service, index) => (
                  <div key={service.id || index} className="flex justify-between text-sm">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-purple-600 font-medium">
                        {service.quantity || 1}x
                      </span>
                      <span className="text-gray-700">
                        {service.services?.name || 'Serviço'}
                      </span>
                    </div>
                    <span className="text-gray-900 font-medium whitespace-nowrap ml-2">
                      R$ {(service.total_price || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data do Agendamento */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>📅</span>
            <span className="font-medium">
              {formatDate(appointment.scheduled_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Telefone do Cliente (se não estava visível) */}
          {appointment.client?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">📱</span>
              <a 
                href={`tel:${appointment.client.phone}`}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {appointment.client.phone}
              </a>
              <a
                href={`https://wa.me/${appointment.client.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800 text-xs"
                onClick={(e) => e.stopPropagation()}
                title="Abrir WhatsApp"
              >
                WhatsApp →
              </a>
            </div>
          )}

          {/* Observações */}
          {appointment.notes && (
            <div className="text-sm bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-600 font-medium">📝 Observações</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
