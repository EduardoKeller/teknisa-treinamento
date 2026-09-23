import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Rdv, UsuarioAtual, STATUS_LABEL, STATUS_CLASS, formatarData } from "@/lib/types";
import { ValorReembolso } from "@/components/valor-reembolso";

export default async function MeusRdvsPage() {
  const meResponse = await apiFetch("/api/usuarios/me");
  const usuarioAtual: UsuarioAtual | null = meResponse.ok ? await meResponse.json() : null;

  const query = usuarioAtual && usuarioAtual.perfil !== "funcionario" ? `?usuario_id=${usuarioAtual.id}` : "";
  const response = await apiFetch(`/api/rdvs${query}`);

  if (!response.ok) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar seus RDVs. Tente novamente mais tarde.</p>
      </div>
    );
  }

  const rdvs: Rdv[] = await response.json();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Meus RDVs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Relatórios de despesas de viagem que você criou</p>
        </div>
        <Link
          href="/rdvs/novo"
          className="inline-flex w-fit items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Novo RDV
        </Link>
      </div>

      {rdvs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Você ainda não criou nenhum RDV.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
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
                      {rdv.empresas?.nome ?? "-"}
                    </Link>
                  </td>
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
