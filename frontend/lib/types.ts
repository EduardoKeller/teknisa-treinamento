export type StatusRdv = "rascunho" | "enviado" | "aprovado" | "reprovado" | "pago";
export type Perfil = "funcionario" | "aprovador" | "financeiro" | "admin";

export interface UsuarioAtual {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  gestor_id: string | null;
  ativo: boolean;
}

export interface UsuarioAdmin extends UsuarioAtual {
  gestor?: { nome: string } | null;
}

export const PERFIL_LABEL: Record<Perfil, string> = {
  funcionario: "Funcionário",
  aprovador: "Aprovador",
  financeiro: "Financeiro",
  admin: "Admin",
};

export interface Empresa {
  id: string;
  nome: string;
  ativa: boolean;
}

export interface CategoriaDespesa {
  id: string;
  nome: string;
  ativa: boolean;
}

export interface CentroCusto {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface ItemDespesa {
  id: string;
  rdv_id: string;
  categoria_id: string;
  descricao: string | null;
  valor: number;
  data_gasto: string;
  comprovante_url: string | null;
  categorias_despesa?: { nome: string } | null;
}

export interface ItemQuilometragem {
  id: string;
  rdv_id: string;
  data: string;
  trajeto: string;
  km: number;
  valor_km: number;
  valor: number;
}

export interface HistoricoStatus {
  id: string;
  rdv_id: string;
  usuario_id: string;
  status_anterior: StatusRdv | null;
  status_novo: StatusRdv;
  justificativa: string | null;
  criado_em: string;
}

export interface Rdv {
  id: string;
  usuario_id: string;
  empresa_id: string;
  centro_custo_id: string;
  motivo_viagem: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  status: StatusRdv;
  valor_total_despesas: number;
  adiantamento_recebido: number;
  valor_reembolso: number;
  criado_em: string;
  enviado_em: string | null;
  aprovado_em: string | null;
  aprovador_id: string | null;
  pago_em: string | null;
  empresas?: { nome: string } | null;
  funcionario?: { nome: string } | null;
  centro_custo?: { nome: string } | null;
}

export interface RdvDetalhado extends Rdv {
  itens_despesa: ItemDespesa[];
  itens_quilometragem: ItemQuilometragem[];
  historico_status: HistoricoStatus[];
}

export const STATUS_LABEL: Record<StatusRdv, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  pago: "Pago",
};

export const STATUS_CLASS: Record<StatusRdv, string> = {
  rascunho: "bg-gray-100 text-gray-700",
  enviado: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-red-100 text-red-700",
  pago: "bg-purple-100 text-purple-700",
};

export function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarValor(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
