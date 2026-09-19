import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { extname } from "path";
import { supabase } from "../supabaseClient";
import { autenticar, autorizar } from "../middleware/auth";
import { Usuario } from "../types";

const EXTENSOES_POR_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

function gerarNomeArquivoSeguro(originalname: string, mimetype: string): string {
  const extensaoOriginal = extname(originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const extensao = /^\.[a-z0-9]+$/.test(extensaoOriginal) ? extensaoOriginal : EXTENSOES_POR_MIME[mimetype] ?? "";
  return `${Date.now()}-${randomUUID()}${extensao}`;
}

export const rdvsRouter = Router();
rdvsRouter.use(autenticar);

const TIPOS_COMPROVANTE_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const uploadComprovante = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_COMPROVANTE_PERMITIDOS.includes(file.mimetype)) {
      cb(new Error("Tipo de arquivo não suportado. Envie uma imagem (JPEG/PNG/WEBP) ou PDF."));
      return;
    }
    cb(null, true);
  },
});

async function idsDaEquipe(gestorId: string): Promise<string[]> {
  const { data } = await supabase.from("usuarios").select("id").eq("gestor_id", gestorId);
  return (data ?? []).map((u) => u.id);
}

const SELECT_RDV_COM_FUNCIONARIO =
  "*, empresas(nome), funcionario:usuarios!usuario_id(nome), centro_custo:centros_custo(nome)";

async function carregarRdvComPermissao(rdvId: string, usuario: Usuario) {
  const { data: rdv, error } = await supabase
    .from("rdv")
    .select(SELECT_RDV_COM_FUNCIONARIO)
    .eq("id", rdvId)
    .single();
  if (error || !rdv) return { rdv: null, permitido: false };

  if (usuario.perfil === "financeiro" || usuario.perfil === "admin") {
    return { rdv, permitido: true };
  }
  if (rdv.usuario_id === usuario.id || rdv.aprovador_id === usuario.id) {
    return { rdv, permitido: true };
  }
  if (usuario.perfil === "aprovador") {
    const { data: dono } = await supabase.from("usuarios").select("gestor_id").eq("id", rdv.usuario_id).single();
    if (dono?.gestor_id === usuario.id) return { rdv, permitido: true };
  }
  return { rdv, permitido: false };
}

async function registrarHistorico(
  rdvId: string,
  usuarioId: string,
  statusAnterior: string,
  statusNovo: string,
  justificativa?: string
) {
  await supabase
    .from("historico_status")
    .insert({ rdv_id: rdvId, usuario_id: usuarioId, status_anterior: statusAnterior, status_novo: statusNovo, justificativa });
}

rdvsRouter.get("/", async (req, res) => {
  const usuario = req.usuario!;
  let query = supabase.from("rdv").select(SELECT_RDV_COM_FUNCIONARIO).order("criado_em", { ascending: false });

  if (usuario.perfil === "funcionario") {
    query = query.eq("usuario_id", usuario.id);
  } else if (usuario.perfil === "aprovador") {
    const equipe = await idsDaEquipe(usuario.id);
    query = query.in("usuario_id", [...equipe, usuario.id]);
  }

  const { status, empresa_id, usuario_id } = req.query;
  if (status) query = query.eq("status", status as string);
  if (empresa_id) query = query.eq("empresa_id", empresa_id as string);
  if (usuario_id && usuario.perfil !== "funcionario") query = query.eq("usuario_id", usuario_id as string);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

rdvsRouter.post("/", async (req, res) => {
  const usuario = req.usuario!;
  const { empresa_id, centro_custo_id, motivo_viagem, periodo_inicio, periodo_fim, adiantamento_recebido } = req.body;

  if (!empresa_id || !centro_custo_id || !periodo_inicio || !periodo_fim) {
    res.status(400).json({ error: "empresa_id, centro_custo_id, periodo_inicio e periodo_fim são obrigatórios" });
    return;
  }

  const { data, error } = await supabase
    .from("rdv")
    .insert({
      usuario_id: usuario.id,
      empresa_id,
      centro_custo_id,
      motivo_viagem,
      periodo_inicio,
      periodo_fim,
      adiantamento_recebido: adiantamento_recebido ?? 0,
    })
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

rdvsRouter.get("/:id", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv, permitido } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv) {
    res.status(404).json({ error: "RDV não encontrado" });
    return;
  }
  if (!permitido) {
    res.status(403).json({ error: "Sem permissão para ver este RDV" });
    return;
  }

  const [{ data: itensDespesa }, { data: itensKm }, { data: historico }] = await Promise.all([
    supabase.from("itens_despesa").select("*, categorias_despesa(nome)").eq("rdv_id", rdv.id).order("data_gasto"),
    supabase.from("itens_quilometragem").select("*").eq("rdv_id", rdv.id).order("data"),
    supabase.from("historico_status").select("*").eq("rdv_id", rdv.id).order("criado_em"),
  ]);

  res.json({ ...rdv, itens_despesa: itensDespesa ?? [], itens_quilometragem: itensKm ?? [], historico_status: historico ?? [] });
});

rdvsRouter.patch("/:id", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv) {
    res.status(404).json({ error: "RDV não encontrado" });
    return;
  }
  if (rdv.usuario_id !== usuario.id || rdv.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível editar o próprio RDV enquanto estiver em rascunho" });
    return;
  }

  const { empresa_id, centro_custo_id, motivo_viagem, periodo_inicio, periodo_fim, adiantamento_recebido } = req.body;
  const { data, error } = await supabase
    .from("rdv")
    .update({ empresa_id, centro_custo_id, motivo_viagem, periodo_inicio, periodo_fim, adiantamento_recebido })
    .eq("id", rdv.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

rdvsRouter.post("/:id/itens-despesa", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv || rdv.usuario_id !== usuario.id || rdv.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível adicionar itens ao próprio RDV em rascunho" });
    return;
  }
  const { categoria_id, descricao, valor, data_gasto, comprovante_url } = req.body;
  if (!categoria_id || !valor || !data_gasto) {
    res.status(400).json({ error: "categoria_id, valor e data_gasto são obrigatórios" });
    return;
  }
  const { data, error } = await supabase
    .from("itens_despesa")
    .insert({ rdv_id: rdv.id, categoria_id, descricao, valor, data_gasto, comprovante_url })
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

rdvsRouter.patch("/:id/itens-despesa/:itemId", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv || rdv.usuario_id !== usuario.id || rdv.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível editar itens do próprio RDV em rascunho" });
    return;
  }
  const { categoria_id, descricao, valor, data_gasto, comprovante_url } = req.body;
  const { data, error } = await supabase
    .from("itens_despesa")
    .update({ categoria_id, descricao, valor, data_gasto, comprovante_url })
    .eq("id", req.params.itemId)
    .eq("rdv_id", rdv.id)
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

rdvsRouter.delete("/:id/itens-despesa/:itemId", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv || rdv.usuario_id !== usuario.id || rdv.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível remover itens do próprio RDV em rascunho" });
    return;
  }
  const { error } = await supabase.from("itens_despesa").delete().eq("id", req.params.itemId).eq("rdv_id", rdv.id);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).send();
});

