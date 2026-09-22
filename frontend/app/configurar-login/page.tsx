"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/api-client";
import { UsuarioAtual } from "@/lib/types";

const LOGIN_REGEX = /^[a-z0-9._]{3,20}$/;

export default function ConfigurarLoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioAtual | null>(null);
  const [login, setLogin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const response = await apiFetchClient("/api/usuarios/me");
      if (!response.ok) {
        router.push("/login");
        return;
      }
      const dados: UsuarioAtual = await response.json();
      if (dados.login) {
        router.push("/rdvs");
        return;
      }
      setUsuario(dados);
      setCarregando(false);
    })();
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    const valor = login.trim().toLowerCase();
    if (!LOGIN_REGEX.test(valor)) {
      setErro("Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou underline.");
      return;
    }

    setSalvando(true);
    const response = await apiFetchClient("/api/usuarios/me/login", {
      method: "PATCH",
      body: JSON.stringify({ login: valor }),
    });
    setSalvando(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setErro(data?.error ?? "Não foi possível salvar o login.");
      return;
    }

    router.push("/rdvs");
    router.refresh();
  }

  if (carregando || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-100">Escolha seu login</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Olá, {usuario.nome.split(" ")[0]}! Crie um login para entrar mais rápido da próxima vez, sem digitar o
          e-mail inteiro.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Login
            </label>
            <input
              id="login"
              type="text"
              autoComplete="username"
              required
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:focus:border-gray-100"
              placeholder="ex.: eduardo.keller"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Letras minúsculas, números, ponto ou underline.</p>
          </div>

          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {salvando ? "Salvando..." : "Salvar e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
