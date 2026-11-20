import { useCallback, useEffect, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeading, Panel, StatusPill } from '@/components/ui'
import { recommendationApi } from '@/lib/api'
import { formatAmount, shortDate } from '@/lib/format'
import type { ApiPage, Recommendation } from '@/types/api'

const evidenceLabels: Record<string, string> = {
  advertising_cost: 'Advertising cost',
  discount_amount: 'Discount amount',
  combined_marketing_spend: 'Combined spend',
  sales_revenue: 'Campaign revenue',
  revenue_per_spend: 'Revenue per spend',
  portfolio_median_spend: 'Portfolio median spend',
  portfolio_median_revenue_per_spend: 'Median revenue per spend',
  ccr_efficiency_score: 'CCR efficiency',
}

function evidenceValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (['advertising_cost', 'discount_amount', 'combined_marketing_spend', 'sales_revenue', 'portfolio_median_spend'].includes(key)) {
    return formatAmount(Number(value))
  }
  if (key.includes('efficiency') || key.includes('revenue_per_spend')) return `${(Number(value) * 100).toFixed(1)}%`
  return String(value)
}

export default function RecommendationsPage() {
  const [result, setResult] = useState<ApiPage<Recommendation> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setResult(await recommendationApi.list(page))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load recommendations.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    let active = true
    recommendationApi
      .list(page)
      .then((response) => {
        if (active) setResult(response)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load recommendations.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page])

  async function generate() {
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      const generated = await recommendationApi.generate()
      setSuccess(`${generated.length} recommendation${generated.length === 1 ? '' : 's'} generated from current campaign data.`)
      setPage(1)
      if (page === 1) await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to generate recommendations.')
    } finally {
      setGenerating(false)
    }
  }

  async function updateStatus(item: Recommendation, status: Recommendation['status']) {
    setBusyId(item.id)
    setError('')
    setSuccess('')
    try {
      await recommendationApi.update(item.id, status)
      setSuccess(`Recommendation marked ${status}.`)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update recommendation.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Next best actions"
        title="Recommendations"
        description="Evidence-led campaign suggestions based on your portfolio's spend, revenue, and efficiency."
        actions={
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="rounded-xl bg-[#101c2c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
          >
            {generating ? 'Analyzing campaigns…' : '✳ &nbsp; Generate recommendations'}
          </button>
        }
      />
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {success && <div className="mb-5"><Notice tone="success">{success}</Notice></div>}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Open', value: result?.data.filter((item) => item.status === 'open').length ?? 0, tone: 'text-amber-700 bg-amber-50' },
          { label: 'Actioned', value: result?.data.filter((item) => item.status === 'actioned').length ?? 0, tone: 'text-teal-700 bg-teal-50' },
          { label: 'Dismissed', value: result?.data.filter((item) => item.status === 'dismissed').length ?? 0, tone: 'text-slate-600 bg-slate-100' },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm text-slate-500">{item.label} on this page</span>
            <span className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${item.tone}`}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <Panel><LoadingState label="Reviewing recommendations…" /></Panel>
        ) : result?.data.length ? (
          result.data.map((item) => (
            <Panel key={item.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusPill value={item.priority} />
                    <StatusPill value={item.status} />
                    {item.campaign?.name && <span className="text-xs text-slate-400">{item.campaign.name}</span>}
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-400">{shortDate(item.created_at)}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
                {item.status === 'open' && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void updateStatus(item, 'actioned')}
                      className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                    >
                      Mark actioned
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void updateStatus(item, 'dismissed')}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
              {item.evidence && Object.keys(item.evidence).length > 0 && (
                <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(item.evidence).map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase leading-4 tracking-wide text-slate-400">{evidenceLabels[key] ?? key.replaceAll('_', ' ')}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{evidenceValue(key, value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          ))
        ) : (
          <Panel>
            <EmptyState title="No recommendations yet" detail="Generate recommendations to compare campaigns against the current portfolio." />
          </Panel>
        )}
      </div>

      {result && result.last_page > 1 && (
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1) }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Previous</button>
          <span className="text-xs text-slate-500">Page {result.current_page} of {result.last_page}</span>
          <button type="button" disabled={page >= result.last_page} onClick={() => { setLoading(true); setPage((value) => value + 1) }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Next</button>
        </div>
      )}
    </>
  )
}
