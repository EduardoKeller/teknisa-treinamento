"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function resolverEmail(valor: string): Promise<string | null> {
    if (valor.includes("@")) return valor;

    const response = await fetch(`${API_URL}/api/usuarios/resolver-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: valor }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.email as string;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setMensagem(null);
    setCarregando(true);

    const email = await resolverEmail(identificador.trim());
    if (!email) {
      setCarregando(false);
      setErro("E-mail/login ou senha inválidos.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    setCarregando(false);

    if (error) {
      setErro("E-mail/login ou senha inválidos.");
      return;
    }

    router.push("/rdvs");
    router.refresh();
  }

  async function handleEsqueciSenha() {
    setErro(null);
    setMensagem(null);

    const email = await resolverEmail(identificador.trim());
    if (!email) {
      setErro("Informe seu e-mail ou login para receber o link de redefinição.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setErro("Não foi possível enviar o e-mail de redefinição.");
      return;
    }

    setMensagem("Enviamos um link de redefinição de senha para o seu e-mail.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-100">Sistema de RDV</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Entre com seu e-mail ou login</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identificador" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              E-mail ou login
            </label>
            <input
              id="identificador"
              type="text"
              autoComplete="username"
              required
              value={identificador}
              onChange={(event) => setIdentificador(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:focus:border-gray-100"
              placeholder="voce@empresa.com ou seu.login"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:focus:border-gray-100"
              placeholder="••••••••"
            />
          </div>

          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
          {mensagem && <p className="text-sm text-green-600 dark:text-green-400">{mensagem}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleEsqueciSenha}
          className="mt-4 text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Esqueci minha senha
        </button>
      </div>
    </div>
  );
}
