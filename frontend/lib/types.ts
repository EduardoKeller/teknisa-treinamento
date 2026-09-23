export type StatusRdv = "rascunho" | "enviado" | "aprovado" | "reprovado" | "pago";
export type Perfil = "funcionario" | "aprovador" | "financeiro" | "admin";

export interface UsuarioAtual {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  gestor_id: string | null;
  ativo: boolean;
  login: string | null;
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
  rascunho: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  enviado: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  aprovado: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  reprovado: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  pago: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

export interface ItemHoraExtra {
  id: string;
  horas_extras_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string | null;
  fez_intervalo: boolean;
  quantidade_horas: number | null;
  justificativa: string | null;
}

export interface HistoricoHe {
  id: string;
  horas_extras_id: string;
  usuario_id: string;
  status_anterior: StatusRdv | null;
  status_novo: StatusRdv;
  justificativa: string | null;
  criado_em: string;
}

export interface HoraExtra {
  id: string;
  usuario_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: StatusRdv;
  total_horas: number;
  criado_em: string;
  enviado_em: string | null;
  aprovado_em: string | null;
  aprovador_id: string | null;
  pago_em: string | null;
  funcionario?: { nome: string } | null;
}

export interface HoraExtraDetalhada extends HoraExtra {
  itens: ItemHoraExtra[];
  historico: HistoricoHe[];
}

export type StatusViagem = "rascunho" | "enviado" | "aprovado" | "reprovado" | "reservado";

export interface HistoricoSolicitacaoViagem {
  id: string;
  solicitacao_id: string;
  usuario_id: string;
  status_anterior: StatusViagem | null;
  status_novo: StatusViagem;
  justificativa: string | null;
  criado_em: string;
}

export interface SolicitacaoViagem {
  id: string;
  usuario_id: string;
  empresa_id: string;
  centro_custo_id: string | null;
  motivo: string;
  status: StatusViagem;

  inclui_hotel: boolean;
  hospede_nome: string | null;
  hospede_telefone: string | null;
  checkin_data: string | null;
  checkin_horario: string | null;
  checkout_data: string | null;
  checkout_horario: string | null;
  cidade: string | null;
  estado: string | null;
  sugestao_hotel_nome: string | null;
  sugestao_hotel_telefone: string | null;
  observacoes_hotel: string | null;

  inclui_passagem: boolean;
  passageiro_nome: string | null;
  passageiro_cpf: string | null;
  passageiro_nascimento: string | null;
  ida_data: string | null;
  ida_de: string | null;
  ida_para: string | null;
  volta_data: string | null;
  volta_de: string | null;
  volta_para: string | null;
  observacoes_passagem: string | null;

  detalhes_reserva: string | null;
  passagem_numero_voo: string | null;

  criado_em: string;
  enviado_em: string | null;
  aprovado_em: string | null;
  aprovador_id: string | null;
  reservado_em: string | null;
  reservado_por_id: string | null;

  empresas?: { nome: string } | null;
  funcionario?: { nome: string } | null;
  centro_custo?: { nome: string } | null;
}

export interface SolicitacaoViagemDetalhada extends SolicitacaoViagem {
  historico: HistoricoSolicitacaoViagem[];
}

export const STATUS_VIAGEM_LABEL: Record<StatusViagem, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  reservado: "Reservado",
};

export const STATUS_VIAGEM_CLASS: Record<StatusViagem, string> = {
  rascunho: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  enviado: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  aprovado: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  reprovado: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  reservado: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

export function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarValor(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarHoras(horas: number) {
  const totalMinutos = Math.round(horas * 60);
  const h = Math.floor(totalMinutos / 60);
  const m = totalMinutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}
