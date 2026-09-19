import { Router } from "express";
import { supabase } from "../supabaseClient";
import { autenticar, autorizar } from "../middleware/auth";

export const empresasRouter = Router();
empresasRouter.use(autenticar);

empresasRouter.get("/", async (req, res) => {
  const incluirInativas = req.query.todas === "true" && req.usuario?.perfil === "admin";
  let query = supabase.from("empresas").select("*").order("nome");
  if (!incluirInativas) query = query.eq("ativa", true);
  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

empresasRouter.post("/", autorizar("admin"), async (req, res) => {
  const { nome } = req.body;
  if (!nome) {
    res.status(400).json({ error: "nome é obrigatório" });
    return;
  }
  const { data, error } = await supabase.from("empresas").insert({ nome }).select().single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

empresasRouter.patch("/:id", autorizar("admin"), async (req, res) => {
  const { nome, ativa } = req.body;
  const { data, error } = await supabase
    .from("empresas")
    .update({ nome, ativa })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});
