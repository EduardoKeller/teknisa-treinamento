import "dotenv/config";
import express from "express";
import cors from "cors";
import { supabase } from "./supabaseClient";
import { categoriasRouter } from "./routes/categorias";
import { empresasRouter } from "./routes/empresas";
import { usuariosRouter } from "./routes/usuarios";
import { dadosBancariosRouter } from "./routes/dadosBancarios";
import { rdvsRouter } from "./routes/rdvs";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
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
app.use("/api/usuarios", usuariosRouter);
app.use("/api/dados-bancarios", dadosBancariosRouter);
app.use("/api/rdvs", rdvsRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
