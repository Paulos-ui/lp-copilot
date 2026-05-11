/**
 * LP Copilot — Frontend API client
 * Calls our backend which proxies to LP Agent API
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// ─── Positions ───────────────────────────────────────────────

export const getOpenPositions = (owner) =>
  apiFetch(`/positions/open?owner=${owner}`);

export const getHistoricalPositions = (owner, page = 1, pageSize = 20) =>
  apiFetch(`/positions/history?owner=${owner}&page=${page}&pageSize=${pageSize}`);

export const getOverviewMetrics = (owner) =>
  apiFetch(`/positions/overview?owner=${owner}`);

export const getPositionRevenue = (owner, range = "7D") =>
  apiFetch(`/positions/revenue?owner=${owner}&range=${range}`);

export const getPositionLogs = (owner, page = 1) =>
  apiFetch(`/positions/logs?owner=${owner}&page=${page}`);

// ─── Pools ───────────────────────────────────────────────────

export const discoverPools = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/pools/discover?${qs}`);
};

export const getPoolInfo = (poolId) => apiFetch(`/pools/${poolId}/info`);

export const getTokenBalances = (wallet) =>
  apiFetch(`/pools/token-balances?wallet=${wallet}`);

// ─── Zap In ──────────────────────────────────────────────────

/**
 * Prepare a Zap-In: returns unsigned transactions to sign with wallet
 */
export const prepareZapIn = (body) =>
  apiFetch("/zap/in/prepare", { method: "POST", body: JSON.stringify(body) });

/**
 * Land a signed Zap-In via Jito bundles
 */
export const landZapIn = (body) =>
  apiFetch("/zap/in/land", { method: "POST", body: JSON.stringify(body) });

// ─── Zap Out ─────────────────────────────────────────────────

export const getZapOutQuote = (positionId, bps = 10000) =>
  apiFetch("/zap/out/quote", {
    method: "POST",
    body: JSON.stringify({ positionId, bps }),
  });

export const prepareZapOut = (body) =>
  apiFetch("/zap/out/prepare", { method: "POST", body: JSON.stringify(body) });

export const landZapOut = (body) =>
  apiFetch("/zap/out/land", { method: "POST", body: JSON.stringify(body) });

// ─── AI ──────────────────────────────────────────────────────

export const chatWithAI = (message, walletData = null) =>
  apiFetch("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, walletData }),
  });

export const analyzePortfolio = (positions, overview) =>
  apiFetch("/ai/analyze", {
    method: "POST",
    body: JSON.stringify({ positions, overview }),
  });

export const getPoolRecommendations = (pools, riskProfile = "medium", budget = null) =>
  apiFetch("/ai/pool-recommendation", {
    method: "POST",
    body: JSON.stringify({ pools, riskProfile, budget }),
  });
