"use client";

import { use, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetchClient } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import {
  CategoriaDespesa,
  RdvDetalhado,
  UsuarioAtual,
  STATUS_LABEL,
  STATUS_CLASS,
  formatarData,
  formatarValor,
} from "@/lib/types";

const PERFIS_APROVADORES = ["aprovador", "financeiro", "admin"];
const PERFIS_FINANCEIRO = ["financeiro", "admin"];

interface Props {
  params: Promise<{ id: string }>;
}

export default function DetalheRdvPage({ params }: Props) {
  const { id } = use(params);
  const { showError } = useToast();

  const [rdv, setRdv] = useState<RdvDetalhado | null>(null);
  const [categorias, setCategorias] = useState<CategoriaDespesa[]>([]);
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioAtual | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  const recarregar = useCallback(async () => {
    const response = await apiFetchClient(`/api/rdvs/${id}`);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const mensagem = data?.error ?? "Não foi possível carregar este RDV.";
      setErro(mensagem);
      showError(mensagem);
      setCarregando(false);
      return;
    }
    const dados = await response.json();
    setRdv(dados);
    setErro(null);
    setCarregando(false);
  }, [id, showError]);

  async function exportarPlanilha() {
    setExportando(true);
    try {
      const response = await apiFetchClient(`/api/rdvs/${id}/exportar`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        showError(data?.error ?? "Não foi possível exportar este RDV.");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const nomeArquivo = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1];
      link.download = nomeArquivo ?? "rdv.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => {
    recarregar();
    (async () => {
      const response = await apiFetchClient("/api/categorias-despesa");
      if (response.ok) setCategorias(await response.json());
    })();
    (async () => {
      const response = await apiFetchClient("/api/usuarios/me");
      if (response.ok) setUsuarioAtual(await response.json());
    })();
  }, [recarregar]);

  if (carregando) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-500 dark:text-gray-400">Carregando...</div>;
  }

  if (erro || !rdv) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">{erro ?? "RDV não encontrado."}</p>
        <Link href="/rdvs" className="mt-2 inline-block text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          ← Meus RDVs
        </Link>
      </div>
    );
  }

  const souDono = usuarioAtual?.id === rdv.usuario_id;
  const souAprovador = usuarioAtual ? PERFIS_APROVADORES.includes(usuarioAtual.perfil) : false;
  const souFinanceiro = usuarioAtual ? PERFIS_FINANCEIRO.includes(usuarioAtual.perfil) : false;
  const editavel = rdv.status === "rascunho" && souDono;

  const linkVoltaHref = souDono
    ? "/rdvs"
    : souFinanceiro && (rdv.status === "aprovado" || rdv.status === "pago")
      ? "/pagamentos"
      : "/aprovacoes";
  const linkVoltaLabel = souDono ? "← Meus RDVs" : linkVoltaHref === "/pagamentos" ? "← Pagamentos" : "← Aprovações";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={linkVoltaHref} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
        {linkVoltaLabel}
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{rdv.empresas?.nome ?? "RDV"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {!souDono && rdv.funcionario?.nome && `${rdv.funcionario.nome} · `}
            {rdv.centro_custo?.nome ?? "-"} · {formatarData(rdv.periodo_inicio)} – {formatarData(rdv.periodo_fim)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[rdv.status]}`}>
          {STATUS_LABEL[rdv.status]}
        </span>
      </div>

      {editavel ? (
        <InfoViagemEditavel rdv={rdv} onAtualizar={recarregar} />
      ) : (
        rdv.motivo_viagem && (
          <p className="mb-6 rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{rdv.motivo_viagem}</p>
        )
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResumoCard titulo="Total de despesas" valor={formatarValor(rdv.valor_total_despesas)} />
        {editavel ? (
          <AdiantamentoEditavel rdv={rdv} onAtualizar={recarregar} />
        ) : (
          <ResumoCard titulo="Adiantamento" valor={formatarValor(rdv.adiantamento_recebido)} />
        )}
        <ResumoCard titulo="Reembolso" valor={formatarValor(rdv.valor_reembolso)} destaque />
      </div>

      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={exportarPlanilha}
          disabled={exportando}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {exportando ? "Exportando..." : "Exportar planilha"}
        </button>
      </div>

      {souDono && <AcaoEnvio rdv={rdv} onAtualizar={recarregar} />}
      {!souDono && souAprovador && rdv.status === "enviado" && (
        <AcaoAprovacao rdv={rdv} onAtualizar={recarregar} />
      )}
      {!souDono && souFinanceiro && rdv.status === "aprovado" && (
        <AcaoPagamento rdv={rdv} onAtualizar={recarregar} />
      )}

      <SecaoItensDespesa
        rdvId={rdv.id}
        itens={rdv.itens_despesa}
        categorias={categorias}
        editavel={editavel}
        periodoInicio={rdv.periodo_inicio}
        periodoFim={rdv.periodo_fim}
        onAtualizar={recarregar}
      />

      <SecaoItensKm
        rdvId={rdv.id}
        itens={rdv.itens_quilometragem}
        editavel={editavel}
        periodoInicio={rdv.periodo_inicio}
        periodoFim={rdv.periodo_fim}
        onAtualizar={recarregar}
      />

      <SecaoHistorico historico={rdv.historico_status} />
    </div>
  );
}

function AcaoEnvio({ rdv, onAtualizar }: { rdv: RdvDetalhado; onAtualizar: () => Promise<void> }) {
  const { showError } = useToast();
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [cpf, setCpf] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    setErro(null);
    if (!cpf) {
      setErro("Informe seu CPF para confirmar o envio.");
      return;
    }
    setEnviando(true);
    const response = await apiFetchClient(`/api/rdvs/${rdv.id}/enviar`, {
      method: "POST",
      body: JSON.stringify({ cpf }),
    });
    setEnviando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const mensagem = data?.error ?? "Não foi possível enviar o RDV.";
      setErro(mensagem);
      showError(mensagem);
      return;
    }
    setMostrarConfirmacao(false);
    setCpf("");
    await onAtualizar();
  }

  async function reabrir() {
    setReabrindo(true);
    const response = await apiFetchClient(`/api/rdvs/${rdv.id}/reabrir`, { method: "POST" });
    setReabrindo(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível reabrir o RDV.");
      return;
    }
    await onAtualizar();
  }

  if (rdv.status === "reprovado") {
    const ultimaReprovacao = [...rdv.historico_status].reverse().find((h) => h.status_novo === "reprovado");
    return (
      <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">Este RDV foi reprovado</p>
        {ultimaReprovacao?.justificativa && (
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{ultimaReprovacao.justificativa}</p>
        )}
        <button
          type="button"
          onClick={reabrir}
          disabled={reabrindo}
          className="mt-3 rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-900 disabled:opacity-60 dark:bg-red-700 dark:hover:bg-red-600"
        >
          {reabrindo ? "Reabrindo..." : "Corrigir e reenviar"}
        </button>
      </div>
    );
  }

  if (rdv.status !== "rascunho") {
    return null;
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {!mostrarConfirmacao ? (
        <button
          type="button"
          onClick={() => setMostrarConfirmacao(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          Enviar para aprovação
        </button>
      ) : (
        <div>
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            Confirme seu CPF cadastrado para enviar este RDV para aprovação.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
            >
              {enviando ? "Enviando..." : "Confirmar envio"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarConfirmacao(false);
                setErro(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Cancelar
            </button>
          </div>
          {erro && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {erro}
              {erro.includes("dados bancários") && (
                <>
                  {" "}
                  <Link href="/perfil" className="underline">
                    Cadastrar agora
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AcaoAprovacao({ rdv, onAtualizar }: { rdv: RdvDetalhado; onAtualizar: () => Promise<void> }) {
  const { showError } = useToast();
  const [mostrarReprovacao, setMostrarReprovacao] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [processando, setProcessando] = useState(false);

  async function aprovar() {
    setProcessando(true);
    const response = await apiFetchClient(`/api/rdvs/${rdv.id}/aprovar`, { method: "POST" });
    setProcessando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível aprovar o RDV.");
      return;
    }
    await onAtualizar();
  }

  async function reprovar() {
    if (!justificativa.trim()) {
      showError("Informe uma justificativa para reprovar.");
      return;
    }
    setProcessando(true);
    const response = await apiFetchClient(`/api/rdvs/${rdv.id}/reprovar`, {
      method: "POST",
      body: JSON.stringify({ justificativa }),
    });
    setProcessando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível reprovar o RDV.");
      return;
    }
    setMostrarReprovacao(false);
    setJustificativa("");
    await onAtualizar();
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {!mostrarReprovacao ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={aprovar}
            disabled={processando}
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-60 dark:bg-green-600 dark:hover:bg-green-500"
          >
            {processando ? "Aprovando..." : "Aprovar"}
          </button>
          <button
            type="button"
            onClick={() => setMostrarReprovacao(true)}
            disabled={processando}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            Reprovar
          </button>
        </div>
      ) : (
        <div>
          <label htmlFor="justificativa" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Justificativa da reprovação
          </label>
          <textarea
            id="justificativa"
            rows={3}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Explique o motivo da reprovação"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={reprovar}
              disabled={processando}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
            >
              {processando ? "Reprovando..." : "Confirmar reprovação"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarReprovacao(false);
                setJustificativa("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AcaoPagamento({ rdv, onAtualizar }: { rdv: RdvDetalhado; onAtualizar: () => Promise<void> }) {
  const { showError } = useToast();
  const [processando, setProcessando] = useState(false);

  async function pagar() {
    setProcessando(true);
    const response = await apiFetchClient(`/api/rdvs/${rdv.id}/pagar`, { method: "POST" });
    setProcessando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível marcar o RDV como pago.");
      return;
    }
    await onAtualizar();
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
        RDV aprovado. Confirme quando o reembolso de {formatarValor(rdv.valor_reembolso)} for depositado.
      </p>
      <button
        type="button"
        onClick={pagar}
        disabled={processando}
        className="rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-800 disabled:opacity-60 dark:bg-purple-600 dark:hover:bg-purple-500"
      >
        {processando ? "Registrando..." : "Marcar como pago"}
      </button>
    </div>
  );
}

function SecaoHistorico({ historico }: { historico: RdvDetalhado["historico_status"] }) {
  if (historico.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Histórico</h2>
      <ul className="space-y-2">
        {historico.map((item) => (
          <li key={item.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {item.status_anterior ? `${STATUS_LABEL[item.status_anterior]} → ` : ""}
              {STATUS_LABEL[item.status_novo]}
            </span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{formatarData(item.criado_em)}</span>
            {item.justificativa && <p className="mt-1 text-gray-600 dark:text-gray-400">{item.justificativa}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResumoCard({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{titulo}</p>
      <p className={`mt-1 text-lg font-semibold ${destaque ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>{valor}</p>
    </div>
  );
}

