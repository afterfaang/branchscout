import { Outlet, Link } from "react-router-dom";

export function AppShell() {
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
          <nav className="text-sm text-slate-600">
            <Link to="/login" className="hover:text-slate-900">
              Giriş
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-500">
          BranchScout v0.1.0 — Sprint 0 skeleton
        </div>
      </footer>
    </div>
  );
}
