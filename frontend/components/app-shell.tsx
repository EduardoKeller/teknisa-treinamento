"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  CheckSquare,
  ChevronDown,
  Clock,
  FileText,
  LayoutDashboard,
  ListChecks,
  Menu,
  Plane,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import { PERFIL_LABEL, UsuarioAtual } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Plane;
  exact?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  icon: typeof Plane;
  items: NavItem[];
}

const STORAGE_KEY = "rdv-sidebar-grupos";

function montarGrupos(usuario: UsuarioAtual): NavGroup[] {
  const podeAprovar = ["aprovador", "financeiro", "admin"].includes(usuario.perfil);
  const podePagar = ["financeiro", "admin"].includes(usuario.perfil);
  const ehAdmin = usuario.perfil === "admin";

  const grupos: NavGroup[] = [
    {
      id: "rdv",
      title: "RDV",
      icon: Plane,
      items: [
        { href: "/rdvs", label: "Meus RDVs", icon: FileText, exact: true },
        ...(podeAprovar ? [{ href: "/aprovacoes", label: "Aprovações", icon: CheckSquare }] : []),
        ...(podePagar ? [{ href: "/pagamentos", label: "Reembolsos", icon: Wallet }] : []),
      ],
    },
    {
      id: "horas",
      title: "Jornada & Horas",
      icon: Clock,
      items: [
        { href: "/horas-extras", label: "Meus registros", icon: ListChecks, exact: true },
        ...(podeAprovar
          ? [{ href: "/horas-extras/aprovacoes", label: "Aprovações", icon: CheckSquare }]
          : []),
        ...(podePagar
          ? [{ href: "/horas-extras/pagamentos", label: "Pagamentos", icon: Wallet }]
          : []),
      ],
    },
    {
      id: "config",
      title: "Configurações",
      icon: Settings,
      items: [
        { href: "/perfil", label: "Dados bancários", icon: Banknote },
        ...(ehAdmin ? [{ href: "/admin", label: "Administração", icon: Users }] : []),
      ],
    },
  ];

  return grupos;
}

function ehAtivo(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function grupoContemRotaAtiva(pathname: string, grupo: NavGroup) {
  return grupo.items.some((item) => ehAtivo(pathname, item));
}

function carregarEstado(): Record<string, boolean> {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    return bruto ? JSON.parse(bruto) : {};
  } catch {
    return {};
  }
}

function salvarEstado(estado: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch {
    // localStorage indisponível (modo privado etc.) — ignora
  }
}

function SidebarConteudo({ usuario, onNavegar }: { usuario: UsuarioAtual; onNavegar?: () => void }) {
  const pathname = usePathname();
  const grupos = montarGrupos(usuario);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // localStorage só existe no cliente; ler aqui (em vez de no useState) evita mismatch de hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbertos(carregarEstado());
  }, []);

  function alternarGrupo(id: string) {
    setAbertos((atual) => {
      const proximo = { ...atual, [id]: !estaAberto(id) };
      salvarEstado(proximo);
      return proximo;
    });
  }

  function estaAberto(id: string) {
    if (id in abertos) return abertos[id];
    return true;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sistema de RDV</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Viagens &amp; horas extras</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {grupos.map((grupo) => {
          const GrupoIcone = grupo.icon;
          const aberto = estaAberto(grupo.id) || grupoContemRotaAtiva(pathname, grupo);
          return (
            <div key={grupo.id}>
              <button
                type="button"
                onClick={() => alternarGrupo(grupo.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 transition hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <GrupoIcone className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">{grupo.title}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${aberto ? "rotate-0" : "-rotate-90"}`}
                />
              </button>
              {aberto && (
                <div className="space-y-0.5 pb-2">
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
                            ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                        }`}
                      >
                        <Icone className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {usuario.nome.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{usuario.nome}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{PERFIL_LABEL[usuario.perfil]}</p>
          </div>
          <ThemeToggle />
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}

export function AppShell({ usuario, children }: { usuario: UsuarioAtual; children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block dark:border-gray-800 dark:bg-gray-900">
        <div className="fixed h-screen w-64">
          <SidebarConteudo usuario={usuario} />
        </div>
      </aside>

      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAberto(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              className="absolute right-3 top-3 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarConteudo usuario={usuario} onNavegar={() => setMenuAberto(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sistema de RDV</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
