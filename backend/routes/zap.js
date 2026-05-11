import { Router } from "express";
import {
  getPoolInfo,
  generateZapInTx,
  landZapInTx,
  getZapOutQuotes,
  generateZapOutTx,
  landZapOutTx,
} from "../lib/lpAgent.js";

export const zapRouter = Router();

/**
 * POST /api/zap/in/prepare
 * Body: { poolId, owner, inputSOL, strategy?, slippageBps?, rangeWidth? }
 *
 * 1. Fetches pool info to get active bin
 * 2. Generates unsigned transactions
 * Returns: { transactions, meta, lastValidBlockHeight }
 * Frontend then signs and calls /api/zap/in/land
 */
zapRouter.post("/in/prepare", async (req, res) => {
  const {
    poolId,
    owner,
    inputSOL,
    strategy = "Spot",
    slippageBps = 500,
    rangeWidth = 34, // bins on each side of active bin
  } = req.body;

  if (!poolId || !owner || !inputSOL) {
    return res.status(400).json({ error: "poolId, owner, and inputSOL are required" });
  }

  try {
    // Step 1: Get pool info to find active bin
    const poolInfo = await getPoolInfo(poolId);
    const activeBin = poolInfo.data?.liquidityViz?.activeBin;

    if (!activeBin) {
      return res.status(400).json({ error: "Could not determine active bin for pool" });
    }

    const fromBinId = activeBin.binId - rangeWidth;
    const toBinId = activeBin.binId + rangeWidth;

    // Step 2: Generate unsigned transactions
    const txData = await generateZapInTx({
      poolId,
      owner,
      inputSOL: Number(inputSOL),
      percentX: 0.5,
      fromBinId,
      toBinId,
      strategy,
      slippageBps: Number(slippageBps),
      mode: "zap-in",
    });

    res.json({
      activeBin: activeBin.binId,
      fromBinId,
      toBinId,
      positionPubKey: txData.data.meta?.positionPubKey,
      lastValidBlockHeight: txData.data.lastValidBlockHeight,
      swapTxs: txData.data.swapTxsWithJito,        // base64 unsigned txs - sign on frontend
      addLiquidityTxs: txData.data.addLiquidityTxsWithJito, // base64 unsigned txs
      meta: txData.data.meta,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/zap/in/land
 * Body: { lastValidBlockHeight, signedSwapTxs, signedAddTxs, meta }
 *
 * Submits signed transactions via Jito bundles
 */
zapRouter.post("/in/land", async (req, res) => {
  const { lastValidBlockHeight, signedSwapTxs, signedAddTxs, meta } = req.body;

  if (!lastValidBlockHeight || !signedAddTxs || !meta) {
    return res.status(400).json({ error: "lastValidBlockHeight, signedAddTxs, and meta required" });
  }

  try {
    const result = await landZapInTx({
      lastValidBlockHeight,
      swapTxsWithJito: signedSwapTxs || [],
      addLiquidityTxsWithJito: signedAddTxs,
      meta,
    });

    res.json({
      success: true,
      signature: result.data?.signature,
      explorerUrl: `https://solscan.io/tx/${result.data?.signature}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/zap/out/quote
 * Body: { positionId, bps? }
 *
 * Preview what you'll receive before executing
 */
zapRouter.post("/out/quote", async (req, res) => {
  const { positionId, bps = 10000 } = req.body;
  if (!positionId) return res.status(400).json({ error: "positionId is required" });

  try {
    const quotes = await getZapOutQuotes({ positionId, bps: Number(bps) });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/zap/out/prepare
 * Body: { positionId, owner, bps?, output?, slippageBps? }
 *
 * Generates unsigned withdrawal transactions
 * Returns: { closeTxs, swapTxs, lastValidBlockHeight }
 * Frontend signs and calls /api/zap/out/land
 */
zapRouter.post("/out/prepare", async (req, res) => {
  const {
    positionId,
    owner,
    bps = 10000,
    output = "allBaseToken",
    slippageBps = 500,
  } = req.body;

  if (!positionId || !owner) {
    return res.status(400).json({ error: "positionId and owner are required" });
  }

  try {
    const txData = await generateZapOutTx({
      positionId,
      owner,
      bps: Number(bps),
      output,
      slippageBps: Number(slippageBps),
    });

    res.json({
      lastValidBlockHeight: txData.data.lastValidBlockHeight,
      closeTxs: txData.data.closeTxsWithJito,   // sign on frontend
      swapTxs: txData.data.swapTxsWithJito,     // sign on frontend
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/zap/out/land
 * Body: { lastValidBlockHeight, signedCloseTxs, signedSwapTxs }
 */
zapRouter.post("/out/land", async (req, res) => {
  const { lastValidBlockHeight, signedCloseTxs, signedSwapTxs } = req.body;

  if (!lastValidBlockHeight || !signedCloseTxs) {
    return res.status(400).json({ error: "lastValidBlockHeight and signedCloseTxs required" });
  }

  try {
    const result = await landZapOutTx({
      lastValidBlockHeight,
      closeTxsWithJito: signedCloseTxs,
      swapTxsWithJito: signedSwapTxs || [],
    });

    res.json({
      success: true,
      signature: result.data?.signature,
      explorerUrl: `https://solscan.io/tx/${result.data?.signature}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
