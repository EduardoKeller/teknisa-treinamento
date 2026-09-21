"use client";

import { use, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetchClient } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { ehDiaUtil } from "@/lib/feriados";
import {
  HoraExtraDetalhada,
  UsuarioAtual,
  STATUS_LABEL,
  STATUS_CLASS,
  formatarData,
  formatarHoras,
} from "@/lib/types";

const PERFIS_APROVADORES = ["aprovador", "financeiro", "admin"];
const PERFIS_FINANCEIRO = ["financeiro", "admin"];

// Jornada padrão: 07:30–12:00 e 13:00–17:18 (8h48min) — espelha o cálculo do backend
const JORNADA_PADRAO_MINUTOS = 8 * 60 + 48;
const MINUTOS_INTERVALO = 60;

const HORA_VALIDA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function maskHora(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 4);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

function calcularHorasExtrasPreview(
  horaInicio: string,
  horaFim: string,
  fezIntervalo: boolean,
  data: string,
): number | null {
  if (!HORA_VALIDA_REGEX.test(horaInicio) || !HORA_VALIDA_REGEX.test(horaFim)) return null;
  const [hi, mi] = horaInicio.split(":").map(Number);
  const [hf, mf] = horaFim.split(":").map(Number);
  const minutosTrabalhados = hf * 60 + mf - (hi * 60 + mi) - (fezIntervalo ? MINUTOS_INTERVALO : 0);
  if (minutosTrabalhados <= 0) return null;

  // Em dia útil, hora extra é o que passar da jornada padrão. Em final de semana ou feriado,
  // a empresa não trabalha, então todo o tempo registrado conta como extra.
  const minutosExtras = !data || ehDiaUtil(data) ? minutosTrabalhados - JORNADA_PADRAO_MINUTOS : minutosTrabalhados;
  if (minutosExtras <= 0) return null;
  return Math.round((minutosExtras / 60) * 100) / 100;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function DetalheHorasExtrasPage({ params }: Props) {
  const { id } = use(params);
  const { showError } = useToast();

  const [he, setHe] = useState<HoraExtraDetalhada | null>(null);
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioAtual | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  const recarregar = useCallback(async () => {
    const response = await apiFetchClient(`/api/horas-extras/${id}`);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const mensagem = data?.error ?? "Não foi possível carregar este registro.";
      setErro(mensagem);
      showError(mensagem);
      setCarregando(false);
      return;
    }
    const dados = await response.json();
    setHe(dados);
    setErro(null);
    setCarregando(false);
  }, [id, showError]);

  useEffect(() => {
    (async () => {
      await recarregar();
    })();
    (async () => {
      const response = await apiFetchClient("/api/usuarios/me");
      if (response.ok) setUsuarioAtual(await response.json());
    })();
  }, [recarregar]);

  async function exportarPlanilha() {
    setExportando(true);
    try {
      const response = await apiFetchClient(`/api/horas-extras/${id}/exportar`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        showError(data?.error ?? "Não foi possível exportar este registro.");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const nomeArquivo = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1];
      link.download = nomeArquivo ?? "horas-extras.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  if (carregando) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-500">Carregando...</div>;
  }

  if (erro || !he) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-red-600">{erro ?? "Registro não encontrado."}</p>
        <Link href="/horas-extras" className="mt-2 inline-block text-sm text-gray-500 hover:text-gray-700">
          ← Minhas Horas Extras
        </Link>
      </div>
    );
  }

  const souDono = usuarioAtual?.id === he.usuario_id;
  const souAprovador = usuarioAtual ? PERFIS_APROVADORES.includes(usuarioAtual.perfil) : false;
  const souFinanceiro = usuarioAtual ? PERFIS_FINANCEIRO.includes(usuarioAtual.perfil) : false;
  const editavel = he.status === "rascunho" && souDono;

  const linkVoltaHref = souDono
    ? "/horas-extras"
    : souFinanceiro && (he.status === "aprovado" || he.status === "pago")
      ? "/horas-extras/pagamentos"
      : "/horas-extras/aprovacoes";
  const linkVoltaLabel = souDono
    ? "← Minhas Horas Extras"
    : linkVoltaHref === "/horas-extras/pagamentos"
      ? "← Pagamentos"
      : "← Aprovações";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={linkVoltaHref} className="text-sm text-gray-500 hover:text-gray-700">
        {linkVoltaLabel}
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {!souDono && he.funcionario?.nome ? he.funcionario.nome : "Horas extras"}
          </h1>
          <p className="text-sm text-gray-500">
            {formatarData(he.periodo_inicio)} – {formatarData(he.periodo_fim)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[he.status]}`}>
          {STATUS_LABEL[he.status]}
        </span>
      </div>

      <div className="mb-8 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Total de horas</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatarHoras(he.total_horas)}</p>
        </div>
        <button
          type="button"
          onClick={exportarPlanilha}
          disabled={exportando || he.itens.length === 0}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportando ? "Exportando..." : "Exportar planilha"}
        </button>
      </div>

      {souDono && <AcaoEnvio he={he} onAtualizar={recarregar} />}
      {!souDono && souAprovador && he.status === "enviado" && <AcaoAprovacao he={he} onAtualizar={recarregar} />}
      {!souDono && souFinanceiro && he.status === "aprovado" && <AcaoPagamento he={he} onAtualizar={recarregar} />}

      <SecaoItens
        heId={he.id}
        itens={he.itens}
        editavel={editavel}
        periodoInicio={he.periodo_inicio}
        periodoFim={he.periodo_fim}
        onAtualizar={recarregar}
      />

      <SecaoHistorico historico={he.historico} />
    </div>
  );
}

function AcaoEnvio({ he, onAtualizar }: { he: HoraExtraDetalhada; onAtualizar: () => Promise<void> }) {
  const { showError } = useToast();
  const [enviando, setEnviando] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);

  async function enviar() {
    setEnviando(true);
    const response = await apiFetchClient(`/api/horas-extras/${he.id}/enviar`, { method: "POST" });
    setEnviando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível enviar o registro.");
      return;
    }
    await onAtualizar();
  }

  async function reabrir() {
    setReabrindo(true);
    const response = await apiFetchClient(`/api/horas-extras/${he.id}/reabrir`, { method: "POST" });
    setReabrindo(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível reabrir o registro.");
      return;
    }
    await onAtualizar();
  }

  if (he.status === "reprovado") {
    const ultimaReprovacao = [...he.historico].reverse().find((h) => h.status_novo === "reprovado");
    return (
      <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Este registro foi reprovado</p>
        {ultimaReprovacao?.justificativa && (
          <p className="mt-1 text-sm text-red-700">{ultimaReprovacao.justificativa}</p>
        )}
        <button
          type="button"
          onClick={reabrir}
          disabled={reabrindo}
          className="mt-3 rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-900 disabled:opacity-60"
        >
          {reabrindo ? "Reabrindo..." : "Corrigir e reenviar"}
        </button>
      </div>
    );
  }

  if (he.status !== "rascunho") {
    return null;
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
      >
        {enviando ? "Enviando..." : "Enviar para aprovação"}
      </button>
    </div>
  );
}

function AcaoAprovacao({ he, onAtualizar }: { he: HoraExtraDetalhada; onAtualizar: () => Promise<void> }) {
  const { showError } = useToast();
  const [mostrarReprovacao, setMostrarReprovacao] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [processando, setProcessando] = useState(false);

  async function aprovar() {
    setProcessando(true);
    const response = await apiFetchClient(`/api/horas-extras/${he.id}/aprovar`, { method: "POST" });
    setProcessando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível aprovar o registro.");
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
    const response = await apiFetchClient(`/api/horas-extras/${he.id}/reprovar`, {
      method: "POST",
      body: JSON.stringify({ justificativa }),
    });
    setProcessando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível reprovar o registro.");
      return;
    }
    setMostrarReprovacao(false);
    setJustificativa("");
    await onAtualizar();
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
      {!mostrarReprovacao ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={aprovar}
            disabled={processando}
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-60"
          >
            {processando ? "Aprovando..." : "Aprovar"}
          </button>
          <button
            type="button"
            onClick={() => setMostrarReprovacao(true)}
            disabled={processando}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Reprovar
          </button>
        </div>
      ) : (
        <div>
          <label htmlFor="justificativa" className="mb-1 block text-sm font-medium text-gray-700">
            Justificativa da reprovação
          </label>
          <textarea
            id="justificativa"
            rows={3}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Explique o motivo da reprovação"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={reprovar}
              disabled={processando}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              {processando ? "Reprovando..." : "Confirmar reprovação"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarReprovacao(false);
                setJustificativa("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AcaoPagamento({ he, onAtualizar }: { he: HoraExtraDetalhada; onAtualizar: () => Promise<void> }) {
  const { showError } = useToast();
  const [processando, setProcessando] = useState(false);

  async function pagar() {
    setProcessando(true);
    const response = await apiFetchClient(`/api/horas-extras/${he.id}/pagar`, { method: "POST" });
    setProcessando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível marcar o registro como pago.");
      return;
    }
    await onAtualizar();
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm text-gray-700">
        Registro aprovado com {formatarHoras(he.total_horas)}. Confirme quando o pagamento for processado.
      </p>
      <button
        type="button"
        onClick={pagar}
        disabled={processando}
        className="rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-800 disabled:opacity-60"
      >
        {processando ? "Registrando..." : "Marcar como pago"}
      </button>
    </div>
  );
}

function SecaoItens({
  heId,
  itens,
  editavel,
  periodoInicio,
  periodoFim,
  onAtualizar,
}: {
  heId: string;
  itens: HoraExtraDetalhada["itens"];
  editavel: boolean;
  periodoInicio: string;
  periodoFim: string;
  onAtualizar: () => Promise<void>;
}) {
  const { showError } = useToast();
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [fezIntervalo, setFezIntervalo] = useState(true);
  const [justificativa, setJustificativa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const previaHoras = calcularHorasExtrasPreview(horaInicio, horaFim, fezIntervalo, data);

  async function adicionarItem(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!data || !horaInicio || !horaFim) {
      setErro("Preencha data, hora de início e hora de fim.");
      return;
    }

    if (!HORA_VALIDA_REGEX.test(horaInicio) || !HORA_VALIDA_REGEX.test(horaFim)) {
      setErro("Informe os horários completos no formato HH:MM (ex.: 07:30).");
      return;
    }

    if (data < periodoInicio || data > periodoFim) {
      setErro(`A data deve estar entre ${formatarData(periodoInicio)} e ${formatarData(periodoFim)}.`);
      return;
    }

    setEnviando(true);
    const response = await apiFetchClient(`/api/horas-extras/${heId}/itens`, {
      method: "POST",
      body: JSON.stringify({
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        fez_intervalo: fezIntervalo,
        justificativa: justificativa || null,
      }),
    });
    setEnviando(false);

    if (!response.ok) {
      const respData = await response.json().catch(() => null);
      const mensagem = respData?.error ?? "Não foi possível adicionar o item.";
      setErro(mensagem);
      showError(mensagem);
      return;
    }

    setData("");
    setHoraInicio("");
    setHoraFim("");
    setFezIntervalo(true);
    setJustificativa("");
    await onAtualizar();
  }

  async function removerItem(itemId: string) {
    const response = await apiFetchClient(`/api/horas-extras/${heId}/itens/${itemId}`, { method: "DELETE" });
    if (!response.ok) {
      const respData = await response.json().catch(() => null);
      showError(respData?.error ?? "Não foi possível remover o item.");
      return;
    }
    await onAtualizar();
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Dias com horas extras</h2>

      {itens.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">Nenhum item adicionado.</p>
      ) : (
        <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Início</th>
                <th className="px-4 py-2">Fim</th>
                <th className="px-4 py-2">Intervalo</th>
                <th className="px-4 py-2 text-right">Horas extras</th>
                <th className="px-4 py-2">Justificativa</th>
                {editavel && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-gray-600">{formatarData(item.data)}</td>
                  <td className="px-4 py-2 text-gray-600">{item.hora_inicio.slice(0, 5)}</td>
                  <td className="px-4 py-2 text-gray-600">{item.hora_fim.slice(0, 5)}</td>
                  <td className="px-4 py-2 text-gray-600">{item.fez_intervalo ? "Sim" : "Não"}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {formatarHoras(item.quantidade_horas)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{item.justificativa ?? "-"}</td>
                  {editavel && (
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removerItem(item.id)}
                        className="text-xs text-red-600 underline hover:text-red-800"
                      >
                        Remover
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editavel && (
        <form onSubmit={adicionarItem} className="rounded-lg border border-dashed border-gray-300 p-4">
          <p className="mb-3 text-xs text-gray-500">
            Jornada padrão: 07:30–12:00 e 13:00–17:18 (8h48min). As horas extras são calculadas automaticamente.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              min={periodoInicio}
              max={periodoFim}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="07:30"
              maxLength={5}
              value={horaInicio}
              onChange={(e) => setHoraInicio(maskHora(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="17:18"
              maxLength={5}
              value={horaFim}
              onChange={(e) => setHoraFim(maskHora(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Justificativa (opcional)"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={fezIntervalo} onChange={(e) => setFezIntervalo(e.target.checked)} />
            Fiz o intervalo de almoço (12:00–13:00)
          </label>
          {HORA_VALIDA_REGEX.test(horaInicio) && HORA_VALIDA_REGEX.test(horaFim) && (
            <p className="mt-2 text-sm text-gray-600">
              {previaHoras === null
                ? "Sem horas extras nesse intervalo."
                : `Horas extras calculadas: ${formatarHoras(previaHoras)}`}
            </p>
          )}
          {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="mt-3 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {enviando ? "Adicionando..." : "Adicionar item"}
          </button>
        </form>
      )}
    </section>
  );
}

function SecaoHistorico({ historico }: { historico: HoraExtraDetalhada["historico"] }) {
  if (historico.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Histórico</h2>
      <ul className="space-y-2">
        {historico.map((item) => (
          <li key={item.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
            <span className="font-medium text-gray-900">
              {item.status_anterior ? `${STATUS_LABEL[item.status_anterior]} → ` : ""}
              {STATUS_LABEL[item.status_novo]}
            </span>
            <span className="ml-2 text-xs text-gray-500">{formatarData(item.criado_em)}</span>
            {item.justificativa && <p className="mt-1 text-gray-600">{item.justificativa}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
