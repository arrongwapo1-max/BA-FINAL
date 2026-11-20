export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'staff'
  created_at?: string
}

export interface UserCreateInput {
  name: string
  email: string
  password: string
  role: User['role']
}

export type UserUpdateInput = Partial<Omit<UserCreateInput, 'password'>> & { password?: string }

export interface AuthResponse {
  token: string
  user: User
}

export interface ApiPage<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Campaign {
  id: number
  name: string
  advertising_cost: number
  marketing_hours: number
  discount_amount: number
  sales_revenue: number
  customers_acquired: number
  campaign_date: string
  notes: string | null
  is_sample: boolean
  sales_count?: number
}

export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  is_sample: boolean
  sales_count?: number
}

export interface Sale {
  id: number
  customer_id: number
  campaign_id: number | null
  amount: number
  quantity: number
  sold_at: string
  notes: string | null
  is_sample: boolean
  customer?: Pick<Customer, 'id' | 'name' | 'email'>
  campaign?: Pick<Campaign, 'id' | 'name'> | null
}

export interface Recommendation {
  id: number
  campaign_id: number | null
  type: string
  priority: 'high' | 'medium' | 'low' | string
  title: string
  body: string
  evidence: Record<string, unknown> | null
  status: 'open' | 'actioned' | 'dismissed'
  campaign?: Pick<Campaign, 'id' | 'name' | 'is_sample'> | null
  created_at: string
}

export interface MonthlySales {
  month: string
  revenue: number
  units: number
}

export interface EfficiencyResult {
  campaign_id: number
  campaign_name?: string
  campaign?: Pick<Campaign, 'id' | 'name' | 'is_sample'>
  efficiency_score: number
  is_efficient: boolean
  rank: number
  reference_set?: Array<{ campaign_id: number; campaign_name: string; weight: number }>
}

export interface DashboardSummary {
  totals: {
    sales_revenue: number
    average_sale: number
    advertising_expenses: number
    discount_amount: number
    customers_acquired: number
    customers: number
    campaigns: number
    average_campaign_efficiency: number
  }
  monthly_sales: MonthlySales[]
  monthly_marketing: Array<{
    month: string
    advertising_cost: number
    customers_acquired: number
  }>
  top_campaigns: Campaign[]
  efficiency_ranking: EfficiencyResult[]
  most_efficient_campaign: EfficiencyResult | null
  sample_data_notice: string | null
}

export interface Forecast {
  model: string
  training_months: number
  message: string | null
  history: Array<{
    month: string
    actual_sales_revenue: number
    actual_customers_acquired: number
  }>
  predictions: Array<{
    month: string
    predicted_sales_revenue: number
    predicted_customers_acquired: number
  }>
  limitations?: string
}

export interface DeaAnalysis {
  model: 'CCR' | 'BCC'
  orientation: string
  returns_to_scale: string
  assumptions: string[]
  results: EfficiencyResult[]
  excluded: Array<{ campaign_id: number; campaign_name: string; reason: string }>
}

export interface DashboardResponse {
  summary: DashboardSummary
  forecast: Forecast
  recommendations: Recommendation[]
}

export interface CampaignInput {
  name: string
  advertising_cost: number
  marketing_hours: number
  discount_amount: number
  sales_revenue: number
  customers_acquired: number
  campaign_date: string
  notes: string | null
}

export interface CustomerInput {
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
}

export interface SaleInput {
  customer_id: number
  campaign_id: number | null
  amount: number
  quantity: number
  sold_at: string
  notes: string | null
}
