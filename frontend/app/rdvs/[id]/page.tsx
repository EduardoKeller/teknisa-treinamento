"use client";

import { use, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetchClient } from "@/lib/api-client";
import {
  CategoriaDespesa,
  RdvDetalhado,
  STATUS_LABEL,
  STATUS_CLASS,
  formatarData,
  formatarValor,
} from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function DetalheRdvPage({ params }: Props) {
  const { id } = use(params);

  const [rdv, setRdv] = useState<RdvDetalhado | null>(null);
  const [categorias, setCategorias] = useState<CategoriaDespesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    const response = await apiFetchClient(`/api/rdvs/${id}`);
    if (!response.ok) {
      setErro("Não foi possível carregar este RDV.");
      setCarregando(false);
      return;
    }
    const dados = await response.json();
    setRdv(dados);
    setErro(null);
    setCarregando(false);
  }, [id]);

  useEffect(() => {
    recarregar();
    (async () => {
      const response = await apiFetchClient("/api/categorias-despesa");
      if (response.ok) setCategorias(await response.json());
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

  const editavel = rdv.status === "rascunho";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/rdvs" className="text-sm text-gray-500 hover:text-gray-700">
        ← Meus RDVs
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{rdv.empresas?.nome ?? "RDV"}</h1>
          <p className="text-sm text-gray-500">
            {rdv.unop_ug} · {formatarData(rdv.periodo_inicio)} – {formatarData(rdv.periodo_fim)}
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

      <AcaoEnvio rdv={rdv} onAtualizar={recarregar} />

      <SecaoItensDespesa
        rdvId={rdv.id}
        itens={rdv.itens_despesa}
        categorias={categorias}
        editavel={editavel}
        onAtualizar={recarregar}
      />

      <SecaoItensKm rdvId={rdv.id} itens={rdv.itens_quilometragem} editavel={editavel} onAtualizar={recarregar} />

      <SecaoHistorico historico={rdv.historico_status} />
    </div>
  );
}

function AcaoEnvio({ rdv, onAtualizar }: { rdv: RdvDetalhado; onAtualizar: () => Promise<void> }) {
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
      setErro(data?.error ?? "Não foi possível enviar o RDV.");
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
    if (response.ok) await onAtualizar();
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
  onAtualizar,
}: {
  rdvId: string;
  itens: RdvDetalhado["itens_despesa"];
  categorias: CategoriaDespesa[];
  editavel: boolean;
  onAtualizar: () => Promise<void>;
}) {
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
      setErro(data?.error ?? "Não foi possível adicionar o item.");
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
    if (response.ok) await onAtualizar();
  }

  async function verComprovante(itemId: string) {
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-despesa/${itemId}/comprovante`);
    if (!response.ok) return;
    const { url } = await response.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function enviarComprovante(itemId: string, arquivo: File) {
    setUploadIdAtivo(itemId);
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-despesa/${itemId}/comprovante`, {
      method: "POST",
      body: formData,
    });
    setUploadIdAtivo(null);
    if (response.ok) await onAtualizar();
  }

  async function removerComprovante(itemId: string) {
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-despesa/${itemId}/comprovante`, {
      method: "DELETE",
    });
    if (response.ok) await onAtualizar();
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
  onAtualizar,
}: {
  rdvId: string;
  itens: RdvDetalhado["itens_quilometragem"];
  editavel: boolean;
  onAtualizar: () => Promise<void>;
}) {
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

    setEnviando(true);
    const response = await apiFetchClient(`/api/rdvs/${rdvId}/itens-km`, {
      method: "POST",
      body: JSON.stringify({ data, trajeto, km: Number(km), valor_km: Number(valorKm) }),
    });
    setEnviando(false);

    if (!response.ok) {
      const respData = await response.json().catch(() => null);
      setErro(respData?.error ?? "Não foi possível adicionar o km.");
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
    if (response.ok) await onAtualizar();
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
