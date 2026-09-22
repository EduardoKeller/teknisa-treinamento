import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { UsuarioAtual } from "@/lib/types";
import { AdminNav } from "./nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const meResponse = await apiFetch("/api/usuarios/me");
  if (!meResponse.ok) {
    redirect("/login");
  }
  const usuarioAtual: UsuarioAtual = await meResponse.json();

  if (usuarioAtual.perfil !== "admin") {
    redirect("/rdvs");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Administração</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Usuários, empresas e categorias de despesa</p>
      </div>

      <AdminNav />

      <div className="mt-6">{children}</div>
    </div>
  );
}
