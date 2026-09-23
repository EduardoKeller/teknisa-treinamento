"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetchClient } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import {
  SolicitacaoViagemDetalhada,
  UsuarioAtual,
  STATUS_VIAGEM_LABEL,
  STATUS_VIAGEM_CLASS,
  formatarData,
} from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

const COMPANHIAS = ["LATAM", "GOL", "Azul", "Outra"] as const;

const URL_MINHAS_VIAGENS: Record<string, string> = {
  LATAM: "https://www.latamairlines.com/br/pt/minhas-viagens",
  GOL: "https://b2c.voegol.com.br/minhas-viagens",
  Azul: "https://www.voeazul.com.br/br/pt/home/reservas.html",
};

const CAMPO_LABEL = "text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500";
const CAMPO_VALOR = "text-sm text-gray-900 dark:text-gray-100";

function Campo({ label, valor }: { label: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div>
      <p className={CAMPO_LABEL}>{label}</p>
      <p className={CAMPO_VALOR}>{valor}</p>
    </div>
  );
}

export default function DetalheSolicitacaoViagemPage({ params }: Props) {
  const { showError, showSuccess } = useToast();
  const [id, setId] = useState<string | null>(null);
  const [solicitacao, setSolicitacao] = useState<SolicitacaoViagemDetalhada | null>(null);
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioAtual | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async (solicitacaoId: string) => {
    const [meResponse, response] = await Promise.all([
      apiFetchClient("/api/usuarios/me"),
      apiFetchClient(`/api/solicitacoes-viagem/${solicitacaoId}`),
    ]);
    if (meResponse.ok) setUsuarioAtual(await meResponse.json());
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setErro(data?.error ?? "Solicitação não encontrada.");
      setCarregando(false);
      return;
    }
    setSolicitacao(await response.json());
    setCarregando(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { id: paramId } = await params;
      setId(paramId);
      await recarregar(paramId);
    })();
  }, [params, recarregar]);

  if (carregando) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-gray-500 dark:text-gray-400">Carregando...</div>;
  }

  if (erro || !solicitacao || !id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">{erro ?? "Solicitação não encontrada."}</p>
        <Link href="/viagens" className="mt-2 inline-block text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          ← Minhas Solicitações
        </Link>
      </div>
    );
  }

  const souDono = usuarioAtual?.id === solicitacao.usuario_id;
  const podeAprovar = usuarioAtual ? ["aprovador", "financeiro", "admin"].includes(usuarioAtual.perfil) : false;
  const podeReservar = usuarioAtual ? ["financeiro", "admin"].includes(usuarioAtual.perfil) : false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/viagens" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
        ← Minhas Solicitações
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{solicitacao.motivo}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {solicitacao.funcionario?.nome && `${solicitacao.funcionario.nome} · `}
            {solicitacao.empresas?.nome ?? "-"}
            {solicitacao.centro_custo?.nome && ` · ${solicitacao.centro_custo.nome}`} ·{" "}
            {formatarData(solicitacao.criado_em)}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_VIAGEM_CLASS[solicitacao.status]}`}>
          {STATUS_VIAGEM_LABEL[solicitacao.status]}
        </span>
      </div>

      {solicitacao.inclui_hotel && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Reserva de hotel</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Hóspede" valor={solicitacao.hospede_nome} />
            <Campo label="Telefone" valor={solicitacao.hospede_telefone} />
            <Campo
              label="Entrada"
              valor={
                solicitacao.checkin_data
                  ? `${formatarData(solicitacao.checkin_data)}${solicitacao.checkin_horario ? " · " + solicitacao.checkin_horario : ""}`
                  : null
              }
            />
            <Campo
              label="Saída"
              valor={
                solicitacao.checkout_data
                  ? `${formatarData(solicitacao.checkout_data)}${solicitacao.checkout_horario ? " · " + solicitacao.checkout_horario : ""}`
                  : null
              }
            />
            <Campo label="Cidade/Estado" valor={[solicitacao.cidade, solicitacao.estado].filter(Boolean).join("/") || null} />
            <Campo label="Sugestão de hotel" valor={solicitacao.sugestao_hotel_nome} />
            <Campo label="Telefone do hotel" valor={solicitacao.sugestao_hotel_telefone} />
          </div>
          {solicitacao.observacoes_hotel && (
            <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {solicitacao.observacoes_hotel}
            </p>
          )}
        </div>
      )}

      {solicitacao.inclui_passagem && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Passagem aérea</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Passageiro" valor={solicitacao.passageiro_nome} />
            <Campo label="CPF" valor={solicitacao.passageiro_cpf} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
              <p className={`mb-2 ${CAMPO_LABEL}`}>Ida</p>
              <div className="space-y-2">
                <Campo
                  label="Data"
                  valor={solicitacao.ida_data ? formatarData(solicitacao.ida_data) : null}
                />
                <Campo label="Trecho" valor={[solicitacao.ida_de, solicitacao.ida_para].filter(Boolean).join(" → ") || null} />
              </div>
            </div>
            <div className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
              <p className={`mb-2 ${CAMPO_LABEL}`}>Volta</p>
              <div className="space-y-2">
                <Campo
                  label="Data"
                  valor={solicitacao.volta_data ? formatarData(solicitacao.volta_data) : null}
                />
                <Campo label="Trecho" valor={[solicitacao.volta_de, solicitacao.volta_para].filter(Boolean).join(" → ") || null} />
              </div>
            </div>
          </div>
          {solicitacao.observacoes_passagem && (
            <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {solicitacao.observacoes_passagem}
            </p>
          )}
        </div>
      )}

      {solicitacao.detalhes_reserva && (
        <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950">
          <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Reserva confirmada</p>
          <p className="mt-1 text-sm text-purple-700 dark:text-purple-400">{solicitacao.detalhes_reserva}</p>
          {solicitacao.passagem_localizador && (
            <p className="mt-1 text-sm text-purple-700 dark:text-purple-400">
              Localizador: <span className="font-medium">{solicitacao.passagem_localizador}</span>
              {solicitacao.passagem_companhia && ` · ${solicitacao.passagem_companhia}`}
            </p>
          )}
          {(solicitacao.passagem_numero_voo || (solicitacao.passagem_companhia && URL_MINHAS_VIAGENS[solicitacao.passagem_companhia])) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {solicitacao.passagem_numero_voo && (
                <a
                  href={`https://flightaware.com/live/flight/${encodeURIComponent(solicitacao.passagem_numero_voo.replace(/\s+/g, ""))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-purple-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500"
                >
                  Acompanhar voo {solicitacao.passagem_numero_voo} ↗
                </a>
              )}
              {solicitacao.passagem_companhia && URL_MINHAS_VIAGENS[solicitacao.passagem_companhia] && (
                <a
                  href={URL_MINHAS_VIAGENS[solicitacao.passagem_companhia]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-purple-700 px-3 py-1.5 text-sm font-medium text-purple-800 transition hover:bg-purple-100 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900"
                >
                  Consultar no site da {solicitacao.passagem_companhia} ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {souDono && solicitacao.status === "rascunho" && (
        <AcaoEnviar id={id} onAtualizar={() => recarregar(id)} />
      )}

      {souDono && solicitacao.status === "reprovado" && (
        <AcaoReprovada solicitacao={solicitacao} id={id} onAtualizar={() => recarregar(id)} />
      )}

      {podeAprovar && solicitacao.status === "enviado" && (
        <AcaoAprovacao id={id} onAtualizar={() => recarregar(id)} />
      )}

      {podeReservar && solicitacao.status === "aprovado" && (
        <AcaoReservar
          id={id}
          incluiPassagem={solicitacao.inclui_passagem}
          onAtualizar={() => recarregar(id)}
        />
      )}

      {solicitacao.historico.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Histórico</h2>
          <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            {solicitacao.historico.map((h) => (
              <li key={h.id}>
                {formatarData(h.criado_em)} — {STATUS_VIAGEM_LABEL[h.status_novo]}
                {h.justificativa && `: ${h.justificativa}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AcaoEnviar({ id, onAtualizar }: { id: string; onAtualizar: () => Promise<void> }) {
  const { showError } = useToast();
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setEnviando(true);
    const response = await apiFetchClient(`/api/solicitacoes-viagem/${id}/enviar`, { method: "POST" });
    setEnviando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível enviar a solicitação.");
      return;
    }
    await onAtualizar();
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
      >
        {enviando ? "Enviando..." : "Enviar para aprovação"}
      </button>
    </div>
  );
}

function AcaoReprovada({
  solicitacao,
  id,
  onAtualizar,
}: {
  solicitacao: SolicitacaoViagemDetalhada;
  id: string;
  onAtualizar: () => Promise<void>;
}) {
  const { showError } = useToast();
  const [reabrindo, setReabrindo] = useState(false);
  const ultimaReprovacao = [...solicitacao.historico].reverse().find((h) => h.status_novo === "reprovado");

  async function reabrir() {
    setReabrindo(true);
    const response = await apiFetchClient(`/api/solicitacoes-viagem/${id}/reabrir`, { method: "POST" });
    setReabrindo(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível reabrir a solicitação.");
      return;
    }
    await onAtualizar();
  }

  return (
    <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
      <p className="text-sm font-medium text-red-800 dark:text-red-300">Esta solicitação foi reprovada</p>
      {ultimaReprovacao?.justificativa && (
        <p className="mt-1 text-sm text-red-700 dark:text-red-400">{ultimaReprovacao.justificativa}</p>
      )}
      <button
        type="button"
        onClick={reabrir}
        disabled={reabrindo}
        className="mt-3 rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-900 disabled:opacity-60 dark:bg-red-700 dark:hover:bg-red-600"
      >
        {reabrindo ? "Reabrindo..." : "Reabrir e reenviar"}
      </button>
    </div>
  );
}

function AcaoAprovacao({ id, onAtualizar }: { id: string; onAtualizar: () => Promise<void> }) {
  const { showError } = useToast();
  const [processando, setProcessando] = useState(false);
  const [mostrarReprovacao, setMostrarReprovacao] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  async function aprovar() {
    setProcessando(true);
    const response = await apiFetchClient(`/api/solicitacoes-viagem/${id}/aprovar`, { method: "POST" });
    setProcessando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível aprovar.");
      return;
    }
    await onAtualizar();
  }

  async function reprovar() {
    if (!justificativa) {
      showError("Informe a justificativa da reprovação.");
      return;
    }
    setProcessando(true);
    const response = await apiFetchClient(`/api/solicitacoes-viagem/${id}/reprovar`, {
      method: "POST",
      body: JSON.stringify({ justificativa }),
    });
    setProcessando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível reprovar.");
      return;
    }
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
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
            rows={2}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={reprovar}
              disabled={processando}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
            >
              {processando ? "Enviando..." : "Confirmar reprovação"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarReprovacao(false)}
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

function AcaoReservar({
  id,
  incluiPassagem,
  onAtualizar,
}: {
  id: string;
  incluiPassagem: boolean;
  onAtualizar: () => Promise<void>;
}) {
  const { showError } = useToast();
  const [detalhes, setDetalhes] = useState("");
  const [numeroVoo, setNumeroVoo] = useState("");
  const [localizador, setLocalizador] = useState("");
  const [companhia, setCompanhia] = useState("");
  const [processando, setProcessando] = useState(false);

  async function reservar() {
    if (!detalhes) {
      showError("Descreva os detalhes da reserva confirmada.");
      return;
    }
    setProcessando(true);
    const response = await apiFetchClient(`/api/solicitacoes-viagem/${id}/reservar`, {
      method: "POST",
      body: JSON.stringify({
        detalhes_reserva: detalhes,
        passagem_numero_voo: numeroVoo || null,
        passagem_localizador: localizador || null,
        passagem_companhia: companhia || null,
      }),
    });
    setProcessando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      showError(data?.error ?? "Não foi possível marcar como reservado.");
      return;
    }
    await onAtualizar();
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <label htmlFor="detalhes_reserva" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Confirmar reserva — descreva o que foi reservado/comprado
      </label>
      <textarea
        id="detalhes_reserva"
        rows={3}
        placeholder="Ex.: Hotel XYZ reservado, confirmação 12345. Voo GOL 1234 emitido, localizador ABCDEF."
        value={detalhes}
        onChange={(e) => setDetalhes(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
      />

      {incluiPassagem && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="numero_voo" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Número do voo (opcional)
            </label>
            <input
              id="numero_voo"
              type="text"
              placeholder="Ex.: LA4321, G31234"
              value={numeroVoo}
              onChange={(e) => setNumeroVoo(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
          </div>
          <div>
            <label htmlFor="localizador" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Localizador (opcional)
            </label>
            <input
              id="localizador"
              type="text"
              placeholder="Ex.: XPTO12"
              value={localizador}
              onChange={(e) => setLocalizador(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            />
          </div>
          <div>
            <label htmlFor="companhia" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Companhia aérea
            </label>
            <select
              id="companhia"
              value={companhia}
              onChange={(e) => setCompanhia(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100"
            >
              <option value="">Não informar</option>
              {COMPANHIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={reservar}
        disabled={processando}
        className="mt-3 rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-800 disabled:opacity-60 dark:bg-purple-600 dark:hover:bg-purple-500"
      >
        {processando ? "Salvando..." : "Marcar como reservado"}
      </button>
    </div>
  );
}
