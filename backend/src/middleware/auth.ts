import { Request, Response, NextFunction } from "express";
import { supabase } from "../supabaseClient";
import { Perfil, Usuario } from "../types";

declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario;
    }
  }
}

export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Token ausente" });
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: "Token inválido" });
    return;
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, gestor_id, ativo")
    .eq("id", authData.user.id)
    .single();

  if (usuarioError || !usuario) {
    res.status(403).json({ error: "Usuário não cadastrado no sistema" });
    return;
  }

  if (!usuario.ativo) {
    res.status(403).json({ error: "Usuário inativo" });
    return;
  }

  req.usuario = usuario as Usuario;
  next();
}

export function autorizar(...perfis: Perfil[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      res.status(403).json({ error: "Sem permissão para esta ação" });
      return;
    }
    next();
  };
}
