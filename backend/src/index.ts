import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { supabase } from "./supabaseClient";
import { categoriasRouter } from "./routes/categorias";
import { empresasRouter } from "./routes/empresas";
import { centrosCustoRouter } from "./routes/centrosCusto";
import { usuariosRouter } from "./routes/usuarios";
import { dadosBancariosRouter } from "./routes/dadosBancarios";
import { rdvsRouter } from "./routes/rdvs";
import { horasExtrasRouter } from "./routes/horasExtras";
import { solicitacoesViagemRouter } from "./routes/solicitacoesViagem";
import { municipiosRouter } from "./routes/municipios";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ exposedHeaders: ["Content-Disposition"] }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/ping-db", async (_req, res) => {
  const { error } = await supabase.from("_supabase_ping").select("*").limit(1);
  const tableNotFound = error?.code === "42P01" || error?.code === "PGRST205";
  if (error && !tableNotFound) {
    res.status(500).json({ connected: false, error: error.message });
    return;
  }
  res.json({ connected: true });
});

app.use("/api/categorias-despesa", categoriasRouter);
app.use("/api/empresas", empresasRouter);
app.use("/api/centros-custo", centrosCustoRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api/dados-bancarios", dadosBancariosRouter);
app.use("/api/rdvs", rdvsRouter);
app.use("/api/horas-extras", horasExtrasRouter);
app.use("/api/solicitacoes-viagem", solicitacoesViagemRouter);
app.use("/api/municipios", municipiosRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `Falha no upload: ${err.message}` });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Erro interno" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
