import { Transaction, VersionedTransaction } from "@solana/web3.js";

/**
 * Signs a base64-encoded transaction using the connected wallet.
 * Handles both legacy and versioned transactions.
 *
 * @param {string} base64Tx - Unsigned transaction in base64
 * @param {object} wallet - Solana wallet adapter wallet object (must have signTransaction)
 * @returns {Promise<string>} Signed transaction in base64
 */
export async function signBase64Transaction(base64Tx, wallet) {
  const buffer = Buffer.from(base64Tx, "base64");

  try {
    // Try versioned transaction first
    const tx = VersionedTransaction.deserialize(buffer);
    const signed = await wallet.signTransaction(tx);
    return Buffer.from(signed.serialize()).toString("base64");
  } catch {
    // Fall back to legacy transaction
    const tx = Transaction.from(buffer);
    const signed = await wallet.signTransaction(tx);
    return signed
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64");
  }
}

/**
 * Signs an array of base64 transactions
 */
export async function signAllBase64Transactions(base64Txs, wallet) {
  return Promise.all(base64Txs.map((tx) => signBase64Transaction(tx, wallet)));
}

/**
 * Full Zap-In flow:
 * 1. Call /api/zap/in/prepare to get unsigned txs
 * 2. Sign with wallet
 * 3. Call /api/zap/in/land to submit
 */
export async function executeZapIn({ poolId, owner, inputSOL, strategy, slippageBps, rangeWidth }, wallet, api) {
  // Step 1: Prepare (get unsigned txs from backend)
  const prepared = await api.prepareZapIn({ poolId, owner, inputSOL, strategy, slippageBps, rangeWidth });

  // Step 2: Sign all transactions
  const signedSwapTxs = await signAllBase64Transactions(prepared.swapTxs || [], wallet);
  const signedAddTxs = await signAllBase64Transactions(prepared.addLiquidityTxs || [], wallet);

  // Step 3: Land via Jito
  const result = await api.landZapIn({
    lastValidBlockHeight: prepared.lastValidBlockHeight,
    signedSwapTxs,
    signedAddTxs,
    meta: prepared.meta,
  });

  return {
    signature: result.signature,
    explorerUrl: result.explorerUrl,
    positionPubKey: prepared.positionPubKey,
  };
}

/**
 * Full Zap-Out flow:
 * 1. Call /api/zap/out/prepare to get unsigned txs
 * 2. Sign with wallet
 * 3. Call /api/zap/out/land to submit
 */
export async function executeZapOut({ positionId, owner, bps, output, slippageBps }, wallet, api) {
  // Step 1: Prepare
  const prepared = await api.prepareZapOut({ positionId, owner, bps, output, slippageBps });

  // Step 2: Sign
  const signedCloseTxs = await signAllBase64Transactions(prepared.closeTxs || [], wallet);
  const signedSwapTxs = await signAllBase64Transactions(prepared.swapTxs || [], wallet);

  // Step 3: Land
  const result = await api.landZapOut({
    lastValidBlockHeight: prepared.lastValidBlockHeight,
    signedCloseTxs,
    signedSwapTxs,
  });

  return {
    signature: result.signature,
    explorerUrl: result.explorerUrl,
  };
}
