"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetchClient } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { Empresa } from "@/lib/types";

export default function AdminEmpresasPage() {
  const { showError, showSuccess } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);

  const carregar = async () => {
    const response = await apiFetchClient("/api/empresas?todas=true");
    if (response.ok) setEmpresas(await response.json());
    setCarregando(false);
  };

  useEffect(() => {
    (async () => {
      await carregar();
    })();
  }, []);

  async function criarEmpresa(event: FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      showError("Informe o nome da empresa.");
      return;
    }
    setCriando(true);
    const response = await apiFetchClient("/api/empresas", { method: "POST", body: JSON.stringify({ nome }) });
    setCriando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível criar a empresa.");
      return;
    }
    setNome("");
    showSuccess("Empresa criada com sucesso.");
    await carregar();
  }

  async function alternarAtiva(empresa: Empresa) {
    const response = await apiFetchClient(`/api/empresas/${empresa.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ativa: !empresa.ativa }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível atualizar a empresa.");
      return;
    }
    await carregar();
  }

  if (carregando) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>;
  }

  return (
    <div>
      <form onSubmit={criarEmpresa} className="mb-6 flex gap-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
        <input
          type="text"
          placeholder="Nome da empresa"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
        />
        <button
          type="submit"
          disabled={criando}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
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
            {empresas.map((empresa) => (
              <tr key={empresa.id}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{empresa.nome}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      empresa.ativa
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {empresa.ativa ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => alternarAtiva(empresa)}
                    className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {empresa.ativa ? "Desativar" : "Ativar"}
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
