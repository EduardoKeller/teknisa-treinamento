import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { UsuarioAtual } from "@/lib/types";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const meResponse = await apiFetch("/api/usuarios/me");
  if (!meResponse.ok) {
    redirect("/login");
  }
  const usuarioAtual: UsuarioAtual = await meResponse.json();

  return <AppShell usuario={usuarioAtual}>{children}</AppShell>;
}
