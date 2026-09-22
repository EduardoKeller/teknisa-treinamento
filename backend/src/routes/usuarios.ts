import { Router } from "express";
import { supabase } from "../supabaseClient";
import { autenticar, autorizar } from "../middleware/auth";

export const usuariosRouter = Router();

const LOGIN_REGEX = /^[a-z0-9._]{3,20}$/;

usuariosRouter.post("/resolver-login", async (req, res) => {
  const { login } = req.body;
  if (typeof login !== "string" || !login) {
    res.status(400).json({ error: "Informe o login." });
    return;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("email")
    .eq("ativo", true)
    .eq("login", login.trim().toLowerCase())
    .maybeSingle();

  if (error || !data) {
    res.status(404).json({ error: "Login ou senha inválidos." });
    return;
  }

  res.json({ email: data.email });
});

usuariosRouter.use(autenticar);

usuariosRouter.get("/me", async (req, res) => {
  res.json(req.usuario);
});

usuariosRouter.patch("/me/login", async (req, res) => {
  if (req.usuario!.login) {
    res.status(400).json({ error: "Seu login já foi configurado." });
    return;
  }

  const login = typeof req.body.login === "string" ? req.body.login.trim().toLowerCase() : "";
  if (!LOGIN_REGEX.test(login)) {
    res.status(400).json({
      error: "O login deve ter de 3 a 20 caracteres, usando apenas letras minúsculas, números, ponto ou underline.",
    });
    return;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .update({ login })
    .eq("id", req.usuario!.id)
    .select("id, nome, email, perfil, gestor_id, ativo, login")
    .single();

  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "Esse login já está em uso." });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  res.json(data);
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

  const login = typeof req.body.login === "string" ? req.body.login.trim().toLowerCase() : null;
  if (login && !LOGIN_REGEX.test(login)) {
    res.status(400).json({
      error: "O login deve ter de 3 a 20 caracteres, usando apenas letras minúsculas, números, ponto ou underline.",
    });
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
    .insert({ id: authUser.user.id, nome, email, perfil, gestor_id: gestor_id ?? null, login })
    .select()
    .single();

  if (error) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    if (error.code === "23505") {
      res.status(409).json({ error: "Esse login já está em uso." });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

usuariosRouter.patch("/:id", autorizar("admin"), async (req, res) => {
  const { nome, perfil, gestor_id, ativo } = req.body;

  const login = typeof req.body.login === "string" ? req.body.login.trim().toLowerCase() : null;
  if (login && !LOGIN_REGEX.test(login)) {
    res.status(400).json({
      error: "O login deve ter de 3 a 20 caracteres, usando apenas letras minúsculas, números, ponto ou underline.",
    });
    return;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .update({ nome, perfil, gestor_id, ativo, login })
    .eq("id", req.params.id)
    .select("id, nome, email, perfil, gestor_id, ativo, login")
    .single();
  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "Esse login já está em uso." });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});
