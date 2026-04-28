import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { completeMfaLogin } from "./authApi";
import { useAuthStore } from "./authStore";
import { ApiError } from "../../lib/apiClient";

const Schema = z.object({
  code: z.string().regex(/^\d{6}$/, "6 haneli kod"),
});
type FormValues = z.infer<typeof Schema>;

interface LocationState {
  mfaToken?: string;
}

export function VerifyMfaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const mfaToken = (location.state as LocationState | null)?.mfaToken;

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { code: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      completeMfaLogin({ mfaToken: mfaToken!, code: values.code }),
    onSuccess: (data) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      navigate("/", { replace: true });
    },
  });

  if (isAuthenticated) return <Navigate to="/" replace />;
  if (!mfaToken) return <Navigate to="/login" replace />;

  const apiError =
    mutation.error instanceof ApiError
      ? (mutation.error.body?.detail ?? mutation.error.message)
      : mutation.isError
        ? "Doğrulama başarısız oldu."
        : null;

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-block w-10 h-10 rounded bg-brand-600 text-white grid place-items-center font-bold text-lg">
            B
          </span>
          <div>
            <div className="font-semibold text-slate-900">BranchScout</div>
            <div className="text-xs text-slate-500">İki Faktörlü Doğrulama</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold mb-1">Kimlik Doğrulama</h1>
        <p className="text-sm text-slate-500 mb-6">
          Authenticator uygulamanızdaki 6 haneli kodu girin.
        </p>
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              TOTP Kodu
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              autoComplete="one-time-code"
              maxLength={6}
              {...form.register("code")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••"
            />
            {form.formState.errors.code && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>
          {apiError && (
            <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {apiError}
            </div>
          )}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? "Doğrulanıyor…" : "Doğrula"}
          </button>
        </form>
      </div>
    </div>
  );
}
