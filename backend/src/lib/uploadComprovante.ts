import multer from "multer";
import { randomUUID } from "crypto";
import { extname } from "path";

const EXTENSOES_POR_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const TIPOS_COMPROVANTE_PERMITIDOS = Object.keys(EXTENSOES_POR_MIME);

export function gerarNomeArquivoSeguro(originalname: string, mimetype: string): string {
  const extensaoOriginal = extname(originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const extensao = /^\.[a-z0-9]+$/.test(extensaoOriginal) ? extensaoOriginal : EXTENSOES_POR_MIME[mimetype] ?? "";
  return `${Date.now()}-${randomUUID()}${extensao}`;
}

export const uploadComprovante = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_COMPROVANTE_PERMITIDOS.includes(file.mimetype)) {
      cb(new Error("Tipo de arquivo não suportado. Envie uma imagem (JPEG/PNG/WEBP) ou PDF."));
      return;
    }
    cb(null, true);
  },
});
