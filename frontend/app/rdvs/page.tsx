import { apiFetch } from "@/lib/api";
import { LogoutButton } from "./logout-button";

const STATUS_LABEL = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  pago: "Pago",
} as const;

const STATUS_CLASS = {
  rascunho: "bg-gray-100 text-gray-700",
  enviado: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-red-100 text-red-700",
  pago: "bg-purple-100 text-purple-700",
} as const;

type StatusRdv = keyof typeof STATUS_LABEL;

interface Rdv {
  id: string;
  unop_ug: string;
  motivo_viagem: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  status: StatusRdv;
  valor_reembolso: number;
  criado_em: string;
  empresas: { nome: string } | null;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatarValor(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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
        <LogoutButton />
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
                  <td className="px-4 py-3 text-gray-900">{rdv.empresas?.nome ?? "-"}</td>
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
