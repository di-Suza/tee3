import { useSelector } from 'react-redux';
import { selectCurrentRole } from '../../features/auth/store/authSlice.js';
import { can } from '../constants/permissions.js';

function ModulePage({ title, eyebrow, description, permission, primaryAction = 'Create', onActionClick, children }) {
  const role = useSelector(selectCurrentRole);
  const canManage = permission ? can(role, permission) : false;

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-[#334033] bg-[#111611] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#baff16]">{eyebrow}</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-white">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#aeb5c0]">{description}</p>
          </div>

          {canManage && primaryAction && (
            <button
              type="button"
              onClick={onActionClick}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#baff16] px-5 text-sm font-bold text-[#080b0a] shadow-[0_14px_28px_rgba(186,255,22,0.18)] transition hover:bg-[#d7ff5f] focus:outline-none focus:ring-4 focus:ring-[#baff16]/20"
            >
              <svg className="w-5 h-5 mr-1.5 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {primaryAction}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#334033] bg-[#111611] shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        {children}
      </div>
    </section>
  );
}

export default ModulePage;
