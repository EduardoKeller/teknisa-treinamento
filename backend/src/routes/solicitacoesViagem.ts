import { Router } from "express";
import { supabase } from "../supabaseClient";
import { autenticar, autorizar } from "../middleware/auth";
import { Usuario } from "../types";

export const solicitacoesViagemRouter = Router();
solicitacoesViagemRouter.use(autenticar);

const SELECT_SOLICITACAO_COM_FUNCIONARIO =
  "*, empresas(nome), funcionario:usuarios!usuario_id(nome), centro_custo:centros_custo(nome)";

async function idsDaEquipe(gestorId: string): Promise<string[]> {
  const { data } = await supabase.from("usuarios").select("id").eq("gestor_id", gestorId);
  return (data ?? []).map((u) => u.id);
}

async function carregarSolicitacaoComPermissao(id: string, usuario: Usuario) {
  const { data: solicitacao, error } = await supabase
    .from("solicitacoes_viagem")
    .select(SELECT_SOLICITACAO_COM_FUNCIONARIO)
    .eq("id", id)
    .single();
  if (error || !solicitacao) return { solicitacao: null, permitido: false };

  if (usuario.perfil === "financeiro" || usuario.perfil === "admin") {
    return { solicitacao, permitido: true };
  }
  if (solicitacao.usuario_id === usuario.id || solicitacao.aprovador_id === usuario.id) {
    return { solicitacao, permitido: true };
  }
  if (usuario.perfil === "aprovador") {
    const { data: dono } = await supabase
      .from("usuarios")
      .select("gestor_id")
      .eq("id", solicitacao.usuario_id)
      .single();
    if (dono?.gestor_id === usuario.id) return { solicitacao, permitido: true };
  }
  return { solicitacao, permitido: false };
}

async function registrarHistorico(
  solicitacaoId: string,
  usuarioId: string,
  statusAnterior: string,
  statusNovo: string,
  justificativa?: string
) {
  await supabase.from("solicitacoes_viagem_historico").insert({
    solicitacao_id: solicitacaoId,
    usuario_id: usuarioId,
    status_anterior: statusAnterior,
    status_novo: statusNovo,
    justificativa,
  });
}

const CAMPOS_HOTEL = [
  "hospede_nome",
  "hospede_telefone",
  "checkin_data",
  "checkin_horario",
  "checkout_data",
  "checkout_horario",
  "cidade",
  "estado",
  "sugestao_hotel_nome",
  "sugestao_hotel_telefone",
  "observacoes_hotel",
] as const;

const CAMPOS_PASSAGEM = [
  "passageiro_nome",
  "passageiro_cpf",
  "passageiro_nascimento",
  "ida_data",
  "ida_de",
  "ida_para",
  "volta_data",
  "volta_de",
  "volta_para",
  "observacoes_passagem",
] as const;

function extrairCampos(body: Record<string, unknown>, campos: readonly string[]) {
  const resultado: Record<string, unknown> = {};
  for (const campo of campos) resultado[campo] = body[campo] ?? null;
  return resultado;
}

function validarPayload(body: Record<string, unknown>): string | null {
  const { empresa_id, motivo, inclui_hotel, inclui_passagem } = body;
  if (!empresa_id || !motivo) {
    return "empresa_id e motivo são obrigatórios";
  }
  if (!inclui_hotel && !inclui_passagem) {
    return "Selecione ao menos hospedagem ou passagem";
  }
  if (inclui_hotel) {
    const { hospede_nome, checkin_data, checkout_data, cidade } = body;
    if (!hospede_nome || !checkin_data || !checkout_data || !cidade) {
      return "Para hospedagem: hóspede, cidade e datas de entrada/saída são obrigatórios";
    }
  }
  if (inclui_passagem) {
    const { passageiro_nome, ida_data, ida_de, ida_para } = body;
    if (!passageiro_nome || !ida_data || !ida_de || !ida_para) {
      return "Para passagem: passageiro e dados da ida são obrigatórios";
    }
  }
  return null;
}

