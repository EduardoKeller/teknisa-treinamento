import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { HoraExtra, UsuarioAtual, STATUS_LABEL, STATUS_CLASS, formatarData, formatarHoras } from "@/lib/types";

export default async function PagamentosHorasExtrasPage() {
  const meResponse = await apiFetch("/api/usuarios/me");
  if (!meResponse.ok) {
    redirect("/login");
  }
  const usuarioAtual: UsuarioAtual = await meResponse.json();

  if (!["financeiro", "admin"].includes(usuarioAtual.perfil)) {
    redirect("/horas-extras");
  }

  const response = await apiFetch("/api/horas-extras?status=aprovado");

  if (!response.ok) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar os pagamentos pendentes.</p>
      </div>
    );
  }

  const registros: HoraExtra[] = await response.json();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Pagamentos de horas extras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registros aprovados aguardando pagamento</p>
        </div>
        <Link href="/horas-extras" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          Minhas Horas Extras
        </Link>
      </div>

      {registros.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nenhum registro aprovado aguardando pagamento no momento.
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
