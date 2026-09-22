"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetchClient } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { CentroCusto } from "@/lib/types";

export default function AdminCentrosCustoPage() {
  const { showError, showSuccess } = useToast();
  const [centros, setCentros] = useState<CentroCusto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);

  const carregar = async () => {
    const response = await apiFetchClient("/api/centros-custo?todas=true");
    if (response.ok) setCentros(await response.json());
    setCarregando(false);
  };

  useEffect(() => {
    (async () => {
      await carregar();
    })();
  }, []);

  async function criarCentro(event: FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      showError("Informe o nome do centro de custo.");
      return;
    }
    setCriando(true);
    const response = await apiFetchClient("/api/centros-custo", { method: "POST", body: JSON.stringify({ nome }) });
    setCriando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível criar o centro de custo.");
      return;
    }
    setNome("");
    showSuccess("Centro de custo criado com sucesso.");
    await carregar();
  }

  async function alternarAtivo(centro: CentroCusto) {
    const response = await apiFetchClient(`/api/centros-custo/${centro.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: !centro.ativo }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível atualizar o centro de custo.");
      return;
    }
    await carregar();
  }

  if (carregando) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>;
  }

  return (
    <div>
      <form onSubmit={criarCentro} className="mb-6 flex gap-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
        <input
          type="text"
          placeholder="Nome do centro de custo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
        />
        <button
          type="submit"
          disabled={criando}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          {criando ? "Criando..." : "Adicionar"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {centros.map((centro) => (
              <tr key={centro.id}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{centro.nome}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      centro.ativo
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {centro.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => alternarAtivo(centro)}
                    className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {centro.ativo ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
