import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { positionsRouter } from "./routes/positions.js";
import { poolsRouter } from "./routes/pools.js";
import { zapRouter } from "./routes/zap.js";
import { aiRouter } from "./routes/ai.js";

dotenv.config();

const app = express();

// ── CORS: allow ALL origins (fine for a hackathon) ────────────
app.use(cors());
app.options("/{*path}", cors());
app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ status: "LP Copilot backend running" }));
app.get("/health", (_req, res) => res.json({
  status: "ok",
  hasLpAgentKey: !!process.env.LP_AGENT_API_KEY,
  hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
}));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/positions", positionsRouter);
app.use("/api/pools", poolsRouter);
app.use("/api/zap", zapRouter);
app.use("/api/ai", aiRouter);

// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
  console.log(`LP_AGENT_API_KEY: ${process.env.LP_AGENT_API_KEY ? "SET" : "MISSING"}`);
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? "SET" : "MISSING"}`);
});
