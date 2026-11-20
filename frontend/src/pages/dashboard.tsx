import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState, LoadingState, MetricCard, Notice, PageHeading, Panel, StatusPill } from '@/components/ui'
import { formatAmount, monthLabel } from '@/lib/format'
import { dashboardApi } from '@/lib/api'
import type { DashboardResponse } from '@/types/api'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await dashboardApi.get())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    dashboardApi
      .get()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load dashboard data.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) return <LoadingState label="Gathering your business insights…" />

  if (error || !data) {
    return (
      <>
        <PageHeading eyebrow="Overview" title="Good to see you." description="Your business snapshot will appear here once connected." />
        <Notice>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error || 'No dashboard data was returned.'}</span>
            <button type="button" onClick={() => void load()} className="font-semibold underline underline-offset-2">
              Try again
            </button>
          </div>
          <p className="mt-1 text-xs opacity-80">Check that the Laravel API is running at 127.0.0.1:8000 and sign in with an API account.</p>
        </Notice>
      </>
    )
  }

  const { summary, forecast, recommendations } = data
  const totals = summary.totals
  const chartRows = summary.monthly_sales.slice(-8)
  const maxRevenue = Math.max(...chartRows.map((row) => Number(row.revenue)), 1)
  const nextForecast = forecast.predictions[0]
  const topCampaigns = summary.top_campaigns.slice(0, 5)

  return (
    <>
      <PageHeading
        eyebrow="Business overview"
        title="Good to see you."
        description="A clear view of your sales, customers, and campaign performance."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ↻ &nbsp; Refresh data
          </button>
        }
      />

      {summary.sample_data_notice && (
        <div className="mb-6">
          <Notice tone="info">{summary.sample_data_notice}</Notice>
        </div>
      )}
      <p className="mb-3 text-xs text-slate-400">Amounts are shown in the units stored by your API; no currency is configured.</p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Sales revenue"
          value={formatAmount(totals.sales_revenue)}
          detail={`Average sale ${formatAmount(totals.average_sale)}`}
          icon="↗"
          tone="teal"
        />
        <MetricCard
          label="Active campaigns"
          value={totals.campaigns.toLocaleString()}
          detail={`${formatAmount(totals.advertising_expenses)} in advertising`}
          icon="▤"
          tone="blue"
        />
        <MetricCard
          label="Customers"
          value={totals.customers.toLocaleString()}
          detail={`${totals.customers_acquired.toLocaleString()} acquired through campaigns`}
          icon="◉"
          tone="violet"
        />
        <MetricCard
          label="Campaign efficiency"
          value={`${(totals.average_campaign_efficiency * 100).toFixed(0)}%`}
          detail="Average CCR efficiency score"
          icon="⌁"
          tone="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">Sales performance</h2>
              <p className="mt-1 text-sm text-slate-500">Recorded revenue by month</p>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">Actual sales</span>
          </div>
          {chartRows.length ? (
            <div className="px-5 pb-5 pt-7 sm:px-6">
              <div className="relative flex h-52 items-end gap-3 border-b border-slate-200">
                <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
                <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-slate-200" />
                <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-dashed border-slate-200" />
                {chartRows.map((row) => {
                  const height = Math.max(4, (Number(row.revenue) / maxRevenue) * 100)
                  return (
                    <div key={row.month} className="group relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                      <span className="mb-2 hidden rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                        {formatAmount(Number(row.revenue))}
                      </span>
                      <div
                        className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-teal-700 to-teal-400 transition-opacity group-hover:opacity-80"
                        style={{ height: `${height}%` }}
                        title={`${formatAmount(Number(row.revenue))} in ${monthLabel(row.month)}`}
                      />
                      <span className="absolute -bottom-6 whitespace-nowrap text-[10px] text-slate-400">
                        {monthLabel(row.month)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-10 flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Revenue across recorded sales</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatAmount(totals.sales_revenue)}</p>
                </div>
                <Link to="/sales" className="text-xs font-semibold text-teal-700 hover:text-teal-900">
                  View sales →
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState title="No sales history yet" detail="Add sales records to see monthly revenue trends here." />
          )}
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Outlook</h2>
              <p className="mt-1 text-sm text-slate-500">Short-term revenue forecast</p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700">↗</span>
          </div>
          {nextForecast ? (
            <>
              <p className="mt-8 text-3xl font-semibold tracking-tight text-slate-950">
                {formatAmount(nextForecast.predicted_sales_revenue)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Estimated sales for {monthLabel(nextForecast.month)}</p>
              <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">Trend model</p>
                <p className="mt-1 text-sm leading-5 text-violet-900">
                  Based on {forecast.training_months} months of saved history.
                </p>
              </div>
              <Link to="/analytics" className="mt-5 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900">
                Explore analytics →
              </Link>
            </>
          ) : (
            <div className="mt-5">
              <Notice tone="info">{forecast.message ?? 'More monthly history is needed before a forecast can be shown.'}</Notice>
              <Link to="/analytics" className="mt-4 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900">
                View analytics →
              </Link>
            </div>
          )}
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
            Forecasts extend a simple historical trend and do not account for seasonality or external changes.
          </p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">Top campaigns</h2>
              <p className="mt-1 text-sm text-slate-500">Ranked by recorded campaign revenue</p>
            </div>
            <Link to="/campaigns" className="text-xs font-semibold text-teal-700 hover:text-teal-900">
              All campaigns →
            </Link>
          </div>
          {topCampaigns.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Campaign</th>
                    <th className="px-4 py-3 font-semibold">Revenue</th>
                    <th className="px-4 py-3 font-semibold">Ad spend</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-800">{campaign.name}</span>
                        {campaign.is_sample && <span className="ml-2"><StatusPill value="low" /></span>}
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-800">{formatAmount(Number(campaign.sales_revenue))}</td>
                      <td className="px-4 py-4 text-slate-500">{formatAmount(Number(campaign.advertising_cost))}</td>
                      <td className="px-6 py-4 text-slate-500">{monthLabel(campaign.campaign_date.slice(0, 7))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No campaigns yet" detail="Create a campaign to start tracking its performance." />
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">Recommendations</h2>
              <p className="mt-1 text-sm text-slate-500">Open actions for your portfolio</p>
            </div>
            <Link to="/recommendations" className="text-xs font-semibold text-teal-700 hover:text-teal-900">
              View all →
            </Link>
          </div>
          {recommendations.length ? (
            <div className="divide-y divide-slate-100">
              {recommendations.slice(0, 4).map((recommendation) => (
                <div key={recommendation.id} className="px-5 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-5 text-slate-800">{recommendation.title}</p>
                    <StatusPill value={recommendation.priority} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{recommendation.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing to action" detail="Generate recommendations after adding campaign data." />
          )}
        </Panel>
      </div>
    </>
  )
}
