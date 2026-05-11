import { Router } from "express";
import {
  getOpenPositions,
  getHistoricalPositions,
  getOverviewMetrics,
  getPositionRevenue,
  getPositionLogs,
} from "../lib/lpAgent.js";

export const positionsRouter = Router();

// GET /api/positions/open?owner=<wallet>
positionsRouter.get("/open", async (req, res) => {
  const { owner } = req.query;
  if (!owner) return res.status(400).json({ error: "owner query param required" });
  try {
    const data = await getOpenPositions(owner);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/positions/history?owner=<wallet>&page=1&pageSize=20
positionsRouter.get("/history", async (req, res) => {
  const { owner, page, pageSize } = req.query;
  if (!owner) return res.status(400).json({ error: "owner query param required" });
  try {
    const data = await getHistoricalPositions(owner, Number(page) || 1, Number(pageSize) || 20);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/positions/overview?owner=<wallet>
positionsRouter.get("/overview", async (req, res) => {
  const { owner, protocol } = req.query;
  if (!owner) return res.status(400).json({ error: "owner query param required" });
  try {
    const data = await getOverviewMetrics(owner, protocol);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/positions/revenue?owner=<wallet>&range=7D
positionsRouter.get("/revenue", async (req, res) => {
  const { owner, range } = req.query;
  if (!owner) return res.status(400).json({ error: "owner query param required" });
  try {
    const data = await getPositionRevenue(owner, range || "7D");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/positions/logs?owner=<wallet>&page=1
positionsRouter.get("/logs", async (req, res) => {
  const { owner, page, pageSize } = req.query;
  if (!owner) return res.status(400).json({ error: "owner query param required" });
  try {
    const data = await getPositionLogs(owner, Number(page) || 1, Number(pageSize) || 20);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
