import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { positionsRouter } from "./routes/positions.js";
import { poolsRouter } from "./routes/pools.js";
import { zapRouter } from "./routes/zap.js";
import { aiRouter } from "./routes/ai.js";

dotenv.config();

const app = express();

// ─── CORS ─────────────────────────────────────────────────────
// Allows localhost dev AND any Vercel deployment automatically
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain automatically
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    // Allow explicitly listed origins
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// ─── Health check (test this first in browser) ────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    env: {
      hasLpAgentKey: !!process.env.LP_AGENT_API_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      frontendUrl: process.env.FRONTEND_URL || "not set",
    }
  });
});

// ─── API routes ───────────────────────────────────────────────
app.use("/api/positions", positionsRouter);
app.use("/api/pools", poolsRouter);
app.use("/api/zap", zapRouter);
app.use("/api/ai", aiRouter);

// ─── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`LP Copilot backend running on port ${PORT}`);
  console.log(`LP Agent key: ${process.env.LP_AGENT_API_KEY ? "✓ set" : "✗ MISSING"}`);
  console.log(`Anthropic key: ${process.env.ANTHROPIC_API_KEY ? "✓ set" : "✗ MISSING"}`);
});
