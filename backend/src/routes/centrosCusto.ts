import { Router } from "express";
import { supabase } from "../supabaseClient";
import { autenticar, autorizar } from "../middleware/auth";

export const centrosCustoRouter = Router();
centrosCustoRouter.use(autenticar);

centrosCustoRouter.get("/", async (req, res) => {
  const incluirInativos = req.query.todas === "true" && req.usuario?.perfil === "admin";
  let query = supabase.from("centros_custo").select("*").order("nome");
  if (!incluirInativos) query = query.eq("ativo", true);
  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

centrosCustoRouter.post("/", autorizar("admin"), async (req, res) => {
  const { nome } = req.body;
  if (!nome) {
    res.status(400).json({ error: "nome é obrigatório" });
    return;
  }
  const { data, error } = await supabase.from("centros_custo").insert({ nome }).select().single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

centrosCustoRouter.patch("/:id", autorizar("admin"), async (req, res) => {
  const { nome, ativo } = req.body;
  const { data, error } = await supabase
    .from("centros_custo")
    .update({ nome, ativo })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});
