import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Container } from './Container'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Debug: verificar se o Supabase está configurado
      console.log('Attempting login/signup...')
      
      // Teste de conectividade antes de tentar autenticação
      const { data: testData, error: testError } = await supabase.from('profiles').select('count').limit(1)
      console.log('Supabase connection test:', { testData, testError })
      
      if (isSignUp) {
        // Criar conta
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0], // Nome temporário baseado no email
            }
          }
        })

        if (error) {
          console.error('Signup error:', error)
          throw error
        }

        if (data.user && !data.session) {
          setMessage('Verifique seu email para confirmar a conta!')
        } else {
          setMessage('Conta criada com sucesso!')
          onSuccess?.()
        }
      } else {
        // Fazer login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          console.error('Login error:', error)
          throw error
        }

        setMessage('Login realizado com sucesso!')
        onSuccess?.()
      }
    } catch (error: any) {
      console.error('Auth error details:', error)
      
      // Melhor tratamento de erro
      let errorMessage = 'Erro desconhecido'
      
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos'
        } else if (error.message.includes('User not confirmed')) {
          errorMessage = 'Por favor, confirme seu email antes de fazer login'
        } else if (error.message.includes('not valid JSON')) {
          errorMessage = 'Erro de configuração. Tente novamente em alguns minutos.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 py-4">
      <Container className="space-y-4">
        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6 rounded-2xl shadow-xl mb-6">
            <h2 className="text-2xl font-bold mb-2">
              💄 MakeUp Manager
            </h2>
            <p className="text-pink-100">
              {isSignUp ? 'Criar sua conta' : 'Entrar na sua conta'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xl">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                📧 Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors bg-gray-50 focus:bg-white placeholder-gray-500"
                placeholder="seu@email.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                🔐 Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors bg-gray-50 focus:bg-white placeholder-gray-500"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.636 6.636a8.966 8.966 0 00-2.115 2.242M9.878 9.878a3 3 0 103.365-3.366M14.12 14.12l3.536 3.536a8.966 8.966 0 002.115-2.242M14.12 14.12a3 3 0 01-3.365 3.366m0 0a8.966 8.966 0 01-4.242-2.242" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm leading-relaxed">{message}</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isSignUp ? 'Criando...' : 'Entrando...'}
                </span>
              ) : (
                isSignUp ? '🚀 Criar Conta' : '🔓 Entrar'
              )}
            </button>
          </form>

          <div className="mt-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">ou</span>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                  setMessage('')
                }}
                className="w-full text-center text-pink-600 hover:text-pink-500 font-semibold py-2 px-4 rounded-lg hover:bg-pink-50 transition-colors"
              >
                {isSignUp ? '👤 Já tem conta? Entrar' : '✨ Não tem conta? Criar uma'}
              </button>
            </div>
          </div>
        </div>


      </Container>
    </div>
  )
}