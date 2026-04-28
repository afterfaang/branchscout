import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { loginRequest } from "./authApi";
import { useAuthStore } from "./authStore";
import { ApiError } from "../../lib/apiClient";

const LoginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta giriniz"),
  password: z.string().min(1, "Parola gerekli"),
});
type LoginFormValues = z.infer<typeof LoginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      if (data.status === "mfa_required") {
        navigate("/auth/verify-mfa", {
          replace: true,
          state: { mfaToken: data.mfaToken },
        });
        return;
      }
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      navigate("/", { replace: true });
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  const apiError =
    mutation.error instanceof ApiError
      ? (mutation.error.body?.detail ?? mutation.error.message)
      : mutation.isError
        ? "Giriş başarısız oldu. Lütfen tekrar deneyiniz."
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
            <div className="text-xs text-slate-500">Şube Saha Keşif</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold mb-1">Giriş Yap</h1>
        <p className="text-sm text-slate-500 mb-6">
          Demo: <span className="font-mono">admin@demo-bank.test</span> /{" "}
          <span className="font-mono">admin123!</span>
        </p>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              E-posta
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Parola
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {form.formState.errors.password && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {apiError && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
