import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { EmptyState, LoadingState, Notice, PageHeading, Panel, StatusPill } from '@/components/ui'
import { campaignApi, customerApi, lookupApi, saleApi } from '@/lib/api'
import { formatAmount, localDateInput, localDateTimeInput, shortDate } from '@/lib/format'
import type {
  ApiPage,
  Campaign,
  CampaignInput,
  Customer,
  CustomerInput,
  Sale,
  SaleInput,
} from '@/types/api'

interface SelectOption {
  value: string
  label: string
}

interface FieldDefinition {
  name: string
  label: string
  type?: 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select'
  required?: boolean
  step?: string
  options?: () => Promise<SelectOption[]>
}

interface Column<T> {
  label: string
  render: (item: T) => ReactNode
}

interface RecordConfig<T> {
  title: string
  description: string
  singular: string
  searchable?: boolean
  fields: FieldDefinition[]
  columns: Column<T>[]
  list: (page: number, search: string) => Promise<ApiPage<T>>
  formValues: (record?: T) => Record<string, string>
  save: (id: number | null, values: Record<string, string>) => Promise<void>
  remove: (id: number) => Promise<void>
  importCsv?: (file: File) => Promise<{ imported: number }>
}

function usePageData<T>(
  list: RecordConfig<T>['list'],
  page: number,
  search: string,
) {
  const [result, setResult] = useState<ApiPage<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setResult(await list(page, search))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load records.')
    } finally {
      setLoading(false)
    }
  }, [list, page, search])

  useEffect(() => {
    let active = true
    list(page, search)
      .then((response) => {
        if (active) {
          setResult(response)
          setError('')
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load records.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [list, page, search])

  return { result, loading, error, reload, setError }
}

function RecordsPage<T extends { id: number; is_sample?: boolean }>({
  config,
}: {
  config: RecordConfig<T>
}) {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const { result, loading, error, reload, setError } = usePageData(config.list, page, search)
  const [editing, setEditing] = useState<T | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [fieldOptions, setFieldOptions] = useState<Record<string, SelectOption[]>>({})
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let active = true
    const optionFields = config.fields.filter((field) => field.options)
    Promise.all(
      optionFields.map(async (field) => [field.name, await field.options!()] as const),
    )
      .then((entries) => {
        if (active) setFieldOptions(Object.fromEntries(entries))
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load form options.')
      })
    return () => {
      active = false
    }
  }, [config.fields, setError])

  const startCreate = () => {
    setEditing(null)
    setFormOpen(true)
    setFormValues(config.formValues())
    setFormError('')
    setSuccess('')
  }

  const startEdit = (record: T) => {
    setEditing(record)
    setFormOpen(true)
    setFormValues(config.formValues(record))
    setFormError('')
    setSuccess('')
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await config.save(editing?.id ?? null, formValues)
      setEditing(null)
      setFormOpen(false)
      setSuccess(`${config.singular} ${editing ? 'updated' : 'created'} successfully.`)
      await reload()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : `Unable to save ${config.singular.toLowerCase()}.`)
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecord(record: T) {
    if (!window.confirm(`Delete this ${config.singular.toLowerCase()}? This action cannot be undone.`)) return
    setError('')
    setSuccess('')
    try {
      await config.remove(record.id)
      setSuccess(`${config.singular} deleted.`)
      if (result?.data.length === 1 && page > 1) setPage(page - 1)
      else await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to delete ${config.singular.toLowerCase()}.`)
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !config.importCsv) return
    setImporting(true)
    setError('')
    setSuccess('')
    try {
      const response = await config.importCsv(file)
      setSuccess(`${response.imported} campaign${response.imported === 1 ? '' : 's'} imported.`)
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Campaign import failed.')
    } finally {
      setImporting(false)
    }
  }

  const totalPages = result?.last_page ?? 1
  const countLabel = useMemo(() => {
    if (!result) return ''
    const first = result.total === 0 ? 0 : (result.current_page - 1) * result.per_page + 1
    const last = Math.min(result.current_page * result.per_page, result.total)
    return `${first}–${last} of ${result.total}`
  }, [result])

  return (
    <>
      <PageHeading
        eyebrow="Workspace records"
        title={config.title}
        description={config.description}
        actions={
          <div className="flex flex-wrap gap-2">
            {config.importCsv && (
              <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                {importing ? 'Importing…' : 'Import CSV'}
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleImport} disabled={importing} />
              </label>
            )}
            <button
              type="button"
              onClick={startCreate}
              className="rounded-xl bg-[#101c2c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
            >
              + Add {config.singular}
            </button>
          </div>
        }
      />

      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {success && <div className="mb-5"><Notice tone="success">{success}</Notice></div>}

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4 sm:px-5">
          <div>
            <p className="text-sm font-semibold text-slate-800">{config.title} list</p>
            <p className="mt-1 text-xs text-slate-400">{countLabel} records</p>
          </div>
          {config.searchable !== false && (
            <label className="relative block w-full sm:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={`Search ${config.title.toLowerCase()}…`}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
              />
            </label>
          )}
        </div>

        {loading ? (
          <LoadingState label={`Loading ${config.title.toLowerCase()}…`} />
        ) : result?.data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.label} className="px-5 py-3.5 font-semibold">{column.label}</th>
                  ))}
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/70">
                    {config.columns.map((column) => (
                      <td key={column.label} className="px-5 py-4 text-slate-600">{column.render(record)}</td>
                    ))}
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <button type="button" onClick={() => startEdit(record)} className="mr-3 text-xs font-semibold text-teal-700 hover:text-teal-900">
                        Edit
                      </button>
                      <button type="button" onClick={() => void deleteRecord(record)} className="text-xs font-semibold text-rose-600 hover:text-rose-800">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={search ? 'No matching records' : `No ${config.title.toLowerCase()} yet`}
            detail={search ? 'Try another search term.' : `Add your first ${config.singular.toLowerCase()} to get started.`}
          />
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
          <p className="text-xs text-slate-400">{countLabel} records</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-1 text-xs text-slate-500">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </Panel>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setFormOpen(false)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="record-dialog-title" className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{editing ? 'Update record' : 'New record'}</p>
                <h2 id="record-dialog-title" className="mt-1 text-xl font-semibold text-slate-900">
                  {editing ? `Edit ${config.singular.toLowerCase()}` : `Add ${config.singular.toLowerCase()}`}
                </h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} disabled={saving} aria-label="Close dialog" className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100">
                ×
              </button>
            </div>
            <form onSubmit={submitForm}>
              <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                {config.fields.map((field) => (
                  <label key={field.name} className={field.type === 'textarea' ? 'block sm:col-span-2' : 'block'}>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                      {field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}
                    </span>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={formValues[field.name] ?? ''}
                        onChange={(event) => setFormValues((current) => ({ ...current, [field.name]: event.target.value }))}
                        className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formValues[field.name] ?? ''}
                        onChange={(event) => setFormValues((current) => ({ ...current, [field.name]: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                      >
                        <option value="">{field.required ? 'Choose an option' : 'None'}</option>
                        {(fieldOptions[field.name] ?? []).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type ?? 'text'}
                        required={field.required}
                        step={field.step}
                        min={field.type === 'number' ? '0' : undefined}
                        value={formValues[field.name] ?? ''}
                        onChange={(event) => setFormValues((current) => ({ ...current, [field.name]: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                      />
                    )}
                  </label>
                ))}
              </div>
              {formError && <div className="px-6 pb-3"><Notice>{formError}</Notice></div>}
              <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-[#101c2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save record'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

const campaignFields: FieldDefinition[] = [
  { name: 'name', label: 'Campaign name', required: true },
  { name: 'campaign_date', label: 'Campaign date', type: 'date', required: true },
  { name: 'advertising_cost', label: 'Advertising cost', type: 'number', step: '0.01', required: true },
  { name: 'marketing_hours', label: 'Marketing hours', type: 'number', step: '0.01', required: true },
  { name: 'discount_amount', label: 'Discount amount', type: 'number', step: '0.01', required: true },
  { name: 'sales_revenue', label: 'Campaign sales revenue', type: 'number', step: '0.01', required: true },
  { name: 'customers_acquired', label: 'Customers acquired', type: 'number', step: '1', required: true },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const campaignConfig: RecordConfig<Campaign> = {
  title: 'Campaigns',
  singular: 'Campaign',
  description: 'Track campaign investment, customer acquisition, and revenue outcomes.',
  fields: campaignFields,
  list: campaignApi.list,
  formValues: (record) => ({
    name: record?.name ?? '',
    campaign_date: record?.campaign_date?.slice(0, 10) ?? localDateInput(),
    advertising_cost: record ? String(record.advertising_cost) : '',
    marketing_hours: record ? String(record.marketing_hours) : '',
    discount_amount: record ? String(record.discount_amount) : '',
    sales_revenue: record ? String(record.sales_revenue) : '',
    customers_acquired: record ? String(record.customers_acquired) : '',
    notes: record?.notes ?? '',
  }),
  columns: [
    { label: 'Campaign', render: (item) => <span className="font-semibold text-slate-800">{item.name}{item.is_sample && <span className="ml-2"><StatusPill value="sample" /></span>}</span> },
    { label: 'Date', render: (item) => shortDate(item.campaign_date) },
    { label: 'Revenue', render: (item) => <span className="font-medium text-slate-800">{formatAmount(Number(item.sales_revenue))}</span> },
    { label: 'Ad spend', render: (item) => formatAmount(Number(item.advertising_cost)) },
    { label: 'Customers', render: (item) => Number(item.customers_acquired).toLocaleString() },
  ],
  save: async (id, values) => {
    const input: CampaignInput = {
      name: values.name.trim(),
      campaign_date: values.campaign_date,
      advertising_cost: Number(values.advertising_cost),
      marketing_hours: Number(values.marketing_hours),
      discount_amount: Number(values.discount_amount),
      sales_revenue: Number(values.sales_revenue),
      customers_acquired: Number(values.customers_acquired),
      notes: values.notes.trim() || null,
    }
    if (id) await campaignApi.update(id, input)
    else await campaignApi.create(input)
  },
  remove: campaignApi.remove,
  importCsv: campaignApi.importCsv,
}

const customerFields: FieldDefinition[] = [
  { name: 'name', label: 'Customer name', required: true },
  { name: 'email', label: 'Email address', type: 'email' },
  { name: 'phone', label: 'Phone number' },
  { name: 'company', label: 'Company' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const customerConfig: RecordConfig<Customer> = {
  title: 'Customers',
  singular: 'Customer',
  description: 'Keep customer contacts and company details in one place.',
  fields: customerFields,
  list: customerApi.list,
  formValues: (record) => ({
    name: record?.name ?? '',
    email: record?.email ?? '',
    phone: record?.phone ?? '',
    company: record?.company ?? '',
    notes: record?.notes ?? '',
  }),
  columns: [
    { label: 'Customer', render: (item) => <span className="font-semibold text-slate-800">{item.name}{item.is_sample && <span className="ml-2"><StatusPill value="sample" /></span>}</span> },
    { label: 'Company', render: (item) => item.company || '—' },
    { label: 'Email', render: (item) => item.email || '—' },
    { label: 'Phone', render: (item) => item.phone || '—' },
    { label: 'Sales', render: (item) => item.sales_count ?? 0 },
  ],
  save: async (id, values) => {
    const input: CustomerInput = {
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      company: values.company.trim() || null,
      notes: values.notes.trim() || null,
    }
    if (id) await customerApi.update(id, input)
    else await customerApi.create(input)
  },
  remove: customerApi.remove,
}

const saleFields: FieldDefinition[] = [
  {
    name: 'customer_id',
    label: 'Customer',
    type: 'select',
    required: true,
    options: async () => {
      const result = await lookupApi.customers()
      return result.data.map((customer) => ({ value: String(customer.id), label: customer.name }))
    },
  },
  {
    name: 'campaign_id',
    label: 'Campaign (optional)',
    type: 'select',
    options: async () => {
      const result = await lookupApi.campaigns()
      return result.data.map((campaign) => ({ value: String(campaign.id), label: campaign.name }))
    },
  },
  { name: 'amount', label: 'Sale amount', type: 'number', step: '0.01', required: true },
  { name: 'quantity', label: 'Quantity', type: 'number', step: '1', required: true },
  { name: 'sold_at', label: 'Date and time', type: 'datetime-local', required: true },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const saleConfig: RecordConfig<Sale> = {
  title: 'Sales',
  singular: 'Sale',
  description: 'Record transactions and connect them to customers and campaigns.',
  fields: saleFields,
  searchable: false,
  list: saleApi.list,
  formValues: (record) => ({
    customer_id: record ? String(record.customer_id) : '',
    campaign_id: record?.campaign_id ? String(record.campaign_id) : '',
    amount: record ? String(record.amount) : '',
    quantity: record ? String(record.quantity) : '1',
    sold_at: record?.sold_at ? record.sold_at.slice(0, 16) : localDateTimeInput(),
    notes: record?.notes ?? '',
  }),
  columns: [
    { label: 'Customer', render: (item) => <span className="font-semibold text-slate-800">{item.customer?.name ?? `Customer #${item.customer_id}`}{item.is_sample && <span className="ml-2"><StatusPill value="sample" /></span>}</span> },
    { label: 'Campaign', render: (item) => item.campaign?.name ?? '—' },
    { label: 'Amount', render: (item) => <span className="font-medium text-slate-800">{formatAmount(Number(item.amount))}</span> },
    { label: 'Units', render: (item) => item.quantity.toLocaleString() },
    { label: 'Date', render: (item) => shortDate(item.sold_at) },
  ],
  save: async (id, values) => {
    const input: SaleInput = {
      customer_id: Number(values.customer_id),
      campaign_id: values.campaign_id ? Number(values.campaign_id) : null,
      amount: Number(values.amount),
      quantity: Number(values.quantity),
      sold_at: values.sold_at,
      notes: values.notes.trim() || null,
    }
    if (id) await saleApi.update(id, input)
    else await saleApi.create(input)
  },
  remove: saleApi.remove,
}

export function CampaignsPage() {
  return <RecordsPage config={campaignConfig} />
}

export function CustomersPage() {
  return <RecordsPage config={customerConfig} />
}

export function SalesPage() {
  return <RecordsPage config={saleConfig} />
}
