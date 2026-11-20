import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/app-shell'
import { AdminOnly, ProtectedRoutes } from '@/components/protected-routes'
import { AuthProvider } from '@/lib/auth-provider'
import { LoadingState } from '@/components/ui'
import '@/styles/global.css'

const AnalyticsPage = lazy(() => import('@/pages/analytics'))
const DashboardPage = lazy(() => import('@/pages/dashboard'))
const LoginPage = lazy(() => import('@/pages/login'))
const RecommendationsPage = lazy(() => import('@/pages/recommendations'))
const ReportsPage = lazy(() => import('@/pages/reports'))
const UsersPage = lazy(() => import('@/pages/users'))
const { CampaignsPage, CustomersPage, SalesPage } = await import('@/pages/records')
const { ForgotPasswordPage, ResetPasswordPage } = await import('@/pages/password-recovery')

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<LoadingState label="Loading page…" />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoutes />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<AdminOnly><UsersPage /></AdminOnly>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </AuthProvider>,
)
