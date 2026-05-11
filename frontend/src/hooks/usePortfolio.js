import { useState, useEffect, useCallback } from "react";
import {
  getOpenPositions,
  getOverviewMetrics,
  getPositionRevenue,
  getPositionLogs,
  analyzePortfolio,
} from "../lib/api";

/**
 * Main hook: loads all portfolio data for a connected wallet
 */
export function usePortfolio(walletAddress) {
  const [state, setState] = useState({
    positions: [],
    overview: null,
    revenue: null,
    logs: [],
    aiInsights: [],
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!walletAddress) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      // Parallel fetch everything
      const [posRes, overviewRes, revenueRes, logsRes] = await Promise.allSettled([
        getOpenPositions(walletAddress),
        getOverviewMetrics(walletAddress),
        getPositionRevenue(walletAddress, "7D"),
        getPositionLogs(walletAddress),
      ]);

      const positions = posRes.status === "fulfilled" ? posRes.value.data || [] : [];
      const overview = overviewRes.status === "fulfilled" ? overviewRes.value.data : null;
      const revenue = revenueRes.status === "fulfilled" ? revenueRes.value.data : null;
      const logs = logsRes.status === "fulfilled" ? logsRes.value.data || [] : [];

      setState((s) => ({ ...s, positions, overview, revenue, logs, loading: false }));

      // Load AI insights in the background
      if (positions.length > 0) {
        try {
          const aiRes = await analyzePortfolio(positions, overview);
          setState((s) => ({ ...s, aiInsights: aiRes.insights || [] }));
        } catch {
          // Non-critical — ignore AI errors
        }
      }
    } catch (err) {
      setState((s) => ({ ...s, error: err.message, loading: false }));
    }
  }, [walletAddress]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}

/**
 * Derived portfolio metrics from raw data
 */
export function usePortfolioMetrics(positions, overview) {
  if (!positions?.length && !overview) {
    return { tvl: 0, totalFees: 0, netPnl: 0, totalIL: 0, winRate: 0 };
  }

  // Sum from open positions
  const tvl = positions.reduce((sum, p) => sum + (parseFloat(p.currentValue) || 0), 0);
  const totalFees = positions.reduce((sum, p) => sum + (p.collectedFee || 0) + (p.unCollectedFee || 0), 0);

  // From overview (all-time)
  const netPnl = overview?.total_pnl?.ALL || 0;
  const winRate = (overview?.win_rate?.ALL || 0) * 100;

  // Rough IL estimate: inputValue - currentValue when negative
  const totalIL = positions.reduce((sum, p) => {
    const il = (parseFloat(p.currentValue) || 0) - (p.inputValue || 0);
    return sum + (il < 0 ? il : 0);
  }, 0);

  return {
    tvl,
    totalFees,
    netPnl,
    totalIL,
    winRate,
    openCount: positions.length,
    totalPositions: overview?.total_lp || positions.length,
  };
}
