import { useEffect, useMemo, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeading, Panel, StatusPill } from '@/components/ui'
import { dashboardApi } from '@/lib/api'
import { formatAmount, monthLabel } from '@/lib/format'
import type { DeaAnalysis, Forecast } from '@/types/api'

export default function AnalyticsPage() {
  const [months, setMonths] = useState(6)
  const [model, setModel] = useState<'CCR' | 'BCC'>('CCR')
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [dea, setDea] = useState<DeaAnalysis | null>(null)
  const [forecastError, setForecastError] = useState('')
  const [deaError, setDeaError] = useState('')
  const [forecastLoading, setForecastLoading] = useState(true)
  const [deaLoading, setDeaLoading] = useState(true)

  useEffect(() => {
    let active = true
    dashboardApi
      .forecast(months)
      .then((result) => {
        if (active) setForecast(result)
      })
      .catch((cause: unknown) => {
        if (active) setForecastError(cause instanceof Error ? cause.message : 'Unable to load forecast.')
      })
      .finally(() => {
        if (active) setForecastLoading(false)
      })
    return () => {
      active = false
    }
  }, [months])

  useEffect(() => {
    let active = true
    dashboardApi
      .dea(model)
      .then((result) => {
        if (active) setDea(result)
      })
      .catch((cause: unknown) => {
        if (active) setDeaError(cause instanceof Error ? cause.message : 'Unable to calculate efficiency.')
      })
      .finally(() => {
        if (active) setDeaLoading(false)
      })
    return () => {
      active = false
    }
  }, [model])

  const chartRows = useMemo(() => {
    if (!forecast) return []
    return [
      ...forecast.history.map((item) => ({
        month: item.month,
        label: 'Actual',
        value: Number(item.actual_sales_revenue),
      })),
      ...forecast.predictions.map((item) => ({
        month: item.month,
        label: 'Forecast',
        value: Number(item.predicted_sales_revenue),
      })),
    ]
  }, [forecast])
  const maxRevenue = Math.max(...chartRows.map((row) => row.value), 1)

  return (
    <>
      <PageHeading
        eyebrow="Decision support"
        title="Analytics"
        description="Explore a transparent sales forecast and compare campaign efficiency across your portfolio."
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">Sales forecast</h2>
              <p className="mt-1 text-sm text-slate-500">A linear trend fitted to saved monthly records</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
              Months ahead
              <select
                value={months}
                onChange={(event) => {
                  setForecastLoading(true)
                  setForecastError('')
                  setMonths(Number(event.target.value))
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-teal-500"
              >
                {[3, 6, 9, 12, 18, 24].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <div className="p-5 sm:p-6">
            {forecastLoading ? (
              <LoadingState label="Fitting forecast…" />
            ) : forecastError ? (
              <Notice>{forecastError}</Notice>
            ) : forecast ? (
              <>
                <div className="mb-6 flex flex-wrap gap-3">
                  <div className="rounded-xl bg-teal-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">History used</p>
                    <p className="mt-1 text-lg font-semibold text-teal-950">{forecast.training_months} months</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Forecast points</p>
                    <p className="mt-1 text-lg font-semibold text-violet-950">{forecast.predictions.length}</p>
                  </div>
                </div>
                {forecast.message && <div className="mb-5"><Notice tone="info">{forecast.message}</Notice></div>}
                {chartRows.length ? (
                  <>
                    <div className="relative flex h-64 items-end gap-2 border-b border-slate-200 sm:gap-3">
                      <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
                      <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-slate-200" />
                      <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-dashed border-slate-200" />
                      {chartRows.map((row) => (
                        <div key={`${row.label}-${row.month}`} className="group relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                          <span className="mb-2 hidden rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                            {formatAmount(row.value)}
                          </span>
                          <div
                            className={`w-full max-w-10 rounded-t-md ${row.label === 'Actual' ? 'bg-teal-600' : 'border-2 border-dashed border-violet-500 bg-violet-100'}`}
                            style={{ height: `${Math.max(3, (row.value / maxRevenue) * 100)}%` }}
                            title={`${row.label}: ${formatAmount(row.value)}`}
                          />
                          <span className="absolute -bottom-6 whitespace-nowrap text-[9px] text-slate-400 sm:text-[10px]">
                            {monthLabel(row.month)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-teal-600" /> Recorded revenue</span>
                      <span className="flex items-center gap-2"><i className="size-2.5 rounded-sm border border-violet-500 bg-violet-100" /> Forecast revenue</span>
                    </div>
                  </>
                ) : (
                  <EmptyState title="History is not sufficient" detail="Add at least two months of sales or campaign records to fit a trend." />
                )}
                {forecast.limitations && <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">{forecast.limitations}</p>}
              </>
            ) : null}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">Campaign efficiency</h2>
              <p className="mt-1 text-sm text-slate-500">Input-oriented Data Envelopment Analysis</p>
            </div>
            <div className="flex rounded-lg bg-slate-100 p-1" aria-label="DEA model">
              {(['CCR', 'BCC'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => {
                    setDeaLoading(true)
                    setDeaError('')
                    setModel(value)
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${model === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5 sm:p-6">
            {deaLoading ? (
              <LoadingState label={`Evaluating ${model} efficiency…`} />
            ) : deaError ? (
              <Notice>{deaError}</Notice>
            ) : dea ? (
              <>
                <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-xs text-slate-500">Evaluated campaigns</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-900">{dea.results.length}</p>
                  </div>
                  <p className="text-right text-xs leading-5 text-slate-500">
                    {dea.returns_to_scale} returns<br />input orientation
                  </p>
                </div>
                {dea.results.length ? (
                  <div className="max-h-[390px] divide-y divide-slate-100 overflow-y-auto">
                    {dea.results.map((item) => (
                      <div key={item.campaign_id} className="flex items-center gap-3 py-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">
                          {item.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{item.campaign_name}</p>
                          <p className="mt-0.5 text-xs text-slate-400">Rank {item.rank}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-800">{(Number(item.efficiency_score) * 100).toFixed(1)}%</p>
                          <StatusPill value={item.is_efficient ? 'efficient' : 'inefficient'} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No campaigns to evaluate" detail="Create campaigns with positive inputs to calculate relative efficiency." />
                )}
                {dea.excluded.length > 0 && (
                  <details className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <summary className="cursor-pointer text-xs font-semibold text-amber-900">
                      {dea.excluded.length} campaign{dea.excluded.length === 1 ? '' : 's'} excluded from scoring
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {dea.excluded.map((item) => (
                        <li key={item.campaign_id} className="text-xs leading-5 text-amber-800">
                          <strong>{item.campaign_name}:</strong> {item.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : null}
          </div>
        </Panel>
      </div>
      {dea?.assumptions && (
        <Panel className="mt-6 p-5 sm:p-6">
          <h2 className="font-semibold text-slate-900">How to read these scores</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-2">
            {dea.assumptions.map((assumption) => <li key={assumption} className="flex gap-2"><span className="text-teal-600">•</span><span>{assumption}</span></li>)}
          </ul>
        </Panel>
      )}
    </>
  )
}
