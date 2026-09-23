import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  Rdv,
  HoraExtra,
  SolicitacaoViagem,
  UsuarioAtual,
  StatusRdv,
  StatusViagem,
  STATUS_LABEL,
  STATUS_CLASS,
  STATUS_VIAGEM_LABEL,
  STATUS_VIAGEM_CLASS,
  formatarData,
} from "@/lib/types";

const CARD_CLASS = "rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900";

function contarPorStatus<S extends string>(itens: { status: S }[]): Partial<Record<S, number>> {
  const contagem: Partial<Record<S, number>> = {};
  for (const item of itens) contagem[item.status] = (contagem[item.status] ?? 0) + 1;
  return contagem;
}

function dataRelevanteViagem(v: SolicitacaoViagem): string | null {
  if (v.inclui_hotel && v.checkin_data) return v.checkin_data;
  if (v.inclui_passagem && v.ida_data) return v.ida_data;
  return null;
}

export default async function InicioPage() {
  const meResponse = await apiFetch("/api/usuarios/me");
  const usuarioAtual: UsuarioAtual | null = meResponse.ok ? await meResponse.json() : null;

  if (!usuarioAtual) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar seus dados.</p>
      </div>
    );
  }

  const podeAprovar = ["aprovador", "financeiro", "admin"].includes(usuarioAtual.perfil);
  const podePagar = ["financeiro", "admin"].includes(usuarioAtual.perfil);
  const queryPropria = usuarioAtual.perfil !== "funcionario" ? `?usuario_id=${usuarioAtual.id}` : "";

  const [
    rdvsResp,
    heResp,
    viagensResp,
    rdvsAprovarResp,
    heAprovarResp,
    viagensAprovarResp,
    rdvsPagarResp,
    hePagarResp,
    viagensReservarResp,
  ] = await Promise.all([
    apiFetch(`/api/rdvs${queryPropria}`),
    apiFetch(`/api/horas-extras${queryPropria}`),
    apiFetch(`/api/solicitacoes-viagem${queryPropria}`),
    podeAprovar ? apiFetch(`/api/rdvs?status=enviado`) : null,
    podeAprovar ? apiFetch(`/api/horas-extras?status=enviado`) : null,
    podeAprovar ? apiFetch(`/api/solicitacoes-viagem?status=enviado`) : null,
    podePagar ? apiFetch(`/api/rdvs?status=aprovado`) : null,
    podePagar ? apiFetch(`/api/horas-extras?status=aprovado`) : null,
    podePagar ? apiFetch(`/api/solicitacoes-viagem?status=aprovado`) : null,
  ]);

  const meusRdvs: Rdv[] = rdvsResp.ok ? await rdvsResp.json() : [];
  const minhasHe: HoraExtra[] = heResp.ok ? await heResp.json() : [];
  const minhasViagens: SolicitacaoViagem[] = viagensResp.ok ? await viagensResp.json() : [];

  const rdvsParaAprovar: Rdv[] = rdvsAprovarResp?.ok ? await rdvsAprovarResp.json() : [];
  const heParaAprovar: HoraExtra[] = heAprovarResp?.ok ? await heAprovarResp.json() : [];
  const viagensParaAprovar: SolicitacaoViagem[] = viagensAprovarResp?.ok ? await viagensAprovarResp.json() : [];

  const rdvsParaPagar: Rdv[] = rdvsPagarResp?.ok ? await rdvsPagarResp.json() : [];
  const heParaPagar: HoraExtra[] = hePagarResp?.ok ? await hePagarResp.json() : [];
  const viagensParaReservar: SolicitacaoViagem[] = viagensReservarResp?.ok ? await viagensReservarResp.json() : [];

  const pendenciasAprovacao = [
    { label: "RDVs", count: rdvsParaAprovar.length, href: "/aprovacoes" },
    { label: "Horas Extras", count: heParaAprovar.length, href: "/horas-extras/aprovacoes" },
    { label: "Viagens", count: viagensParaAprovar.length, href: "/viagens/aprovacoes" },
  ].filter((p) => p.count > 0);

  const pendenciasPagamento = [
    { label: "Reembolsos de RDV", count: rdvsParaPagar.length, href: "/pagamentos" },
    { label: "Pagamentos de Horas Extras", count: heParaPagar.length, href: "/horas-extras/pagamentos" },
    { label: "Reservas de viagem", count: viagensParaReservar.length, href: "/viagens/reservas" },
  ].filter((p) => p.count > 0);

  const hoje = new Date().toISOString().slice(0, 10);
  const proximaViagem = minhasViagens
    .filter((v) => v.status === "reservado" && (dataRelevanteViagem(v) ?? "") >= hoje)
    .sort((a, b) => (dataRelevanteViagem(a) ?? "").localeCompare(dataRelevanteViagem(b) ?? ""))[0];

  const primeiroNome = usuarioAtual.nome.split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Olá, {primeiroNome}!</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Aqui está um resumo do que está em andamento</p>
      </div>

      {(pendenciasAprovacao.length > 0 || pendenciasPagamento.length > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pendenciasAprovacao.map((p) => (
            <Link
              key={`aprovar-${p.label}`}
              href={p.href}
              className="rounded-lg border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:hover:bg-blue-900"
            >
              <p className="text-2xl font-semibold text-blue-800 dark:text-blue-300">{p.count}</p>
              <p className="text-sm text-blue-700 dark:text-blue-400">{p.label} aguardando sua aprovação</p>
            </Link>
          ))}
          {pendenciasPagamento.map((p) => (
            <Link
              key={`pagar-${p.label}`}
              href={p.href}
              className="rounded-lg border border-purple-200 bg-purple-50 p-4 transition hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950 dark:hover:bg-purple-900"
            >
              <p className="text-2xl font-semibold text-purple-800 dark:text-purple-300">{p.count}</p>
              <p className="text-sm text-purple-700 dark:text-purple-400">{p.label} pendente</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mb-6">
        {proximaViagem ? (
          <Link
            href={`/viagens/${proximaViagem.id}`}
            className={`block ${CARD_CLASS} transition hover:border-gray-300 dark:hover:border-gray-700`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Próxima viagem
            </p>
            <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">{proximaViagem.motivo}</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
              {proximaViagem.inclui_hotel && proximaViagem.checkin_data && (
                <span>
                  🏨 {proximaViagem.cidade ?? "Hotel"} · {formatarData(proximaViagem.checkin_data)}
                  {proximaViagem.checkout_data && ` – ${formatarData(proximaViagem.checkout_data)}`}
                </span>
              )}
              {proximaViagem.inclui_passagem && proximaViagem.ida_data && (
                <span>
                  ✈️ {proximaViagem.ida_de} → {proximaViagem.ida_para} · {formatarData(proximaViagem.ida_data)}
                </span>
              )}
            </div>
          </Link>
        ) : (
          <div className={CARD_CLASS}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Próxima viagem
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Nenhuma viagem reservada no momento.{" "}
              <Link href="/viagens/novo" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
                Criar solicitação
              </Link>
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ResumoCard
          titulo="Meus RDVs"
          href="/rdvs"
          botaoLabel="Novo RDV"
          botaoHref="/rdvs/novo"
          contagem={contarPorStatus<StatusRdv>(meusRdvs)}
          rotulos={STATUS_LABEL}
          classes={STATUS_CLASS}
        />
        <ResumoCard
          titulo="Minhas Horas Extras"
          href="/horas-extras"
          botaoLabel="Novo registro"
          botaoHref="/horas-extras/novo"
          contagem={contarPorStatus<StatusRdv>(minhasHe)}
          rotulos={STATUS_LABEL}
          classes={STATUS_CLASS}
        />
        <ResumoCard
          titulo="Minhas Solicitações de Viagem"
          href="/viagens"
          botaoLabel="Nova solicitação"
          botaoHref="/viagens/novo"
          contagem={contarPorStatus<StatusViagem>(minhasViagens)}
          rotulos={STATUS_VIAGEM_LABEL}
          classes={STATUS_VIAGEM_CLASS}
        />
      </div>
    </div>
  );
}

function ResumoCard<S extends string>({
  titulo,
  href,
  botaoLabel,
  botaoHref,
  contagem,
  rotulos,
  classes,
}: {
  titulo: string;
  href: string;
  botaoLabel: string;
  botaoHref: string;
  contagem: Partial<Record<S, number>>;
  rotulos: Record<S, string>;
  classes: Record<S, string>;
}) {
  const total = Object.values(contagem).reduce((soma: number, n) => soma + (n as number), 0);
  const statusComItens = (Object.keys(contagem) as S[]).filter((status) => (contagem[status] ?? 0) > 0);

  return (
    <div className={CARD_CLASS}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titulo}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{total} no total</p>
        </div>
        <Link
          href={botaoHref}
          className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-blue-700"
        >
          {botaoLabel}
        </Link>
      </div>

      {statusComItens.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nada por aqui ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {statusComItens.map((status) => (
            <span key={status} className={`rounded-full px-2 py-1 text-xs font-medium ${classes[status]}`}>
              {contagem[status]} {rotulos[status]}
            </span>
          ))}
        </div>
      )}

      <Link
        href={href}
        className="mt-3 inline-block text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        Ver tudo →
      </Link>
    </div>
  );
}
