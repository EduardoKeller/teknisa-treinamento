"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/categorias", label: "Categorias" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 border-b border-gray-200">
      {ABAS.map((aba) => {
        const ativa = pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={`border-b-2 px-1 pb-2 text-sm transition ${
              ativa
                ? "border-gray-900 font-medium text-gray-900"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900"
            }`}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
