import "dotenv/config";
import express from "express";
import cors from "cors";
import { supabase } from "./supabaseClient";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/ping-db", async (_req, res) => {
  const { error } = await supabase.from("_supabase_ping").select("*").limit(1);
  if (error && error.code !== "42P01") {
    res.status(500).json({ connected: false, error: error.message });
    return;
  }
  res.json({ connected: true });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
