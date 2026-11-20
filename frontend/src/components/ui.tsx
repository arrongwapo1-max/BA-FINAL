import type { ReactNode } from 'react'

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = 'teal',
}: {
  label: string
  value: string
  detail: string
  icon: string
  tone?: 'teal' | 'blue' | 'amber' | 'violet'
}) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-xl text-lg ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-xs text-slate-500">{detail}</p>
    </Panel>
  )
}

export function Notice({
  children,
  tone = 'error',
}: {
  children: ReactNode
  tone?: 'error' | 'info' | 'success'
}) {
  const tones = {
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-teal-200 bg-teal-50 text-teal-800',
  }

  return <div className={`rounded-xl border px-4 py-3 text-sm leading-6 ${tones[tone]}`}>{children}</div>
}

export function LoadingState({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="grid min-h-64 place-items-center">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="size-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        {label}
      </div>
    </div>
  )
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-500">
        ◌
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  )
}

export function StatusPill({ value }: { value: string }) {
  const styles: Record<string, string> = {
    open: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    high: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    medium: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    low: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    sample: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    actioned: 'bg-teal-50 text-teal-700 ring-teal-600/20',
    dismissed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    efficient: 'bg-teal-50 text-teal-700 ring-teal-600/20',
    inefficient: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    admin: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    staff: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  }
  const label = value.replaceAll('_', ' ')
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${styles[value] ?? styles.low}`}
    >
      {label}
    </span>
  )
}

