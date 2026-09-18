"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setMensagem(null);
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }

    router.push("/rdvs");
    router.refresh();
  }

  async function handleEsqueciSenha() {
    setErro(null);
    setMensagem(null);

    if (!email) {
      setErro("Informe seu e-mail para receber o link de redefinição.");
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Sistema de RDV</h1>
        <p className="mb-6 text-sm text-gray-500">Entre com seu e-mail corporativo</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
              placeholder="voce@empresa.com"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {mensagem && <p className="text-sm text-green-600">{mensagem}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleEsqueciSenha}
          className="mt-4 text-sm text-gray-500 underline hover:text-gray-700"
        >
          Esqueci minha senha
        </button>
      </div>
    </div>
  );
}
