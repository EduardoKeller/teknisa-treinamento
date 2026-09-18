export type Perfil = "funcionario" | "aprovador" | "financeiro" | "admin";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  gestor_id: string | null;
  ativo: boolean;
}
