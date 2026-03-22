import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, Partner } from '../lib/supabase'

type PartnerRow = {
  id: string
  user_id: string | null
  name: string
  phone: string
  notes?: string | null
  created_at?: string
  updated_at?: string
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`
}

export default function Partners({ user }: { user?: any }) {
  const [partners, setPartners] = useState<Partner[]>([])
  const [editing, setEditing] = useState<Partner | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)

  // autofocus name input when form opens
  useEffect(() => {
    if (showForm && nameRef.current) {
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [showForm])

  useEffect(() => {
    loadPartners()
  }, [])

  async function loadPartners() {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('partners').select('*').order('created_at', { ascending: false })
      if (user && user.id) {
        query = query.eq('user_id', user.id)
      }
      const { data, error } = await query

      if (error) throw error
      if (data) {
        setPartners(data.map(d => ({
          id: d.id,
          user_id: d.user_id,
          name: d.name,
          phone: d.phone,
          notes: d.notes || undefined,
          created_at: d.created_at || '',
          updated_at: d.updated_at || ''
        })))
      }
    } catch (err: any) {
      console.error('Erro carregando parceiros:', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setName('')
    setPhone('')
    setNotes('')
  }

  const startEdit = (p: Partner) => {
    setEditing(p)
    setName(p.name)
    setPhone(p.phone)
    setNotes(p.notes || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setShowForm(true)
  }

  const save = () => {
    if (!name.trim() || !phone.trim()) {
      alert('Nome e telefone são obrigatórios')
      return
    }
    ;(async () => {
      try {
        if (editing) {
          const payload: any = { 
            name: name.trim(), 
            phone: phone.trim(), 
            notes: notes.trim() || null 
          }
          const { data, error } = await supabase
            .from('partners')
            .update(payload)
            .eq('id', editing.id)
            .select()

          if (error) throw error
          if (data) await loadPartners()
        } else {
          const payload: any = { 
            name: name.trim(), 
            phone: phone.trim(), 
            notes: notes.trim() || null 
          }
          if (user && user.id) payload.user_id = user.id
          const { data, error} = await supabase
            .from('partners')
            .insert(payload)
            .select()

          if (error) throw error
          if (data) await loadPartners()
        }
      } catch (err: any) {
        console.error('Erro salvando parceiro:', err)
        alert('Erro salvando parceiro: ' + (err.message || String(err)))
      } finally {
        resetForm()
        setShowForm(false)
      }
    })()
  }

  const remove = (id: string) => {
    if (!window.confirm('Excluir parceiro?')) return
    ;(async () => {
      try {
        const { error } = await supabase.from('partners').delete().eq('id', id)
        if (error) throw error
        await loadPartners()
      } catch (err: any) {
        console.error('Erro ao excluir parceiro:', err)
        alert('Erro ao excluir parceiro: ' + (err.message || String(err)))
      }
    })()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return partners
    return partners.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.phone.includes(q)
    )
  }, [partners, query])

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const toggleExpanded = (id: string) => setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-3 rounded-xl border border-cyan-200 shadow-sm">
          <div className="text-center">
            <div className="text-lg mb-1">🤝</div>
            <div className="text-xs text-gray-600 font-medium">Total</div>
            <div className="text-lg font-bold text-cyan-600">
              {filtered.length}
            </div>
            <div className="text-xs text-gray-500">parceiros</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl border border-purple-200 shadow-sm">
          <div className="text-center">
            <div className="text-lg mb-1">📋</div>
            <div className="text-xs text-gray-600 font-medium">Com Notas</div>
            <div className="text-lg font-bold text-purple-600">
              {filtered.filter(p => p.notes).length}
            </div>
            <div className="text-xs text-gray-500">registros</div>
          </div>
        </div>
      </div>

      {/* Search Box */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-cyan-400 focus:outline-none transition-all duration-200 shadow-sm"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">🔍</span>
      </div>

      {/* Add Button */}
      <button
        onClick={() => { resetForm(); setShowForm(!showForm) }}
        className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
      >
        <span>{showForm ? '❌ Cancelar' : '➕ Adicionar Parceiro'}</span>
      </button>

      {/* Form */}
      {showForm && (
        <div className="bg-gradient-to-br from-cyan-50 via-white to-purple-50 p-6 rounded-2xl border-2 border-cyan-200 shadow-lg space-y-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <span>{editing ? '✏️' : '➕'}</span>
            <span>{editing ? 'Editar Parceiro' : 'Novo Parceiro'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Column 1 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo *</label>
                <input
                  ref={nameRef}
                  aria-label="Nome"
                  type="text"
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all duration-200 bg-white shadow-sm"
                  placeholder="Digite o nome completo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Telefone *</label>
                <input
                  aria-label="Telefone"
                  type="tel"
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all duration-200 bg-white shadow-sm"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas / Especialidade
                  <span className="text-xs text-gray-500 ml-2">(opcional, máx 500 caracteres)</span>
                </label>
                <textarea
                  aria-label="Notas"
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all duration-200 bg-white shadow-sm resize-none"
                  placeholder="Ex: Especialista em maquiagem de noiva, disponível fins de semana..."
                  rows={5}
                  maxLength={500}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {notes.length}/500
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={save}
              disabled={!name.trim() || !phone.trim()}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {editing ? '💾 Salvar Alterações' : '➕ Adicionar Parceiro'}
            </button>
            
            <button
              onClick={() => { resetForm(); setShowForm(false) }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* Partners List */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">🤝</div>
          <p className="text-gray-600 font-medium">
            {query ? 'Nenhum parceiro encontrado' : 'Nenhum parceiro cadastrado'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {query ? 'Tente outro termo de busca' : 'Clique em "Adicionar Parceiro" para começar'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((partner) => {
            const isExpanded = expandedMap[partner.id] || false
            const cleanPhone = partner.phone.replace(/\D/g, '')
            const whatsappLink = `https://wa.me/55${cleanPhone}`

            return (
              <div
                key={partner.id}
                className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-cyan-300 hover:shadow-md transition-all duration-200"
              >
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                      {partner.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-bold text-gray-800 truncate">{partner.name}</h3>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <span>📱</span>
                          <span>{formatPhone(partner.phone)}</span>
                        </span>
                        
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 font-medium flex items-center space-x-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>💬</span>
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => toggleExpanded(partner.id)}
                    className="ml-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                  >
                    <span className="text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    {/* Notes */}
                    {partner.notes && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="text-xs font-semibold text-purple-700 mb-1">📋 Notas:</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{partner.notes}</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => startEdit(partner)}
                        className="flex-1 py-2 px-4 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                      >
                        <span>✏️</span>
                        <span>Editar</span>
                      </button>
                      
                      <button
                        onClick={() => remove(partner.id)}
                        className="flex-1 py-2 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                      >
                        <span>🗑️</span>
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
