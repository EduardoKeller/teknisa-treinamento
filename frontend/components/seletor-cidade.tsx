"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetchClient } from "@/lib/api-client";

export interface Municipio {
  nome: string;
  uf: string;
}

let cache: Municipio[] | null = null;
let promessa: Promise<Municipio[]> | null = null;

function carregarMunicipios(): Promise<Municipio[]> {
  if (cache) return Promise.resolve(cache);
  if (!promessa) {
    promessa = apiFetchClient("/api/municipios")
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: Municipio[]) => {
        cache = lista;
        return lista;
      })
      .catch(() => []);
  }
  return promessa;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

interface SeletorCidadeProps {
  id?: string;
  valor: string;
  onChange: (texto: string) => void;
  onSelecionar: (municipio: Municipio) => void;
  placeholder?: string;
  className: string;
}

export function SeletorCidade({ id, valor, onChange, onSelecionar, placeholder, className }: SeletorCidadeProps) {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    carregarMunicipios().then(setMunicipios);
  }, []);

  const sugestoes = useMemo(() => {
    const consulta = normalizar(valor.trim());
    if (consulta.length < 2) return [];
    return municipios.filter((m) => normalizar(m.nome).includes(consulta)).slice(0, 8);
  }, [valor, municipios]);

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={valor}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        className={className}
      />
      {aberto && sugestoes.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {sugestoes.map((m) => (
            <li key={`${m.nome}-${m.uf}`}>
              <button
                type="button"
                onMouseDown={() => {
                  onSelecionar(m);
                  setAberto(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                {m.nome} <span className="text-gray-400 dark:text-gray-500">- {m.uf}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
