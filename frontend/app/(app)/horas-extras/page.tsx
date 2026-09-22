import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { HoraExtra, UsuarioAtual, STATUS_LABEL, STATUS_CLASS, formatarData, formatarHoras } from "@/lib/types";

export default async function MinhasHorasExtrasPage() {
  const meResponse = await apiFetch("/api/usuarios/me");
  const usuarioAtual: UsuarioAtual | null = meResponse.ok ? await meResponse.json() : null;

  const query = usuarioAtual && usuarioAtual.perfil !== "funcionario" ? `?usuario_id=${usuarioAtual.id}` : "";
  const response = await apiFetch(`/api/horas-extras${query}`);

  if (!response.ok) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar suas horas extras. Tente novamente mais tarde.</p>
      </div>
    );
  }

  const registros: HoraExtra[] = await response.json();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Minhas Horas Extras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registros de horas extras que você lançou</p>
        </div>
        <Link
          href="/horas-extras/novo"
          className="inline-flex w-fit items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          Novo registro
        </Link>
      </div>

      {registros.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Você ainda não lançou nenhuma hora extra.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
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
                      {formatarData(he.periodo_inicio)} – {formatarData(he.periodo_fim)}
                    </Link>
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
