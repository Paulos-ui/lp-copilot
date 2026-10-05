import { Transaction, VersionedTransaction } from "@solana/web3.js";

const fromBase64 = (value) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const toBase64 = (bytes) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
};

export async function signBase64Transaction(base64Tx, wallet) {
  const bytes = fromBase64(base64Tx);
  try {
    const tx = VersionedTransaction.deserialize(bytes);
    const signed = await wallet.signTransaction(tx);
    return toBase64(signed.serialize());
  } catch {
    const tx = Transaction.from(bytes);
    const signed = await wallet.signTransaction(tx);
    return toBase64(signed.serialize({ requireAllSignatures: false, verifySignatures: false }));
  }
}

export async function signAllBase64Transactions(base64Txs, wallet) {
  return Promise.all(base64Txs.map(tx => signBase64Transaction(tx, wallet)));
}

export async function executeZapIn({ poolId, owner, inputSOL, strategy, slippageBps, rangeWidth }, wallet, api) {
  const prepared = await api.prepareZapIn({ poolId, owner, inputSOL, strategy, slippageBps, rangeWidth });
  const signedSwapTxs = await signAllBase64Transactions(prepared.swapTxs || [], wallet);
  const signedAddTxs = await signAllBase64Transactions(prepared.addLiquidityTxs || [], wallet);
  const result = await api.landZapIn({ lastValidBlockHeight: prepared.lastValidBlockHeight, signedSwapTxs, signedAddTxs, meta: prepared.meta });
  return { signature: result.signature, explorerUrl: result.explorerUrl, positionPubKey: prepared.positionPubKey };
}

export async function executeZapOut({ positionId, owner, bps, output, slippageBps }, wallet, api) {
  const prepared = await api.prepareZapOut({ positionId, owner, bps, output, slippageBps });
  const signedCloseTxs = await signAllBase64Transactions(prepared.closeTxs || [], wallet);
  const signedSwapTxs = await signAllBase64Transactions(prepared.swapTxs || [], wallet);
  const result = await api.landZapOut({ lastValidBlockHeight: prepared.lastValidBlockHeight, signedCloseTxs, signedSwapTxs });
  return { signature: result.signature, explorerUrl: result.explorerUrl };
}
