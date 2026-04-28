import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  type Branch,
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
} from "./branchesApi";
import { ApiError } from "../../../lib/apiClient";

const FormSchema = z.object({
  code: z.string().min(1, "Kod gerekli"),
  name: z.string().min(1, "İsim gerekli"),
  address: z.string().min(1, "Adres gerekli"),
});
type FormValues = z.infer<typeof FormSchema>;

export function BranchesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Branch | null>(null);
  const [showForm, setShowForm] = useState(false);

  const branchesQ = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: listBranches,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { code: "", name: "", address: "" },
  });

  const openCreate = () => {
    form.reset({ code: "", name: "", address: "" });
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (b: Branch) => {
    form.reset({ code: b.code, name: b.name, address: b.address });
    setEditing(b);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const createM = useMutation({
    mutationFn: (v: FormValues) => createBranch(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "branches"] });
      closeForm();
    },
  });
  const updateM = useMutation({
    mutationFn: (v: FormValues) => updateBranch(editing!.id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "branches"] });
      closeForm();
    },
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "branches"] }),
  });

  const onSubmit = form.handleSubmit((v) =>
    editing ? updateM.mutate(v) : createM.mutate(v),
  );

  const submitError =
    (createM.error || updateM.error) instanceof ApiError
      ? ((createM.error || updateM.error) as ApiError).body?.detail
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Şubeler</h1>
          <p className="text-sm text-slate-500">Tenant kapsamındaki şubeler.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 text-sm transition-colors"
        >
          + Yeni Şube
        </button>
      </div>

      {branchesQ.isLoading && <p className="text-slate-500">Yükleniyor…</p>}
      {branchesQ.isError && (
        <p className="text-red-600 text-sm">Şubeler yüklenemedi.</p>
      )}
      {branchesQ.data && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="py-2 px-4 font-medium">Kod</th>
                <th className="py-2 px-4 font-medium">İsim</th>
                <th className="py-2 px-4 font-medium">Adres</th>
                <th className="py-2 px-4 font-medium text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {branchesQ.data.branches.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center text-slate-500">
                    Henüz şube yok. "Yeni Şube" butonu ile ekleyin.
                  </td>
                </tr>
              )}
              {branchesQ.data.branches.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="py-2 px-4 font-mono">{b.code}</td>
                  <td className="py-2 px-4">{b.name}</td>
                  <td className="py-2 px-4 text-slate-600">{b.address}</td>
                  <td className="py-2 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(b)}
                      className="text-brand-600 hover:underline mr-3"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`${b.code} şubesini silmek istiyor musunuz?`)) {
                          deleteM.mutate(b.id);
                        }
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/40 grid place-items-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Şubeyi Düzenle" : "Yeni Şube"}
            </h2>
            <form className="space-y-3" onSubmit={onSubmit} noValidate>
              <Field
                label="Kod"
                placeholder="KDK-001"
                {...form.register("code")}
                error={form.formState.errors.code?.message}
              />
              <Field
                label="İsim"
                placeholder="Kadıköy Şubesi"
                {...form.register("name")}
                error={form.formState.errors.name?.message}
              />
              <Field
                label="Adres"
                placeholder="Bağdat Cd. No:123, Kadıköy, İstanbul"
                {...form.register("address")}
                error={form.formState.errors.address?.message}
              />
              {submitError && (
                <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {submitError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createM.isPending || updateM.isPending}
                  className="rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
                >
                  {editing ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
