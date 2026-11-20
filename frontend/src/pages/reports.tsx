import { useState } from 'react'
import { Notice, PageHeading, Panel } from '@/components/ui'
import { downloadReport } from '@/lib/api'

const reports = [
  { type: 'sales', title: 'Sales report', description: 'Recorded transactions with associated customers and campaigns.', icon: '↗' },
  { type: 'campaigns', title: 'Campaign report', description: 'Marketing investment, revenue, and acquired-customer results.', icon: '▤' },
  { type: 'descriptive', title: 'Descriptive analytics', description: 'Portfolio totals and descriptive performance measures.', icon: '◈' },
  { type: 'predictive', title: 'Predictive analytics', description: 'Historical values and linear trend projections.', icon: '⌁' },
  { type: 'dea', title: 'Efficiency analysis', description: 'CCR campaign scores and excluded decision-making units.', icon: '◎' },
  { type: 'recommendations', title: 'Recommendations', description: 'Campaign suggestions and supporting evidence.', icon: '✳' },
] as const

type ReportType = (typeof reports)[number]['type']
type ReportFormat = 'csv' | 'pdf'

export default function ReportsPage() {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleDownload(type: ReportType, format: ReportFormat) {
    const key = `${type}-${format}`
    setBusy(key)
    setError('')
    setSuccess('')
    try {
      const file = await downloadReport(type, format)
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${type}-report.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setSuccess(`${type[0].toUpperCase()}${type.slice(1)} ${format.toUpperCase()} report downloaded.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download report.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Export center"
        title="Reports"
        description="Download analysis and operational data from the authenticated API."
      />
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {success && <div className="mb-5"><Notice tone="success">{success}</Notice></div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <Panel key={report.type} className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-lg text-teal-700">{report.icon}</span>
              <div>
                <h2 className="font-semibold text-slate-900">{report.title}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">{report.description}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4">
              {(['csv', 'pdf'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => void handleDownload(report.type, format)}
                  disabled={busy !== null}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-wait disabled:opacity-50"
                >
                  {busy === `${report.type}-${format}` ? 'Preparing…' : `${format} download`}
                </button>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      <div className="mt-6">
        <Notice tone="info">Reports are generated from live backend data. Forecast and efficiency reports use the backend’s configured model assumptions.</Notice>
      </div>
    </>
  )
}
