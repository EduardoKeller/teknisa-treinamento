"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetchClient } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { SeletorCidade } from "@/components/seletor-cidade";
import { CentroCusto, Empresa } from "@/lib/types";

const INPUT_CLASS =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-100";
const LABEL_CLASS = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

export default function NovaSolicitacaoViagemPage() {
  const router = useRouter();
  const { showError } = useToast();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [carregandoListas, setCarregandoListas] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [empresaId, setEmpresaId] = useState("");
  const [centroCustoId, setCentroCustoId] = useState("");
  const [motivo, setMotivo] = useState("");

  const [incluiHotel, setIncluiHotel] = useState(true);
  const [hospedeNome, setHospedeNome] = useState("");
  const [hospedeTelefone, setHospedeTelefone] = useState("");
  const [checkinData, setCheckinData] = useState("");
  const [checkinHorario, setCheckinHorario] = useState("");
  const [checkoutData, setCheckoutData] = useState("");
  const [checkoutHorario, setCheckoutHorario] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [sugestaoHotelNome, setSugestaoHotelNome] = useState("");
  const [sugestaoHotelTelefone, setSugestaoHotelTelefone] = useState("");
  const [observacoesHotel, setObservacoesHotel] = useState("");

  const [incluiPassagem, setIncluiPassagem] = useState(false);
  const [passageiroNome, setPassageiroNome] = useState("");
  const [passageiroCpf, setPassageiroCpf] = useState("");
  const [passageiroNascimento, setPassageiroNascimento] = useState("");
  const [idaData, setIdaData] = useState("");
  const [idaDe, setIdaDe] = useState("");
  const [idaPara, setIdaPara] = useState("");
  const [voltaData, setVoltaData] = useState("");
  const [voltaDe, setVoltaDe] = useState("");
  const [voltaPara, setVoltaPara] = useState("");
  const [observacoesPassagem, setObservacoesPassagem] = useState("");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [empresasResp, centrosResp] = await Promise.all([
        apiFetchClient("/api/empresas"),
        apiFetchClient("/api/centros-custo"),
      ]);
      if (cancelado) return;
      if (empresasResp.ok) setEmpresas(await empresasResp.json());
      if (centrosResp.ok) setCentrosCusto(await centrosResp.json());
      setCarregandoListas(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!empresaId || !motivo) {
      setErro("Preencha empresa e motivo da solicitação.");
      return;
    }
    if (!incluiHotel && !incluiPassagem) {
      setErro("Selecione ao menos hospedagem ou passagem.");
      return;
    }
    if (incluiHotel && (!hospedeNome || !checkinData || !checkoutData || !cidade)) {
      setErro("Para hospedagem, preencha hóspede, cidade e datas de entrada/saída.");
      return;
    }
    if (incluiPassagem && (!passageiroNome || !idaData || !idaDe || !idaPara)) {
      setErro("Para passagem, preencha passageiro e os dados da ida.");
      return;
    }

    setEnviando(true);
    const response = await apiFetchClient("/api/solicitacoes-viagem", {
      method: "POST",
      body: JSON.stringify({
        empresa_id: empresaId,
        centro_custo_id: centroCustoId || null,
        motivo,
        inclui_hotel: incluiHotel,
        hospede_nome: hospedeNome || null,
        hospede_telefone: hospedeTelefone || null,
        checkin_data: checkinData || null,
        checkin_horario: checkinHorario || null,
        checkout_data: checkoutData || null,
        checkout_horario: checkoutHorario || null,
        cidade: cidade || null,
        estado: estado || null,
        sugestao_hotel_nome: sugestaoHotelNome || null,
        sugestao_hotel_telefone: sugestaoHotelTelefone || null,
        observacoes_hotel: observacoesHotel || null,
        inclui_passagem: incluiPassagem,
        passageiro_nome: passageiroNome || null,
        passageiro_cpf: passageiroCpf || null,
        passageiro_nascimento: passageiroNascimento || null,
        ida_data: idaData || null,
        ida_de: idaDe || null,
        ida_para: idaPara || null,
        volta_data: voltaData || null,
        volta_de: voltaDe || null,
        volta_para: voltaPara || null,
        observacoes_passagem: observacoesPassagem || null,
      }),
    });
    setEnviando(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const mensagem = data?.error ?? "Não foi possível criar a solicitação.";
      setErro(mensagem);
      showError(mensagem);
      return;
    }

    const solicitacao = await response.json();
    router.push(`/viagens/${solicitacao.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/viagens"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          ← Minhas Solicitações
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">Nova solicitação de viagem</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Peça a reserva de um hotel e/ou a compra de uma passagem aérea
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="empresa" className={LABEL_CLASS}>
              Empresa
            </label>
            <select
              id="empresa"
              required
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              disabled={carregandoListas}
              className={INPUT_CLASS}
            >
              <option value="">{carregandoListas ? "Carregando..." : "Selecione a empresa"}</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="centro_custo" className={LABEL_CLASS}>
              Alocar custo para
            </label>
            <select
              id="centro_custo"
              value={centroCustoId}
              onChange={(e) => setCentroCustoId(e.target.value)}
              disabled={carregandoListas}
              className={INPUT_CLASS}
            >
              <option value="">{carregandoListas ? "Carregando..." : "Sem centro de custo"}</option>
              {centrosCusto.map((centro) => (
                <option key={centro.id} value={centro.id}>
                  {centro.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="motivo" className={LABEL_CLASS}>
            Motivo da solicitação
          </label>
          <textarea
            id="motivo"
            rows={2}
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: Treinamento na matriz"
            className={INPUT_CLASS}
          />
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <input
              type="checkbox"
              checked={incluiHotel}
              onChange={(e) => setIncluiHotel(e.target.checked)}
              className="h-4 w-4"
            />
            Reserva de hotel
          </label>

          {incluiHotel && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="hospede_nome" className={LABEL_CLASS}>
                    Nome completo do hóspede
                  </label>
                  <input
                    id="hospede_nome"
                    type="text"
                    value={hospedeNome}
                    onChange={(e) => setHospedeNome(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="hospede_telefone" className={LABEL_CLASS}>
                    Telefone para contato
                  </label>
                  <input
                    id="hospede_telefone"
                    type="text"
                    value={hospedeTelefone}
                    onChange={(e) => setHospedeTelefone(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="checkin_data" className={LABEL_CLASS}>
                      Entrada
                    </label>
                    <input
                      id="checkin_data"
                      type="date"
                      value={checkinData}
                      onChange={(e) => setCheckinData(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="checkin_horario" className={LABEL_CLASS}>
                      Horário
                    </label>
                    <input
                      id="checkin_horario"
                      type="text"
                      placeholder="15h"
                      value={checkinHorario}
                      onChange={(e) => setCheckinHorario(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="checkout_data" className={LABEL_CLASS}>
                      Saída
                    </label>
                    <input
                      id="checkout_data"
                      type="date"
                      value={checkoutData}
                      onChange={(e) => setCheckoutData(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout_horario" className={LABEL_CLASS}>
                      Horário
                    </label>
                    <input
                      id="checkout_horario"
                      type="text"
                      placeholder="9h"
                      value={checkoutHorario}
                      onChange={(e) => setCheckoutHorario(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cidade" className={LABEL_CLASS}>
                    Cidade
                  </label>
                  <SeletorCidade
                    id="cidade"
                    valor={cidade}
                    onChange={setCidade}
                    onSelecionar={(m) => {
                      setCidade(m.nome);
                      setEstado(m.uf);
                    }}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="estado" className={LABEL_CLASS}>
                    Estado
                  </label>
                  <input
                    id="estado"
                    type="text"
                    placeholder="SC"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sugestao_hotel_nome" className={LABEL_CLASS}>
                    Sugestão de hotel (opcional)
                  </label>
                  <input
                    id="sugestao_hotel_nome"
                    type="text"
                    value={sugestaoHotelNome}
                    onChange={(e) => setSugestaoHotelNome(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="sugestao_hotel_telefone" className={LABEL_CLASS}>
                    Telefone do hotel
                  </label>
                  <input
                    id="sugestao_hotel_telefone"
                    type="text"
                    value={sugestaoHotelTelefone}
                    onChange={(e) => setSugestaoHotelTelefone(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="observacoes_hotel" className={LABEL_CLASS}>
                  Observações sobre a reserva
                </label>
                <textarea
                  id="observacoes_hotel"
                  rows={2}
                  value={observacoesHotel}
                  onChange={(e) => setObservacoesHotel(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <input
              type="checkbox"
              checked={incluiPassagem}
              onChange={(e) => setIncluiPassagem(e.target.checked)}
              className="h-4 w-4"
            />
            Compra de passagem aérea
          </label>

          {incluiPassagem && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="passageiro_nome" className={LABEL_CLASS}>
                    Nome completo do passageiro
                  </label>
                  <input
                    id="passageiro_nome"
                    type="text"
                    value={passageiroNome}
                    onChange={(e) => setPassageiroNome(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="passageiro_cpf" className={LABEL_CLASS}>
                      CPF
                    </label>
                    <input
                      id="passageiro_cpf"
                      type="text"
                      value={passageiroCpf}
                      onChange={(e) => setPassageiroCpf(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="passageiro_nascimento" className={LABEL_CLASS}>
                      Nascimento
                    </label>
                    <input
                      id="passageiro_nascimento"
                      type="date"
                      value={passageiroNascimento}
                      onChange={(e) => setPassageiroNascimento(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Ida</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="ida_data" className={LABEL_CLASS}>
                      Data
                    </label>
                    <input
                      id="ida_data"
                      type="date"
                      value={idaData}
                      onChange={(e) => setIdaData(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="ida_de" className={LABEL_CLASS}>
                      De
                    </label>
                    <SeletorCidade
                      id="ida_de"
                      placeholder="Cidade/UF"
                      valor={idaDe}
                      onChange={setIdaDe}
                      onSelecionar={(m) => setIdaDe(`${m.nome}/${m.uf}`)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="ida_para" className={LABEL_CLASS}>
                      Para
                    </label>
                    <SeletorCidade
                      id="ida_para"
                      placeholder="Cidade/UF"
                      valor={idaPara}
                      onChange={setIdaPara}
                      onSelecionar={(m) => setIdaPara(`${m.nome}/${m.uf}`)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Volta</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="volta_data" className={LABEL_CLASS}>
                      Data
                    </label>
                    <input
                      id="volta_data"
                      type="date"
                      value={voltaData}
                      onChange={(e) => setVoltaData(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="volta_de" className={LABEL_CLASS}>
                      De
                    </label>
                    <SeletorCidade
                      id="volta_de"
                      placeholder="Cidade/UF"
                      valor={voltaDe}
                      onChange={setVoltaDe}
                      onSelecionar={(m) => setVoltaDe(`${m.nome}/${m.uf}`)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="volta_para" className={LABEL_CLASS}>
                      Para
                    </label>
                    <SeletorCidade
                      id="volta_para"
                      placeholder="Cidade/UF"
                      valor={voltaPara}
                      onChange={setVoltaPara}
                      onSelecionar={(m) => setVoltaPara(`${m.nome}/${m.uf}`)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="observacoes_passagem" className={LABEL_CLASS}>
                  Observações
                </label>
                <textarea
                  id="observacoes_passagem"
                  rows={2}
                  value={observacoesPassagem}
                  onChange={(e) => setObservacoesPassagem(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}
        </div>

        {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {enviando ? "Criando..." : "Criar solicitação"}
          </button>
          <Link
            href="/viagens"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
