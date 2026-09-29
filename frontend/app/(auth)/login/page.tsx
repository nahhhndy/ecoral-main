'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, Waves, KeyRound, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/providers'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
})
type LoginFormData = z.infer<typeof loginSchema>

const resetSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(8, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
type ResetFormData = z.infer<typeof resetSchema>

function formatApiError(e: any, fallback: string): string {
  if (e?.code === 'ECONNABORTED' || e?.message?.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.'
  }
  const detail = e?.response?.data?.detail
  if (typeof detail === 'string') {
    return detail
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0]?.msg || fallback
  }
  return e?.message || fallback
}

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, logout } = useAuth()

  const [isForgot, setIsForgot] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const [error, setError] = useState('')
  const [resetError, setResetError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Login form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    setValue: setLoginValue,
    getValues: getLoginValues,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Reset form
  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    setValue: setResetValue,
    reset: resetResetForm,
    formState: { errors: resetErrors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  })

  // Check URL params on initial load
  useEffect(() => {
    const mode = searchParams.get('mode')
    const resetStatus = searchParams.get('reset')
    const emailParam = searchParams.get('email')

    if (mode === 'forgot' || mode === 'reset') {
      setIsForgot(true)
    }

    if (resetStatus === 'success') {
      setSuccessMessage('Password changed successfully. Please sign in with your new password.')
    }

    if (emailParam) {
      setLoginValue('email', emailParam)
      setResetValue('email', emailParam)
    }
  }, [searchParams, setLoginValue, setResetValue])

  const onLoginSubmit = async (data: LoginFormData) => {
    setError('')
    setSuccessMessage('')
    setIsAuthenticating(true)
    try {
      const res = await authApi.login(data)
      await login(res.access_token, res.refresh_token)
      router.push('/dashboard')
    } catch (e: any) {
      setError(formatApiError(e, 'Invalid email or password'))
    } finally {
      setIsAuthenticating(false)
    }
  }

  const onResetSubmit = async (data: ResetFormData) => {
    setResetError('')
    setIsResetting(true)
    try {
      const res = await authApi.resetPassword({
        email: data.email,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      })

      // Invalidate current auth session and clear stored tokens
      logout()

      // Reset reset form state
      resetResetForm()

      // Switch to sign in view
      setIsForgot(false)

      // Pre-populate email in login form
      setLoginValue('email', data.email)
      setLoginValue('password', '')

      // Display explicit success confirmation
      setSuccessMessage(
        res.message || 'Password changed successfully. Please sign in with your new password.'
      )
    } catch (e: any) {
      setResetError(formatApiError(e, 'Failed to reset password. Please check your email.'))
    } finally {
      setIsResetting(false)
    }
  }

  const handleOpenForgot = () => {
    const currentEmail = getLoginValues('email')
    if (currentEmail) {
      setResetValue('email', currentEmail)
    }
    setError('')
    setResetError('')
    setSuccessMessage('')
    setIsForgot(true)
  }

  const handleBackToLogin = () => {
    setResetError('')
    setIsForgot(false)
  }

  return (
    <div className="p-8 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-xl">
      <AnimatePresence mode="wait">
        {!isForgot ? (
          <motion.div
            key="login-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 border-b border-[#24475F]/60 pb-5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#18C8FF] to-[#5EEAD4] flex items-center justify-center text-[#07131E] shadow-sm">
                <Waves className="w-6 h-6 text-[#07131E]" />
              </div>
              <div>
                <h1 className="font-display font-bold text-[#F5FAFC] text-lg">Sign In to EcoRal</h1>
                <p className="text-xs text-[#8FA6B8]">Environmental Intelligence SaaS Platform</p>
              </div>
            </div>

            {/* Success message banner */}
            {successMessage && (
              <div
                id="reset-success-alert"
                className="mb-4 p-3 rounded-lg border border-[#5EEAD4]/40 bg-[#5EEAD4]/10 text-[#5EEAD4] text-xs font-medium flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#5EEAD4]" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error message banner */}
            {error && (
              <div
                id="login-error-alert"
                className="mb-4 p-3 rounded-lg border border-[#FF5A6E]/30 bg-[#FF5A6E]/10 text-[#FF5A6E] text-xs font-medium"
              >
                {error}
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8FA6B8] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  {...registerLogin('email')}
                  type="email"
                  id="login-email"
                  placeholder="researcher@ecoral.io"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
                />
                {loginErrors.email && (
                  <p className="text-[11px] text-[#FF5A6E] mt-1">{loginErrors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#8FA6B8] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    id="forgot-password-link"
                    onClick={handleOpenForgot}
                    className="text-xs text-[#18C8FF] hover:underline hover:text-[#5EEAD4] font-medium transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    {...registerLogin('password')}
                    type={showPass ? 'text' : 'password'}
                    id="login-password"
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA6B8] hover:text-[#F5FAFC]"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-[11px] text-[#FF5A6E] mt-1">{loginErrors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                id="sign-in-button"
                disabled={isAuthenticating}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-[#18C8FF]/15"
              >
                {isAuthenticating ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-[#8FA6B8] mt-6">
              Don't have an account?{' '}
              <Link href="/register" className="text-[#18C8FF] font-semibold hover:underline">
                Create an EcoRal Account
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="forgot-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 border-b border-[#24475F]/60 pb-5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#18C8FF] to-[#5EEAD4] flex items-center justify-center text-[#07131E] shadow-sm">
                <KeyRound className="w-5 h-5 text-[#07131E]" />
              </div>
              <div>
                <h1 className="font-display font-bold text-[#F5FAFC] text-lg">Reset Password</h1>
                <p className="text-xs text-[#8FA6B8]">Verify account and set a new password</p>
              </div>
            </div>

            {/* Error message banner */}
            {resetError && (
              <div
                id="reset-error-alert"
                className="mb-4 p-3 rounded-lg border border-[#FF5A6E]/30 bg-[#FF5A6E]/10 text-[#FF5A6E] text-xs font-medium"
              >
                {resetError}
              </div>
            )}

            {/* Reset Password Form */}
            <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8FA6B8] uppercase tracking-wider mb-1.5">
                  Account Email Address
                </label>
                <input
                  {...registerReset('email')}
                  type="email"
                  id="reset-email"
                  placeholder="researcher@ecoral.io"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
                />
                {resetErrors.email && (
                  <p className="text-[11px] text-[#FF5A6E] mt-1">{resetErrors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8FA6B8] uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    {...registerReset('new_password')}
                    type={showNewPass ? 'text' : 'password'}
                    id="reset-new-password"
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA6B8] hover:text-[#F5FAFC]"
                    aria-label={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetErrors.new_password && (
                  <p className="text-[11px] text-[#FF5A6E] mt-1">{resetErrors.new_password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8FA6B8] uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    {...registerReset('confirm_password')}
                    type={showConfirmPass ? 'text' : 'password'}
                    id="reset-confirm-password"
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA6B8] hover:text-[#F5FAFC]"
                    aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetErrors.confirm_password && (
                  <p className="text-[11px] text-[#FF5A6E] mt-1">
                    {resetErrors.confirm_password.message}
                  </p>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  id="reset-submit-button"
                  disabled={isResetting}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-[#18C8FF]/15"
                >
                  {isResetting ? 'Updating Password...' : 'Reset Password'}
                </button>

                <button
                  type="button"
                  id="cancel-reset-button"
                  onClick={handleBackToLogin}
                  className="w-full py-2 rounded-lg border border-[#24475F] bg-[#122535]/50 text-[#8FA6B8] hover:text-[#F5FAFC] hover:bg-[#122535] text-xs font-semibold transition-all cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#07131E] text-[#F5FAFC]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[550px] h-[550px] rounded-full bg-[#18C8FF]/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#8FA6B8] hover:text-[#F5FAFC] mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to EcoRal Home
        </Link>

        <Suspense
          fallback={
            <div className="p-8 rounded-xl border border-[#24475F] bg-[#0C1C2A] text-center text-[#8FA6B8] text-xs">
              Loading...
            </div>
          }
        >
          <LoginFormContent />
        </Suspense>
      </motion.div>
    </div>
  )
}
