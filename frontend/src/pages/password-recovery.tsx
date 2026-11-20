import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Notice } from '@/components/ui'
import { authApi } from '@/lib/api'

function RecoveryLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#101c2c] p-4 sm:p-8">
      <section className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl shadow-black/20 sm:p-10">
        <div className="mb-9 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-teal-600 text-xs font-bold text-white">DP</span>
          <span className="text-xs font-semibold tracking-[0.12em] text-slate-900">DATAPULSE</span>
        </div>
        {children}
      </section>
    </main>
  )
}

function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={10}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 hover:text-slate-800"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
            {visible ? (
              <>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.7 10.7 0 0112 5c5.2 0 8.6 4.5 9.5 6-.4.7-1.5 2.3-3.5 3.8M6.2 6.2C3.9 7.6 2.5 9.7 2 11c.9 1.5 4.3 6 10 6 1 0 2-.2 2.9-.5" />
              </>
            ) : (
              <>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z" />
                <circle cx="12" cy="12" r="2.5" />
              </>
            )}
          </svg>
        </button>
      </div>
    </label>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const response = await authApi.requestPasswordReset(email.trim())
      setSuccess(response.message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send a password reset link.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RecoveryLayout>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Account recovery</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Forgot your password?</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Enter the email address for your account and we’ll send you a link to reset your password.
      </p>
      {(error || success) && (
        <div className="mt-6">
          <Notice tone={success ? 'success' : 'error'}>{success || error}</Notice>
        </div>
      )}
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            placeholder="you@company.com"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-xl bg-[#101c2c] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Sending link…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">
        <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-900">Back to sign in</Link>
      </p>
    </RecoveryLayout>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const response = await authApi.resetPassword({
        email: email.trim(),
        token,
        password,
        password_confirmation: passwordConfirmation,
      })
      setSuccess(response.message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reset your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RecoveryLayout>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Account recovery</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Set a new password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Choose a new password with at least 10 characters.</p>
      {!token && (
        <div className="mt-6">
          <Notice>The reset link is incomplete. Request a new link to continue.</Notice>
        </div>
      )}
      {(error || success) && (
        <div className="mt-6">
          <Notice tone={success ? 'success' : 'error'}>{success || error}</Notice>
        </div>
      )}
      {token && !success && (
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              placeholder="you@company.com"
            />
          </label>
          <PasswordInput label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
          <PasswordInput
            label="Confirm new password"
            value={passwordConfirmation}
            onChange={setPasswordConfirmation}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-xl bg-[#101c2c] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Updating password…' : 'Reset password'}
          </button>
        </form>
      )}
      <p className="mt-7 text-center text-sm text-slate-500">
        {success ? (
          <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-900">Continue to sign in</Link>
        ) : (
          <Link to="/forgot-password" className="font-semibold text-teal-700 hover:text-teal-900">Request a new link</Link>
        )}
      </p>
    </RecoveryLayout>
  )
}
