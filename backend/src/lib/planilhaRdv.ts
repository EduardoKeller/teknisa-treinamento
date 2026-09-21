import path from "path";
import ExcelJS from "exceljs";

const TEMPLATE_PATH = path.join(__dirname, "..", "..", "templates", "rdv-template.xlsx");

interface RdvParaPlanilha {
  motivo_viagem: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  adiantamento_recebido: number;
  funcionario?: { nome: string } | null;
  empresas?: { nome: string } | null;
  centro_custo?: { nome: string } | null;
}

interface ItemDespesaParaPlanilha {
  data_gasto: string;
  descricao: string | null;
  valor: number;
  categorias_despesa?: { nome: string } | null;
}

interface ItemQuilometragemParaPlanilha {
  data: string;
  trajeto: string;
  km: number;
  valor: number;
}

interface DadosBancariosParaPlanilha {
  cpf: string;
  banco_nome: string;
  banco_numero: string;
  agencia: string;
  conta_corrente: string;
}

const KM_ROW_START = 13;
const KM_ROW_CAPACITY = 4;
const DESPESA_ROW_START = 21;
const DESPESA_ROW_CAPACITY = 20;

function paraData(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function preencherMerged(sheet: ExcelJS.Worksheet, endereco: string, valor: unknown) {
  sheet.getCell(endereco).value = valor as ExcelJS.CellValue;
}

export async function gerarPlanilhaRdv(
  rdv: RdvParaPlanilha,
  itensDespesa: ItemDespesaParaPlanilha[],
  itensQuilometragem: ItemQuilometragemParaPlanilha[],
  dadosBancarios: DadosBancariosParaPlanilha | null,
  aprovadorNome: string | null,
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const sheet = workbook.worksheets[0];

  const nomeFuncionario = rdv.funcionario?.nome ?? "-";

  preencherMerged(sheet, "B6", nomeFuncionario);
  preencherMerged(sheet, "B7", rdv.empresas?.nome ?? "-");
  preencherMerged(sheet, "F7", rdv.centro_custo?.nome ?? "-");
  preencherMerged(sheet, "C8", rdv.motivo_viagem ?? "-");
  preencherMerged(sheet, "C9", paraData(rdv.periodo_inicio));
  preencherMerged(sheet, "H9", paraData(rdv.periodo_fim));

  // Quilometragem: usa as linhas em branco do modelo e, se precisar de mais, duplica a última.
  const kmExtra = Math.max(0, itensQuilometragem.length - KM_ROW_CAPACITY);
  if (kmExtra > 0) {
    sheet.duplicateRow(KM_ROW_START + KM_ROW_CAPACITY - 1, kmExtra, true);
  }
  itensQuilometragem.forEach((item, index) => {
    const row = KM_ROW_START + index;
    sheet.getCell(`A${row}`).value = paraData(item.data);
    preencherMerged(sheet, `B${row}`, item.trajeto);
    sheet.getCell(`I${row}`).value = item.km;
    sheet.getCell(`J${row}`).value = item.valor;
  });
  const totalKm = itensQuilometragem.reduce((soma, item) => soma + item.valor, 0);
  const kmTotalRow = KM_ROW_START + KM_ROW_CAPACITY + kmExtra;
  sheet.getCell(`J${kmTotalRow}`).value = totalKm;

  // Despesas: mesma lógica, com as 20 linhas em branco do modelo.
  const despesaRowStart = DESPESA_ROW_START + kmExtra;
  const despesaExtra = Math.max(0, itensDespesa.length - DESPESA_ROW_CAPACITY);
  if (despesaExtra > 0) {
    sheet.duplicateRow(despesaRowStart + DESPESA_ROW_CAPACITY - 1, despesaExtra, true);
  }
  itensDespesa.forEach((item, index) => {
    const row = despesaRowStart + index;
    sheet.getCell(`A${row}`).value = paraData(item.data_gasto);
    preencherMerged(sheet, `B${row}`, item.categorias_despesa?.nome ?? "-");
    preencherMerged(sheet, `D${row}`, item.descricao ?? "-");
    sheet.getCell(`J${row}`).value = item.valor;
  });
  const totalDespesas = itensDespesa.reduce((soma, item) => soma + item.valor, 0);
  const despesaTotalRow = despesaRowStart + DESPESA_ROW_CAPACITY + despesaExtra;
  sheet.getCell(`J${despesaTotalRow}`).value = totalDespesas;

  const offset = kmExtra + despesaExtra;
  const totalGeral = totalKm + totalDespesas;
  const valorReembolso = totalGeral - rdv.adiantamento_recebido;

  sheet.getCell(`J${43 + offset}`).value = totalGeral;
  preencherMerged(sheet, `H${46 + offset}`, rdv.adiantamento_recebido);
  preencherMerged(sheet, `H${47 + offset}`, totalGeral);
  preencherMerged(sheet, `H${48 + offset}`, valorReembolso);

  preencherMerged(sheet, `C${52 + offset}`, nomeFuncionario);
  preencherMerged(sheet, `G${52 + offset}`, aprovadorNome ?? "-");

  preencherMerged(sheet, `E${56 + offset}`, nomeFuncionario);
  preencherMerged(sheet, `B${57 + offset}`, dadosBancarios?.cpf ?? "-");
  preencherMerged(
    sheet,
    `H${57 + offset}`,
    dadosBancarios ? `${dadosBancarios.banco_numero} - ${dadosBancarios.banco_nome}` : "-",
  );
  preencherMerged(sheet, `B${58 + offset}`, dadosBancarios?.agencia ?? "-");
  preencherMerged(sheet, `H${58 + offset}`, dadosBancarios?.conta_corrente ?? "-");

  return workbook.xlsx.writeBuffer();
}
