// Espelha backend/src/lib/feriados.ts para o preview em tempo real no formulário.

function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function somarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

function formatarISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function feriadosNacionais(ano: number): Set<string> {
  const fixos = [
    `${ano}-01-01`,
    `${ano}-04-21`,
    `${ano}-05-01`,
    `${ano}-09-07`,
    `${ano}-10-12`,
    `${ano}-11-02`,
    `${ano}-11-15`,
    `${ano}-11-20`,
    `${ano}-12-25`,
  ];

  const pascoa = domingoDePascoa(ano);
  const moveis = [
    formatarISO(somarDias(pascoa, -48)),
    formatarISO(somarDias(pascoa, -47)),
    formatarISO(somarDias(pascoa, -2)),
    formatarISO(somarDias(pascoa, 60)),
  ];

  return new Set([...fixos, ...moveis]);
}

export function ehFeriado(data: string): boolean {
  const ano = Number(data.slice(0, 4));
  return feriadosNacionais(ano).has(data);
}

/** Segunda a sexta e não feriado — a jornada padrão da empresa. */
export function ehDiaUtil(data: string): boolean {
  const diaDaSemana = new Date(`${data}T00:00:00Z`).getUTCDay();
  const ehDiaDeSemana = diaDaSemana >= 1 && diaDaSemana <= 5;
  return ehDiaDeSemana && !ehFeriado(data);
}
