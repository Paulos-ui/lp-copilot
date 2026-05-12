import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { positionsRouter } from "./routes/positions.js";
import { poolsRouter } from "./routes/pools.js";
import { zapRouter } from "./routes/zap.js";
import { aiRouter } from "./routes/ai.js";

dotenv.config();

const app = express();

// Content-Security-Policy middleware — must come before other routes/middleware
app.use((_req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
    ].join("; ")
  );
  next();
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// API routes
app.use("/api/positions", positionsRouter);
app.use("/api/pools", poolsRouter);
app.use("/api/zap", zapRouter);
app.use("/api/ai", aiRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`LP Copilot backend running on port ${PORT}`));
