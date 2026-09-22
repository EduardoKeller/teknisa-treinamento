"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetchClient } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { CentroCusto, Empresa } from "@/lib/types";

export default function NovoRdvPage() {
  const router = useRouter();
  const { showError } = useToast();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregandoEmpresas, setCarregandoEmpresas] = useState(true);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [carregandoCentros, setCarregandoCentros] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [empresaId, setEmpresaId] = useState("");
  const [centroCustoId, setCentroCustoId] = useState("");
  const [motivoViagem, setMotivoViagem] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [adiantamentoRecebido, setAdiantamentoRecebido] = useState("0");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const response = await apiFetchClient("/api/empresas");
      if (cancelado) return;
      if (response.ok) {
        const data: Empresa[] = await response.json();
        setEmpresas(data);
      }
      setCarregandoEmpresas(false);
    })();
    (async () => {
      const response = await apiFetchClient("/api/centros-custo");
      if (cancelado) return;
      if (response.ok) {
        const data: CentroCusto[] = await response.json();
        setCentrosCusto(data);
      }
      setCarregandoCentros(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!empresaId || !centroCustoId || !periodoInicio || !periodoFim) {
      setErro("Preencha empresa, centro de custo e o período da viagem.");
      return;
    }

    if (periodoFim < periodoInicio) {
      setErro("O fim do período não pode ser antes do início.");
      return;
    }

    setEnviando(true);
    const response = await apiFetchClient("/api/rdvs", {
      method: "POST",
      body: JSON.stringify({
        empresa_id: empresaId,
        centro_custo_id: centroCustoId,
        motivo_viagem: motivoViagem || null,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        adiantamento_recebido: Number(adiantamentoRecebido) || 0,
      }),
    });
    setEnviando(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const mensagem = data?.error ?? "Não foi possível criar o RDV.";
      setErro(mensagem);
      showError(mensagem);
      return;
    }

    const rdv = await response.json();
    router.push(`/rdvs/${rdv.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/rdvs" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          ← Meus RDVs
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">Novo RDV</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Preencha os dados da viagem para começar a adicionar despesas</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <label htmlFor="empresa" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Empresa
          </label>
          <select
            id="empresa"
            required
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            disabled={carregandoEmpresas}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none disabled:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:focus:border-gray-100 dark:disabled:bg-gray-800"
          >
            <option value="">{carregandoEmpresas ? "Carregando..." : "Selecione a empresa"}</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="centro_custo" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Centro de custo
          </label>
          <select
            id="centro_custo"
            required
            value={centroCustoId}
            onChange={(e) => setCentroCustoId(e.target.value)}
            disabled={carregandoCentros}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none disabled:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:focus:border-gray-100 dark:disabled:bg-gray-800"
          >
            <option value="">{carregandoCentros ? "Carregando..." : "Selecione o centro de custo"}</option>
            {centrosCusto.map((centro) => (
              <option key={centro.id} value={centro.id}>
                {centro.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="motivo" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Motivo da viagem
          </label>
          <textarea
            id="motivo"
            rows={3}
            value={motivoViagem}
            onChange={(e) => setMotivoViagem(e.target.value)}
            placeholder="Descreva o motivo da viagem"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:focus:border-gray-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="periodo_inicio" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Início
            </label>
            <input
              id="periodo_inicio"
              type="date"
              required
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:focus:border-gray-100"
            />
          </div>
          <div>
            <label htmlFor="periodo_fim" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fim
            </label>
            <input
              id="periodo_fim"
              type="date"
              required
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:focus:border-gray-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="adiantamento" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Adiantamento recebido (R$)
          </label>
          <input
            id="adiantamento"
            type="number"
            min="0"
            step="0.01"
            value={adiantamentoRecebido}
            onChange={(e) => setAdiantamentoRecebido(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:focus:border-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Deixe 0 se não recebeu adiantamento.</p>
        </div>

        {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {enviando ? "Criando..." : "Criar RDV"}
          </button>
          <Link href="/rdvs" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
