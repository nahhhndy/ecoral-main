'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/providers'

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

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [resetError, setResetError] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetFormData) => {
    setResetError('')
    setIsResetting(true)
    try {
      await authApi.resetPassword({
        email: data.email,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      })
      logout()
      router.push(`/login?reset=success&email=${encodeURIComponent(data.email)}`)
    } catch (e: any) {
      setResetError(formatApiError(e, 'Failed to reset password. Please check your email.'))
    } finally {
      setIsResetting(false)
    }
  }

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
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#8FA6B8] hover:text-[#F5FAFC] mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>

        <div className="p-8 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-xl">
          <div className="flex items-center gap-3 mb-6 border-b border-[#24475F]/60 pb-5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#18C8FF] to-[#5EEAD4] flex items-center justify-center text-[#07131E] shadow-sm">
              <KeyRound className="w-5 h-5 text-[#07131E]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-[#F5FAFC] text-lg">Reset Password</h1>
              <p className="text-xs text-[#8FA6B8]">Verify account and set a new password</p>
            </div>
          </div>

          {resetError && (
            <div
              id="reset-error-alert"
              className="mb-4 p-3 rounded-lg border border-[#FF5A6E]/30 bg-[#FF5A6E]/10 text-[#FF5A6E] text-xs font-medium"
            >
              {resetError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8FA6B8] uppercase tracking-wider mb-1.5">
                Account Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="researcher@ecoral.io"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
              />
              {errors.email && (
                <p className="text-[11px] text-[#FF5A6E] mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8FA6B8] uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  {...register('new_password')}
                  type={showNewPass ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA6B8] hover:text-[#F5FAFC]"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-[11px] text-[#FF5A6E] mt-1">{errors.new_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8FA6B8] uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  {...register('confirm_password')}
                  type={showConfirmPass ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA6B8] hover:text-[#F5FAFC]"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-[11px] text-[#FF5A6E] mt-1">{errors.confirm_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isResetting}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-[#18C8FF]/15"
            >
              {isResetting ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>

          <p className="text-center text-xs text-[#8FA6B8] mt-6">
            Remember your credentials?{' '}
            <Link href="/login" className="text-[#18C8FF] font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
