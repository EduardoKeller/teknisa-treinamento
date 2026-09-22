"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetchClient } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { Perfil, PERFIL_LABEL, UsuarioAdmin } from "@/lib/types";

const PERFIS: Perfil[] = ["funcionario", "aprovador", "financeiro", "admin"];

export default function AdminUsuariosPage() {
  const { showError, showSuccess } = useToast();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("funcionario");
  const [gestorId, setGestorId] = useState("");
  const [criando, setCriando] = useState(false);

  const carregar = async () => {
    const response = await apiFetchClient("/api/usuarios");
    if (response.ok) setUsuarios(await response.json());
    setCarregando(false);
  };

  useEffect(() => {
    (async () => {
      await carregar();
    })();
  }, []);

  async function criarUsuario(event: FormEvent) {
    event.preventDefault();
    if (!nome || !email || !senha) {
      showError("Preencha nome, e-mail e senha.");
      return;
    }
    setCriando(true);
    const response = await apiFetchClient("/api/usuarios", {
      method: "POST",
      body: JSON.stringify({ nome, email, senha, perfil, gestor_id: gestorId || null }),
    });
    setCriando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível criar o usuário.");
      return;
    }
    setNome("");
    setEmail("");
    setSenha("");
    setPerfil("funcionario");
    setGestorId("");
    showSuccess("Usuário criado com sucesso.");
    await carregar();
  }

  async function salvarEdicao(id: string, dados: { perfil: Perfil; gestor_id: string | null; ativo: boolean }) {
    const response = await apiFetchClient(`/api/usuarios/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dados),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível atualizar o usuário.");
      return;
    }
    setEditandoId(null);
    await carregar();
  }

  if (carregando) {
    return <p className="text-sm text-gray-500">Carregando...</p>;
  }

  return (
    <div>
      <form onSubmit={criarUsuario} autoComplete="off" className="mb-6 rounded-lg border border-dashed border-gray-300 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Novo usuário</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="text"
            name="novo-usuario-nome"
            autoComplete="off"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          />
          <input
            type="text"
            name="novo-usuario-email"
            autoComplete="off"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          />
          <input
            type="text"
            name="novo-usuario-senha"
            autoComplete="off"
            placeholder="Senha inicial"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          />
          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value as Perfil)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          >
            {PERFIS.map((p) => (
              <option key={p} value={p}>
                {PERFIL_LABEL[p]}
              </option>
            ))}
          </select>
          <select
            value={gestorId}
            onChange={(e) => setGestorId(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          >
            <option value="">Sem gestor</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={criando}
          className="mt-3 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {criando ? "Criando..." : "Criar usuário"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">E-mail</th>
              <th className="px-4 py-2">Perfil</th>
              <th className="px-4 py-2">Gestor</th>
              <th className="px-4 py-2">Ativo</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((usuario) =>
              editandoId === usuario.id ? (
                <LinhaEdicao
                  key={usuario.id}
                  usuario={usuario}
                  usuarios={usuarios}
                  onCancelar={() => setEditandoId(null)}
                  onSalvar={(dados) => salvarEdicao(usuario.id, dados)}
                />
              ) : (
                <tr key={usuario.id}>
                  <td className="px-4 py-2 text-gray-900">{usuario.nome}</td>
                  <td className="px-4 py-2 text-gray-600">{usuario.email}</td>
                  <td className="px-4 py-2 text-gray-600">{PERFIL_LABEL[usuario.perfil]}</td>
                  <td className="px-4 py-2 text-gray-600">{usuario.gestor?.nome ?? "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        usuario.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {usuario.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setEditandoId(usuario.id)}
                      className="text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinhaEdicao({
  usuario,
  usuarios,
  onCancelar,
  onSalvar,
}: {
  usuario: UsuarioAdmin;
  usuarios: UsuarioAdmin[];
  onCancelar: () => void;
  onSalvar: (dados: { perfil: Perfil; gestor_id: string | null; ativo: boolean }) => void;
}) {
  const [perfil, setPerfil] = useState<Perfil>(usuario.perfil);
  const [gestorId, setGestorId] = useState(usuario.gestor_id ?? "");
  const [ativo, setAtivo] = useState(usuario.ativo);

  return (
    <tr className="bg-gray-50">
      <td className="px-4 py-2 text-gray-900">{usuario.nome}</td>
      <td className="px-4 py-2 text-gray-600">{usuario.email}</td>
      <td className="px-4 py-2">
        <select
          value={perfil}
          onChange={(e) => setPerfil(e.target.value as Perfil)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
        >
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {PERFIL_LABEL[p]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <select
          value={gestorId}
          onChange={(e) => setGestorId(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
        >
          <option value="">Sem gestor</option>
          {usuarios
            .filter((u) => u.id !== usuario.id)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={() => onSalvar({ perfil, gestor_id: gestorId || null, ativo })}
          className="mr-2 text-xs text-green-700 underline hover:text-green-900"
        >
          Salvar
        </button>
        <button type="button" onClick={onCancelar} className="text-xs text-gray-500 underline hover:text-gray-700">
          Cancelar
        </button>
      </td>
    </tr>
  );
}