async function buscarItemDespesa(rdvId: string, itemId: string) {
  const { data, error } = await supabase
    .from("itens_despesa")
    .select("*")
    .eq("id", itemId)
    .eq("rdv_id", rdvId)
    .single();
  if (error || !data) return null;
  return data;
}

rdvsRouter.post(
  "/:id/itens-despesa/:itemId/comprovante",
  uploadComprovante.single("arquivo"),
  async (req, res) => {
    const usuario = req.usuario!;
    const { rdv } = await carregarRdvComPermissao(String(req.params.id), usuario);
    if (!rdv || rdv.usuario_id !== usuario.id || rdv.status !== "rascunho") {
      res.status(403).json({ error: "Só é possível anexar comprovante ao próprio RDV em rascunho" });
      return;
    }

    const item = await buscarItemDespesa(rdv.id, String(req.params.itemId));
    if (!item) {
      res.status(404).json({ error: "Item de despesa não encontrado" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Envie um arquivo no campo 'arquivo'" });
      return;
    }

    const nomeArquivo = gerarNomeArquivoSeguro(req.file.originalname, req.file.mimetype);
    const caminho = `${rdv.id}/${item.id}/${nomeArquivo}`;
    const { error: uploadError } = await supabase.storage
      .from("comprovantes")
      .upload(caminho, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) {
      res.status(400).json({ error: uploadError.message });
      return;
    }

    if (item.comprovante_url) {
      await supabase.storage.from("comprovantes").remove([item.comprovante_url]);
    }

    const { data, error } = await supabase
      .from("itens_despesa")
      .update({ comprovante_url: caminho })
      .eq("id", item.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  }
);

rdvsRouter.get("/:id/itens-despesa/:itemId/comprovante", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv, permitido } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv || !permitido) {
    res.status(403).json({ error: "Sem permissão para ver este comprovante" });
    return;
  }

  const item = await buscarItemDespesa(rdv.id, req.params.itemId);
  if (!item || !item.comprovante_url) {
    res.status(404).json({ error: "Comprovante não encontrado" });
    return;
  }

  const { data, error } = await supabase.storage
    .from("comprovantes")
    .createSignedUrl(item.comprovante_url, 60);

  if (error || !data) {
    res.status(400).json({ error: error?.message ?? "Erro ao gerar link do comprovante" });
    return;
  }

  res.json({ url: data.signedUrl, expiraEm: 60 });
});

