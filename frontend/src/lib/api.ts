import type {
  ApiPage,
  AuthResponse,
  Campaign,
  CampaignInput,
  Customer,
  CustomerInput,
  DashboardResponse,
  DeaAnalysis,
  Forecast,
  Recommendation,
  Sale,
  SaleInput,
  UserCreateInput,
  UserUpdateInput,
  User,
} from '@/types/api'

const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')
const API_TIMEOUT_MS = 60_000
export const TOKEN_KEY = 'business-analytics-token'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

function errorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== 'object' || payload === null) return fallback

  const record = payload as { message?: unknown; errors?: unknown }
  if (typeof record.errors === 'object' && record.errors !== null) {
    const firstError = Object.values(record.errors).flat()[0]
    if (typeof firstError === 'string') return firstError
  }
  return typeof record.message === 'string' ? record.message : fallback
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body,
      signal: options.signal ?? controller.signal,
    })
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new ApiError('The request timed out. Please try again.', 408)
    }
    throw cause
  } finally {
    window.clearTimeout(timeout)
  }

  if (response.status === 204) return undefined as T

  const rawBody = await response.text()
  let payload: unknown = null
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = rawBody
    }
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(payload, `Request failed (${response.status}).`), response.status)
  }

  return payload as T
}

function pageQuery(page: number, search?: string): string {
  const params = new URLSearchParams({ per_page: '10', page: String(page) })
  if (search?.trim()) params.set('search', search.trim())
  return `?${params.toString()}`
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  requestPasswordReset: (email: string) =>
    apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (input: { email: string; token: string; password: string; password_confirmation: string }) =>
    apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: input,
    }),
  register: (name: string, email: string, password: string, password_confirmation: string) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { name, email, password, password_confirmation },
    }),
  currentUser: () => apiRequest<User>('/user'),
  logout: () => apiRequest<{ message: string }>('/auth/logout', { method: 'POST' }),
}

export const dashboardApi = {
  get: () => apiRequest<DashboardResponse>('/dashboard'),
  forecast: (months: number) => apiRequest<Forecast>(`/analytics/forecast?months=${months}`),
  dea: (model: 'CCR' | 'BCC') => apiRequest<DeaAnalysis>(`/analytics/dea?model=${model}`),
}

export const campaignApi = {
  list: (page: number, search: string) =>
    apiRequest<ApiPage<Campaign>>(`/campaigns${pageQuery(page, search)}`),
  create: (input: CampaignInput) =>
    apiRequest<Campaign>('/campaigns', { method: 'POST', body: input }),
  update: (id: number, input: CampaignInput) =>
    apiRequest<Campaign>(`/campaigns/${id}`, { method: 'PUT', body: input }),
  remove: (id: number) => apiRequest<void>(`/campaigns/${id}`, { method: 'DELETE' }),
  importCsv: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiRequest<{ imported: number }>('/campaigns/import', { method: 'POST', body: form })
  },
}

export const customerApi = {
  list: (page: number, search: string) =>
    apiRequest<ApiPage<Customer>>(`/customers${pageQuery(page, search)}`),
  create: (input: CustomerInput) =>
    apiRequest<Customer>('/customers', { method: 'POST', body: input }),
  update: (id: number, input: CustomerInput) =>
    apiRequest<Customer>(`/customers/${id}`, { method: 'PUT', body: input }),
  remove: (id: number) => apiRequest<void>(`/customers/${id}`, { method: 'DELETE' }),
}

export const saleApi = {
  list: (page: number) => apiRequest<ApiPage<Sale>>(`/sales${pageQuery(page)}`),
  create: (input: SaleInput) => apiRequest<Sale>('/sales', { method: 'POST', body: input }),
  update: (id: number, input: SaleInput) =>
    apiRequest<Sale>(`/sales/${id}`, { method: 'PUT', body: input }),
  remove: (id: number) => apiRequest<void>(`/sales/${id}`, { method: 'DELETE' }),
}

export const userApi = {
  list: (page: number) => apiRequest<ApiPage<User>>(`/users?per_page=25&page=${page}`),
  create: (input: UserCreateInput) =>
    apiRequest<User>('/users', { method: 'POST', body: input }),
  update: (id: number, input: UserUpdateInput) =>
    apiRequest<User>(`/users/${id}`, { method: 'PUT', body: input }),
  remove: (id: number) => apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
}

export const lookupApi = {
  customers: () => apiRequest<ApiPage<Customer>>('/customers?per_page=100'),
  campaigns: () => apiRequest<ApiPage<Campaign>>('/campaigns?per_page=100'),
}

export const recommendationApi = {
  list: (page: number) =>
    apiRequest<ApiPage<Recommendation>>(`/analytics/recommendations?page=${page}&per_page=10`),
  generate: () =>
    apiRequest<Recommendation[]>('/analytics/recommendations/generate', {
      method: 'POST',
    }),
  update: (id: number, status: Recommendation['status']) =>
    apiRequest<Recommendation>(`/recommendations/${id}`, {
      method: 'PATCH',
      body: { status },
    }),
}

export async function downloadReport(
  type: 'sales' | 'campaigns' | 'descriptive' | 'predictive' | 'dea' | 'recommendations',
  format: 'csv' | 'pdf',
): Promise<Blob> {
  const headers = new Headers({ Accept: format === 'pdf' ? 'application/pdf' : 'text/csv' })
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}/reports/${type}.${format}`, { headers })
  if (!response.ok) {
    const body = await response.text()
    let payload: unknown = body
    try {
      payload = JSON.parse(body)
    } catch {
      // Keep the response text as the error message when it is not JSON.
    }
    throw new ApiError(errorMessage(payload, `Report download failed (${response.status}).`), response.status)
  }
  return response.blob()
}
