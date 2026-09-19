"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetchClient } from "@/lib/api-client";

interface DadosBancarios {
  usuario_id: string;
  cpf: string;
  banco_nome: string;
  banco_numero: string;
  agencia: string;
  conta_corrente: string;
}

export default function PerfilPage() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const [cpf, setCpf] = useState("");
  const [bancoNome, setBancoNome] = useState("");
  const [bancoNumero, setBancoNumero] = useState("");
  const [agencia, setAgencia] = useState("");
  const [contaCorrente, setContaCorrente] = useState("");

  useEffect(() => {
    (async () => {
      const response = await apiFetchClient("/api/dados-bancarios");
      if (response.ok) {
        const dados: DadosBancarios | null = await response.json();
        if (dados) {
          setCpf(dados.cpf);
          setBancoNome(dados.banco_nome);
          setBancoNumero(dados.banco_numero);
          setAgencia(dados.agencia);
          setContaCorrente(dados.conta_corrente);
        }
      }
      setCarregando(false);
    })();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);

    if (!cpf || !bancoNome || !bancoNumero || !agencia || !contaCorrente) {
      setErro("Preencha todos os campos.");
      return;
    }

    setSalvando(true);
    const response = await apiFetchClient("/api/dados-bancarios", {
      method: "PUT",
      body: JSON.stringify({
        cpf,
        banco_nome: bancoNome,
        banco_numero: bancoNumero,
        agencia,
        conta_corrente: contaCorrente,
      }),
    });
    setSalvando(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setErro(data?.error ?? "Não foi possível salvar seus dados bancários.");
      return;
    }

    setSucesso(true);
  }

  if (carregando) {
    return <div className="mx-auto max-w-lg px-4 py-8 text-sm text-gray-500">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/rdvs" className="text-sm text-gray-500 hover:text-gray-700">
        ← Meus RDVs
      </Link>
      <h1 className="mt-1 text-2xl font-semibold text-gray-900">Dados bancários</h1>
      <p className="text-sm text-gray-500">
        Usados para o depósito do reembolso e para confirmar sua identidade ao enviar um RDV.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label htmlFor="cpf" className="mb-1 block text-sm font-medium text-gray-700">
            CPF
          </label>
          <input
            id="cpf"
            type="text"
            required
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="banco_nome" className="mb-1 block text-sm font-medium text-gray-700">
            Banco
          </label>
          <input
            id="banco_nome"
            type="text"
            required
            value={bancoNome}
            onChange={(e) => setBancoNome(e.target.value)}
            placeholder="Ex.: Nu Pagamentos S.A"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="banco_numero" className="mb-1 block text-sm font-medium text-gray-700">
              Código
            </label>
            <input
              id="banco_numero"
              type="text"
              required
              value={bancoNumero}
              onChange={(e) => setBancoNumero(e.target.value)}
              placeholder="0260"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="agencia" className="mb-1 block text-sm font-medium text-gray-700">
              Agência
            </label>
            <input
              id="agencia"
              type="text"
              required
              value={agencia}
              onChange={(e) => setAgencia(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="conta" className="mb-1 block text-sm font-medium text-gray-700">
              Conta
            </label>
            <input
              id="conta"
              type="text"
              required
              value={contaCorrente}
              onChange={(e) => setContaCorrente(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {sucesso && <p className="text-sm text-green-600">Dados salvos com sucesso.</p>}

        <button
          type="submit"
          disabled={salvando}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
