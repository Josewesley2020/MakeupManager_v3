import React, { useState, useEffect } from 'react'
import { supabase, formatDuration, formatDate } from '../lib/supabase'
import PaymentService from '../lib/PaymentService'

interface AppointmentModalProps {
  mode: 'create' | 'edit'
  isOpen: boolean
  onClose: () => void
  onSave: (appointmentData: any) => Promise<void>
  user: any
  
  // Dados do cliente (obrigatório para create, pode vir preenchido para edit)
  clientName: string
  clientPhone: string
  
  // Dados dos serviços (para create)
  services?: Array<{
    serviceId: string
    serviceName: string
    quantity: number
    unitPrice: number
    totalPrice: number
    duration_minutes?: number
  }>
  
  // Região e taxa de deslocamento
  selectedArea?: { id: string; name: string; travel_fee: number }
  includeTravelFee?: boolean
  
  // Parceiro (opcional)
  selectedPartner?: { id: string; name: string }
  commissionAmount?: number
  
  // Valor personalizado (opcional)
  useManualPrice?: boolean
  manualPrice?: number
  
  // Dados iniciais (para edit ou create via calendário)
  initialDate?: string
  initialTime?: string
  initialStatus?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  initialAddress?: string
  initialNotes?: string
  initialPaymentData?: {
    totalAppointment: number
    totalService: number
    travelFee: number
    totalPaid: number
    paymentStatus: 'pending' | 'paid'
  }
  
  // Agendamento sendo editado (para mode === 'edit')
  appointment?: any
}

