import { Router } from "express";
import { discoverPools, getPoolInfo, getPoolStats, getPoolPositions, getTopLPers, getTokenBalances } from "../lib/lpAgent.js";

export const poolsRouter = Router();

// GET /api/pools/discover?sortBy=vol_24h&min_liquidity=50000&...
poolsRouter.get("/discover", async (req, res) => {
  try {
    const data = await discoverPools(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pools/:poolId/info
poolsRouter.get("/:poolId/info", async (req, res) => {
  try {
    const data = await getPoolInfo(req.params.poolId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pools/:poolId/stats
poolsRouter.get("/:poolId/stats", async (req, res) => {
  try {
    const data = await getPoolStats(req.params.poolId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pools/:poolId/positions
poolsRouter.get("/:poolId/positions", async (req, res) => {
  const { page, pageSize } = req.query;
  try {
    const data = await getPoolPositions(req.params.poolId, Number(page) || 1, Number(pageSize) || 20);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pools/:poolId/top-lpers  (Premium endpoint)
poolsRouter.get("/:poolId/top-lpers", async (req, res) => {
  const { page, pageSize } = req.query;
  try {
    const data = await getTopLPers(req.params.poolId, Number(page) || 1, Number(pageSize) || 10);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pools/token-balances?wallet=<address>
poolsRouter.get("/token-balances", async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "wallet query param required" });
  try {
    const data = await getTokenBalances(wallet);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
