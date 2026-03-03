import { useState, useCallback, useMemo } from 'react'
import PaymentService from '../lib/PaymentService'

/**
 * Hook customizado para cálculos de pagamento
 * Centraliza toda a lógica de pagamentos para reutilização
 */

export interface PaymentState {
  totalAmount: number
  downPayment: number
  paidAmount: number
  remainingAmount: number
  paymentStatus: 'pending' | 'paid' | 'partial'
}

export function usePaymentCalculator(initialTotal: number = 0) {
  const [totalAmount, setTotalAmount] = useState(initialTotal)
  const [paidAmount, setPaidAmount] = useState(0)
  const [downPayment, setDownPayment] = useState(0)

  // Cálculos derivados (memoizados)
  const remainingAmount = useMemo(() => {
    return Math.max(0, totalAmount - paidAmount)
  }, [totalAmount, paidAmount])

  const paymentStatus = useMemo((): 'pending' | 'paid' | 'partial' => {
    if (paidAmount === 0) return 'pending'
    if (paidAmount >= totalAmount) return 'paid'
    return 'partial'
  }, [paidAmount, totalAmount])

  const paymentPercentage = useMemo(() => {
    if (totalAmount === 0) return 0
    return Math.min(100, (paidAmount / totalAmount) * 100)
  }, [paidAmount, totalAmount])

  // Funções auxiliares
  const updateTotal = useCallback((newTotal: number) => {
    setTotalAmount(Math.max(0, newTotal))
  }, [])

  const updatePaid = useCallback((newPaid: number) => {
    setPaidAmount(Math.max(0, Math.min(newPaid, totalAmount)))
  }, [totalAmount])

  const updateDownPayment = useCallback((newDownPayment: number) => {
    const validated = Math.max(0, Math.min(newDownPayment, totalAmount))
    setDownPayment(validated)
    // Quando define entrada, automaticamente marca como pago
    if (validated > 0 && paidAmount === 0) {
      setPaidAmount(validated)
    }
  }, [totalAmount, paidAmount])

  const addPayment = useCallback((amount: number) => {
    setPaidAmount(prev => Math.min(prev + Math.max(0, amount), totalAmount))
  }, [totalAmount])

  const reset = useCallback(() => {
    setTotalAmount(0)
    setPaidAmount(0)
    setDownPayment(0)
  }, [])

  const resetWithTotal = useCallback((newTotal: number) => {
    setTotalAmount(Math.max(0, newTotal))
    setPaidAmount(0)
    setDownPayment(0)
  }, [])

  // Estado completo
  const paymentState: PaymentState = useMemo(() => ({
    totalAmount,
    downPayment,
    paidAmount,
    remainingAmount,
    paymentStatus
  }), [totalAmount, downPayment, paidAmount, remainingAmount, paymentStatus])

  return {
    // Estado
    ...paymentState,
    paymentPercentage,
    
    // Setters diretos
    setTotalAmount: updateTotal,
    setPaidAmount: updatePaid,
    setDownPayment: updateDownPayment,
    
    // Métodos auxiliares
    addPayment,
    reset,
    resetWithTotal,
    
    // Estado completo como objeto
    paymentState
  }
}

/**
 * Hook para formatar valores monetários
 */
export function usePaymentFormatter() {
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }, [])

  const formatPercentage = useCallback((value: number): string => {
    return `${value.toFixed(1)}%`
  }, [])

  return {
    formatCurrency,
    formatPercentage
  }
}
