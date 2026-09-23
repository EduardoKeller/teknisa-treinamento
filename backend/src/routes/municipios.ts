import { Router } from "express";

export const municipiosRouter = Router();

interface MunicipioIbge {
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
}

interface Municipio {
  nome: string;
  uf: string;
}

const IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cache: Municipio[] | null = null;
let cacheEm = 0;

async function carregarMunicipios(): Promise<Municipio[]> {
  if (cache && Date.now() - cacheEm < CACHE_TTL_MS) return cache;

  const response = await fetch(IBGE_URL);
  if (!response.ok) {
    if (cache) return cache;
    throw new Error("Não foi possível carregar a lista de municípios");
  }

  const dados = (await response.json()) as MunicipioIbge[];
  const lista = dados
    .map((m) => ({ nome: m.nome, uf: m.microrregiao?.mesorregiao?.UF?.sigla ?? "" }))
    .filter((m) => m.uf);

  cache = lista;
  cacheEm = Date.now();
  return lista;
}

municipiosRouter.get("/", async (_req, res) => {
  try {
    const municipios = await carregarMunicipios();
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.json(municipios);
  } catch {
    res.status(502).json({ error: "Não foi possível carregar a lista de municípios no momento" });
  }
});
