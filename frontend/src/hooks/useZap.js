import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { executeZapIn, executeZapOut } from "../lib/transactions";
import * as api from "../lib/api";

/**
 * Hook for Zap-In flow
 * Returns { zapIn, loading, error, result }
 */
export function useZapIn() {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const zapIn = useCallback(
    async ({ poolId, inputSOL, strategy = "Spot", slippageBps = 500, rangeWidth = 34 }) => {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const owner = wallet.publicKey.toBase58();
        const res = await executeZapIn(
          { poolId, owner, inputSOL, strategy, slippageBps, rangeWidth },
          wallet,
          api
        );
        setResult(res);
        return res;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet]
  );

  return { zapIn, loading, error, result };
}

/**
 * Hook for Zap-Out flow
 * Returns { zapOut, getQuote, loading, error, result, quote }
 */
export function useZapOut() {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [quote, setQuote] = useState(null);

  const getQuote = useCallback(async (positionId, bps = 10000) => {
    setQuoteLoading(true);
    try {
      const res = await api.getZapOutQuote(positionId, bps);
      setQuote(res.data);
      return res.data;
    } catch (err) {
      setError(err.message);
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  const zapOut = useCallback(
    async ({ positionId, bps = 10000, output = "allBaseToken", slippageBps = 500 }) => {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const owner = wallet.publicKey.toBase58();
        const res = await executeZapOut(
          { positionId, owner, bps, output, slippageBps },
          wallet,
          api
        );
        setResult(res);
        return res;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet]
  );

  return { zapOut, getQuote, loading, quoteLoading, error, result, quote };
}
