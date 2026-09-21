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
    return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-500">Carregando...</div>;
  }

  if (erro || !rdv) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-red-600">{erro ?? "RDV não encontrado."}</p>
        <Link href="/rdvs" className="mt-2 inline-block text-sm text-gray-500 hover:text-gray-700">
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
      <Link href={linkVoltaHref} className="text-sm text-gray-500 hover:text-gray-700">
        {linkVoltaLabel}
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{rdv.empresas?.nome ?? "RDV"}</h1>
          <p className="text-sm text-gray-500">
            {!souDono && rdv.funcionario?.nome && `${rdv.funcionario.nome} · `}
            {rdv.centro_custo?.nome ?? "-"} · {formatarData(rdv.periodo_inicio)} – {formatarData(rdv.periodo_fim)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[rdv.status]}`}>
          {STATUS_LABEL[rdv.status]}
        </span>
      </div>

      {rdv.motivo_viagem && (
        <p className="mb-6 rounded-md bg-gray-50 p-3 text-sm text-gray-700">{rdv.motivo_viagem}</p>
      )}

      <div className="mb-8 grid grid-cols-3 gap-4">
        <ResumoCard titulo="Total de despesas" valor={formatarValor(rdv.valor_total_despesas)} />
        <ResumoCard titulo="Adiantamento" valor={formatarValor(rdv.adiantamento_recebido)} />
        <ResumoCard titulo="Reembolso" valor={formatarValor(rdv.valor_reembolso)} destaque />
      </div>

      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={exportarPlanilha}
          disabled={exportando}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Este RDV foi reprovado</p>
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

  if (rdv.status !== "rascunho") {
    return null;
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
      {!mostrarConfirmacao ? (
        <button
          type="button"
          onClick={() => setMostrarConfirmacao(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Enviar para aprovação
        </button>
      ) : (
        <div>
          <p className="mb-2 text-sm text-gray-700">
            Confirme seu CPF cadastrado para enviar este RDV para aprovação.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {enviando ? "Enviando..." : "Confirmar envio"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarConfirmacao(false);
                setErro(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
          {erro && (
            <p className="mt-2 text-sm text-red-600">
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
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm text-gray-700">
        RDV aprovado. Confirme quando o reembolso de {formatarValor(rdv.valor_reembolso)} for depositado.
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

function SecaoHistorico({ historico }: { historico: RdvDetalhado["historico_status"] }) {
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

function ResumoCard({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{titulo}</p>
      <p className={`mt-1 text-lg font-semibold ${destaque ? "text-gray-900" : "text-gray-700"}`}>{valor}</p>
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
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Itens de despesa</h2>

      {itens.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">Nenhum item de despesa adicionado.</p>
      ) : (
        <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2">Comprovante</th>
                {editavel && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-gray-900">{item.categorias_despesa?.nome ?? "-"}</td>
                  <td className="px-4 py-2 text-gray-600">{item.descricao ?? "-"}</td>
                  <td className="px-4 py-2 text-gray-600">{formatarData(item.data_gasto)}</td>
                  <td className="px-4 py-2 text-right text-gray-900">{formatarValor(item.valor)}</td>
                  <td className="px-4 py-2">
                    {item.comprovante_url ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => verComprovante(item.id)}
                          className="text-xs text-blue-600 underline hover:text-blue-800"
                        >
                          Ver
                        </button>
                        {editavel && (
                          <button
                            type="button"
                            onClick={() => removerComprovante(item.id)}
                            className="text-xs text-red-600 underline hover:text-red-800"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ) : editavel ? (
                      <label className="cursor-pointer text-xs text-gray-500 underline hover:text-gray-700">
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
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
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
          <div className="grid grid-cols-4 gap-3">
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
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
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <input
              type="date"
              value={dataGasto}
              onChange={(e) => setDataGasto(e.target.value)}
              min={periodoInicio}
              max={periodoFim}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
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
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Quilometragem</h2>

      {itens.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">Nenhum km registrado.</p>
      ) : (
        <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Trajeto</th>
                <th className="px-4 py-2 text-right">Km</th>
                <th className="px-4 py-2 text-right">Valor/km</th>
                <th className="px-4 py-2 text-right">Valor</th>
                {editavel && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-gray-600">{formatarData(item.data)}</td>
                  <td className="px-4 py-2 text-gray-900">{item.trajeto}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{item.km}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatarValor(item.valor_km)}</td>
                  <td className="px-4 py-2 text-right text-gray-900">{formatarValor(item.valor)}</td>
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
          <div className="grid grid-cols-4 gap-3">
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
              placeholder="Trajeto"
              value={trajeto}
              onChange={(e) => setTrajeto(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Km"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor por km"
              value={valorKm}
              onChange={(e) => setValorKm(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
          {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="mt-3 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {enviando ? "Adicionando..." : "Adicionar km"}
          </button>
        </form>
      )}
    </section>
  );
}
