import { useState, useEffect, useCallback } from "react";
import { discoverPools, getPoolRecommendations } from "../lib/api";

/**
 * Hook for pool discovery with filters
 */
export function usePools(initialFilters = {}) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    sortBy: "vol_24h",
    sortOrder: "desc",
    pageSize: 20,
    min_liquidity: 10000,
    ...initialFilters,
  });

  const load = useCallback(async (overrideFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const merged = { ...filters, ...overrideFilters };
      const res = await discoverPools(merged);
      setPools(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  return { pools, loading, error, pagination, filters, updateFilter, refresh: load };
}

/**
 * Hook for AI pool recommendations
 */
export function usePoolRecommendations(pools, riskProfile = "medium") {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!pools?.length) return;
    setLoading(true);
    try {
      const res = await getPoolRecommendations(pools, riskProfile);
      setRecommendations(res.recommendations || []);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [pools, riskProfile]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { recommendations, loading };
}

/**
 * Format pool display name
 */
export function formatPoolName(pool) {
  const t0 = pool.token0_symbol || pool.token0?.slice(0, 4) || "?";
  const t1 = pool.token1_symbol || pool.token1?.slice(0, 4) || "?";
  return `${t0}/${t1}`;
}

/**
 * Calculate estimated APR from fee/TVL ratio
 */
export function estimateAPR(pool) {
  if (!pool.tvl || !pool.vol_24h || !pool.fee) return null;
  // APR ≈ (24h_fees / TVL) * 365 * 100
  const dailyFees = pool.vol_24h * pool.fee;
  return ((dailyFees / pool.tvl) * 365 * 100).toFixed(1);
}