rdvsRouter.delete("/:id/itens-despesa/:itemId/comprovante", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv || rdv.usuario_id !== usuario.id || rdv.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível remover comprovante do próprio RDV em rascunho" });
    return;
  }

  const item = await buscarItemDespesa(rdv.id, req.params.itemId);
  if (!item || !item.comprovante_url) {
    res.status(404).json({ error: "Comprovante não encontrado" });
    return;
  }

  await supabase.storage.from("comprovantes").remove([item.comprovante_url]);

  const { data, error } = await supabase
    .from("itens_despesa")
    .update({ comprovante_url: null })
    .eq("id", item.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

rdvsRouter.post("/:id/itens-km", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv || rdv.usuario_id !== usuario.id || rdv.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível adicionar km ao próprio RDV em rascunho" });
    return;
  }
  const { data: dataGasto, trajeto, km, valor_km } = req.body;
  if (!dataGasto || !trajeto || !km || !valor_km) {
    res.status(400).json({ error: "data, trajeto, km e valor_km são obrigatórios" });
    return;
  }
  const { data, error } = await supabase
    .from("itens_quilometragem")
    .insert({ rdv_id: rdv.id, data: dataGasto, trajeto, km, valor_km })
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

rdvsRouter.delete("/:id/itens-km/:itemId", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv || rdv.usuario_id !== usuario.id || rdv.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível remover km do próprio RDV em rascunho" });
    return;
  }
  const { error } = await supabase.from("itens_quilometragem").delete().eq("id", req.params.itemId).eq("rdv_id", rdv.id);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).send();
});

// RF20: confirmação de CPF ao enviar
rdvsRouter.post("/:id/enviar", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv || rdv.usuario_id !== usuario.id || rdv.status !== "rascunho") {
    res.status(403).json({ error: "Só é possível enviar o próprio RDV em rascunho" });
    return;
  }

  const { cpf } = req.body;
  if (!cpf) {
    res.status(400).json({ error: "Confirmação de CPF é obrigatória para enviar o RDV" });
    return;
  }

  const { data: dadosBancarios } = await supabase
    .from("dados_bancarios")
    .select("cpf")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (!dadosBancarios) {
    res.status(400).json({ error: "Cadastre seus dados bancários (incluindo CPF) antes de enviar um RDV" });
    return;
  }

  if (dadosBancarios.cpf.replace(/\D/g, "") !== String(cpf).replace(/\D/g, "")) {
    res.status(400).json({ error: "CPF não confere com o cadastrado" });
    return;
  }

  const { data, error } = await supabase
    .from("rdv")
    .update({ status: "enviado", enviado_em: new Date().toISOString() })
    .eq("id", rdv.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(rdv.id, usuario.id, "rascunho", "enviado");
  res.json(data);
});

rdvsRouter.post("/:id/aprovar", autorizar("aprovador", "financeiro", "admin"), async (req, res) => {
  const usuario = req.usuario!;
  const { rdv, permitido } = await carregarRdvComPermissao(String(req.params.id), usuario);
  if (!rdv || !permitido || rdv.status !== "enviado") {
    res.status(403).json({ error: "RDV não encontrado, sem permissão ou não está aguardando aprovação" });
    return;
  }

  const { data, error } = await supabase
    .from("rdv")
    .update({ status: "aprovado", aprovado_em: new Date().toISOString(), aprovador_id: usuario.id })
    .eq("id", rdv.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(rdv.id, usuario.id, "enviado", "aprovado");
  res.json(data);
});

rdvsRouter.post("/:id/reprovar", autorizar("aprovador", "financeiro", "admin"), async (req, res) => {
  const usuario = req.usuario!;
  const { rdv, permitido } = await carregarRdvComPermissao(String(req.params.id), usuario);
  if (!rdv || !permitido || rdv.status !== "enviado") {
    res.status(403).json({ error: "RDV não encontrado, sem permissão ou não está aguardando aprovação" });
    return;
  }

  const { justificativa } = req.body;
  if (!justificativa) {
    res.status(400).json({ error: "Justificativa é obrigatória para reprovar" });
    return;
  }

  const { data, error } = await supabase
    .from("rdv")
    .update({ status: "reprovado", aprovador_id: usuario.id })
    .eq("id", rdv.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(rdv.id, usuario.id, "enviado", "reprovado", justificativa);
  res.json(data);
});

rdvsRouter.post("/:id/reabrir", async (req, res) => {
  const usuario = req.usuario!;
  const { rdv } = await carregarRdvComPermissao(req.params.id, usuario);
  if (!rdv || rdv.usuario_id !== usuario.id || rdv.status !== "reprovado") {
    res.status(403).json({ error: "Só é possível reabrir o próprio RDV quando reprovado" });
    return;
  }

  const { data, error } = await supabase.from("rdv").update({ status: "rascunho" }).eq("id", rdv.id).select().single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(rdv.id, usuario.id, "reprovado", "rascunho");
  res.json(data);
});

rdvsRouter.post("/:id/pagar", autorizar("financeiro", "admin"), async (req, res) => {
  const usuario = req.usuario!;
  const { data: rdv, error: rdvError } = await supabase.from("rdv").select("*").eq("id", req.params.id).single();
  if (rdvError || !rdv || rdv.status !== "aprovado") {
    res.status(403).json({ error: "RDV não encontrado ou não está aprovado" });
    return;
  }

  const { data, error } = await supabase
    .from("rdv")
    .update({ status: "pago", pago_em: new Date().toISOString() })
    .eq("id", rdv.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  await registrarHistorico(rdv.id, usuario.id, "aprovado", "pago");
  res.json(data);
});
