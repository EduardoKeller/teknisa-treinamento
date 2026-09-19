import { Router } from "express";
import { supabase } from "../supabaseClient";
import { autenticar, autorizar } from "../middleware/auth";
import { Usuario } from "../types";

export const horasExtrasRouter = Router();
horasExtrasRouter.use(autenticar);

const SELECT_HE_COM_FUNCIONARIO = "*, funcionario:usuarios!usuario_id(nome)";

async function idsDaEquipe(gestorId: string): Promise<string[]> {
  const { data } = await supabase.from("usuarios").select("id").eq("gestor_id", gestorId);
  return (data ?? []).map((u) => u.id);
}

async function carregarHeComPermissao(heId: string, usuario: Usuario) {
  const { data: he, error } = await supabase
    .from("horas_extras")
    .select(SELECT_HE_COM_FUNCIONARIO)
    .eq("id", heId)
    .single();
  if (error || !he) return { he: null, permitido: false };

  if (usuario.perfil === "financeiro" || usuario.perfil === "admin") {
    return { he, permitido: true };
  }
  if (he.usuario_id === usuario.id || he.aprovador_id === usuario.id) {
    return { he, permitido: true };
  }
  if (usuario.perfil === "aprovador") {
    const { data: dono } = await supabase.from("usuarios").select("gestor_id").eq("id", he.usuario_id).single();
    if (dono?.gestor_id === usuario.id) return { he, permitido: true };
  }
  return { he, permitido: false };
}

function dataForaDoPeriodo(data: string, he: { periodo_inicio: string; periodo_fim: string }): boolean {
  return data < he.periodo_inicio || data > he.periodo_fim;
}

async function registrarHistorico(
  heId: string,
  usuarioId: string,
  statusAnterior: string,
  statusNovo: string,
  justificativa?: string
) {
  await supabase
    .from("he_historico")
    .insert({ horas_extras_id: heId, usuario_id: usuarioId, status_anterior: statusAnterior, status_novo: statusNovo, justificativa });
}

