import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { setupTotp, verifyTotp, type TotpSetupResponse } from "./authApi";
import { ApiError } from "../../lib/apiClient";

const Schema = z.object({
  code: z.string().regex(/^\d{6}$/, "6 haneli kod"),
});
type FormValues = z.infer<typeof Schema>;

export function SetupMfaPage() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    let cancelled = false;
    setupTotp()
      .then((res) => {
        if (!cancelled) setSetup(res);
      })
      .catch((err) => {
        const msg =
          err instanceof ApiError
            ? (err.body?.detail ?? err.message)
            : "TOTP kurulumu başlatılamadı.";
        if (!cancelled) setSetupError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => verifyTotp(values.code),
    onSuccess: () => {
      navigate("/", { replace: true });
    },
  });

  const apiError =
    mutation.error instanceof ApiError
      ? (mutation.error.body?.detail ?? mutation.error.message)
      : mutation.isError
        ? "Doğrulama başarısız."
        : null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-block w-10 h-10 rounded bg-brand-600 text-white grid place-items-center font-bold text-lg">
            B
          </span>
          <div>
            <div className="font-semibold text-slate-900">BranchScout</div>
            <div className="text-xs text-slate-500">İki Faktörlü Doğrulama Kurulumu</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold mb-2">İki Faktörlü Doğrulama</h1>
        <p className="text-sm text-slate-600 mb-6">
          Hesabınızı korumak için Google Authenticator, 1Password veya Authy gibi bir
          uygulamayla aşağıdaki QR kodu tarayın, ardından 6 haneli kodu doğrulayın.
        </p>

        {setupError && (
          <div role="alert" className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {setupError}
          </div>
        )}

        {!setup ? (
          <p className="text-slate-500">Kurulum hazırlanıyor…</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-medium text-slate-700 mb-2">QR Kodu</h2>
              <img
                src={setup.qrDataUrl}
                alt="TOTP QR"
                className="w-48 h-48 border border-slate-200 rounded-md bg-white"
              />
              <p className="text-xs text-slate-500 mt-2">
                Tarayamıyorsanız, kodu manuel girin: yukarıdaki bağlantıdaki secret.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-700 mb-2">Yedek Kodlar</h2>
              <p className="text-xs text-slate-500 mb-2">
                Telefonunuzu kaybederseniz aşağıdaki kodlardan biri ile hesabınıza
                erişebilirsiniz. Lütfen güvenli bir yere kaydedin — bu liste tekrar
                gösterilmeyecek.
              </p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-xs bg-slate-50 border border-slate-200 rounded-md p-3">
                {setup.recoveryCodes.map((c) => (
                  <li key={c} className="px-1 py-0.5 select-all">{c}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <hr className="my-6 border-slate-200" />

        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Doğrulama Kodu
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              {...form.register("code")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="123456"
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
            disabled={!setup || mutation.isPending}
            className="rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? "Doğrulanıyor…" : "Doğrula ve Etkinleştir"}
          </button>
        </form>
      </div>
    </div>
  );
}
