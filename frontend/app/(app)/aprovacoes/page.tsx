import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Rdv, UsuarioAtual, STATUS_LABEL, STATUS_CLASS, formatarData } from "@/lib/types";
import { ValorReembolso } from "@/components/valor-reembolso";
import { AbasStatus } from "@/components/abas-status";

const ABAS = [
  { valor: "enviado", rotulo: "Pendentes" },
  { valor: "aprovado", rotulo: "Aprovados" },
  { valor: "reprovado", rotulo: "Reprovados" },
  { valor: "todos", rotulo: "Todos" },
];

const MENSAGEM_VAZIO: Record<string, string> = {
  enviado: "Nenhum RDV aguardando aprovação no momento.",
  aprovado: "Nenhum RDV aprovado ainda.",
  reprovado: "Nenhum RDV reprovado.",
  todos: "Nenhum RDV encontrado.",
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AprovacoesPage({ searchParams }: Props) {
  const meResponse = await apiFetch("/api/usuarios/me");
  if (!meResponse.ok) {
    redirect("/login");
  }
  const usuarioAtual: UsuarioAtual = await meResponse.json();

  if (!["aprovador", "financeiro", "admin"].includes(usuarioAtual.perfil)) {
    redirect("/rdvs");
  }

  const { status } = await searchParams;
  const aba = ABAS.some((a) => a.valor === status) ? status! : "enviado";

  const response = await apiFetch(aba === "todos" ? "/api/rdvs" : `/api/rdvs?status=${aba}`);

  if (!response.ok) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar os RDVs.</p>
      </div>
    );
  }

  const todos: Rdv[] = await response.json();
  const rdvs = aba === "todos" ? todos.filter((rdv) => rdv.status !== "rascunho") : todos;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Aprovações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">RDVs da sua equipe, com histórico de aprovações e reprovações</p>
        </div>
        <Link href="/rdvs" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          Meus RDVs
        </Link>
      </div>

      <AbasStatus basePath="/aprovacoes" abas={ABAS} ativa={aba} />

      {rdvs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {MENSAGEM_VAZIO[aba]}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Funcionário</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Reembolso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rdvs.map((rdv) => (
                <tr key={rdv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-0">
                    <Link href={`/rdvs/${rdv.id}`} className="block px-4 py-3 text-gray-900 dark:text-gray-100">
                      {rdv.funcionario?.nome ?? "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{rdv.empresas?.nome ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{rdv.motivo_viagem ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {formatarData(rdv.periodo_inicio)} – {formatarData(rdv.periodo_fim)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASS[rdv.status]}`}>
                      {STATUS_LABEL[rdv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ValorReembolso valor={rdv.valor_reembolso} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
