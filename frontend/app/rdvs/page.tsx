import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { LogoutButton } from "./logout-button";
import { Rdv, STATUS_LABEL, STATUS_CLASS, formatarData, formatarValor } from "@/lib/types";

export default async function MeusRdvsPage() {
  const response = await apiFetch("/api/rdvs");

  if (!response.ok) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-red-600">Não foi possível carregar seus RDVs. Tente novamente mais tarde.</p>
      </div>
    );
  }

  const rdvs: Rdv[] = await response.json();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meus RDVs</h1>
          <p className="text-sm text-gray-500">Relatórios de despesas de viagem que você criou</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/rdvs/novo"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Novo RDV
          </Link>
          <LogoutButton />
        </div>
      </div>

      {rdvs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
          Você ainda não criou nenhum RDV.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Reembolso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rdvs.map((rdv) => (
                <tr key={rdv.id} className="hover:bg-gray-50">
                  <td className="p-0">
                    <Link href={`/rdvs/${rdv.id}`} className="block px-4 py-3 text-gray-900">
                      {rdv.empresas?.nome ?? "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{rdv.motivo_viagem ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatarData(rdv.periodo_inicio)} – {formatarData(rdv.periodo_fim)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASS[rdv.status]}`}>
                      {STATUS_LABEL[rdv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatarValor(rdv.valor_reembolso)}
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
