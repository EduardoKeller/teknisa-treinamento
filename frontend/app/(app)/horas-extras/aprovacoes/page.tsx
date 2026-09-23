import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { HoraExtra, UsuarioAtual, STATUS_LABEL, STATUS_CLASS, formatarData, formatarHoras } from "@/lib/types";
import { AbasStatus } from "@/components/abas-status";

const ABAS = [
  { valor: "enviado", rotulo: "Pendentes" },
  { valor: "aprovado", rotulo: "Aprovados" },
  { valor: "reprovado", rotulo: "Reprovados" },
  { valor: "todos", rotulo: "Todos" },
];

const MENSAGEM_VAZIO: Record<string, string> = {
  enviado: "Nenhum registro aguardando aprovação no momento.",
  aprovado: "Nenhum registro aprovado ainda.",
  reprovado: "Nenhum registro reprovado.",
  todos: "Nenhum registro encontrado.",
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AprovacoesHorasExtrasPage({ searchParams }: Props) {
  const meResponse = await apiFetch("/api/usuarios/me");
  if (!meResponse.ok) {
    redirect("/login");
  }
  const usuarioAtual: UsuarioAtual = await meResponse.json();

  if (!["aprovador", "financeiro", "admin"].includes(usuarioAtual.perfil)) {
    redirect("/horas-extras");
  }

  const { status } = await searchParams;
  const aba = ABAS.some((a) => a.valor === status) ? status! : "enviado";

  const response = await apiFetch(aba === "todos" ? "/api/horas-extras" : `/api/horas-extras?status=${aba}`);

  if (!response.ok) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar os registros.</p>
      </div>
    );
  }

  const todos: HoraExtra[] = await response.json();
  const registros = aba === "todos" ? todos.filter((he) => he.status !== "rascunho") : todos;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Aprovações de horas extras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registros da sua equipe, com histórico de aprovações e reprovações</p>
        </div>
        <Link href="/horas-extras" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          Minhas Horas Extras
        </Link>
      </div>

      <AbasStatus basePath="/horas-extras/aprovacoes" abas={ABAS} ativa={aba} />

      {registros.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {MENSAGEM_VAZIO[aba]}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Funcionário</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total de horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {registros.map((he) => (
                <tr key={he.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-0">
                    <Link href={`/horas-extras/${he.id}`} className="block px-4 py-3 text-gray-900 dark:text-gray-100">
                      {he.funcionario?.nome ?? "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {formatarData(he.periodo_inicio)} – {formatarData(he.periodo_fim)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASS[he.status]}`}>
                      {STATUS_LABEL[he.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatarHoras(he.total_horas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
