/**
 * PaymentService - Serviço centralizado para cálculos de pagamento
 * 
 * REGRAS DE NEGÓCIO V2:
 * 1. payment_total_appointment = valor total (serviços + deslocamento)
 * 2. total_amount_paid = soma de todos os pagamentos realizados
 * 3. remaining_amount = payment_total_appointment - total_amount_paid
 * 4. payment_status = calculado automaticamente pelo trigger do banco
 * 
 * IMPORTANTE:
 * - Sempre usar total_amount_paid como fonte única de verdade
 * - Valores sempre em BRL (Real brasileiro)
 * - Arredondamento: 2 casas decimais
 */

export interface Appointment {
  id: string
  payment_total_appointment: number | null
  payment_total_service: number | null
  total_amount_paid: number | null
  travel_fee: number
  payment_status: 'paid' | 'pending'
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
}

export class PaymentService {
  /**
   * Calcula o valor total já pago
   * @param appointment - Agendamento
   * @returns Valor pago (nunca negativo)
   */
  static getTotalPaid(appointment: Appointment): number {
    const paid = appointment.total_amount_paid || 0
    return Math.max(0, paid)
  }

  /**
   * Calcula o valor total do agendamento
   * @param appointment - Agendamento
   * @returns Valor total (nunca negativo)
   */
  static getTotalAmount(appointment: Appointment): number {
    const total = appointment.payment_total_appointment || 0
    return Math.max(0, total)
  }

  /**
   * Calcula o valor restante a pagar
   * @param appointment - Agendamento
   * @returns Valor restante (pode ser 0, nunca negativo)
   */
  static getRemainingAmount(appointment: Appointment): number {
    const total = this.getTotalAmount(appointment)
    const paid = this.getTotalPaid(appointment)
    const remaining = total - paid
    return Math.max(0, remaining)
  }

  /**
   * Calcula o percentual pago (0-100)
   * @param appointment - Agendamento
   * @returns Percentual (0-100)
   */
  static getPaymentPercentage(appointment: Appointment): number {
    const total = this.getTotalAmount(appointment)
    if (total === 0) return 0
    
    const paid = this.getTotalPaid(appointment)
    const percentage = (paid / total) * 100
    return Math.min(100, Math.round(percentage))
  }

  /**
   * Determina o status de pagamento baseado nos valores
   * @param appointment - Agendamento
   * @returns Status calculado
   */
  static calculatePaymentStatus(appointment: Appointment): 'paid' | 'pending' {
    const remaining = this.getRemainingAmount(appointment)
    return remaining === 0 ? 'paid' : 'pending'
  }

  /**
   * Valida se um pagamento excede o total permitido
   * @param appointment - Agendamento
   * @param newPayment - Novo valor a ser pago
   * @returns true se válido
   */
  static validatePayment(appointment: Appointment, newPayment: number): boolean {
    if (newPayment < 0) return false
    const total = this.getTotalAmount(appointment)
    const paid = this.getTotalPaid(appointment)
    return (paid + newPayment) <= total
  }

  /**
   * Calcula total de receita de uma lista de agendamentos
   * @param appointments - Lista de agendamentos
   * @param onlyCompleted - Se deve filtrar apenas completados
   * @returns Total de receita
   */
  static calculateTotalRevenue(
    appointments: Appointment[], 
    onlyCompleted: boolean = true
  ): number {
    return appointments
      .filter(apt => {
        if (apt.status === 'cancelled') return false
        if (onlyCompleted && apt.status !== 'completed') return false
        return true
      })
      .reduce((sum, apt) => sum + this.getTotalPaid(apt), 0)
  }

  /**
   * Calcula total pendente de recebimento
   * @param appointments - Lista de agendamentos
   * @returns Total pendente
   */
  static calculateTotalPending(appointments: Appointment[]): number {
    return appointments
      .filter(apt => apt.status !== 'cancelled')
      .reduce((sum, apt) => sum + this.getRemainingAmount(apt), 0)
  }

  /**
   * Formata valor em Real brasileiro
   * @param value - Valor numérico
   * @returns String formatada (ex: "R$ 150,00")
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  /**
   * Calcula sinal sugerido (30% do total)
   * @param totalAmount - Valor total do agendamento
   * @returns Valor do sinal
   */
  static calculateDownPayment(totalAmount: number): number {
    return Math.round(totalAmount * 0.3 * 100) / 100
  }

  /**
   * Verifica se appointment pode ser marcado como pago
   * @param appointment - Agendamento
   * @returns true se pode marcar como pago
   */
  static canMarkAsPaid(appointment: Appointment): boolean {
    return this.getRemainingAmount(appointment) === 0
  }

  /**
   * Verifica se appointment precisa de follow-up de pagamento
   * @param appointment - Agendamento
   * @param daysUntil - Dias até o agendamento
   * @returns true se precisa follow-up
   */
  static needsPaymentFollowUp(appointment: Appointment, daysUntil: number): boolean {
    return daysUntil <= 3 && this.getRemainingAmount(appointment) > 0
  }

  /**
   * Calcula valor médio de agendamentos
   * @param appointments - Lista de agendamentos
   * @returns Valor médio
   */
  static calculateAverageValue(appointments: Appointment[]): number {
    const validAppointments = appointments.filter(apt => apt.status !== 'cancelled')
    if (validAppointments.length === 0) return 0
    
    const total = validAppointments.reduce((sum, apt) => sum + this.getTotalAmount(apt), 0)
    return total / validAppointments.length
  }

  /**
   * Retorna descrição textual do status de pagamento
   * @param appointment - Agendamento
   * @returns Descrição em português
   */
  static getPaymentStatusText(appointment: Appointment): string {
    const percentage = this.getPaymentPercentage(appointment)
    
    if (percentage === 100) return 'Pago'
    if (percentage === 0) return 'Pendente'
    return `Parcial (${percentage}%)`
  }
}

export default PaymentService
