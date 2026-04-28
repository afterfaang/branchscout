import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { acceptInvitation, fetchInvitation } from "./authApi";
import { useAuthStore } from "./authStore";
import { ApiError } from "../../lib/apiClient";

const Schema = z
  .object({
    password: z.string().min(8, "En az 8 karakter"),
    confirmPassword: z.string().min(8, "En az 8 karakter"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Parolalar eşleşmiyor",
  });
type FormValues = z.infer<typeof Schema>;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Yönetici",
  REGION_MANAGER: "Bölge Müdürü",
  BRANCH_MANAGER: "Şube Müdürü",
  ANALYST: "Analist",
};

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const invitation = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetchInvitation(token!),
    enabled: !!token,
    retry: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      acceptInvitation({ token: token!, password: values.password }),
    onSuccess: (data) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      // After accept, push the user toward MFA setup so they enrol immediately.
      navigate("/auth/setup-mfa", { replace: true });
    },
  });

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  if (invitation.isLoading) {
    return <CenterCard><p className="text-slate-600">Davet doğrulanıyor…</p></CenterCard>;
  }
  if (invitation.isError || !invitation.data) {
    return (
      <CenterCard>
        <h1 className="text-xl font-semibold mb-2">Davet bulunamadı</h1>
        <p className="text-sm text-slate-600">
          Bu davet linki geçersiz, süresi dolmuş ya da iptal edilmiş olabilir. Lütfen yöneticinizden yeni bir davet talep edin.
        </p>
      </CenterCard>
    );
  }

  const inv = invitation.data;
  const apiError =
    mutation.error instanceof ApiError
      ? (mutation.error.body?.detail ?? mutation.error.message)
      : mutation.isError
        ? "Davet kabul edilemedi. Lütfen tekrar deneyiniz."
        : null;

  return (
    <CenterCard>
      <h1 className="text-2xl font-semibold mb-1">Hesabınızı Oluşturun</h1>
      <p className="text-sm text-slate-600 mb-6">
        <strong>{inv.email}</strong> için davet aldınız (
        {ROLE_LABEL[inv.role] ?? inv.role}
        {inv.branch && <> · şube {inv.branch.code}</>}
        ). Lütfen bir parola belirleyin.
      </p>
      <form
        className="space-y-4"
        noValidate
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <Field
          label="Parola"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
          error={form.formState.errors.password?.message}
        />
        <Field
          label="Parola (tekrar)"
          type="password"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
          error={form.formState.errors.confirmPassword?.message}
        />
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
          {mutation.isPending ? "Kaydediliyor…" : "Hesabımı Oluştur"}
        </button>
      </form>
    </CenterCard>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <Brand />
        {children}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="inline-block w-10 h-10 rounded bg-brand-600 text-white grid place-items-center font-bold text-lg">
        B
      </span>
      <div>
        <div className="font-semibold text-slate-900">BranchScout</div>
        <div className="text-xs text-slate-500">Şube Saha Keşif</div>
      </div>
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
const Field = (props: FieldProps) => {
  const { label, error, ...rest } = props;
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        {...rest}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};
