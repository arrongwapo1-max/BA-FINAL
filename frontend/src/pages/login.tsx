import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Notice } from '@/components/ui'
import { useAuth } from '@/lib/use-auth'

export default function LoginPage() {
  const { user, loading, error: sessionError, login, register, clearError } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const logoutWarning =
    typeof location.state === 'object' &&
    location.state !== null &&
    'logoutWarning' in location.state &&
    typeof location.state.logoutWarning === 'string'
      ? location.state.logoutWarning
      : ''

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    clearError()
    setSubmitting(true)
    try {
      if (mode === 'register') await register(name.trim(), email.trim(), password)
      else await login(email.trim(), password)
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Unable to authenticate.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#101c2c] p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-black/20 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#101c2c] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-36 -top-32 size-[440px] rounded-full border border-teal-300/10" />
          <div className="absolute -right-14 -top-10 size-[260px] rounded-full border border-teal-300/10" />
          <div className="absolute -bottom-40 -left-36 size-[460px] rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-400 text-lg font-bold text-slate-950">
              DP
            </span>
            <span className="text-xs font-semibold tracking-[0.12em]">DATAPULSE</span>
          </div>
          <div className="relative max-w-md">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">
              Your business, in focus
            </p>
            <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight">
              Clarity for your next big move.
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-300">
              Bring campaign performance, customer activity, and sales insights together in one workspace.
            </p>
            <div className="mt-10 flex items-center gap-3">
              <span className="h-px w-10 bg-teal-300" />
              <span className="text-xs text-slate-400">Analytics grounded in your records</span>
            </div>
          </div>
          <p className="relative text-xs text-slate-500">A considered view of what moves your business forward.</p>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-9 lg:hidden">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-teal-600 text-xs font-bold text-white">DP</span>
                <span className="text-xs font-semibold tracking-[0.12em] text-slate-900">DATAPULSE</span>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === 'login'
                ? 'Use your workspace credentials to continue.'
                : 'New accounts are created with staff access.'}
            </p>

            {(formError || sessionError || logoutWarning) && (
              <div className="mt-6">
                <Notice tone={logoutWarning && !formError && !sessionError ? 'info' : 'error'}>
                  {formError || sessionError || logoutWarning}
                </Notice>
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
                  <input
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    placeholder="Your name"
                  />
                </label>
              )}
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
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <div className="relative">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={mode === 'register' ? 10 : undefined}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    placeholder={mode === 'register' ? 'At least 10 characters' : 'Enter your password'}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={passwordVisible}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 hover:text-slate-800"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                      {passwordVisible ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.7 10.7 0 0112 5c5.2 0 8.6 4.5 9.5 6-.4.7-1.5 2.3-3.5 3.8M6.2 6.2C3.9 7.6 2.5 9.7 2 11c.9 1.5 4.3 6 10 6 1 0 2-.2 2.9-.5" />
                        </>
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z" />
                      )}
                      {!passwordVisible && <circle cx="12" cy="12" r="2.5" />}
                    </svg>
                  </button>
                </div>
              </label>
              {mode === 'login' && (
                <div className="-mt-2 text-right">
                  <Link to="/forgot-password" className="text-sm font-semibold text-teal-700 hover:text-teal-900">
                    Forgot password?
                  </Link>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || loading}
                className="flex w-full items-center justify-center rounded-xl bg-[#101c2c] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              {mode === 'login' ? 'New to DataPulse?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setFormError('')
                  clearError()
                }}
                className="font-semibold text-teal-700 hover:text-teal-900"
              >
                {mode === 'login' ? 'Create account' : 'Sign in'}
              </button>
            </p>
            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              Your data stays in your configured DataPulse API.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
