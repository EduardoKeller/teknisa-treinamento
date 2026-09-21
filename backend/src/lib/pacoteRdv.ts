import JSZip from "jszip";

export interface ArquivoParaZip {
  nome: string;
  conteudo: Buffer;
}

/**
 * Monta um .zip em memória com a planilha do RDV e os comprovantes anexados.
 */
export async function gerarZipRdv(planilha: ArquivoParaZip, comprovantes: ArquivoParaZip[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(planilha.nome, planilha.conteudo);
  for (const comprovante of comprovantes) {
    zip.file(`comprovantes/${comprovante.nome}`, comprovante.conteudo);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}
