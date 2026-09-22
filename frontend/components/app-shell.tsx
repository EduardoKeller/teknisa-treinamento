"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  CheckSquare,
  Clock,
  LayoutDashboard,
  Menu,
  Plane,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { LogoutButton } from "./logout-button";
import { PERFIL_LABEL, UsuarioAtual } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Plane;
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function montarGrupos(usuario: UsuarioAtual): NavGroup[] {
  const podeAprovar = ["aprovador", "financeiro", "admin"].includes(usuario.perfil);
  const podePagar = ["financeiro", "admin"].includes(usuario.perfil);
  const ehAdmin = usuario.perfil === "admin";

  const grupos: NavGroup[] = [
    {
      title: "RDV",
      items: [
        { href: "/rdvs", label: "Meus RDVs", icon: Plane, exact: true },
        ...(podeAprovar ? [{ href: "/aprovacoes", label: "Aprovações", icon: CheckSquare }] : []),
        ...(podePagar ? [{ href: "/pagamentos", label: "Pagamentos", icon: Wallet }] : []),
      ],
    },
    {
      title: "Horas extras",
      items: [
        { href: "/horas-extras", label: "Meus registros", icon: Clock, exact: true },
        ...(podeAprovar
          ? [{ href: "/horas-extras/aprovacoes", label: "Aprovações", icon: CheckSquare }]
          : []),
        ...(podePagar
          ? [{ href: "/horas-extras/pagamentos", label: "Pagamentos", icon: Wallet }]
          : []),
      ],
    },
    {
      title: "Conta",
      items: [
        { href: "/perfil", label: "Dados bancários", icon: Banknote },
        ...(ehAdmin ? [{ href: "/admin", label: "Administração", icon: Settings }] : []),
      ],
    },
  ];

  return grupos;
}

function ehAtivo(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarConteudo({ usuario, onNavegar }: { usuario: UsuarioAtual; onNavegar?: () => void }) {
  const pathname = usePathname();
  const grupos = montarGrupos(usuario);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Sistema de RDV</p>
          <p className="text-xs text-gray-500">Viagens &amp; horas extras</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {grupos.map((grupo) => (
          <div key={grupo.title}>
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {grupo.title}
            </p>
            <div className="space-y-0.5">
              {grupo.items.map((item) => {
                const Icone = item.icon;
                const ativo = ehAtivo(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavegar}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition ${
                      ativo
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icone className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
            {usuario.nome.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{usuario.nome}</p>
            <p className="truncate text-xs text-gray-500">{PERFIL_LABEL[usuario.perfil]}</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}

export function AppShell({ usuario, children }: { usuario: UsuarioAtual; children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="fixed h-screen w-64">
          <SidebarConteudo usuario={usuario} />
        </div>
      </aside>

      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAberto(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              className="absolute right-3 top-3 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarConteudo usuario={usuario} onNavegar={() => setMenuAberto(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-white">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Sistema de RDV</p>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