export function AppointmentModal({
  mode,
  isOpen,
  onClose,
  onSave,
  user,
  clientName,
  clientPhone,
  services = [],
  selectedArea,
  includeTravelFee = false,
  selectedPartner,
  commissionAmount = 0,
  useManualPrice = false,
  manualPrice = 0,
  initialDate = '',
  initialTime = '',
  initialStatus = 'pending',
  initialAddress = '',
  initialNotes = '',
  initialPaymentData,
  appointment
}: AppointmentModalProps) {
  
  // Estados do formulário
  const [appointmentAddress, setAppointmentAddress] = useState(initialAddress)
  const [appointmentDate, setAppointmentDate] = useState(initialDate)
  const [appointmentTime, setAppointmentTime] = useState(initialTime)
  const [appointmentHour, setAppointmentHour] = useState('')
  const [appointmentMinute, setAppointmentMinute] = useState('')
  const [appointmentStatus, setAppointmentStatus] = useState(initialStatus)
  const [notes, setNotes] = useState(initialNotes)
  
  // Estados de pagamento
  const [downPaymentPercentage, setDownPaymentPercentage] = useState(30)
  const [downPaymentAmount, setDownPaymentAmount] = useState('0')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending')
  const [totalAmountPaid, setTotalAmountPaid] = useState(0)
  
  // Estados de controle
  const [isConfirmed, setIsConfirmed] = useState(initialStatus === 'confirmed')
  const [isSaving, setIsSaving] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  // Inicializar dados ao abrir modal
  useEffect(() => {
    if (!isOpen) return
    
    if (mode === 'edit' && appointment) {
      // Preencher com dados do agendamento existente
      setAppointmentAddress(appointment.appointment_address || '')
      setAppointmentDate(appointment.scheduled_date || '')
      setAppointmentTime(appointment.scheduled_time || '')
      setAppointmentStatus(appointment.status || 'pending')
      setNotes(appointment.notes || '')
      setIsConfirmed(appointment.status === 'confirmed' || appointment.status === 'completed')
      setTotalAmountPaid(appointment.total_amount_paid || 0)
      setPaymentStatus(appointment.payment_status || 'pending')
      setDownPaymentAmount(String(appointment.total_amount_paid || 0))
    } else if (initialPaymentData) {
      // Para create, se tiver dados de pagamento iniciais
      setTotalAmountPaid(initialPaymentData.totalPaid || 0)
      setPaymentStatus(initialPaymentData.paymentStatus || 'pending')
    }
    
    // Calcular entrada automática baseada na porcentagem
    if (mode === 'create') {
      const total = calculateTotal()
      const calculatedEntry = (total * (downPaymentPercentage / 100)).toFixed(2)
      setDownPaymentAmount(calculatedEntry)
    }
  }, [isOpen, mode, appointment, downPaymentPercentage])
  
  // Juntar hora e minuto em appointmentTime quando mudam
  useEffect(() => {
    if (appointmentHour && appointmentMinute) {
      setAppointmentTime(`${appointmentHour}:${appointmentMinute}`)
    }
  }, [appointmentHour, appointmentMinute])
  
  // Calcular valor total do atendimento
  const calculateTotal = () => {
    if (useManualPrice) return manualPrice
    
    const servicesTotal = services.reduce((sum, service) => sum + service.totalPrice, 0)
    const travelFee = includeTravelFee && selectedArea ? selectedArea.travel_fee : 0
    return servicesTotal + travelFee
  }
  
  // Calcular tempo total estimado
  const calculateTotalDuration = () => {
    if (useManualPrice) return 0
    return services.reduce((total, service) => {
      return total + (service.duration_minutes || 60) * service.quantity
    }, 0)
  }
  
  // Validação: status confirmado requer local + data
  const validateConfirmation = (): { valid: boolean; message: string } => {
    if (isConfirmed || appointmentStatus === 'confirmed') {
      if (!appointmentAddress || appointmentAddress.trim() === '') {
        return { valid: false, message: '⚠️ Para confirmar o agendamento, é necessário informar o endereço!' }
      }
      if (!appointmentDate) {
        return { valid: false, message: '⚠️ Para confirmar o agendamento, é necessário informar a data!' }
      }
      if (!appointmentTime) {
        return { valid: false, message: '⚠️ Para confirmar o agendamento, é necessário informar o horário!' }
      }
    }
    return { valid: true, message: '' }
  }
  
  // Handler para mudança do checkbox de confirmação
  const handleConfirmationChange = async (checked: boolean) => {
    if (checked) {
      // Validar antes de permitir confirmação
      const validation = validateConfirmation()
      if (!validation.valid) {
        alert(validation.message)
        return
      }
      
      // Perguntar sobre pagamento de entrada
      const total = mode === 'create' ? calculateTotal() : (appointment?.payment_total_appointment || 0)
      const entryValue = mode === 'create' ? parseFloat(downPaymentAmount) : (appointment?.total_amount_paid || 0)
      
      const shouldAskPayment = window.confirm(
        `💰 A entrada de R$ ${entryValue.toFixed(2)} foi paga?\n\n` +
        `Valor total: R$ ${total.toFixed(2)}\n` +
        `Entrada esperada (${downPaymentPercentage}%): R$ ${(total * (downPaymentPercentage / 100)).toFixed(2)}\n\n` +
        'Clique "OK" se foi pago ou "Cancelar" se ainda está pendente.'
      )
      
      if (shouldAskPayment) {
        setPaymentStatus('paid')
        if (mode === 'create') {
          setTotalAmountPaid(parseFloat(downPaymentAmount))
        }
      } else {
        setPaymentStatus('pending')
      }
    }
    
    setIsConfirmed(checked)
    setAppointmentStatus(checked ? 'confirmed' : 'pending')
  }
  
  // Handler para mudança de status (modo edit)
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'confirmed' || newStatus === 'completed') {
      // Validar campos obrigatórios
      if (!appointmentAddress || !appointmentDate || !appointmentTime) {
        alert('⚠️ Para confirmar/concluir o agendamento, preencha endereço, data e horário!')
        return
      }
      
      // Se estiver marcando como completed, perguntar sobre pagamento
      if (newStatus === 'completed' && paymentStatus !== 'paid') {
        const total = appointment?.payment_total_appointment || 0
        const shouldMarkAsPaid = window.confirm(
          '💰 Deseja marcar este agendamento como PAGO ao concluí-lo?\n\n' +
          `Valor total: R$ ${total.toFixed(2)}\n` +
          `Valor já pago: R$ ${totalAmountPaid.toFixed(2)}\n\n` +
          'Clique "OK" para marcar como pago ou "Cancelar" para manter o status de pagamento atual.'
        )
        
        if (shouldMarkAsPaid) {
          setPaymentStatus('paid')
          setTotalAmountPaid(total)
          setDownPaymentAmount(String(total))
        }
      }
    }
    
    setAppointmentStatus(newStatus as any)
    setIsConfirmed(newStatus === 'confirmed' || newStatus === 'completed')
  }
  
  // Salvar agendamento
  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Validação final
      const validation = validateConfirmation()
      if (!validation.valid) {
        alert(validation.message)
        setIsSaving(false)
        return
      }
      
      // Preparar dados do agendamento
      const appointmentData = {
        address: appointmentAddress,
        date: appointmentDate,
        time: appointmentTime || `${appointmentHour}:${appointmentMinute}`,
        status: appointmentStatus,
        notes: notes,
        payment_status: paymentStatus,
        total_amount_paid: parseFloat(downPaymentAmount) || totalAmountPaid,
        // Dados específicos do modo create
        ...(mode === 'create' && {
          services,
          selectedArea,
          includeTravelFee,
          selectedPartner,
          commissionAmount,
          useManualPrice,
          manualPrice,
          downPaymentPercentage
        }),
        // Dados específicos do modo edit
        ...(mode === 'edit' && {
          appointmentId: appointment.id
        })
      }
      
      await onSave(appointmentData)
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar agendamento:', error)
      alert(`Erro ao salvar agendamento: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }
  
  if (!isOpen) return null
  
  const totalValue = mode === 'create' ? calculateTotal() : (appointment?.payment_total_appointment || 0)
  const totalDuration = mode === 'create' ? calculateTotalDuration() : (appointment?.total_duration_minutes || 0)
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-sm sm:max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-xl sm:text-2xl">{mode === 'create' ? '📅' : '✏️'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold truncate">
                  {mode === 'create' 
                    ? (isConfirmed ? 'Confirmar Agendamento' : 'Criar Agendamento')
                    : 'Editar Agendamento'
                  }
                </h2>
                <p className="text-blue-100 text-sm">{clientName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0"
            >
              <span className="text-white text-lg">×</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Cliente (apenas exibição) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3 sm:p-4 rounded-xl border border-indigo-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="mr-2">👤</span>
                Cliente
              </label>
              <input
                type="text"
                value={clientName}
                readOnly
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900 font-medium"
              />
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 sm:p-4 rounded-xl border border-purple-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="mr-2">📱</span>
                Telefone
              </label>
              <input
                type="tel"
                value={clientPhone}
                readOnly
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900 font-medium"
              />
            </div>
          </div>

          {/* Status (apenas para edit) */}
          {mode === 'edit' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">📅</span>
                Status do Agendamento
              </label>
              <select
                value={appointmentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900"
              >
                <option value="pending">⏳ Aguardando Confirmação</option>
                <option value="confirmed">✅ Agendamento Confirmado</option>
                <option value="completed">🎉 Serviço Realizado</option>
                <option value="cancelled">❌ Agendamento Cancelado</option>
              </select>
            </div>
          )}

          {/* Checkbox para confirmar (apenas para create) */}
          {mode === 'create' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="isAppointmentConfirmed"
                  checked={isConfirmed}
                  onChange={(e) => handleConfirmationChange(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label htmlFor="isAppointmentConfirmed" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    ✅ Confirmar agendamento
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Requer endereço, data e horário para prosseguir
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Endere</content>
</invoke>