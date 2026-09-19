import { Router } from "express";
import { supabase } from "../supabaseClient";
import { autenticar, autorizar } from "../middleware/auth";

export const categoriasRouter = Router();
categoriasRouter.use(autenticar);

categoriasRouter.get("/", async (req, res) => {
  const incluirInativas = req.query.todas === "true" && req.usuario?.perfil === "admin";
  let query = supabase.from("categorias_despesa").select("*").order("nome");
  if (!incluirInativas) query = query.eq("ativa", true);
  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

categoriasRouter.post("/", autorizar("admin"), async (req, res) => {
  const { nome } = req.body;
  if (!nome) {
    res.status(400).json({ error: "nome é obrigatório" });
    return;
  }
  const { data, error } = await supabase.from("categorias_despesa").insert({ nome }).select().single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

categoriasRouter.patch("/:id", autorizar("admin"), async (req, res) => {
  const { nome, ativa } = req.body;
  const { data, error } = await supabase
    .from("categorias_despesa")
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
