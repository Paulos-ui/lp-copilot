import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

export const aiRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LP_SYSTEM_PROMPT = `You are LP Copilot, an expert AI advisor for Liquidity Providers on Solana, specializing in Meteora DLMM and DAMM V2 pools. You have deep knowledge of:
- LP strategies (Spot, Curve, BidAsk distributions)
- Impermanent loss calculation and mitigation
- Fee optimization and compounding
- Pool selection criteria (TVL, volume, fee/TVL ratio, volatility)
- Zap-in / Zap-out timing
- When to rebalance positions

Always give direct, actionable advice. Use numbers when available. Keep responses concise (under 200 words). Format important figures in bold using **value**.`;

/**
 * POST /api/ai/chat
 * Body: { message, walletData? }
 * walletData: { positions, overview } - optional context from LP Agent
 */
aiRouter.post("/chat", async (req, res) => {
  const { message, walletData } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  let userMessage = message;

  // Inject wallet context if provided
  if (walletData) {
    userMessage = `Context about my portfolio:
${JSON.stringify(walletData, null, 2)}

My question: ${message}`;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: LP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    res.json({ reply: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/analyze
 * Body: { positions, overview }
 * Returns AI-generated insights about the portfolio
 */
aiRouter.post("/analyze", async (req, res) => {
  const { positions, overview } = req.body;
  if (!positions) return res.status(400).json({ error: "positions is required" });

  const prompt = `Analyze this LP portfolio and give me 3 specific, actionable insights:

Open Positions:
${JSON.stringify(positions, null, 2)}

${overview ? `Overview Metrics:\n${JSON.stringify(overview, null, 2)}` : ""}

Return ONLY a JSON array with exactly 3 insights. Each insight:
{
  "type": "good" | "warn" | "info",
  "title": "short title",
  "message": "specific actionable message mentioning pool names and numbers"
}
No other text, just the JSON array.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: LP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    let text = response.content[0].text.trim();
    // Strip possible markdown fences
    text = text.replace(/```json|```/g, "").trim();
    const insights = JSON.parse(text);
    res.json({ insights });
  } catch (err) {
    // Fallback static insights on parse error
    res.json({
      insights: [
        { type: "info", title: "Analysis ready", message: "Connect your wallet to get personalized insights." }
      ]
    });
  }
});

/**
 * POST /api/ai/pool-recommendation
 * Body: { pools, riskProfile: 'low' | 'medium' | 'high', budget? }
 * Returns ranked pool recommendations
 */
aiRouter.post("/pool-recommendation", async (req, res) => {
  const { pools, riskProfile = "medium", budget } = req.body;
  if (!pools?.length) return res.status(400).json({ error: "pools array is required" });

  const prompt = `Given these available pools and a ${riskProfile} risk profile${budget ? ` with $${budget} budget` : ""}, rank the top 3 best pools to enter right now and explain why:

Pools:
${JSON.stringify(pools.slice(0, 20), null, 2)}

Return ONLY a JSON array of top 3 recommendations:
[{
  "poolAddress": "...",
  "pairName": "TOKEN0/TOKEN1",
  "score": 85,
  "reason": "concise reason",
  "strategy": "Spot|Curve|BidAsk",
  "expectedAPR": "X%"
}]
No other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: LP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    let text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    const recommendations = JSON.parse(text);
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
