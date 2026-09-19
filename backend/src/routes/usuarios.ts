import { Router } from "express";
import { supabase } from "../supabaseClient";
import { autenticar, autorizar } from "../middleware/auth";

export const usuariosRouter = Router();
usuariosRouter.use(autenticar);

usuariosRouter.get("/me", async (req, res) => {
  res.json(req.usuario);
});

usuariosRouter.get("/", autorizar("financeiro", "admin"), async (_req, res) => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*, gestor:usuarios!gestor_id(nome)")
    .order("nome");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

usuariosRouter.post("/", autorizar("admin"), async (req, res) => {
  const { nome, email, perfil, gestor_id, senha } = req.body;
  if (!nome || !email || !perfil || !senha) {
    res.status(400).json({ error: "nome, email, perfil e senha são obrigatórios" });
    return;
  }

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    res.status(400).json({ error: authError?.message ?? "Erro ao criar usuário" });
    return;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .insert({ id: authUser.user.id, nome, email, perfil, gestor_id: gestor_id ?? null })
    .select()
    .single();

  if (error) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

usuariosRouter.patch("/:id", autorizar("admin"), async (req, res) => {
  const { nome, perfil, gestor_id, ativo } = req.body;
  const { data, error } = await supabase
    .from("usuarios")
    .update({ nome, perfil, gestor_id, ativo })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});
