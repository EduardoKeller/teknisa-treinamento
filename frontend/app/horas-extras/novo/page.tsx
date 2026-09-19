"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetchClient } from "@/lib/api-client";
import { useToast } from "@/components/toast";

export default function NovoRegistroHorasExtrasPage() {
  const router = useRouter();
  const { showError } = useToast();

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!periodoInicio || !periodoFim) {
      setErro("Preencha o período de referência.");
      return;
    }

    if (periodoFim < periodoInicio) {
      setErro("O fim do período não pode ser antes do início.");
      return;
    }

    setEnviando(true);
    const response = await apiFetchClient("/api/horas-extras", {
      method: "POST",
      body: JSON.stringify({ periodo_inicio: periodoInicio, periodo_fim: periodoFim }),
    });
    setEnviando(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const mensagem = data?.error ?? "Não foi possível criar o registro.";
      setErro(mensagem);
      showError(mensagem);
      return;
    }

    const he = await response.json();
    router.push(`/horas-extras/${he.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/horas-extras" className="text-sm text-gray-500 hover:text-gray-700">
          ← Minhas Horas Extras
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Novo registro de horas extras</h1>
        <p className="text-sm text-gray-500">Informe o período de referência para começar a lançar as horas</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="periodo_inicio" className="mb-1 block text-sm font-medium text-gray-700">
              Início
            </label>
            <input
              id="periodo_inicio"
              type="date"
              required
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="periodo_fim" className="mb-1 block text-sm font-medium text-gray-700">
              Fim
            </label>
            <input
              id="periodo_fim"
              type="date"
              required
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {enviando ? "Criando..." : "Criar registro"}
          </button>
          <Link href="/horas-extras" className="text-sm text-gray-500 hover:text-gray-700">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
