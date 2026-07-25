import { Link, Outlet } from 'react-router';
import { useSelector } from 'react-redux';

import { selectAccessToken, selectCurrentUser } from '../../features/auth/store/authSlice.js';
import BrandLogo from './BrandLogo.jsx';

function PublicLayout() {
  const accessToken = useSelector(selectAccessToken);
  const user = useSelector(selectCurrentUser);

  return (
    <div className="min-h-screen bg-[#080b0a] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-[#222c24] bg-[#080b0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center">
            <BrandLogo size="md" withGlow />
          </Link>

          <nav className="flex items-center gap-3">
            {accessToken ? (
              <>
                <span className="hidden max-w-48 truncate text-sm text-slate-400 sm:inline">{user?.email}</span>
                <Link
                  to="/dashboard"
                  className="rounded-xl bg-[#baff16] px-4 py-2 text-sm font-bold text-[#080b0a] shadow-[0_0_24px_rgba(186,255,22,0.18)] transition hover:bg-[#d7ff5f]"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-xl border border-[#334033] px-4 py-2 text-sm font-bold text-slate-100 transition hover:border-[#baff16] hover:text-[#d7ff5f]"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
