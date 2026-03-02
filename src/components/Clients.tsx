import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  notes?: string
  address?: string
  instagram?: string
}

type ClientRow = {
  id: string
  user_id: string | null
  name: string
  phone: string
  email?: string | null
  notes?: string | null
  address?: string | null
  instagram?: string | null
  created_at?: string
  updated_at?: string
}

const generateId = () => Math.random().toString(36).slice(2, 9)

function formatPhone(raw: string) {
  // simple BR phone formatting: keep digits and format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`
}

export default function Clients({ user }: { user?: any }) {
  const [clients, setClients] = useState<Client[]>([])
  const [editing, setEditing] = useState<Client | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [address, setAddress] = useState('')
  const [instagram, setInstagram] = useState('')
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
    loadClients()
  }, [])

  async function loadClients() {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('clients').select('*').order('created_at', { ascending: false })
      if (user && user.id) {
        query = query.eq('user_id', user.id)
      }
      const { data, error } = await query

      if (error) throw error
      if (data) {
        setClients(data.map(d => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          email: d.email || undefined,
          notes: d.notes || undefined,
          address: d.address || undefined,
          instagram: d.instagram || undefined
        })))
      }
    } catch (err: any) {
      console.error('Erro carregando clientes:', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setAddress('')
    setInstagram('')
  }

  const startEdit = (c: Client) => {
    setEditing(c)
    setName(c.name)
    setPhone(c.phone)
    setEmail(c.email || '')
    setNotes(c.notes || '')
    setAddress(c.address || '')
    setInstagram(c.instagram || '')
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
          const payload: any = { name: name.trim(), phone: phone.trim(), email: email.trim() || null, notes: notes.trim() || null, address: address.trim() || null, instagram: instagram.trim() || null }
          if (user && user.id) payload.user_id = user.id
          const { data, error } = await supabase
            .from('clients')
            .update(payload)
            .eq('id', editing.id)
            .select()

          if (error) throw error
          if (data) await loadClients()
        } else {
          const payload: any = { name: name.trim(), phone: phone.trim(), email: email.trim() || null, notes: notes.trim() || null, address: address.trim() || null, instagram: instagram.trim() || null }
          if (user && user.id) payload.user_id = user.id
          const { data, error } = await supabase
            .from('clients')
            .insert(payload)
            .select()

          if (error) throw error
          if (data) await loadClients()
        }
      } catch (err: any) {
        console.error('Erro salvando cliente:', err)
        alert('Erro salvando cliente: ' + (err.message || String(err)))
      } finally {
        resetForm()
        setShowForm(false)
      }
    })()
  }

  const remove = (id: string) => {
    if (!window.confirm('Excluir cliente?')) return
    ;(async () => {
      try {
        const { error } = await supabase.from('clients').delete().eq('id', id)
        if (error) throw error
        await loadClients()
      } catch (err: any) {
        console.error('Erro ao excluir cliente:', err)
        alert('Erro ao excluir cliente: ' + (err.message || String(err)))
      }
    })()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').toLowerCase().includes(q))
  }, [clients, query])

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const toggleExpanded = (id: string) => setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-center">
            <div className="text-lg mb-1">👥</div>
            <div className="text-xs text-gray-600 font-medium">Total</div>
            <div className="text-lg font-bold text-blue-600">
              {filtered.length}
            </div>
            <div className="text-xs text-gray-500">clientes</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl border border-green-200 shadow-sm">
          <div className="text-center">
            <div className="text-lg mb-1">📷</div>
            <div className="text-xs text-gray-600 font-medium">Com Instagram</div>
            <div className="text-lg font-bold text-green-600">
              {filtered.filter(c => c.instagram).length}
            </div>
            <div className="text-xs text-gray-500">perfis</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Lista de Clientes
            </h2>
            <button 
              onClick={() => setShowForm(s => !s)} 
              className="px-4 py-2 bg-white/20 text-white rounded-xl text-sm hover:bg-white/30 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
            >
              <span className="text-lg">{showForm ? '✕' : '➕'}</span>
              <span className="hidden sm:inline font-medium">{showForm ? 'Fechar' : 'Adicionar'}</span>
            </button>
          </div>
          <div className="text-blue-100 text-sm mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-200 rounded-full"></span>
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} cadastrado{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="p-4">
          {/* Formulário */}
          <div className={`overflow-hidden transition-all duration-300 ${showForm ? 'max-h-[800px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 rounded-xl space-y-4 mb-4 border border-blue-100 shadow-lg">
              <div className="text-center mb-4">
                <h3 className="font-bold text-gray-800 text-lg flex items-center justify-center gap-2">
                  <span className="text-2xl">{editing ? '✏️' : '➕'}</span>
                  {editing ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {editing ? 'Atualize as informações do cliente' : 'Adicione um novo cliente à sua lista'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coluna 1 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>👤</span>
                      Nome completo *
                    </label>
                    <input 
                      ref={nameRef} 
                      aria-label="Nome" 
                      type="text" 
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white shadow-sm hover:shadow-md focus:shadow-lg" 
                      placeholder="Digite o nome completo" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>📱</span>
                      Telefone *
                    </label>
                    <input 
                      aria-label="Telefone" 
                      type="tel" 
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white shadow-sm hover:shadow-md focus:shadow-lg" 
                      placeholder="(11) 99999-9999" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>✉️</span>
                      Email
                    </label>
                    <input 
                      aria-label="Email" 
                      type="email" 
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white shadow-sm hover:shadow-md focus:shadow-lg" 
                      placeholder="cliente@email.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Coluna 2 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>📍</span>
                      Endereço
                    </label>
                    <input 
                      aria-label="Endereço" 
                      type="text" 
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white shadow-sm hover:shadow-md focus:shadow-lg" 
                      placeholder="Rua, número, bairro, cidade" 
                      value={address} 
                      onChange={e => setAddress(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>📷</span>
                      Instagram
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                      <input 
                        aria-label="Instagram" 
                        type="text" 
                        className="w-full pl-8 pr-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white shadow-sm hover:shadow-md focus:shadow-lg" 
                        placeholder="usuario" 
                        value={instagram} 
                        onChange={e => setInstagram(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span>📝</span>
                      Notas
                    </label>
                    <textarea 
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white shadow-sm hover:shadow-md focus:shadow-lg resize-none" 
                      placeholder="Observações sobre o cliente..." 
                      rows={3}
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-blue-200">
                <button 
                  onClick={save} 
                  disabled={!name.trim() || !phone.trim()} 
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  <span>{editing ? '💾' : '➕'}</span>
                  <span>{editing ? 'Salvar Alterações' : 'Adicionar Cliente'}</span>
                </button>
                <button 
                  onClick={() => { resetForm(); setShowForm(false); }} 
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>

          {/* Busca */}
          <div className="mb-4">
            <div className="relative">
              <input 
                aria-label="Buscar" 
                type="text" 
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-blue-500 focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg" 
                placeholder="Buscar por nome, telefone ou email..." 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                🔍
              </div>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista de Clientes */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="text-gray-500 mt-4 font-medium">Carregando clientes...</p>
              <p className="text-gray-400 text-sm mt-1">Aguarde um momento</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-red-600 font-semibold mb-2">Erro ao carregar clientes</p>
              <p className="text-gray-500 text-sm">{error}</p>
              <button
                onClick={loadClients}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Tentar Novamente
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">{query ? '�' : '�👥'}</div>
              <p className="text-gray-500 font-semibold mb-2">
                {query ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </p>
              <p className="text-gray-400 text-sm">
                {query ? `Não encontramos clientes para "${query}"` : 'Adicione seu primeiro cliente para começar'}
              </p>
              {!query && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  ➕ Adicionar Primeiro Cliente
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(c => (
                <div key={c.id} className="bg-gradient-to-r from-white to-blue-50 border border-blue-100 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 text-lg">
                        {(c.name || ' ')[0].toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-gray-800 truncate text-lg">{c.name}</div>
                          <button
                            onClick={() => toggleExpanded(c.id)}
                            className={`flex-shrink-0 p-2 rounded-full hover:bg-blue-100 transition-all duration-200 ${expandedMap[c.id] ? 'rotate-180 bg-blue-100' : 'rotate-0'}`}
                          >
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        <div className="space-y-2">
                          <a
                            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm bg-green-50 hover:bg-green-100 px-3 py-1 rounded-lg transition-all duration-200 break-all"
                            href={`https://wa.me/55${String(c.phone).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span>📱</span>
                            <span className="truncate">{formatPhone(c.phone)}</span>
                          </a>
                          {c.instagram && (
                            <a
                              className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-medium text-sm bg-pink-50 hover:bg-pink-100 px-3 py-1 rounded-lg transition-all duration-200 break-all"
                              target="_blank"
                              rel="noreferrer"
                              href={`https://instagram.com/${String(c.instagram).replace(/^@/, '')}`}
                            >
                              <span>📷</span>
                              <span className="truncate">@{String(c.instagram).replace(/^@/, '')}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Detalhes expandidos */}
                    <div className={`overflow-hidden transition-all duration-300 ${expandedMap[c.id] ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 mt-0 opacity-0'}`}>
                      <div className="border-t border-blue-100 pt-4 space-y-3">
                        {c.email && (
                          <div className="flex items-center gap-3 text-sm bg-blue-50 p-3 rounded-lg">
                            <span className="text-blue-600 text-lg">✉️</span>
                            <a className="text-gray-700 hover:text-blue-600 font-medium break-all" href={`mailto:${c.email}`}>{c.email}</a>
                          </div>
                        )}
                        {c.address && (
                          <div className="flex items-start gap-3 text-sm bg-green-50 p-3 rounded-lg">
                            <span className="text-green-600 text-lg">📍</span>
                            <span className="text-gray-700 leading-relaxed">{c.address}</span>
                          </div>
                        )}
                        {c.notes && (
                          <div className="flex items-start gap-3 text-sm bg-yellow-50 p-3 rounded-lg">
                            <span className="text-yellow-600 text-lg">📝</span>
                            <span className="text-gray-600 italic leading-relaxed">{c.notes}</span>
                          </div>
                        )}
                        
                        <div className="flex gap-3 pt-3 border-t border-blue-100">
                          <button 
                            onClick={() => startEdit(c)} 
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg text-sm font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                          >
                            <span>✏️</span>
                            <span>Editar</span>
                          </button>
                          <button 
                            onClick={() => remove(c.id)} 
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-lg text-sm font-semibold hover:from-red-500 hover:to-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                          >
                            <span>🗑️</span>
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
