import { NavLink } from 'react-router';
import { useSelector } from 'react-redux';

import { protectedRoutes } from '../../../app/routes.config.jsx';
import { selectCurrentRole, selectCurrentUser } from '../../auth/store/authSlice.js';
import { getSidebarItems } from '../config/sidebarItems.js';

function DashboardPage() {
  const user = useSelector(selectCurrentUser);
  const role = useSelector(selectCurrentRole);
  const modules = getSidebarItems(protectedRoutes, role).filter((item) => item.id !== 'dashboard');
  const stats = [
    { label: 'Visible modules', value: modules.length, tone: 'bg-[#baff16]' },
    { label: 'Current role', value: role, tone: 'bg-white' },
    { label: 'Access mode', value: 'Protected', tone: 'bg-[#d7ff5f]' },
  ];

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-zinc-900 bg-zinc-950 text-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-5 px-5 py-6 sm:px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#baff16]">{role}</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Welcome, {user?.name || 'Admin'}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Your dashboard is filtered from the same route permission config used by protected routes.
            </p>
          </div>

          <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</p>
            <p className="mt-1 text-sm font-semibold text-white">{role}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
              </div>
              <span className={`mt-1 h-3 w-3 rounded-full ${stat.tone}`} aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">Modules</h3>
          <p className="text-sm text-slate-500">{modules.length} available</p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <NavLink
              key={module.id}
              to={`/${module.path}`}
              className="group rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-[#baff16] hover:bg-white hover:shadow-md hover:shadow-[#baff16]/10"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-slate-950">{module.label}</p>
                <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-[#baff16] ring-1 ring-[#baff16]/20 group-hover:bg-emerald-50">
                  {module.code}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{module.module}</p>
            </NavLink>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
