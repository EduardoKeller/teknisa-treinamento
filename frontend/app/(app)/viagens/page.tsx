import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  SolicitacaoViagem,
  UsuarioAtual,
  STATUS_VIAGEM_LABEL,
  STATUS_VIAGEM_CLASS,
  formatarData,
} from "@/lib/types";

function resumoTrecho(s: SolicitacaoViagem): string {
  const partes: string[] = [];
  if (s.inclui_hotel) partes.push("Hotel");
  if (s.inclui_passagem) partes.push("Passagem");
  return partes.join(" + ");
}

export default async function MinhasSolicitacoesViagemPage() {
  const meResponse = await apiFetch("/api/usuarios/me");
  const usuarioAtual: UsuarioAtual | null = meResponse.ok ? await meResponse.json() : null;

  const query = usuarioAtual && usuarioAtual.perfil !== "funcionario" ? `?usuario_id=${usuarioAtual.id}` : "";
  const response = await apiFetch(`/api/solicitacoes-viagem${query}`);

  if (!response.ok) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar suas solicitações. Tente novamente mais tarde.
        </p>
      </div>
    );
  }

  const solicitacoes: SolicitacaoViagem[] = await response.json();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Minhas Solicitações de Viagem</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pedidos de reserva de hotel e/ou compra de passagem</p>
        </div>
        <Link
          href="/viagens/novo"
          className="inline-flex w-fit items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          Nova solicitação
        </Link>
      </div>

      {solicitacoes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Você ainda não criou nenhuma solicitação de viagem.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {solicitacoes.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-0">
                    <Link href={`/viagens/${s.id}`} className="block px-4 py-3 text-gray-900 dark:text-gray-100">
                      {s.empresas?.nome ?? "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.motivo}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{resumoTrecho(s)}</td>
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