function AdiantamentoEditavel({
  rdv,
  onAtualizar,
}: {
  rdv: RdvDetalhado;
  onAtualizar: () => Promise<void>;
}) {
  const { showError } = useToast();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(rdv.adiantamento_recebido));
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const response = await apiFetchClient(`/api/rdvs/${rdv.id}`, {
      method: "PATCH",
      body: JSON.stringify({ adiantamento_recebido: Number(valor) || 0 }),
    });
    setSalvando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível atualizar o adiantamento.");
      return;
    }
    setEditando(false);
    await onAtualizar();
  }

  if (!editando) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Adiantamento</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{formatarValor(rdv.adiantamento_recebido)}</p>
          <button
            type="button"
            onClick={() => {
              setValor(String(rdv.adiantamento_recebido));
              setEditando(true);
            }}
            className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Editar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Adiantamento</p>
      <input
        type="number"
        step="0.01"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        autoFocus
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          disabled={salvando}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function InfoViagemEditavel({ rdv, onAtualizar }: { rdv: RdvDetalhado; onAtualizar: () => Promise<void> }) {
  const { showError } = useToast();
  const [editando, setEditando] = useState(false);
  const [motivo, setMotivo] = useState(rdv.motivo_viagem ?? "");
  const [inicio, setInicio] = useState(rdv.periodo_inicio);
  const [fim, setFim] = useState(rdv.periodo_fim);
  const [salvando, setSalvando] = useState(false);

  function abrirEdicao() {
    setMotivo(rdv.motivo_viagem ?? "");
    setInicio(rdv.periodo_inicio);
    setFim(rdv.periodo_fim);
    setEditando(true);
  }

  async function salvar() {
    if (!inicio || !fim) {
      showError("Informe o início e o fim do período.");
      return;
    }
    if (inicio > fim) {
      showError("A data inicial não pode ser depois da data final.");
      return;
    }
    setSalvando(true);
    const response = await apiFetchClient(`/api/rdvs/${rdv.id}`, {
      method: "PATCH",
      body: JSON.stringify({ motivo_viagem: motivo || null, periodo_inicio: inicio, periodo_fim: fim }),
    });
    setSalvando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível atualizar a viagem.");
      return;
    }
    setEditando(false);
    await onAtualizar();
  }

  if (!editando) {
    return (
      <div className="mb-6 rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <div className="flex items-start justify-between gap-3">
          <div>
            {rdv.motivo_viagem && <p>{rdv.motivo_viagem}</p>}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formatarData(rdv.periodo_inicio)} – {formatarData(rdv.periodo_fim)}
            </p>
          </div>
          <button
            type="button"
            onClick={abrirEdicao}
            className="shrink-0 text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Editar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <label htmlFor="motivo-viagem" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Motivo da viagem
      </label>
      <textarea
        id="motivo-viagem"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="periodo-inicio" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Início
          </label>
          <input
            id="periodo-inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="periodo-fim" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Fim
          </label>
          <input
            id="periodo-fim"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          disabled={salvando}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function SecaoItensDespesa({
  rdvId,
  itens,
  categorias,
  editavel,
  periodoInicio,
  periodoFim,
  onAtualizar,
}: {
  rdvId: string;
  itens: RdvDetalhado["itens_despesa"];
  categorias: CategoriaDespesa[];
  editavel: boolean;
  periodoInicio: string;
  periodoFim: string;
  onAtualizar: () => Promise<void>;
}) {
  const { showError } = useToast();
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataGasto, setDataGasto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [uploadIdAtivo, setUploadIdAtivo] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editCategoriaId, setEditCategoriaId] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editDataGasto, setEditDataGasto] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  function iniciarEdicao(item: RdvDetalhado["itens_despesa"][number]) {
    setEditandoId(item.id);
    setEditCategoriaId(item.categoria_id);
    setEditDescricao(item.descricao ?? "");
    setEditValor(String(item.valor));
    setEditDataGasto(item.data_gasto);
  }

  async function salvarEdicao(itemId: string) {
    if (!editCategoriaId || !editValor || !editDataGasto) {
      showError("Preencha categoria, valor e data.");
      return;
    }
    if (editDataGasto < periodoInicio || editDataGasto > periodoFim) {
      showError(`A data deve estar entre ${formatarData(periodoInicio)} e ${formatarData(periodoFim)}.`);
      return;
    }
    setSalvandoEdicao(true);
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-despesa/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({
        categoria_id: editCategoriaId,
        descricao: editDescricao || null,
        valor: Number(editValor),
        data_gasto: editDataGasto,
      }),
    });
    setSalvandoEdicao(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível salvar as alterações.");
      return;
    }
    setEditandoId(null);
    await onAtualizar();
  }

  async function adicionarItem(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!categoriaId || !valor || !dataGasto) {
      setErro("Preencha categoria, valor e data.");
      return;
    }

    if (dataGasto < periodoInicio || dataGasto > periodoFim) {
      setErro(`A data deve estar entre ${formatarData(periodoInicio)} e ${formatarData(periodoFim)}.`);
      return;
    }

    setEnviando(true);
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-despesa`, {
      method: "POST",
      body: JSON.stringify({
        categoria_id: categoriaId,
        descricao: descricao || null,
        valor: Number(valor),
        data_gasto: dataGasto,
      }),
    });
    setEnviando(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const mensagem = data?.error ?? "Não foi possível adicionar o item.";
      setErro(mensagem);
      showError(mensagem);
      return;
    }

    setCategoriaId("");
    setDescricao("");
    setValor("");
    setDataGasto("");
    await onAtualizar();
  }

  async function removerItem(itemId: string) {
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-despesa/${itemId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível remover o item.");
      return;
    }
    await onAtualizar();
  }

  async function verComprovante(itemId: string) {
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-despesa/${itemId}/comprovante`);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível abrir o comprovante.");
      return;
    }
    const { url } = await response.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function enviarComprovante(itemId: string, arquivo: File) {
    setUploadIdAtivo(itemId);
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    let response: Response;
    try {
      response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-despesa/${itemId}/comprovante`, {
        method: "POST",
        body: formData,
      });
    } catch {
      setUploadIdAtivo(null);
      showError("Não foi possível enviar o comprovante. Verifique sua conexão e tente novamente.");
      return;
    }
    setUploadIdAtivo(null);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível salvar o comprovante.");
      return;
    }
    await onAtualizar();
  }

  async function removerComprovante(itemId: string) {
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-despesa/${itemId}/comprovante`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível remover o comprovante.");
      return;
    }
    await onAtualizar();
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Itens de despesa</h2>

      {itens.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Nenhum item de despesa adicionado.</p>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2">Comprovante</th>
                {editavel && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map((item) =>
                editandoId === item.id ? (
                  <tr key={item.id} className="bg-gray-50 dark:bg-gray-800">
                    <td className="px-4 py-2">
                      <select
                        value={editCategoriaId}
                        onChange={(e) => setEditCategoriaId(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      >
                        {categorias.map((categoria) => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        placeholder="Descrição (opcional)"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={editDataGasto}
                        min={periodoInicio}
                        max={periodoFim}
                        onChange={(e) => setEditDataGasto(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={editValor}
                        onChange={(e) => setEditValor(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">-</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => salvarEdicao(item.id)}
                        disabled={salvandoEdicao}
                        className="mr-3 text-xs text-gray-900 underline hover:text-gray-700 disabled:opacity-60 dark:text-gray-100 dark:hover:text-gray-300"
                      >
                        {salvandoEdicao ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        disabled={salvandoEdicao}
                        className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.categorias_despesa?.nome ?? "-"}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{item.descricao ?? "-"}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{formatarData(item.data_gasto)}</td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">{formatarValor(item.valor)}</td>
                    <td className="px-4 py-2">
                      {item.comprovante_url ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => verComprovante(item.id)}
                            className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Ver
                          </button>
                          {editavel && (
                            <button
                              type="button"
                              onClick={() => removerComprovante(item.id)}
                              className="text-xs text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      ) : editavel ? (
                        <label className="cursor-pointer text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                          {uploadIdAtivo === item.id ? "Enviando..." : "Anexar"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="hidden"
                            disabled={uploadIdAtivo === item.id}
                            onChange={(e) => {
                              const arquivo = e.target.files?.[0];
                              if (arquivo) enviarComprovante(item.id, arquivo);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    {editavel && (
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(item)}
                          className="mr-3 text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removerItem(item.id)}
                          className="text-xs text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {editavel && (
        <form onSubmit={adicionarItem} className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            >
              <option value="">Categoria</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
            <input
              type="date"
              value={dataGasto}
              onChange={(e) => setDataGasto(e.target.value)}
              min={periodoInicio}
              max={periodoFim}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
          </div>
          {erro && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{erro}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="mt-3 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {enviando ? "Adicionando..." : "Adicionar item"}
          </button>
        </form>
      )}
    </section>
  );
}

function SecaoItensKm({
  rdvId,
  itens,
  editavel,
  periodoInicio,
  periodoFim,
  onAtualizar,
}: {
  rdvId: string;
  itens: RdvDetalhado["itens_quilometragem"];
  editavel: boolean;
  periodoInicio: string;
  periodoFim: string;
  onAtualizar: () => Promise<void>;
}) {
  const { showError } = useToast();
  const [data, setData] = useState("");
  const [trajeto, setTrajeto] = useState("");
  const [km, setKm] = useState("");
  const [valorKm, setValorKm] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editData, setEditData] = useState("");
  const [editTrajeto, setEditTrajeto] = useState("");
  const [editKm, setEditKm] = useState("");
  const [editValorKm, setEditValorKm] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  function iniciarEdicao(item: RdvDetalhado["itens_quilometragem"][number]) {
    setEditandoId(item.id);
    setEditData(item.data);
    setEditTrajeto(item.trajeto);
    setEditKm(String(item.km));
    setEditValorKm(String(item.valor_km));
  }

  async function salvarEdicao(itemId: string) {
    if (!editData || !editTrajeto || !editKm || !editValorKm) {
      showError("Preencha data, trajeto, km e valor por km.");
      return;
    }
    if (editData < periodoInicio || editData > periodoFim) {
      showError(`A data deve estar entre ${formatarData(periodoInicio)} e ${formatarData(periodoFim)}.`);
      return;
    }
    setSalvandoEdicao(true);
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-km/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({
        data: editData,
        trajeto: editTrajeto,
        km: Number(editKm),
        valor_km: Number(editValorKm),
      }),
    });
    setSalvandoEdicao(false);
    if (!response.ok) {
      const respData = await response.json().catch(() => null);
      showError(respData?.error ?? "Não foi possível salvar as alterações.");
      return;
    }
    setEditandoId(null);
    await onAtualizar();
  }

  async function adicionarItem(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!data || !trajeto || !km || !valorKm) {
      setErro("Preencha data, trajeto, km e valor por km.");
      return;
    }

    if (data < periodoInicio || data > periodoFim) {
      setErro(`A data deve estar entre ${formatarData(periodoInicio)} e ${formatarData(periodoFim)}.`);
      return;
    }

    setEnviando(true);
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-km`, {
      method: "POST",
      body: JSON.stringify({ data, trajeto, km: Number(km), valor_km: Number(valorKm) }),
    });
    setEnviando(false);

    if (!response.ok) {
      const respData = await response.json().catch(() => null);
      const mensagem = respData?.error ?? "Não foi possível adicionar o km.";
      setErro(mensagem);
      showError(mensagem);
      return;
    }

    setData("");
    setTrajeto("");
    setKm("");
    setValorKm("");
    await onAtualizar();
  }

  async function removerItem(itemId: string) {
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-km/${itemId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível remover o km.");
      return;
    }
    await onAtualizar();
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Quilometragem</h2>

      {itens.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Nenhum km registrado.</p>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Trajeto</th>
                <th className="px-4 py-2 text-right">Km</th>
                <th className="px-4 py-2 text-right">Valor/km</th>
                <th className="px-4 py-2 text-right">Valor</th>
                {editavel && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map((item) =>
                editandoId === item.id ? (
                  <tr key={item.id} className="bg-gray-50 dark:bg-gray-800">
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={editData}
                        min={periodoInicio}
                        max={periodoFim}
                        onChange={(e) => setEditData(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editTrajeto}
                        onChange={(e) => setEditTrajeto(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={editKm}
                        onChange={(e) => setEditKm(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editValorKm}
                        onChange={(e) => setEditValorKm(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-400 dark:text-gray-500">-</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => salvarEdicao(item.id)}
                        disabled={salvandoEdicao}
                        className="mr-3 text-xs text-gray-900 underline hover:text-gray-700 disabled:opacity-60 dark:text-gray-100 dark:hover:text-gray-300"
                      >
                        {salvandoEdicao ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        disabled={salvandoEdicao}
                        className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{formatarData(item.data)}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.trajeto}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{item.km}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{formatarValor(item.valor_km)}</td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">{formatarValor(item.valor)}</td>
                    {editavel && (
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(item)}
                          className="mr-3 text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removerItem(item.id)}
                          className="text-xs text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {editavel && (
        <form onSubmit={adicionarItem} className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              min={periodoInicio}
              max={periodoFim}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
            <input
              type="text"
              placeholder="Trajeto"
              value={trajeto}
              onChange={(e) => setTrajeto(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Km"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor por km"
              value={valorKm}
              onChange={(e) => setValorKm(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
          </div>
          {erro && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{erro}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="mt-3 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {enviando ? "Adicionando..." : "Adicionar km"}
          </button>
        </form>
      )}
    </section>
  );
}
