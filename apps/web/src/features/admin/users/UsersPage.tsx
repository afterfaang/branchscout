import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  type Role,
  inviteUser,
  listInvitations,
  listUsers,
  revokeInvitation,
} from "./usersApi";
import { listBranches } from "../branches/branchesApi";
import { ApiError } from "../../../lib/apiClient";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Yönetici" },
  { value: "REGION_MANAGER", label: "Bölge Müdürü" },
  { value: "BRANCH_MANAGER", label: "Şube Müdürü" },
  { value: "ANALYST", label: "Analist" },
];

const InviteSchema = z.object({
  email: z.string().email("Geçerli bir e-posta"),
  name: z.string().min(1, "Ad gerekli"),
  role: z.enum(["ADMIN", "REGION_MANAGER", "BRANCH_MANAGER", "ANALYST"]),
  branchId: z.string().optional(),
});
type InviteValues = z.infer<typeof InviteSchema>;

export function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const usersQ = useQuery({ queryKey: ["admin", "users"], queryFn: listUsers });
  const invitesQ = useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: listInvitations,
  });
  const branchesQ = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: listBranches,
  });

  const form = useForm<InviteValues>({
    resolver: zodResolver(InviteSchema),
    defaultValues: { email: "", name: "", role: "BRANCH_MANAGER", branchId: "" },
  });

  const inviteM = useMutation({
    mutationFn: (v: InviteValues) =>
      inviteUser({
        email: v.email,
        name: v.name,
        role: v.role,
        branchId: v.branchId || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
      setShowForm(false);
      form.reset();
    },
  });

  const revokeM = useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "invitations"] }),
  });

  const inviteError =
    inviteM.error instanceof ApiError
      ? (inviteM.error.body?.detail ?? inviteM.error.message)
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Kullanıcılar</h1>
          <p className="text-sm text-slate-500">Tenant kullanıcıları ve davetler.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 text-sm transition-colors"
        >
          + Davet Et
        </button>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Aktif Kullanıcılar</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="py-2 px-4 font-medium">İsim</th>
                <th className="py-2 px-4 font-medium">Email</th>
                <th className="py-2 px-4 font-medium">Rol</th>
                <th className="py-2 px-4 font-medium">MFA</th>
                <th className="py-2 px-4 font-medium">Aktif</th>
              </tr>
            </thead>
            <tbody>
              {usersQ.data?.users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="py-2 px-4">{u.name}</td>
                  <td className="py-2 px-4 text-slate-600 font-mono text-xs">{u.email}</td>
                  <td className="py-2 px-4">{ROLE_OPTIONS.find((r) => r.value === u.role)?.label ?? u.role}</td>
                  <td className="py-2 px-4">
                    {u.totpEnabled ? (
                      <span className="text-emerald-600">açık</span>
                    ) : (
                      <span className="text-slate-400">kapalı</span>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    {u.isActive ? "✓" : <span className="text-slate-400">×</span>}
                  </td>
                </tr>
              ))}
              {usersQ.data?.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-4 text-center text-slate-500">
                    Henüz kullanıcı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Davetler</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="py-2 px-4 font-medium">Email</th>
                <th className="py-2 px-4 font-medium">İsim</th>
                <th className="py-2 px-4 font-medium">Rol</th>
                <th className="py-2 px-4 font-medium">Şube</th>
                <th className="py-2 px-4 font-medium">Durum</th>
                <th className="py-2 px-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {invitesQ.data?.invitations.map((inv) => {
                const status = inv.acceptedAt
                  ? "kabul edildi"
                  : inv.revokedAt
                    ? "iptal"
                    : new Date(inv.expiresAt).getTime() < Date.now()
                      ? "süresi doldu"
                      : "bekliyor";
                const isPending = status === "bekliyor";
                return (
                  <tr key={inv.id} className="border-t border-slate-100">
                    <td className="py-2 px-4 font-mono text-xs">{inv.email}</td>
                    <td className="py-2 px-4">{inv.name}</td>
                    <td className="py-2 px-4">{ROLE_OPTIONS.find((r) => r.value === inv.role)?.label ?? inv.role}</td>
                    <td className="py-2 px-4">{inv.branch?.code ?? "—"}</td>
                    <td className="py-2 px-4 text-slate-600">{status}</td>
                    <td className="py-2 px-4 text-right">
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => revokeM.mutate(inv.id)}
                          className="text-red-600 hover:underline"
                        >
                          İptal
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {invitesQ.data?.invitations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-slate-500">
                    Henüz davet yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/40 grid place-items-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Yeni Davet</h2>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((v) => inviteM.mutate(v))}
              noValidate
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
                <input
                  type="email"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Ad Soyad</label>
                <input
                  {...form.register("name")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select
                  {...form.register("role")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Şube (opsiyonel)</label>
                <select
                  {...form.register("branchId")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— Şube atama —</option>
                  {branchesQ.data?.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
              {inviteError && (
                <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {inviteError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={inviteM.isPending}
                  className="rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
                >
                  {inviteM.isPending ? "Gönderiliyor…" : "Davet Gönder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