horasExtrasRouter.get("/", async (req, res) => {
  const usuario = req.usuario!;
  let query = supabase.from("horas_extras").select(SELECT_HE_COM_FUNCIONARIO).order("criado_em", { ascending: false });

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

horasExtrasRouter.post("/", async (req, res) => {
  const usuario = req.usuario!;
  const { periodo_inicio, periodo_fim } = req.body;

  if (!periodo_inicio || !periodo_fim) {
    res.status(400).json({ error: "periodo_inicio e periodo_fim são obrigatórios" });
    return;
  }

  const { data, error } = await supabase
    .from("horas_extras")
    .insert({ usuario_id: usuario.id, periodo_inicio, periodo_fim })
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

horasExtrasRouter.get("/:id", async (req, res) => {
  const usuario = req.usuario!;
  const { he, permitido } = await carregarHeComPermissao(req.params.id, usuario);
  if (!he) {
    res.status(404).json({ error: "Registro de horas extras não encontrado" });
    return;
  }
  if (!permitido) {
    res.status(403).json({ error: "Sem permissão para ver este registro" });
    return;
  }

  const [{ data: itens }, { data: historico }] = await Promise.all([
    supabase.from("he_itens").select("*").eq("horas_extras_id", he.id).order("data"),
    supabase.from("he_historico").select("*").eq("horas_extras_id", he.id).order("criado_em"),
  ]);

  res.json({ ...he, itens: itens ?? [], historico: historico ?? [] });
});

horasExtrasRouter.patch("/:id", async (req, res) => {
  const usuario = req.usuario!;
  const { he } = await carregarHeComPermissao(req.params.id, usuario);
  if (!he) {
    res.status(404).json({ error: "Registro de horas extras não encontrado" });
    return;
  }
  if (he.usuario_id !== usuario.id || he.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível editar o próprio registro enquanto estiver em rascunho" });
    return;
  }

  const { periodo_inicio, periodo_fim } = req.body;
  const { data, error } = await supabase
    .from("horas_extras")
    .update({ periodo_inicio, periodo_fim })
    .eq("id", he.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

horasExtrasRouter.post("/:id/itens", async (req, res) => {
  const usuario = req.usuario!;
  const { he } = await carregarHeComPermissao(req.params.id, usuario);
  if (!he || he.usuario_id !== usuario.id || he.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível adicionar itens ao próprio registro em rascunho" });
    return;
  }
  const { data: dataItem, quantidade_horas, justificativa } = req.body;
  if (!dataItem || !quantidade_horas) {
    res.status(400).json({ error: "data e quantidade_horas são obrigatórios" });
    return;
  }
  if (dataForaDoPeriodo(dataItem, he)) {
    res.status(400).json({
      error: `A data do item deve estar dentro do período informado (${he.periodo_inicio} a ${he.periodo_fim})`,
    });
    return;
  }
  const { data, error } = await supabase
    .from("he_itens")
    .insert({ horas_extras_id: he.id, data: dataItem, quantidade_horas, justificativa })
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

horasExtrasRouter.delete("/:id/itens/:itemId", async (req, res) => {
  const usuario = req.usuario!;
  const { he } = await carregarHeComPermissao(req.params.id, usuario);
  if (!he || he.usuario_id !== usuario.id || he.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível remover itens do próprio registro em rascunho" });
    return;
  }
  const { error } = await supabase.from("he_itens").delete().eq("id", req.params.itemId).eq("horas_extras_id", he.id);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).send();
});

horasExtrasRouter.post("/:id/enviar", async (req, res) => {
  const usuario = req.usuario!;
  const { he } = await carregarHeComPermissao(req.params.id, usuario);
  if (!he || he.usuario_id !== usuario.id || he.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível enviar o próprio registro em rascunho" });
    return;
  }

  const { count } = await supabase
    .from("he_itens")
    .select("*", { count: "exact", head: true })
    .eq("horas_extras_id", he.id);
  if (!count) {
    res.status(400).json({ error: "Adicione ao menos um item antes de enviar" });
    return;
  }

  const { data, error } = await supabase
    .from("horas_extras")
    .update({ status: "enviado", enviado_em: new Date().toISOString() })
    .eq("id", he.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(he.id, usuario.id, "rascunho", "enviado");
  res.json(data);
});

horasExtrasRouter.post("/:id/aprovar", autorizar("aprovador", "financeiro", "admin"), async (req, res) => {
  const usuario = req.usuario!;
  const { he, permitido } = await carregarHeComPermissao(String(req.params.id), usuario);
  if (!he || !permitido || he.status !== "enviado") {
    res.status(403).json({ error: "Registro não encontrado, sem permissão ou não está aguardando aprovação" });
    return;
  }

  const { data, error } = await supabase
    .from("horas_extras")
    .update({ status: "aprovado", aprovado_em: new Date().toISOString(), aprovador_id: usuario.id })
    .eq("id", he.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(he.id, usuario.id, "enviado", "aprovado");
  res.json(data);
});

horasExtrasRouter.post("/:id/reprovar", autorizar("aprovador", "financeiro", "admin"), async (req, res) => {
  const usuario = req.usuario!;
  const { he, permitido } = await carregarHeComPermissao(String(req.params.id), usuario);
  if (!he || !permitido || he.status !== "enviado") {
    res.status(403).json({ error: "Registro não encontrado, sem permissão ou não está aguardando aprovação" });
    return;
  }

  const { justificativa } = req.body;
  if (!justificativa) {
    res.status(400).json({ error: "Justificativa é obrigatória para reprovar" });
    return;
  }

  const { data, error } = await supabase
    .from("horas_extras")
    .update({ status: "reprovado", aprovador_id: usuario.id })
    .eq("id", he.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(he.id, usuario.id, "enviado", "reprovado", justificativa);
  res.json(data);
});

horasExtrasRouter.post("/:id/reabrir", async (req, res) => {
  const usuario = req.usuario!;
  const { he } = await carregarHeComPermissao(req.params.id, usuario);
  if (!he || he.usuario_id !== usuario.id || he.status !== "reprovado") {
    res.status(403).json({ error: "Só é possível reabrir o próprio registro quando reprovado" });
    return;
  }

  const { data, error } = await supabase
    .from("horas_extras")
    .update({ status: "rascunho" })
    .eq("id", he.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(he.id, usuario.id, "reprovado", "rascunho");
  res.json(data);
});

horasExtrasRouter.post("/:id/pagar", autorizar("financeiro", "admin"), async (req, res) => {
  const usuario = req.usuario!;
  const { data: he, error: heError } = await supabase.from("horas_extras").select("*").eq("id", req.params.id).single();
  if (heError || !he || he.status !== "aprovado") {
    res.status(403).json({ error: "Registro não encontrado ou não está aprovado" });
    return;
  }

  const { data, error } = await supabase
    .from("horas_extras")
    .update({ status: "pago", pago_em: new Date().toISOString() })
    .eq("id", he.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(he.id, usuario.id, "aprovado", "pago");
  res.json(data);
});
