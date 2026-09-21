import ExcelJS from "exceljs";

interface HoraExtraParaPlanilha {
  status: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_horas: number;
  funcionario?: { nome: string } | null;
}

interface ItemParaPlanilha {
  data: string;
  hora_inicio: string;
  hora_fim: string;
  fez_intervalo: boolean;
  quantidade_horas: number;
  justificativa: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  pago: "Pago",
};

function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarHoras(horas: number): string {
  const totalMinutos = Math.round(horas * 60);
  const h = Math.floor(totalMinutos / 60);
  const m = totalMinutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

export async function gerarPlanilhaHorasExtras(
  he: HoraExtraParaPlanilha,
  itens: ItemParaPlanilha[],
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de RDV";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Horas extras");
  sheet.columns = [
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 40 },
  ];

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Horas extras";
  sheet.getCell("A1").font = { size: 16, bold: true };

  sheet.getCell("A2").value = "Funcionário";
  sheet.getCell("B2").value = he.funcionario?.nome ?? "-";
  sheet.getCell("A3").value = "Período";
  sheet.getCell("B3").value = `${formatarDataBR(he.periodo_inicio)} – ${formatarDataBR(he.periodo_fim)}`;
  sheet.getCell("A4").value = "Status";
  sheet.getCell("B4").value = STATUS_LABEL[he.status] ?? he.status;
  ["A2", "A3", "A4"].forEach((ref) => {
    sheet.getCell(ref).font = { bold: true };
  });

  const headerRowIndex = 6;
  const headers = ["Data", "Início", "Fim", "Intervalo", "Horas extras", "Justificativa"];
  const headerRow = sheet.getRow(headerRowIndex);
  headers.forEach((titulo, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = titulo;
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  });

  itens.forEach((item, index) => {
    const row = sheet.getRow(headerRowIndex + 1 + index);
    row.getCell(1).value = formatarDataBR(item.data);
    row.getCell(2).value = item.hora_inicio;
    row.getCell(3).value = item.hora_fim;
    row.getCell(4).value = item.fez_intervalo ? "Sim" : "Não";
    row.getCell(5).value = formatarHoras(item.quantidade_horas);
    row.getCell(6).value = item.justificativa ?? "-";
  });

  const totalRowIndex = headerRowIndex + 1 + itens.length;
  const totalRow = sheet.getRow(totalRowIndex);
  totalRow.getCell(4).value = "Total";
  totalRow.getCell(4).font = { bold: true };
  totalRow.getCell(5).value = formatarHoras(he.total_horas);
  totalRow.getCell(5).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}
