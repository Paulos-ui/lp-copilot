import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

export const aiRouter = Router();

// GET /api/ai/status — diagnose key issues
aiRouter.get("/status", (_req, res) => {
  const available = !!process.env.ANTHROPIC_API_KEY;
  res.json({
    available,
    keyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) + "..." || "NOT SET",
    message: available ? "AI ready" : "ANTHROPIC_API_KEY not configured on Railway"
  });
});

const LP_SYSTEM_PROMPT = `You are LP Copilot, an expert AI advisor for Liquidity Providers on Solana, specializing in Meteora DLMM and DAMM V2 pools. You have deep knowledge of LP strategies, impermanent loss, fee optimization, pool selection, and when to zap in/out. Give direct, actionable advice under 200 words.`;

// POST /api/ai/chat
aiRouter.post("/chat", async (req, res) => {
  const { message, walletData } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY is not set. Go to Railway → Variables and add it."
    });
  }

  let userMessage = message;
  if (walletData) {
    userMessage = `My portfolio:\n${JSON.stringify(walletData, null, 2)}\n\nQuestion: ${message}`;
  }

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: LP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error("Anthropic error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/analyze
aiRouter.post("/analyze", async (req, res) => {
  const { positions, overview } = req.body;
  if (!positions) return res.status(400).json({ error: "positions is required" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set on Railway" });

  const prompt = `Analyze this LP portfolio and return ONLY a JSON array of exactly 3 insights. Each: {"type":"good"|"warn"|"info","title":"short title","message":"actionable advice with numbers"}. No other text.

Positions: ${JSON.stringify(positions, null, 2)}
${overview ? `Overview: ${JSON.stringify(overview, null, 2)}` : ""}`;

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: LP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    let text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    res.json({ insights: JSON.parse(text) });
  } catch (err) {
    console.error("AI analyze error:", err.message);
    res.json({ insights: [{ type: "info", title: "Analysis error", message: err.message }] });
  }
});

// POST /api/ai/pool-recommendation
aiRouter.post("/pool-recommendation", async (req, res) => {
  const { pools, riskProfile = "medium", budget } = req.body;
  if (!pools?.length) return res.status(400).json({ error: "pools array is required" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set on Railway" });

  const prompt = `Given these pools and a ${riskProfile} risk profile${budget ? ` with $${budget}` : ""}, return ONLY a JSON array of top 3 recommendations: [{"poolAddress":"...","pairName":"X/Y","score":85,"reason":"...","strategy":"Spot|Curve|BidAsk","expectedAPR":"X%"}]. No other text.

Pools: ${JSON.stringify(pools.slice(0, 20), null, 2)}`;

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: LP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    let text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    res.json({ recommendations: JSON.parse(text) });
  } catch (err) {
    console.error("AI recommend error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
