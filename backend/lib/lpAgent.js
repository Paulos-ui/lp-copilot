/**
 * LP Agent API client
 * Base URL: https://api.lpagent.io/open-api/v1
 * Auth: x-api-key header
 */

const API_BASE = "https://api.lpagent.io/open-api/v1";

export function getApiKey() {
  const key = process.env.LP_AGENT_API_KEY;
  if (!key) throw new Error("LP_AGENT_API_KEY not set in environment");
  return key;
}

export async function lpApi(method, path, body = undefined) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText;
    throw new Error(`LP Agent API error [${res.status}]: ${msg}`);
  }

  return data;
}

// ─── Positions ────────────────────────────────────────────────

/** Get all open LP positions for a wallet */
export async function getOpenPositions(owner) {
  return lpApi("GET", `/lp-positions/opening?owner=${owner}`);
}

/** Get historical LP positions for a wallet */
export async function getHistoricalPositions(owner, page = 1, pageSize = 20) {
  return lpApi("GET", `/lp-positions/history?owner=${owner}&page=${page}&pageSize=${pageSize}`);
}

/** Get overview/metrics for a wallet's LP positions */
export async function getOverviewMetrics(owner, protocol = "meteora") {
  return lpApi("GET", `/lp-positions/overview?owner=${owner}&protocol=${protocol}`);
}

/** Get revenue / PnL over time (7D or 1M) */
export async function getPositionRevenue(owner, range = "7D") {
  return lpApi("GET", `/lp-positions/revenue?owner=${owner}&range=${range}`);
}

/** Get transaction logs for an owner's positions */
export async function getPositionLogs(owner, page = 1, pageSize = 20) {
  return lpApi("GET", `/lp-positions/logs?owner=${owner}&page=${page}&pageSize=${pageSize}`);
}

// ─── Pools ────────────────────────────────────────────────────

/**
 * Discover pools with optional filters
 * sortBy: mcap | created_at | vol_24h | tvl | fee_tvl_ratio | volatility
 */
export async function discoverPools(params = {}) {
  const defaults = {
    chain: "SOL",
    sortBy: "vol_24h",
    sortOrder: "desc",
    page: 1,
    pageSize: 20,
    feeTVLInterval: "24h",
  };
  const merged = { ...defaults, ...params };
  const qs = new URLSearchParams(
    Object.entries(merged).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  return lpApi("GET", `/pools/discover?${qs}`);
}

/** Get full info for a specific pool (includes activeBin for zap-in range) */
export async function getPoolInfo(poolId) {
  return lpApi("GET", `/pools/${poolId}/info`);
}

/** Get onchain stats for a pool */
export async function getPoolStats(poolId) {
  return lpApi("GET", `/pools/${poolId}/stats`);
}

/** Get positions inside a specific pool */
export async function getPoolPositions(poolId, page = 1, pageSize = 20) {
  return lpApi("GET", `/pools/${poolId}/positions?page=${page}&pageSize=${pageSize}`);
}

/** Get top LP providers for a pool (Premium endpoint) */
export async function getTopLPers(poolId, page = 1, pageSize = 10) {
  return lpApi("GET", `/pools/${poolId}/top-lpers?page=${page}&pageSize=${pageSize}`);
}

// ─── Token ────────────────────────────────────────────────────

/** Get token balances for a wallet */
export async function getTokenBalances(wallet) {
  return lpApi("GET", `/token/balances?wallet=${wallet}`);
}

// ─── Zap In ───────────────────────────────────────────────────

/**
 * Step 1: Generate unsigned Zap-In transactions
 * strategy: Spot | Curve | BidAsk
 * mode: zap-in (auto-swap SOL) | normal (provide both tokens)
 */
export async function generateZapInTx({
  poolId,
  owner,
  inputSOL,
  percentX = 0.5,
  fromBinId,
  toBinId,
  strategy = "Spot",
  slippageBps = 500,
  mode = "zap-in",
}) {
  return lpApi("POST", `/pools/${poolId}/add-tx`, {
    stratergy: strategy, // note: API has a typo "stratergy"
    inputSOL,
    percentX,
    fromBinId,
    toBinId,
    owner,
    slippage_bps: slippageBps,
    mode,
  });
}

/**
 * Step 2: Submit signed Zap-In transactions via Jito
 */
export async function landZapInTx({ lastValidBlockHeight, swapTxsWithJito, addLiquidityTxsWithJito, meta }) {
  return lpApi("POST", "/pools/landing-add-tx", {
    lastValidBlockHeight,
    swapTxsWithJito,
    addLiquidityTxsWithJito,
    meta,
  });
}

// ─── Zap Out ──────────────────────────────────────────────────

/**
 * Get quotes before withdrawing (optional preview step)
 * bps: 10000 = 100%, 5000 = 50%, etc.
 */
export async function getZapOutQuotes({ positionId, bps = 10000 }) {
  return lpApi("POST", "/position/decrease-quotes", {
    id: positionId,
    bps,
  });
}

/**
 * Step 1: Generate unsigned Zap-Out transactions
 * output: allBaseToken | both | allToken0 | allToken1
 */
export async function generateZapOutTx({
  positionId,
  owner,
  bps = 10000,
  output = "allBaseToken",
  slippageBps = 500,
}) {
  return lpApi("POST", "/position/decrease-tx", {
    position_id: positionId,
    bps,
    owner,
    slippage_bps: slippageBps,
    output,
    provider: "JUPITER_ULTRA",
  });
}

/**
 * Step 2: Submit signed Zap-Out transactions via Jito
 */
export async function landZapOutTx({ lastValidBlockHeight, closeTxsWithJito, swapTxsWithJito }) {
  return lpApi("POST", "/position/landing-decrease-tx", {
    lastValidBlockHeight,
    closeTxs: [],
    swapTxs: [],
    closeTxsWithJito,
    swapTxsWithJito,
  });
}
