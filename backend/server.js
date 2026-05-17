import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const LP_BASE = "https://api.lpagent.io/open-api/v1";
const LP_KEY  = process.env.LP_AGENT_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

// ── LP Agent helper ───────────────────────────────────────────
async function lp(method, path, body) {
  const r = await fetch(`${LP_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-api-key": LP_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || d.error || r.statusText);
  return d;
}

// ── Groq AI helper ────────────────────────────────────────────
async function groqChat(messages, system) {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY not set on Railway");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      messages: [
        { role: "system", content: system },
        ...messages
      ]
    })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || r.statusText);
  return d.choices[0].message.content;
}

const LP_SYSTEM = "You are LP Copilot, an expert LP advisor for Solana Meteora pools. Give concise, actionable advice under 150 words. Be specific with numbers and pool names when available.";

// ── Health ────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ ok: true, lp: !!LP_KEY, ai: !!GROQ_KEY })
);

// ── Positions ─────────────────────────────────────────────────
app.get("/api/positions/open", async (req, res) => {
  try { res.json(await lp("GET", `/lp-positions/opening?owner=${req.query.owner}`)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/positions/overview", async (req, res) => {
  try { res.json(await lp("GET", `/lp-positions/overview?owner=${req.query.owner}&protocol=meteora`)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/positions/revenue", async (req, res) => {
  try { res.json(await lp("GET", `/lp-positions/revenue?owner=${req.query.owner}&range=${req.query.range||"7D"}`)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/positions/logs", async (req, res) => {
  try { res.json(await lp("GET", `/lp-positions/logs?owner=${req.query.owner}&page=${req.query.page||1}&pageSize=20`)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Pools ─────────────────────────────────────────────────────
app.get("/api/pools/discover", async (req, res) => {
  try {
    const qs = new URLSearchParams({ chain:"SOL", sortBy:"vol_24h", sortOrder:"desc", pageSize:18, ...req.query }).toString();
    res.json(await lp("GET", `/pools/discover?${qs}`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/pools/:id/info", async (req, res) => {
  try { res.json(await lp("GET", `/pools/${req.params.id}/info`)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Zap In ────────────────────────────────────────────────────
app.post("/api/zap/in/prepare", async (req, res) => {
  try {
    const { poolId, owner, inputSOL, strategy="Spot", slippageBps=500, rangeWidth=34 } = req.body;
    const info = await lp("GET", `/pools/${poolId}/info`);
    const activeBin = info.data?.liquidityViz?.activeBin?.binId;
    if (!activeBin) throw new Error("Cannot determine active bin");
    const txData = await lp("POST", `/pools/${poolId}/add-tx`, {
      stratergy: strategy, inputSOL: Number(inputSOL), percentX: 0.5,
      fromBinId: activeBin - rangeWidth, toBinId: activeBin + rangeWidth,
      owner, slippage_bps: Number(slippageBps), mode: "zap-in",
    });
    res.json({ lastValidBlockHeight: txData.data.lastValidBlockHeight, swapTxs: txData.data.swapTxsWithJito||[], addLiquidityTxs: txData.data.addLiquidityTxsWithJito||[], meta: txData.data.meta });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/zap/in/land", async (req, res) => {
  try {
    const r = await lp("POST", "/pools/landing-add-tx", { lastValidBlockHeight: req.body.lastValidBlockHeight, swapTxsWithJito: req.body.signedSwapTxs||[], addLiquidityTxsWithJito: req.body.signedAddTxs||[], meta: req.body.meta });
    res.json({ signature: r.data?.signature, explorerUrl: `https://solscan.io/tx/${r.data?.signature}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/zap/out/prepare", async (req, res) => {
  try {
    const { positionId, owner, bps=10000, output="allBaseToken", slippageBps=500 } = req.body;
    const r = await lp("POST", "/position/decrease-tx", { position_id: positionId, bps: Number(bps), owner, slippage_bps: Number(slippageBps), output, provider: "JUPITER_ULTRA" });
    res.json({ lastValidBlockHeight: r.data.lastValidBlockHeight, closeTxs: r.data.closeTxsWithJito||[], swapTxs: r.data.swapTxsWithJito||[] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/zap/out/land", async (req, res) => {
  try {
    const r = await lp("POST", "/position/landing-decrease-tx", { lastValidBlockHeight: req.body.lastValidBlockHeight, closeTxs:[], swapTxs:[], closeTxsWithJito: req.body.signedCloseTxs||[], swapTxsWithJito: req.body.signedSwapTxs||[] });
    res.json({ signature: r.data?.signature, explorerUrl: `https://solscan.io/tx/${r.data?.signature}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI ────────────────────────────────────────────────────────
app.get("/api/ai/status", (_req, res) => res.json({ available: !!GROQ_KEY }));

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, walletData } = req.body;
    const content = walletData
      ? `My portfolio:\n${JSON.stringify(walletData)}\n\nQuestion: ${message}`
      : message;
    const reply = await groqChat([{ role:"user", content }], LP_SYSTEM);
    res.json({ reply });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/ai/analyze", async (req, res) => {
  try {
    const content = `Analyze and return ONLY a JSON array of 3 insights [{"type":"good"|"warn"|"info","title":"...","message":"..."}]. No markdown.\n\nPositions: ${JSON.stringify(req.body.positions?.slice(0,5))}`;
    const text = await groqChat([{ role:"user", content }], "You are an LP advisor. Return ONLY valid JSON arrays, no markdown fences.");
    const clean = text.trim().replace(/```json|```/g,"").trim();
    res.json({ insights: JSON.parse(clean) });
  } catch (e) { res.json({ insights: [{ type:"info", title:"AI Error", message: e.message }] }); }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✓ Backend on port ${PORT}`);
  console.log(`  LP Agent: ${LP_KEY ? "✓" : "✗ MISSING"}`);
  console.log(`  Groq AI:  ${GROQ_KEY ? "✓" : "✗ MISSING"}`);
});
