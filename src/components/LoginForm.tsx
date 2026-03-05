import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Detectar se o usuário veio de um link de recuperação de senha
  useEffect(() => {
    const processRecoveryToken = async () => {
      // Verificar se há hash na URL (Supabase usa hash para tokens)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const type = hashParams.get('type')
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      
      console.log('🔍 LoginForm - URL Hash:', window.location.hash)
      console.log('🔍 LoginForm - Type:', type)
      console.log('🔍 LoginForm - Access Token:', accessToken ? 'present' : 'missing')
      console.log('🔍 LoginForm - Refresh Token:', refreshToken ? 'present' : 'missing')
      
      if (type === 'recovery' && accessToken) {
        console.log('✅ Modo de recuperação de senha ativado!')
        
        try {
          // Estabelecer sessão com os tokens da URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })
          
          console.log('🔐 Sessão estabelecida:', { data, error })
          
          if (error) {
            console.error('❌ Erro ao estabelecer sessão:', error)
            setError('Erro ao processar link de recuperação. Solicite um novo link.')
            return
          }
          
          setIsPasswordRecovery(true)
          setMessage('✨ Defina sua nova senha abaixo')
        } catch (err) {
          console.error('❌ Erro ao processar tokens:', err)
          setError('Erro ao processar link de recuperação. Solicite um novo link.')
        }
      }
    }
    
    processRecoveryToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isPasswordRecovery) {
        // Atualizar senha após recuperação
        console.log('🔐 Iniciando atualização de senha...')
        
        if (newPassword !== confirmPassword) {
          throw new Error('As senhas não coincidem')
        }

        if (newPassword.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres')
        }

        const { data, error } = await supabase.auth.updateUser({
          password: newPassword
        })

        console.log('🔐 Resultado updateUser:', { data, error })

        if (error) throw error

        setMessage('✅ Senha atualizada com sucesso! Redirecionando...')
        
        // Limpar hash da URL
        window.history.replaceState(null, '', window.location.pathname)
        
        // Aguardar 2 segundos e redirecionar
        setTimeout(() => {
          setIsPasswordRecovery(false)
          onSuccess?.()
        }, 2000)
      } else if (isForgotPassword) {
        // Recuperação de senha
        console.log('📧 Enviando email de recuperação para:', email)
        
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })

        console.log('📧 Resultado resetPasswordForEmail:', { data, error })

        if (error) throw error

        setMessage('📧 Link de recuperação enviado! Verifique seu email.')
        setIsForgotPassword(false)
        setEmail('')
      } else if (isSignUp) {
        // Criar conta
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        })

        if (error) throw error

        if (data.user && !data.session) {
          setMessage('✅ Conta criada! Verifique seu email para confirmar.')
        } else {
          setMessage('✅ Conta criada com sucesso!')
          onSuccess?.()
        }
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        setMessage('✅ Login realizado com sucesso!')
        onSuccess?.()
      }
    } catch (error: any) {
      let errorMessage = 'Erro desconhecido'
      
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos'
        } else if (error.message.includes('User not confirmed')) {
          errorMessage = 'Por favor, confirme seu email antes de fazer login'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setIsForgotPassword(false)
    setError('')
    setMessage('')
  }

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword)
    setIsSignUp(false)
    setError('')
    setMessage('')
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background Animado */}
      <div className="fixed inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600">
        {/* Mesh Gradient Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        {/* Animated Blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      {/* Floating Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-float" />
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-white/20 rounded-full animate-float animation-delay-1000" />
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white/40 rounded-full animate-float animation-delay-2000" />
        <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-white/25 rounded-full animate-float animation-delay-3000" />
      </div>

      {/* Container Principal */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Lado Esquerdo - Ilustração/Branding (Desktop) */}
          <div className="hidden lg:flex flex-col justify-center text-white space-y-6 animate-fade-in-left">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 shadow-2xl">
                <span className="text-5xl">💄</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                MakeUp
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-white">
                  Manager
                </span>
              </h1>
              
              <p className="text-xl text-pink-100 max-w-md leading-relaxed">
                Sistema completo para profissionais de beleza gerenciarem clientes, agendamentos e pagamentos.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-pink-100">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span>Gestão de clientes simplificada</span>
              </div>
              <div className="flex items-center space-x-3 text-pink-100">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span>Controle financeiro completo</span>
              </div>
              <div className="flex items-center space-x-3 text-pink-100">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span>WhatsApp integrado</span>
              </div>
            </div>
          </div>

          {/* Lado Direito - Card de Login */}
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-fade-in-right">
            {/* Logo Mobile */}
            <div className="lg:hidden text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl mb-4">
                <span className="text-4xl">💄</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                MakeUp Manager
              </h2>
              <p className="text-pink-100">
                Gestão profissional de beleza
              </p>
            </div>

            {/* Card Glassmorphism */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 space-y-6 transform transition-all duration-300 hover:shadow-pink-500/20">
              
              {/* Header */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-gray-800">
                  {isPasswordRecovery ? '🔐 Redefinir Senha' : isForgotPassword ? 'Recuperar Senha' : isSignUp ? 'Criar Conta' : 'Bem-vindo(a)!'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {isPasswordRecovery
                    ? 'Escolha uma nova senha segura'
                    : isForgotPassword 
                      ? 'Enviaremos um link de recuperação' 
                      : isSignUp 
                        ? 'Preencha os dados para começar' 
                        : 'Entre com seus dados para continuar'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Password Recovery Mode - Nova Senha */}
                {isPasswordRecovery ? (
                  <>
                    {/* Nova Senha */}
                    <div className="space-y-2">
                      <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700">
                        Nova Senha
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder-gray-400"
                          placeholder="••••••••"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showNewPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.636 6.636m3.242 3.242l4.243 4.242M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

                    {/* Confirmar Nova Senha */}
                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                        Confirmar Senha
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder-gray-400"
                          placeholder="••••••••"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.636 6.636m3.242 3.242l4.243 4.242M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Email */}
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                        Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder-gray-400"
                          placeholder="seu@email.com"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    {!isForgotPassword && (
                      <div className="space-y-2">
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                          Senha
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder-gray-400"
                            placeholder="••••••••"
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.636 6.636m3.242 3.242l4.243 4.242M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {isSignUp && (
                          <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
                        )}
                      </div>
                    )}

                    {/* Forgot Password Link */}
                    {!isSignUp && !isForgotPassword && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={toggleForgotPassword}
                          className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Messages */}
                {message && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl animate-fade-in">
                    <p className="text-green-800 text-sm">{message}</p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-all duration-200 ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processando...
                    </span>
                  ) : (
                    isPasswordRecovery ? '✅ Atualizar Senha' : isForgotPassword ? '📧 Enviar Link' : isSignUp ? '🚀 Criar Conta' : '🔓 Entrar'
                  )}
                </button>
              </form>

              {/* Footer */}
              {!isPasswordRecovery && (
                <div className="space-y-4">
                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-white text-gray-500">ou</span>
                    </div>
                  </div>

                  {/* Toggle Mode */}
                  <div className="text-center">
                    {isForgotPassword ? (
                      <button
                        type="button"
                        onClick={toggleForgotPassword}
                        className="text-sm text-gray-600 hover:text-pink-600 font-medium transition-colors"
                      >
                        ← Voltar para login
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={toggleMode}
                        className="text-sm text-gray-600 hover:text-pink-600 transition-colors"
                      >
                        {isSignUp ? (
                          <>
                            Já tem conta? <span className="font-semibold text-pink-600">Entrar</span>
                          </>
                        ) : (
                          <>
                            Não tem conta? <span className="font-semibold text-pink-600">Criar uma</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Text */}
            <p className="text-center text-white/80 text-xs mt-6">
              © 2026 MakeUp Manager • Gestão Profissional
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}