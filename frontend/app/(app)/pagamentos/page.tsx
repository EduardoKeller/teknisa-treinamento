import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Rdv, UsuarioAtual, STATUS_LABEL, STATUS_CLASS, formatarData, formatarValor } from "@/lib/types";

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
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-red-600">Não foi possível carregar os pagamentos pendentes.</p>
      </div>
    );
  }

  const rdvs: Rdv[] = await response.json();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pagamentos pendentes</h1>
          <p className="text-sm text-gray-500">RDVs aprovados aguardando pagamento</p>
        </div>
        <Link href="/rdvs" className="text-sm text-gray-500 hover:text-gray-700">
          Meus RDVs
        </Link>
      </div>

      {rdvs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
          Nenhum RDV aprovado aguardando pagamento no momento.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Funcionário</th>
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
                      {rdv.funcionario?.nome ?? "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{rdv.empresas?.nome ?? "-"}</td>
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
