import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { usePortfolio, usePortfolioMetrics } from "./hooks/usePortfolio";
import { usePools } from "./hooks/usePools";
import { useZapIn, useZapOut } from "./hooks/useZap";
import * as api from "./lib/api";

export default function App() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  const { positions, overview, logs, aiInsights, loading, refresh } = usePortfolio(walletAddress);
  const metrics = usePortfolioMetrics(positions, overview);
  const { pools } = usePools();

  const { zapIn, loading: zapInLoading } = useZapIn();
  const { zapOut, getQuote, loading: zapOutLoading } = useZapOut();

  const fmt = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);

  const [chatMsg, setChatMsg] = React.useState("");
  const [chatHistory, setChatHistory] = React.useState([
    { role: "ai", text: "Hi! I'm LP Copilot. Ask me anything about your positions or LP strategy. 🚀" },
  ]);
  const [chatLoading, setChatLoading] = React.useState(false);
  const [activePage, setActivePage] = React.useState("overview");

  async function sendChat() {
    if (!chatMsg.trim()) return;
    const msg = chatMsg.trim();
    setChatMsg("");
    setChatHistory((h) => [...h, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const walletData = positions.length ? { positions: positions.slice(0, 5), overview } : null;
      const res = await api.chatWithAI(msg, walletData);
      setChatHistory((h) => [...h, { role: "ai", text: res.reply }]);
    } catch {
      setChatHistory((h) => [...h, { role: "ai", text: "Sorry, AI is unavailable right now." }]);
    } finally {
      setChatLoading(false);
    }
  }

  // ── Styles ──────────────────────────────────────────────────────
  const s = {
    app: { fontFamily: "'DM Sans', sans-serif", background: "#0a0d0f", minHeight: "100vh", color: "#e8edf2" },
    topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 56, borderBottom: "1px solid #1e2428", background: "#111518" },
    logo: { fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: "#00d68f", display: "flex", alignItems: "center", gap: 10 },
    dot: { width: 8, height: 8, borderRadius: "50%", background: "#00d68f" },
    layout: { display: "grid", gridTemplateColumns: "200px 1fr", minHeight: "calc(100vh - 56px)" },
    sidebar: { background: "#111518", borderRight: "1px solid #1e2428", padding: "16px 0" },
    navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", cursor: "pointer", color: active ? "#00d68f" : "#7a8a96", borderLeft: `2px solid ${active ? "#00d68f" : "transparent"}`, background: active ? "#00d68f18" : "transparent", fontSize: 13, transition: "all .2s" }),
    main: { padding: 24, background: "#0a0d0f", display: "flex", flexDirection: "column", gap: 20 },
    grid4: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 },
    card: { background: "#111518", border: "1px solid #1e2428", borderRadius: 10, overflow: "hidden" },
    cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #1e2428" },
    cardTitle: { fontFamily: "monospace", fontSize: 13, fontWeight: 700 },
    cardBody: { padding: 18 },
    metric: { background: "#111518", border: "1px solid #1e2428", borderRadius: 10, padding: "16px 18px" },
    metricLabel: { fontSize: 11, color: "#7a8a96", textTransform: "uppercase", letterSpacing: ".08em", fontFamily: "monospace", marginBottom: 6 },
    metricValue: (color) => ({ fontSize: 24, fontWeight: 600, fontFamily: "monospace", color: color || "#e8edf2" }),
    table: { width: "100%", borderCollapse: "collapse" },
    th: { fontSize: 10, color: "#3d4f5c", textTransform: "uppercase", letterSpacing: ".1em", padding: "0 0 10px", fontFamily: "monospace", textAlign: "left" },
    td: { padding: "12px 0", borderBottom: "1px solid #1e2428", verticalAlign: "middle", fontSize: 13 },
    badge: (color, bg, border) => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontFamily: "monospace", background: bg, color, border: `1px solid ${border}` }),
    btn: (color, bg, border) => ({ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "monospace", cursor: "pointer", background: bg, color, border: `1px solid ${border}`, transition: "all .2s" }),
    input: { width: "100%", background: "#181d21", border: "1px solid #252c32", color: "#e8edf2", padding: "10px 14px", borderRadius: 8, fontFamily: "monospace", fontSize: 14, outline: "none" },
    aiPanel: { background: "#0d1a14", border: "1px solid #1a3a28", borderRadius: 10, padding: 18 },
    insight: (type) => {
      const map = { good: ["#00d68f18", "#00d68f30", "#00d68f"], warn: ["#f5a62318", "#f5a62330", "#f5a623"], info: ["#4d9fff18", "#4d9fff30", "#4d9fff"] };
      const [bg, border, color] = map[type] || map.info;
      return { display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8, background: bg, border: `1px solid ${border}`, marginBottom: 8 };
    },
    chatBubble: (role) => ({ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: role === "user" ? "row-reverse" : "row", marginBottom: 10 }),
    bubble: (role) => ({ background: "#181d21", border: "1px solid #1e2428", borderRadius: 8, padding: "10px 14px", fontSize: 13, lineHeight: 1.6, maxWidth: "80%" }),
  };

  const pages = ["overview", "positions", "discover", "ai"];
  const pageIcons = { overview: "◈", positions: "⊞", discover: "⊕", ai: "✦" };

  return (
    <div style={s.app}>
      {/* Google font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Topbar */}
      <header style={s.topbar}>
        <div style={s.logo}><div style={s.dot} />LP Copilot</div>
        <WalletMultiButton style={{ background: "#00d68f18", border: "1px solid #00d68f55", color: "#00d68f", fontSize: 12, fontFamily: "monospace", borderRadius: 8 }} />
      </header>

      <div style={s.layout}>
        {/* Sidebar */}
        <nav style={s.sidebar}>
          {pages.map((p) => (
            <div key={p} style={s.navItem(activePage === p)} onClick={() => setActivePage(p)}>
              <span>{pageIcons[p]}</span>
              <span style={{ textTransform: "capitalize" }}>{p === "ai" ? "AI Advisor" : p}</span>
            </div>
          ))}
        </nav>

        {/* Main */}
        <main style={s.main}>

          {/* ── OVERVIEW ── */}
          {activePage === "overview" && (
            <>
              {!connected && (
                <div style={{ ...s.card, padding: 32, textAlign: "center", color: "#7a8a96" }}>
                  Connect your Phantom wallet above to view your LP portfolio
                </div>
              )}
              {connected && (
                <>
                  <div style={s.grid4}>
                    <div style={s.metric}><div style={s.metricLabel}>Net PnL (All time)</div><div style={s.metricValue("#00d68f")}>{fmt(metrics.netPnl)}</div></div>
                    <div style={s.metric}><div style={s.metricLabel}>Total Value Locked</div><div style={s.metricValue("#f5a623")}>{fmt(metrics.tvl)}</div></div>
                    <div style={s.metric}><div style={s.metricLabel}>Fees Earned</div><div style={s.metricValue("#4d9fff")}>{fmt(metrics.totalFees)}</div></div>
                    <div style={s.metric}><div style={s.metricLabel}>Win Rate</div><div style={s.metricValue("#00d68f")}>{metrics.winRate.toFixed(1)}%</div></div>
                  </div>

                  {/* AI Insights */}
                  <div style={s.aiPanel}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span style={{ ...s.badge("#00d68f", "#00d68f18", "#00d68f55"), fontSize: 10 }}>✦ AI ADVISOR</span>
                      <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>Portfolio Intelligence</span>
                    </div>
                    {loading && <div style={{ color: "#7a8a96", fontSize: 13 }}>Analyzing your positions...</div>}
                    {aiInsights.map((ins, i) => (
                      <div key={i} style={s.insight(ins.type)}>
                        <span style={{ fontSize: 18 }}>{ins.type === "good" ? "◉" : ins.type === "warn" ? "⚠" : "✦"}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{ins.title}</div>
                          <div style={{ fontSize: 12, color: "#b0bec5", lineHeight: 1.6 }}>{ins.message}</div>
                        </div>
                      </div>
                    ))}
                    {!loading && aiInsights.length === 0 && positions.length === 0 && (
                      <div style={{ color: "#7a8a96", fontSize: 13 }}>No open positions found. Discover pools below to get started.</div>
                    )}
                  </div>

                  {/* Positions table */}
                  <div style={s.card}>
                    <div style={s.cardHead}>
                      <span style={s.cardTitle}>Open Positions ({positions.length})</span>
                      <button style={s.btn("#00d68f", "#00d68f18", "#00d68f55")} onClick={() => setActivePage("discover")}>+ Zap Into Pool</button>
                    </div>
                    <div style={{ padding: "0 18px" }}>
                      <table style={s.table}>
                        <thead><tr>
                          <th style={s.th}>Pool</th><th style={s.th}>Value</th><th style={s.th}>Fees</th><th style={s.th}>PnL</th><th style={s.th}>Status</th><th style={s.th}>Action</th>
                        </tr></thead>
                        <tbody>
                          {positions.length === 0 && !loading && (
                            <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#7a8a96", padding: 30 }}>No open positions</td></tr>
                          )}
                          {positions.map((pos, i) => (
                            <tr key={i}>
                              <td style={s.td}><div style={{ fontWeight: 500 }}>{pos.pairName || `${pos.tokenName0}/${pos.tokenName1}`}</div><div style={{ fontSize: 11, color: "#7a8a96", fontFamily: "monospace" }}>{pos.protocol}</div></td>
                              <td style={{ ...s.td, fontFamily: "monospace" }}>{fmt(parseFloat(pos.currentValue))}</td>
                              <td style={{ ...s.td, fontFamily: "monospace", color: "#00d68f" }}>+{fmt(pos.collectedFee || 0)}</td>
                              <td style={{ ...s.td, fontFamily: "monospace", color: (pos.pnl?.value || 0) >= 0 ? "#00d68f" : "#ff4d6a" }}>{fmt(pos.pnl?.value || 0)}</td>
                              <td style={s.td}><span style={s.badge(pos.inRange ? "#00d68f" : "#f5a623", pos.inRange ? "#00d68f18" : "#f5a62318", pos.inRange ? "#00d68f55" : "#f5a62340")}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />{pos.inRange ? "In Range" : "Out of Range"}</span></td>
                              <td style={s.td}>
                                <button
                                  style={s.btn("#ff4d6a", "#ff4d6a18", "#ff4d6a30")}
                                  disabled={zapOutLoading}
                                  onClick={async () => {
                                    if (!window.confirm(`Zap out 100% of ${pos.pairName}?`)) return;
                                    try {
                                      const res = await zapOut({ positionId: pos.id, bps: 10000 });
                                      alert(`✅ Zap Out success!\nTx: ${res.signature}`);
                                      refresh();
                                    } catch (e) {
                                      alert(`❌ Zap Out failed: ${e.message}`);
                                    }
                                  }}
                                >
                                  {zapOutLoading ? "..." : "Zap Out"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── POSITIONS ── */}
          {activePage === "positions" && (
            <div style={s.card}>
              <div style={s.cardHead}><span style={s.cardTitle}>All Open Positions</span></div>
              <div style={{ padding: "0 18px" }}>
                <table style={s.table}>
                  <thead><tr>
                    <th style={s.th}>Pool</th><th style={s.th}>Value</th><th style={s.th}>Input</th><th style={s.th}>Fees</th><th style={s.th}>PnL %</th><th style={s.th}>In Range</th><th style={s.th}>Age</th>
                  </tr></thead>
                  <tbody>
                    {positions.map((pos, i) => (
                      <tr key={i}>
                        <td style={s.td}><b>{pos.pairName || `${pos.tokenName0}/${pos.tokenName1}`}</b><br /><span style={{ fontSize: 11, color: "#7a8a96", fontFamily: "monospace" }}>{pos.position?.slice(0, 8)}...</span></td>
                        <td style={{ ...s.td, fontFamily: "monospace" }}>{fmt(parseFloat(pos.currentValue))}</td>
                        <td style={{ ...s.td, fontFamily: "monospace", color: "#7a8a96" }}>{fmt(pos.inputValue)}</td>
                        <td style={{ ...s.td, fontFamily: "monospace", color: "#00d68f" }}>+{fmt(pos.collectedFee)}</td>
                        <td style={{ ...s.td, fontFamily: "monospace", color: (pos.pnl?.percent || 0) >= 0 ? "#00d68f" : "#ff4d6a" }}>{(pos.pnl?.percent || 0).toFixed(2)}%</td>
                        <td style={s.td}><span style={{ color: pos.inRange ? "#00d68f" : "#f5a623" }}>{pos.inRange ? "✓" : "✗"}</span></td>
                        <td style={{ ...s.td, color: "#7a8a96", fontSize: 12 }}>{pos.age}d</td>
                      </tr>
                    ))}
                    {positions.length === 0 && <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#7a8a96", padding: 30 }}>Connect wallet to view positions</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── DISCOVER POOLS ── */}
          {activePage === "discover" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600, fontSize: 20 }}>Discover Pools</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                {pools.slice(0, 12).map((pool, i) => {
                  const name = `${pool.token0_symbol || "?"}/${pool.token1_symbol || "?"}`;
                  const apr = pool.tvl && pool.vol_24h ? ((pool.vol_24h * (pool.fee || 0.003) / pool.tvl) * 365 * 100).toFixed(1) : "N/A";
                  return (
                    <div key={i} style={{ ...s.card, padding: 14, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>
                          <div style={{ fontSize: 11, color: "#7a8a96" }}>{pool.protocol}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#00d68f" }}>{apr}%</div>
                          <div style={{ fontSize: 11, color: "#7a8a96" }}>est. APR</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7a8a96", marginBottom: 10 }}>
                        <span>Vol 24h: ${(pool.vol_24h / 1000).toFixed(0)}K</span>
                        <span>TVL: ${(pool.tvl / 1000).toFixed(0)}K</span>
                      </div>
                      <button
                        style={{ ...s.btn("#00d68f", "#00d68f18", "#00d68f55"), width: "100%" }}
                        disabled={!connected || zapInLoading}
                        onClick={async () => {
                          const solAmt = prompt(`Zap into ${name}\n\nHow much SOL?`, "0.1");
                          if (!solAmt) return;
                          try {
                            const res = await zapIn({ poolId: pool.pool, inputSOL: parseFloat(solAmt) });
                            alert(`✅ Zap In success!\nTx: ${res.signature}`);
                            refresh();
                          } catch (e) {
                            alert(`❌ Zap In failed: ${e.message}`);
                          }
                        }}
                      >
                        {connected ? (zapInLoading ? "Processing..." : "⚡ Zap In") : "Connect wallet to Zap In"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── AI ADVISOR ── */}
          {activePage === "ai" && (
            <div style={s.card}>
              <div style={s.cardHead}><span style={s.cardTitle}>✦ AI Advisor — Ask LP Copilot</span></div>
              <div style={s.cardBody}>
                <div style={{ maxHeight: 400, overflowY: "auto", marginBottom: 14 }}>
                  {chatHistory.map((m, i) => (
                    <div key={i} style={s.chatBubble(m.role)}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.role === "ai" ? "#00d68f18" : "#4d9fff18", border: `1px solid ${m.role === "ai" ? "#00d68f55" : "#4d9fff55"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: m.role === "ai" ? "#00d68f" : "#4d9fff", flexShrink: 0 }}>
                        {m.role === "ai" ? "✦" : "U"}
                      </div>
                      <div style={s.bubble(m.role)}>{m.text}</div>
                    </div>
                  ))}
                  {chatLoading && <div style={{ color: "#7a8a96", fontSize: 13 }}>LP Copilot is thinking...</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    value={chatMsg}
                    onChange={(e) => setChatMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Ask about pools, strategies, impermanent loss..."
                  />
                  <button style={s.btn("#00d68f", "#00d68f18", "#00d68f55")} onClick={sendChat} disabled={chatLoading}>
                    Send ↗
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {["What pools should I enter with 1 SOL?", "Explain my impermanent loss", "When should I zap out?", "Best strategy for volatile market?"].map((q) => (
                    <button key={q} style={{ ...s.btn("#7a8a96", "transparent", "#1e2428"), fontSize: 11 }} onClick={() => { setChatMsg(q); }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
