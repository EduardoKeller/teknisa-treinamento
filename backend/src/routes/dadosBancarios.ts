import { Router } from "express";
import { supabase } from "../supabaseClient";
import { autenticar } from "../middleware/auth";

export const dadosBancariosRouter = Router();
dadosBancariosRouter.use(autenticar);

dadosBancariosRouter.get("/", async (req, res) => {
  const usuario = req.usuario!;
  const { data, error } = await supabase
    .from("dados_bancarios")
    .select("*")
    .eq("usuario_id", usuario.id)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

dadosBancariosRouter.put("/", async (req, res) => {
  const usuario = req.usuario!;
  const { cpf, banco_nome, banco_numero, agencia, conta_corrente } = req.body;
  if (!cpf || !banco_nome || !banco_numero || !agencia || !conta_corrente) {
    res.status(400).json({ error: "cpf, banco_nome, banco_numero, agencia e conta_corrente são obrigatórios" });
    return;
  }
  const { data, error } = await supabase
    .from("dados_bancarios")
    .upsert(
      { usuario_id: usuario.id, cpf, banco_nome, banco_numero, agencia, conta_corrente },
      { onConflict: "usuario_id" }
    )
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});
