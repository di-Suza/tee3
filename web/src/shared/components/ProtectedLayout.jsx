import { NavLink, Outlet, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';

import { useLogoutMutation } from '../../features/auth/api/authApi.js';
import { selectCurrentUser } from '../../features/auth/store/authSlice.js';
import { getSidebarItems } from '../../features/dashboard/config/sidebarItems.js';
import { ROLE_LABELS } from '../constants/roles.js';
import BrandLogo from './BrandLogo.jsx';
import LoadingLabel from './LoadingLabel.jsx';

function ProtectedLayout({ routes }) {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [logout, { isLoading }] = useLogoutMutation();
  const sidebarItems = getSidebarItems(routes, user?.role);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-theme min-h-screen bg-[#080b0a] text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-[17rem] border-r border-[#222c24] bg-[#0c100e] text-slate-100 lg:block">
        <div className="flex h-20 items-center border-b border-[#222c24] px-5">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" withGlow />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#baff16]">Admin control</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.id}
              to={`/${item.path}`}
              className={({ isActive }) =>
                [
                  'group flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'border-[#baff16]/70 bg-[#baff16] text-[#080b0a] shadow-[0_16px_32px_rgba(186,255,22,0.18)]'
                    : 'border-transparent text-slate-300 hover:border-[#43513d] hover:bg-[#161c18] hover:text-[#f8ffe6]',
                ].join(' ')
              }
            >
              <span>{item.label}</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] opacity-80 group-hover:bg-white/15">
                {item.code}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-[17rem]">
        <header className="sticky top-0 z-20 border-b border-[#222c24] bg-[#080b0a]/95 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#baff16]">
                {ROLE_LABELS[user?.role] || 'Signed in'}
              </p>
              <h1 className="text-lg font-black text-white">{user?.name || 'Dashboard'}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-md border border-[#334033] bg-[#111611] px-3 py-2 sm:block">
                <p className="max-w-56 truncate text-sm font-medium text-[#cbd5e1]">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="h-10 rounded-md border border-[#334033] bg-[#111611] px-3 text-sm font-semibold text-slate-100 transition hover:border-rose-300 hover:bg-rose-950/40 hover:text-rose-200 focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <LoadingLabel label="Signing out" /> : 'Logout'}
              </button>
            </div>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-[#222c24] bg-[#0c100e] px-4 py-2 lg:hidden">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.id}
              to={`/${item.path}`}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'border-[#baff16]/70 bg-[#baff16] text-[#080b0a]'
                    : 'border-[#334033] bg-[#111611] text-slate-200',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ProtectedLayout;
