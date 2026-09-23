import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Rdv, UsuarioAtual, STATUS_LABEL, STATUS_CLASS, formatarData } from "@/lib/types";
import { ValorReembolso } from "@/components/valor-reembolso";

export default async function PagamentosPage() {
  const meResponse = await apiFetch("/api/usuarios/me");
  if (!meResponse.ok) {
    redirect("/login");
  }
  const usuarioAtual: UsuarioAtual = await meResponse.json();

  if (!["financeiro", "admin"].includes(usuarioAtual.perfil)) {
    redirect("/rdvs");
  }

  const response = await apiFetch("/api/rdvs?status=aprovado");

  if (!response.ok) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar os pagamentos pendentes.</p>
      </div>
    );
  }

  const rdvs: Rdv[] = await response.json();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Pagamentos pendentes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">RDVs aprovados aguardando pagamento</p>
        </div>
        <Link href="/rdvs" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          Meus RDVs
        </Link>
      </div>

      {rdvs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nenhum RDV aprovado aguardando pagamento no momento.
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
