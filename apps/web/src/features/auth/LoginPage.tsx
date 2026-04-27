export function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-block w-10 h-10 rounded bg-brand-600 text-white grid place-items-center font-bold text-lg">
            B
          </span>
          <div>
            <div className="font-semibold text-slate-900">BranchScout</div>
            <div className="text-xs text-slate-500">Şube Saha Keşif</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold mb-1">Giriş Yap</h1>
        <p className="text-sm text-slate-500 mb-6">
          Sprint 1'de auth tamamlandığında burası aktif olacak.
        </p>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              disabled
              placeholder="admin@demo-bank.test"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Parola
            </label>
            <input
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
            />
          </div>
          <button
            type="button"
            disabled
            className="w-full rounded-md bg-brand-600 text-white font-medium py-2 text-sm disabled:opacity-50"
          >
            Giriş (yakında)
          </button>
        </form>
      </div>
    </div>
  );
}
