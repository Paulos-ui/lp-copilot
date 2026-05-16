import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { usePortfolio, usePortfolioMetrics } from "./hooks/usePortfolio";
import { usePools } from "./hooks/usePools";
import { useZapIn, useZapOut } from "./hooks/useZap";
import { chatWithAI } from "./lib/api";

const fmt = (n, dec = 2) =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtUSD = (n) => (n < 0 ? "-$" : "$") + fmt(Math.abs(n));

// ── Metric Card ───────────────────────────────────────────────
function MetricCard({ label, value, color, delta }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".08em", fontFamily: "var(--font-mono)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, fontFamily: "var(--font-mono)", color: `var(--${color})` }}>{value}</div>
      {delta && <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>{delta}</div>}
    </div>
  );
}

// ── Position Row ──────────────────────────────────────────────
function PositionRow({ pos, onZapOut }) {
  const name = `${pos.tokenName0 || "?"}/${pos.tokenName1 || "?"}`;
  const value = fmtUSD(parseFloat(pos.currentValue) || 0);
  const fees = fmtUSD((pos.collectedFee || 0) + (parseFloat(pos.unCollectedFee) || 0));
  const pnl = pos.pnl?.percent != null ? `${pos.pnl.percent >= 0 ? "+" : ""}${fmt(pos.pnl.percent, 2)}%` : "—";
  const pnlColor = pos.pnl?.percent >= 0 ? "var(--green)" : "var(--red)";
  return (
    <tr>
      <td style={{ padding: "12px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex" }}>
            {[pos.logo0, pos.logo1].map((logo, i) => (
              <img key={i} src={logo} alt="" width={24} height={24}
                style={{ borderRadius: "50%", border: "2px solid var(--bg)", marginLeft: i ? -8 : 0 }}
                onError={(e) => { e.target.style.display = "none"; }} />
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <div style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--font-mono)" }}>
              {pos.protocol} · {((pos.poolInfo?.fee || 0) / 10000).toFixed(2)}%
            </div>
          </div>
        </div>
      </td>
      <td style={{ fontFamily: "var(--font-mono)", padding: "12px 8px" }}>{value}</td>
      <td style={{ color: "var(--green)", fontFamily: "var(--font-mono)", padding: "12px 8px" }}>{fees}</td>
      <td style={{ color: pnlColor, fontFamily: "var(--font-mono)", padding: "12px 8px" }}>{pnl}</td>
      <td style={{ padding: "12px 8px" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px",
          borderRadius: 20, fontSize: 11, fontFamily: "var(--font-mono)",
          background: pos.inRange ? "var(--green-dim)" : "var(--amber-dim)",
          color: pos.inRange ? "var(--green)" : "var(--amber)",
          border: `1px solid ${pos.inRange ? "var(--green-mid)" : "#f5a62340"}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
          {pos.inRange ? "In Range" : "Out of Range"}
        </span>
      </td>
      <td style={{ padding: "12px 8px" }}>
        <button onClick={() => onZapOut(pos)} style={{
          padding: "5px 12px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)",
          cursor: "pointer", background: "var(--red-dim)", color: "var(--red)", border: "1px solid #ff4d6a30"
        }}>Zap Out</button>
      </td>
    </tr>
  );
}

// ── Pool Card ─────────────────────────────────────────────────
function PoolCard({ pool, onZapIn }) {
  const name = `${pool.token0_symbol || "?"}/${pool.token1_symbol || "?"}`;
  const apr = pool.tvl && pool.vol_24h && pool.fee
    ? ((pool.vol_24h * pool.fee / pool.tvl) * 365 * 100).toFixed(1) : "—";
  const tvl = pool.tvl ? "$" + (pool.tvl / 1000).toFixed(0) + "K" : "—";
  const vol = pool.vol_24h ? "$" + (pool.vol_24h / 1000).toFixed(0) + "K" : "—";
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>{pool.protocol}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{apr}%</div>
          <div style={{ fontSize: 10, color: "var(--text2)" }}>est. APR</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text2)", marginBottom: 10 }}>
        <span>TVL: {tvl}</span><span>Vol 24h: {vol}</span>
      </div>
      <button onClick={() => onZapIn(pool)} style={{
        width: "100%", padding: 8, borderRadius: 6, fontSize: 12, fontFamily: "var(--font-mono)",
        cursor: "pointer", background: "var(--green-dim)", color: "var(--green)", border: "1px solid var(--green-mid)"
      }}>⚡ Zap In</button>
    </div>
  );
}

// ── AI Chat ───────────────────────────────────────────────────
function AIChat({ positions, overview }) {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm your LP Advisor. Ask me anything — pool selection, when to zap out, how to optimize fees. 🚀" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const walletData = positions?.length ? { positions, overview } : null;
      const res = await chatWithAI(msg, walletData);
      setMessages((m) => [...m, { role: "ai", text: res.reply }]);
    } catch (err) {
      // Show the REAL error so you know exactly what went wrong
      setMessages((m) => [...m, { role: "ai", text: `⚠ Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  const QUICK = ["What pools for 1 SOL?", "Explain impermanent loss", "When should I zap out?", "DLMM vs DAMM V2?"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ color: "var(--green)" }}>✦</span> AI Advisor — Ask LP Copilot
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto", minHeight: 250 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: m.role === "ai" ? "var(--green-dim)" : "var(--blue-dim)",
                border: `1px solid ${m.role === "ai" ? "var(--green-mid)" : "#4d9fff55"}`,
                color: m.role === "ai" ? "var(--green)" : "var(--blue)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11
              }}>
                {m.role === "ai" ? "✦" : "U"}
              </div>
              <div style={{
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "10px 14px", fontSize: 13, lineHeight: 1.6, maxWidth: "80%",
                color: m.text.startsWith("⚠") ? "var(--red)" : "var(--text)"
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green-dim)", border: "1px solid var(--green-mid)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✦</div>
              <div style={{ color: "var(--text2)", fontSize: 12 }}>Thinking...</div>
            </div>
          )}
        </div>
        <div style={{ padding: "0 18px 18px", display: "flex", gap: 8, flexShrink: 0 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about pools, IL, strategy..."
            style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", padding: "10px 14px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 13, outline: "none" }} />
          <button onClick={send} disabled={loading} style={{
            padding: "10px 18px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer", background: "var(--green)", color: "#000",
            border: "none", fontWeight: 700, opacity: loading ? 0.6 : 1
          }}>Send ↗</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {QUICK.map((q) => (
          <button key={q} onClick={() => { setInput(q); }}
            style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer", background: "var(--green-dim)", color: "var(--green)", border: "1px solid var(--green-mid)" }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Zap In Modal ──────────────────────────────────────────────
function ZapInModal({ pool, onClose, onConfirm, loading }) {
  const [inputSOL, setInputSOL] = useState("0.1");
  const [strategy, setStrategy] = useState("Spot");
  if (!pool) return null;
  const name = `${pool.token0_symbol || "?"}/${pool.token1_symbol || "?"}`;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 14, padding: 24, width: 420, maxWidth: "95vw" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--green)", marginBottom: 18 }}>⚡ Zap In — {name}</div>
        <label style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 6 }}>Amount (SOL)</label>
        <input type="number" value={inputSOL} onChange={(e) => setInputSOL(e.target.value)} step="0.01"
          style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", padding: "10px 14px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 14, outline: "none", marginBottom: 14 }} />
        <label style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 6 }}>Strategy</label>
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
          style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", padding: "10px 14px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 13, outline: "none", marginBottom: 18 }}>
          <option value="Spot">Spot — uniform distribution</option>
          <option value="Curve">Curve — concentrated around active bin</option>
          <option value="BidAsk">BidAsk — concentrated at edges</option>
        </select>
        <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "12px 14px", marginBottom: 18 }}>
          {[["Price impact", "<0.01%"], ["Slippage tolerance", "5%"], ["Landing", "Jito bundles ✓"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12, color: "var(--text2)" }}>
              <span>{k}</span><span style={{ color: k === "Landing" ? "var(--green)" : "var(--text)" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 13, cursor: "pointer", background: "transparent", color: "var(--text2)", border: "1px solid var(--border2)" }}>Cancel</button>
          <button onClick={() => onConfirm({ poolId: pool.pool, inputSOL: parseFloat(inputSOL), strategy })} disabled={loading}
            style={{ flex: 1, padding: 12, borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", background: "var(--green)", color: "#000", border: "none", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing..." : "Confirm Zap In ⚡"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Zap Out Modal ─────────────────────────────────────────────
function ZapOutModal({ position, onClose, onConfirm, loading }) {
  const [pct, setPct] = useState(100);
  const [output, setOutput] = useState("allBaseToken");
  if (!position) return null;
  const name = `${position.tokenName0 || "?"}/${position.tokenName1 || "?"}`;
  const value = fmtUSD((parseFloat(position.currentValue) || 0) * pct / 100);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 14, padding: 24, width: 420, maxWidth: "95vw" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--red)", marginBottom: 18 }}>↩ Zap Out — {name}</div>
        <label style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 6 }}>Withdraw Amount</label>
        <input type="range" min={10} max={100} step={10} value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ width: "100%", marginBottom: 4, accentColor: "var(--red)" }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--red)", marginBottom: 14 }}>
          {pct}% <span style={{ fontSize: 13, color: "var(--text2)" }}>≈ {value}</span>
        </div>
        <label style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 6 }}>Receive as</label>
        <select value={output} onChange={(e) => setOutput(e.target.value)}
          style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", padding: "10px 14px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 13, outline: "none", marginBottom: 18 }}>
          <option value="allBaseToken">SOL (recommended)</option>
          <option value="both">Both tokens (no swap)</option>
          <option value="allToken0">{position.tokenName0} only</option>
          <option value="allToken1">{position.tokenName1} only</option>
        </select>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 13, cursor: "pointer", background: "transparent", color: "var(--text2)", border: "1px solid var(--border2)" }}>Cancel</button>
          <button onClick={() => onConfirm({ positionId: position.id, bps: pct * 100, output })} disabled={loading}
            style={{ flex: 1, padding: 12, borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", background: "var(--red)", color: "#fff", border: "none", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing..." : "Confirm Zap Out ↩"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() || null;

  const [page, setPage] = useState("portfolio");
  const [zapInPool, setZapInPool] = useState(null);
  const [zapOutPos, setZapOutPos] = useState(null);
  const [toast, setToast] = useState(null);

  const { positions, overview, aiInsights, loading: portLoading } = usePortfolio(owner);
  const metrics = usePortfolioMetrics(positions, overview);
  const { pools, loading: poolsLoading, updateFilter } = usePools();
  const { zapIn, loading: zapInLoading } = useZapIn();
  const { zapOut, loading: zapOutLoading } = useZapOut();

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleZapIn({ poolId, inputSOL, strategy }) {
    try {
      const res = await zapIn({ poolId, inputSOL, strategy });
      setZapInPool(null);
      showToast(`✓ Zap In confirmed! Tx: ${res.signature?.slice(0, 8)}...`);
    } catch (err) {
      showToast(`✗ ${err.message}`, false);
    }
  }

  async function handleZapOut({ positionId, bps, output }) {
    try {
      const res = await zapOut({ positionId, bps, output });
      setZapOutPos(null);
      showToast(`✓ Zap Out confirmed! Tx: ${res.signature?.slice(0, 8)}...`);
    } catch (err) {
      showToast(`✗ ${err.message}`, false);
    }
  }

  const NAV = [
    { id: "portfolio", label: "Overview", icon: "◈" },
    { id: "positions", label: "Positions", icon: "⊞" },
    { id: "discover", label: "Discover Pools", icon: "⊕" },
    { id: "ai", label: "AI Advisor", icon: "✦" },
  ];

  const thCol = { fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".1em", padding: "0 8px 12px 0", fontFamily: "var(--font-mono)", fontWeight: 400, textAlign: "left" };

  return (
    <>
      {/* ── Full-screen grid layout ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gridTemplateRows: "56px 1fr",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)"
      }}>

        {/* Topbar */}
        <header style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "var(--surface)", borderBottom: "1px solid var(--border)", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--green)" }}>
            <div style={{ width: 8, height: 8, background: "var(--green)", borderRadius: "50%", boxShadow: "0 0 10px var(--green)" }} />
            LP Copilot
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ background: "#1a2940", border: "1px solid var(--blue)", color: "var(--blue)", fontSize: 11, padding: "3px 10px", borderRadius: 20, fontFamily: "var(--font-mono)" }}>◉ Mainnet</span>
            <WalletMultiButton />
          </div>
        </header>

        {/* Sidebar */}
        <nav style={{ background: "var(--surface)", borderRight: "1px solid var(--border)", padding: "20px 0", overflowY: "auto" }}>
          {NAV.map((n) => (
            <div key={n.id} onClick={() => setPage(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", cursor: "pointer",
              fontSize: 13, transition: "all .15s",
              color: page === n.id ? "var(--green)" : "var(--text2)",
              background: page === n.id ? "var(--green-dim)" : "transparent",
              borderLeft: `2px solid ${page === n.id ? "var(--green)" : "transparent"}`,
            }}>
              <span>{n.icon}</span> {n.label}
            </div>
          ))}
        </nav>

        {/* Main scrollable content */}
        <main style={{ overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── PORTFOLIO PAGE ── */}
          {page === "portfolio" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                <MetricCard label="Net PnL (All Time)" value={fmtUSD(metrics.netPnl)} color="green" delta={owner ? `${metrics.openCount} open positions` : "Connect wallet"} />
                <MetricCard label="Total Value Locked" value={fmtUSD(metrics.tvl)} color="amber" delta="Across all positions" />
                <MetricCard label="Fees Earned" value={fmtUSD(metrics.totalFees)} color="blue" delta="Collected + uncollected" />
                <MetricCard label="Impermanent Loss" value={fmtUSD(metrics.totalIL)} color="red" delta={`Win rate: ${fmt(metrics.winRate, 1)}%`} />
              </div>

              {/* AI Insights Panel */}
              {aiInsights.length > 0 && (
                <div style={{ background: "linear-gradient(135deg,#0d1a14,#0a1520)", border: "1px solid #1a3a28", borderRadius: 10, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ background: "var(--green-dim)", border: "1px solid var(--green-mid)", color: "var(--green)", fontSize: 10, padding: "3px 8px", borderRadius: 20, fontFamily: "var(--font-mono)" }}>✦ AI ADVISOR</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>Portfolio Intelligence</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {aiInsights.map((ins, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8,
                        background: ins.type === "good" ? "var(--green-dim)" : ins.type === "warn" ? "var(--amber-dim)" : "var(--blue-dim)",
                        border: `1px solid ${ins.type === "good" ? "#00d68f20" : ins.type === "warn" ? "#f5a62320" : "#4d9fff20"}`
                      }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{ins.type === "good" ? "◉" : ins.type === "warn" ? "⚠" : "✦"}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.6 }}><strong>{ins.title}:</strong> {ins.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!owner && (
                <div style={{ textAlign: "center", padding: 60, color: "var(--text2)", border: "1px dashed var(--border2)", borderRadius: 10 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>Connect your Phantom wallet to see live LP positions</div>
                </div>
              )}

              {portLoading && <div style={{ color: "var(--text2)", textAlign: "center", padding: 20 }}>Loading positions...</div>}

              {positions.length > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>Open Positions</span>
                    <button onClick={() => setPage("discover")} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)", cursor: "pointer", background: "var(--green-dim)", color: "var(--green)", border: "1px solid var(--green-mid)" }}>+ Zap In</button>
                  </div>
                  <div style={{ padding: "0 18px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Pool", "Value", "Fees", "PnL", "Status", "Action"].map((h) => <th key={h} style={thCol}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {positions.map((pos) => <PositionRow key={pos.id} pos={pos} onZapOut={setZapOutPos} />)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── POSITIONS PAGE ── */}
          {page === "positions" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700 }}>Open Positions</div>
                <button onClick={() => setPage("discover")} style={{ padding: "7px 16px", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer", background: "var(--green-dim)", color: "var(--green)", border: "1px solid var(--green-mid)" }}>+ Zap Into New Pool</button>
              </div>
              {!owner
                ? <div style={{ color: "var(--text2)", padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 10 }}>Connect wallet to view positions</div>
                : positions.length === 0
                  ? <div style={{ color: "var(--text2)", padding: 40, textAlign: "center", border: "1px dashed var(--border2)", borderRadius: 10 }}>No open positions found</div>
                  : (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
                      <div style={{ padding: "0 18px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {["Pool", "Value", "Fees", "PnL", "Status", "Action"].map((h) => <th key={h} style={{ ...thCol, paddingTop: 14 }}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {positions.map((pos) => <PositionRow key={pos.id} pos={pos} onZapOut={setZapOutPos} />)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
              }
            </>
          )}

          {/* ── DISCOVER PAGE ── */}
          {page === "discover" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700 }}>Discover Pools</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[["vol_24h", "By Volume"], ["tvl", "By TVL"], ["fee_tvl_ratio", "Fee/TVL"]].map(([val, label]) => (
                    <button key={val} onClick={() => updateFilter("sortBy", val)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)", cursor: "pointer", background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}>{label}</button>
                  ))}
                </div>
              </div>
              {poolsLoading
                ? <div style={{ color: "var(--text2)", textAlign: "center", padding: 40 }}>Loading pools...</div>
                : <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {pools.map((pool) => <PoolCard key={pool.pool} pool={pool} onZapIn={setZapInPool} />)}
                  </div>
              }
            </>
          )}

          {/* ── AI ADVISOR PAGE ── */}
          {page === "ai" && <AIChat positions={positions} overview={overview} />}

        </main>
      </div>

      {/* Modals (outside grid so they overlay everything) */}
      <ZapInModal pool={zapInPool} onClose={() => setZapInPool(null)} onConfirm={handleZapIn} loading={zapInLoading} />
      <ZapOutModal position={zapOutPos} onClose={() => setZapOutPos(null)} onConfirm={handleZapOut} loading={zapOutLoading} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 300,
          background: toast.ok ? "var(--green)" : "var(--red)",
          color: toast.ok ? "#000" : "#fff",
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
          padding: "10px 20px", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,.4)"
        }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
