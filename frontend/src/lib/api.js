/**
 * LP Copilot — Frontend API client
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (networkErr) {
    // Network failure — backend unreachable
    throw new Error(`Cannot reach backend at ${BASE}. Is Railway running? (${networkErr.message})`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Backend returned non-JSON response [${res.status}]`);
  }

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
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

export const prepareZapIn = (body) =>
  apiFetch("/zap/in/prepare", { method: "POST", body: JSON.stringify(body) });

export const landZapIn = (body) =>
  apiFetch("/zap/in/land", { method: "POST", body: JSON.stringify(body) });

// ─── Zap Out ─────────────────────────────────────────────────

export const getZapOutQuote = (positionId, bps = 10000) =>
  apiFetch("/zap/out/quote", { method: "POST", body: JSON.stringify({ positionId, bps }) });

export const prepareZapOut = (body) =>
  apiFetch("/zap/out/prepare", { method: "POST", body: JSON.stringify(body) });

export const landZapOut = (body) =>
  apiFetch("/zap/out/land", { method: "POST", body: JSON.stringify(body) });

// ─── AI ──────────────────────────────────────────────────────

export const checkAIStatus = () => apiFetch("/ai/status");

export const chatWithAI = (message, walletData = null) =>
  apiFetch("/ai/chat", { method: "POST", body: JSON.stringify({ message, walletData }) });

export const analyzePortfolio = (positions, overview) =>
  apiFetch("/ai/analyze", { method: "POST", body: JSON.stringify({ positions, overview }) });

export const getPoolRecommendations = (pools, riskProfile = "medium", budget = null) =>
  apiFetch("/ai/pool-recommendation", { method: "POST", body: JSON.stringify({ pools, riskProfile, budget }) });
