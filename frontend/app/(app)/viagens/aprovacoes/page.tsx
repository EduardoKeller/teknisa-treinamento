import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SolicitacaoViagem, UsuarioAtual, STATUS_VIAGEM_LABEL, STATUS_VIAGEM_CLASS, formatarData } from "@/lib/types";
import { AbasStatus } from "@/components/abas-status";

const ABAS = [
  { valor: "enviado", rotulo: "Pendentes" },
  { valor: "aprovado", rotulo: "Aprovados" },
  { valor: "reprovado", rotulo: "Reprovados" },
  { valor: "todos", rotulo: "Todos" },
];

const MENSAGEM_VAZIO: Record<string, string> = {
  enviado: "Nenhuma solicitação aguardando aprovação no momento.",
  aprovado: "Nenhuma solicitação aprovada ainda.",
  reprovado: "Nenhuma solicitação reprovada.",
  todos: "Nenhuma solicitação encontrada.",
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AprovacoesViagemPage({ searchParams }: Props) {
  const meResponse = await apiFetch("/api/usuarios/me");
  if (!meResponse.ok) {
    redirect("/login");
  }
  const usuarioAtual: UsuarioAtual = await meResponse.json();

  if (!["aprovador", "financeiro", "admin"].includes(usuarioAtual.perfil)) {
    redirect("/viagens");
  }

  const { status } = await searchParams;
  const aba = ABAS.some((a) => a.valor === status) ? status! : "enviado";

  const response = await apiFetch(aba === "todos" ? "/api/solicitacoes-viagem" : `/api/solicitacoes-viagem?status=${aba}`);

  if (!response.ok) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar as solicitações.</p>
      </div>
    );
  }

  const todas: SolicitacaoViagem[] = await response.json();
  const solicitacoes = aba === "todos" ? todas.filter((s) => s.status !== "rascunho") : todas;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Aprovações de viagem</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Solicitações da sua equipe, com histórico de aprovações e reprovações</p>
        </div>
        <Link href="/viagens" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          Minhas Solicitações
        </Link>
      </div>

      <AbasStatus basePath="/viagens/aprovacoes" abas={ABAS} ativa={aba} />

      {solicitacoes.length === 0 ? (
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
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {solicitacoes.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-0">
                    <Link href={`/viagens/${s.id}`} className="block px-4 py-3 text-gray-900 dark:text-gray-100">
                      {s.funcionario?.nome ?? "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.empresas?.nome ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.motivo}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatarData(s.criado_em)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_VIAGEM_CLASS[s.status]}`}>
                      {STATUS_VIAGEM_LABEL[s.status]}
                    </span>
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
