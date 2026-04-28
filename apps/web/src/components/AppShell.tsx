import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/authStore";

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const handleLogout = () => {
    clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block w-8 h-8 rounded bg-brand-600 text-white grid place-items-center font-bold">
              B
            </span>
            <span className="font-semibold text-slate-900">BranchScout</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user?.role === "ADMIN" && (
              <>
                <Link to="/admin/branches" className="text-slate-600 hover:text-slate-900">
                  Şubeler
                </Link>
                <Link to="/admin/users" className="text-slate-600 hover:text-slate-900">
                  Kullanıcılar
                </Link>
              </>
            )}
            <Link to="/auth/setup-mfa" className="text-slate-600 hover:text-slate-900">
              MFA
            </Link>
            {user && (
              <span className="text-slate-600">
                {user.name}
                <span className="text-slate-400"> · </span>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {user.role}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-900"
            >
              Çıkış
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-500">
          BranchScout v0.1.0 — Sprint 1 (auth)
        </div>
      </footer>
    </div>
  );
}
