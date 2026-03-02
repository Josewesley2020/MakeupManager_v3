import React, { useState } from 'react'

interface WhatsAppButtonProps {
  phoneNumber?: string
  message: string
  className?: string
  children?: React.ReactNode
  allowCustomNumber?: boolean
}

export function WhatsAppButton({ phoneNumber = '', message, className = '', children, allowCustomNumber = false }: WhatsAppButtonProps) {
  const [customNumber, setCustomNumber] = useState(phoneNumber)
  const [showNumberInput, setShowNumberInput] = useState(allowCustomNumber)
  const formatPhoneNumber = (phone: string) => {
    // Remove todos os caracteres que não sejam números
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Se não começar com 55 (código do Brasil), adiciona
    if (!cleanPhone.startsWith('55')) {
      return `55${cleanPhone}`
    }
    
    return cleanPhone
  }

  const formatMessage = (text: string) => {
    // Codifica a mensagem para URL
    return encodeURIComponent(text)
  }

  const handleWhatsAppClick = () => {
    const numberToUse = allowCustomNumber ? customNumber : phoneNumber
    if (!numberToUse.trim()) {
      alert('Por favor, digite um número de telefone!')
      return
    }
    
    const formattedPhone = formatPhoneNumber(numberToUse)
    const formattedMessage = formatMessage(message)
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${formattedMessage}`
    
    // Abre em nova aba
    window.open(whatsappUrl, '_blank')
  }

  if (allowCustomNumber) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Campo para digitar número */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📱 Número do WhatsApp:
          </label>
          <input
            type="tel"
            value={customNumber}
            onChange={(e) => setCustomNumber(e.target.value)}
            placeholder="11999999999 ou (11) 99999-9999"
            className="w-full px-3 py-2 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors bg-gray-50 focus:bg-white placeholder-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Pode incluir DDD: (11) 99999-9999 ou 11999999999
          </p>
        </div>
        
        {/* Prévia da mensagem */}
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-sm font-semibold text-green-800 mb-2">📄 Prévia da mensagem:</p>
          <div className="bg-white rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap border border-green-200">
            {message}
          </div>
        </div>

        {/* Botão enviar */}
        <button
          onClick={handleWhatsAppClick}
          className="w-full inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-2 rounded-lg transition-colors duration-200"
        >
          <svg 
            className="w-5 h-5 mr-2" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
          {children || 'Enviar WhatsApp'}
        </button>
      </div>
    )
  }

  // Versão simples (sem campo customizado)
  return (
    <button
      onClick={handleWhatsAppClick}
      className={`
        inline-flex items-center justify-center
        bg-green-500 hover:bg-green-600 
        text-white font-semibold
        px-4 py-2 rounded-lg
        transition-colors duration-200
        ${className}
      `}
    >
      <svg 
        className="w-5 h-5 mr-2" 
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
      </svg>
      {children || 'Enviar WhatsApp'}
    </button>
  )
}

// Hook para gerar mensagens formatadas
export function useWhatsAppMessage() {
  const generateAppointmentMessage = (data: {
    clientName: string
    service: string
    date: string
    time: string
    location?: string
    price?: number
    notes?: string
  }) => {
    let message = `🎨 *MakeUp Manager* - Agendamento Confirmado!\n\n`
    message += `👤 *Cliente:* ${data.clientName}\n`
    message += `💄 *Serviço:* ${data.service}\n`
    message += `📅 *Data:* ${data.date}\n`
    message += `⏰ *Horário:* ${data.time}\n`
    
    if (data.location) {
      message += `📍 *Local:* ${data.location}\n`
    }
    
    if (data.price) {
      message += `💰 *Valor:* R$ ${data.price.toFixed(2)}\n`
    }
    
    if (data.notes) {
      message += `📝 *Observações:* ${data.notes}\n`
    }
    
    message += `\n✨ Obrigada pela preferência!`
    
    return message
  }

  const generateSimpleMessage = (text: string) => {
    return `🎨 *MakeUp Manager*\n\n${text}`
  }

  return {
    generateAppointmentMessage,
    generateSimpleMessage
  }
}