solicitacoesViagemRouter.get("/", async (req, res) => {
  const usuario = req.usuario!;
  let query = supabase
    .from("solicitacoes_viagem")
    .select(SELECT_SOLICITACAO_COM_FUNCIONARIO)
    .order("criado_em", { ascending: false });

  if (usuario.perfil === "funcionario") {
    query = query.eq("usuario_id", usuario.id);
  } else if (usuario.perfil === "aprovador") {
    const equipe = await idsDaEquipe(usuario.id);
    query = query.in("usuario_id", [...equipe, usuario.id]);
  }

  const { status, usuario_id } = req.query;
  if (status) query = query.eq("status", status as string);
  if (usuario_id && usuario.perfil !== "funcionario") query = query.eq("usuario_id", usuario_id as string);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

solicitacoesViagemRouter.post("/", async (req, res) => {
  const usuario = req.usuario!;
  const erro = validarPayload(req.body);
  if (erro) {
    res.status(400).json({ error: erro });
    return;
  }

  const { empresa_id, centro_custo_id, motivo, inclui_hotel, inclui_passagem } = req.body;

  const { data, error } = await supabase
    .from("solicitacoes_viagem")
    .insert({
      usuario_id: usuario.id,
      empresa_id,
      centro_custo_id: centro_custo_id ?? null,
      motivo,
      inclui_hotel: !!inclui_hotel,
      inclui_passagem: !!inclui_passagem,
      ...(inclui_hotel ? extrairCampos(req.body, CAMPOS_HOTEL) : {}),
      ...(inclui_passagem ? extrairCampos(req.body, CAMPOS_PASSAGEM) : {}),
    })
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

solicitacoesViagemRouter.get("/:id", async (req, res) => {
  const usuario = req.usuario!;
  const { solicitacao, permitido } = await carregarSolicitacaoComPermissao(req.params.id, usuario);
  if (!solicitacao) {
    res.status(404).json({ error: "Solicitação não encontrada" });
    return;
  }
  if (!permitido) {
    res.status(403).json({ error: "Sem permissão para ver esta solicitação" });
    return;
  }

  const { data: historico } = await supabase
    .from("solicitacoes_viagem_historico")
    .select("*")
    .eq("solicitacao_id", solicitacao.id)
    .order("criado_em");

  res.json({ ...solicitacao, historico: historico ?? [] });
});

solicitacoesViagemRouter.patch("/:id", async (req, res) => {
  const usuario = req.usuario!;
  const { solicitacao } = await carregarSolicitacaoComPermissao(req.params.id, usuario);
  if (!solicitacao || solicitacao.usuario_id !== usuario.id || !["rascunho", "reprovado"].includes(solicitacao.status)) {
    res.status(403).json({ error: "Só é possível editar a própria solicitação em rascunho ou reprovada" });
    return;
  }

  const erro = validarPayload(req.body);
  if (erro) {
    res.status(400).json({ error: erro });
    return;
  }

  const { empresa_id, centro_custo_id, motivo, inclui_hotel, inclui_passagem } = req.body;

  const { data, error } = await supabase
    .from("solicitacoes_viagem")
    .update({
      empresa_id,
      centro_custo_id: centro_custo_id ?? null,
      motivo,
      inclui_hotel: !!inclui_hotel,
      inclui_passagem: !!inclui_passagem,
      ...extrairCampos(req.body, CAMPOS_HOTEL),
      ...extrairCampos(req.body, CAMPOS_PASSAGEM),
    })
    .eq("id", solicitacao.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

solicitacoesViagemRouter.post("/:id/enviar", async (req, res) => {
  const usuario = req.usuario!;
  const { solicitacao } = await carregarSolicitacaoComPermissao(req.params.id, usuario);
  if (!solicitacao || solicitacao.usuario_id !== usuario.id || solicitacao.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível enviar a própria solicitação em rascunho" });
    return;
  }

  const { data, error } = await supabase
    .from("solicitacoes_viagem")
    .update({ status: "enviado", enviado_em: new Date().toISOString() })
    .eq("id", solicitacao.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(solicitacao.id, usuario.id, "rascunho", "enviado");
  res.json(data);
});

solicitacoesViagemRouter.post("/:id/aprovar", autorizar("aprovador", "financeiro", "admin"), async (req, res) => {
  const usuario = req.usuario!;
  const { solicitacao, permitido } = await carregarSolicitacaoComPermissao(String(req.params.id), usuario);
  if (!solicitacao || !permitido || solicitacao.status !== "enviado") {
    res.status(403).json({ error: "Solicitação não encontrada, sem permissão ou não está aguardando aprovação" });
    return;
  }

  const { data, error } = await supabase
    .from("solicitacoes_viagem")
    .update({ status: "aprovado", aprovado_em: new Date().toISOString(), aprovador_id: usuario.id })
    .eq("id", solicitacao.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(solicitacao.id, usuario.id, "enviado", "aprovado");
  res.json(data);
});

solicitacoesViagemRouter.post("/:id/reprovar", autorizar("aprovador", "financeiro", "admin"), async (req, res) => {
  const usuario = req.usuario!;
  const { solicitacao, permitido } = await carregarSolicitacaoComPermissao(String(req.params.id), usuario);
  if (!solicitacao || !permitido || solicitacao.status !== "enviado") {
    res.status(403).json({ error: "Solicitação não encontrada, sem permissão ou não está aguardando aprovação" });
    return;
  }

  const { justificativa } = req.body;
  if (!justificativa) {
    res.status(400).json({ error: "Justificativa é obrigatória para reprovar" });
    return;
  }

  const { data, error } = await supabase
    .from("solicitacoes_viagem")
    .update({ status: "reprovado", aprovador_id: usuario.id })
    .eq("id", solicitacao.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(solicitacao.id, usuario.id, "enviado", "reprovado", justificativa);
  res.json(data);
});

solicitacoesViagemRouter.post("/:id/reabrir", async (req, res) => {
  const usuario = req.usuario!;
  const { solicitacao } = await carregarSolicitacaoComPermissao(req.params.id, usuario);
  if (!solicitacao || solicitacao.usuario_id !== usuario.id || solicitacao.status !== "reprovado") {
    res.status(403).json({ error: "Só é possível reabrir a própria solicitação quando reprovada" });
    return;
  }

  const { data, error } = await supabase
    .from("solicitacoes_viagem")
    .update({ status: "rascunho" })
    .eq("id", solicitacao.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(solicitacao.id, usuario.id, "reprovado", "rascunho");
  res.json(data);
});

solicitacoesViagemRouter.post("/:id/reservar", autorizar("financeiro", "admin"), async (req, res) => {
  const usuario = req.usuario!;
  const { data: solicitacao, error: erroBusca } = await supabase
    .from("solicitacoes_viagem")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (erroBusca || !solicitacao || solicitacao.status !== "aprovado") {
    res.status(403).json({ error: "Solicitação não encontrada ou não está aprovada" });
    return;
  }

  const { detalhes_reserva, passagem_numero_voo } = req.body;
  if (!detalhes_reserva) {
    res.status(400).json({ error: "Descreva os detalhes da reserva confirmada" });
    return;
  }

  const { data, error } = await supabase
    .from("solicitacoes_viagem")
    .update({
      status: "reservado",
      detalhes_reserva,
      passagem_numero_voo: passagem_numero_voo || null,
      reservado_em: new Date().toISOString(),
      reservado_por_id: usuario.id,
    })
    .eq("id", solicitacao.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(solicitacao.id, usuario.id, "aprovado", "reservado");
  res.json(data);
});
