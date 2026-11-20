import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '@/lib/use-auth'

const navigation: Array<{ to: string; label: string; icon: string; end?: boolean; adminOnly?: boolean }> = [
  { to: '/', label: 'Overview', icon: '◈', end: true },
  { to: '/campaigns', label: 'Campaigns', icon: '▤' },
  { to: '/customers', label: 'Customers', icon: '◉' },
  { to: '/sales', label: 'Sales', icon: '↗' },
  { to: '/analytics', label: 'Analytics', icon: '⌁' },
  { to: '/recommendations', label: 'Recommendations', icon: '✳' },
  { to: '/reports', label: 'Reports', icon: '▧' },
  { to: '/users', label: 'Users', icon: '♙', adminOnly: true },
]

function Navigation({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  const items = navigation.filter((item) => !item.adminOnly || user?.role === 'admin')

  return (
    <nav className={compact ? 'flex min-w-max gap-1 px-4 py-2' : 'space-y-1 px-3'}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `${compact ? 'shrink-0 rounded-lg px-3 py-2' : 'flex items-center gap-3 rounded-xl px-3 py-2.5'} text-sm font-medium transition ${
              isActive
                ? 'bg-teal-500/15 text-teal-200'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <span className="grid size-5 place-items-center text-base" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not sign out cleanly.'
      navigate('/login', { replace: true, state: { logoutWarning: message } })
    }
  }

  const initials = user?.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#101c2c] text-white md:flex">
        <div className="flex h-[84px] items-center gap-3 px-6">
          <div className="grid size-10 place-items-center rounded-xl bg-teal-400 text-lg font-bold text-slate-950">
            DP
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">DATAPULSE</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">Business insights</p>
          </div>
        </div>
        <p className="mb-3 mt-6 px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Workspace
        </p>
        <Navigation />
        <div className="mt-auto border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-400/20 text-xs font-semibold text-teal-200">
              {initials || 'BA'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs capitalize text-slate-400">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <span aria-hidden="true">↪</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="flex h-[68px] items-center justify-between px-4 sm:px-7 lg:px-10">
            <div>
              <p className="text-xs font-medium text-slate-400">Business analytics workspace</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">Make every decision count</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-medium text-slate-800">{user?.name}</span>
                <span className="block text-xs capitalize text-slate-400">{user?.role} account</span>
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800">
                {initials || 'BA'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 md:hidden"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="overflow-x-auto border-t border-slate-100 md:hidden">
            <Navigation compact />
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
