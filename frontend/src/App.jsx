import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d;
}

const usd = (n) => {
  if (n == null || isNaN(n)) return "$0.00";
  const abs = Math.abs(Number(n));
  const s = abs >= 1000 ? (abs / 1000).toFixed(1) + "K" : abs.toFixed(2);
  return (Number(n) < 0 ? "-$" : "$") + s;
};
const pct = (n) => (n >= 0 ? "+" : "") + Number(n).toFixed(2) + "%";

// ── Components ────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "green", glow }) {
  const colors = { green: "var(--green)", amber: "var(--amber)", blue: "var(--blue)", red: "var(--red)", purple: "var(--purple)" };
  const c = colors[color] || colors.green;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 22px", position: "relative", overflow: "hidden" }}>
      {glow && <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: c, borderRadius: "50%", filter: "blur(35px)", opacity: .12 }} />}
      <div style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".1em", fontFamily: "var(--mono)", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--mono)", color: c, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function Badge({ children, color = "green" }) {
  const map = {
    green: { bg: "var(--green-dim)", color: "var(--green)", border: "rgba(0,255,136,.2)" },
    red: { bg: "var(--red-dim)", color: "var(--red)", border: "rgba(255,77,106,.2)" },
    amber: { bg: "var(--amber-dim)", color: "var(--amber)", border: "rgba(255,181,71,.2)" },
    blue: { bg: "var(--blue-dim)", color: "var(--blue)", border: "rgba(77,159,255,.2)" },
  };
  const s = map[color] || map.green;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: "var(--mono)", background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />{children}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style = {} }) {
  const styles = {
    primary: { background: "var(--green)", color: "#000", border: "none", fontWeight: 700 },
    danger: { background: "var(--red-dim)", color: "var(--red)", border: "1px solid rgba(255,77,106,.25)" },
    ghost: { background: "transparent", color: "var(--text2)", border: "1px solid var(--border2)" },
    outline: { background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(0,255,136,.25)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", transition: "all .2s", opacity: disabled ? .6 : 1, ...styles[variant], ...style }}>
      {children}
    </button>
  );
}

function Table({ cols, rows, empty }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          {cols.map((c) => <th key={c} style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".1em", padding: "0 12px 12px 0", fontFamily: "var(--mono)", fontWeight: 400, textAlign: "left" }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: 40, color: "var(--text2)", fontSize: 13 }}>{empty}</td></tr>
          : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border)", transition: "background .15s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.02)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              {row.map((cell, j) => <td key={j} style={{ padding: "14px 12px 14px 0", verticalAlign: "middle" }}>{cell}</td>)}
            </tr>
          ))
        }
      </tbody>
    </table>
  );
}

function Card({ title, action, children, style = {} }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", ...style }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{title}</span>
          {action}
        </div>
      )}
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────

function Modal({ title, color = "var(--green)", onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", padding: 28, width: 440, maxWidth: "95vw", boxShadow: "0 25px 60px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 700, color }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".1em", fontFamily: "var(--mono)", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, readOnly }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
      style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }} />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, color: "var(--text2)" }}>
      <span>{label}</span>
      <span style={{ color: valueColor || "var(--text)", fontFamily: "var(--mono)" }}>{value}</span>
    </div>
  );
}

function ZapInModal({ pool, onClose, onConfirm, loading }) {
  const [sol, setSol] = useState("0.5");
  const [strategy, setStrategy] = useState("Spot");
  if (!pool) return null;
  const name = `${pool.token0_symbol || "?"}/${pool.token1_symbol || "?"}`;
  return (
    <Modal title={`⚡ Zap In — ${name}`} onClose={onClose}>
      <Field label="Amount (SOL)"><Input type="number" value={sol} onChange={(e) => setSol(e.target.value)} placeholder="0.5" /></Field>
      <Field label="Strategy">
        <Select value={strategy} onChange={(e) => setStrategy(e.target.value)} options={[["Spot", "Spot — uniform distribution"], ["Curve", "Curve — concentrated around price"], ["BidAsk", "BidAsk — edge concentrated"]]} />
      </Field>
      <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 20 }}>
        <InfoRow label="Slippage" value="5%" />
        <InfoRow label="Price impact" value="< 0.01%" />
        <InfoRow label="Transaction landing" value="Jito bundles" valueColor="var(--green)" />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
        <Btn onClick={() => onConfirm({ poolId: pool.pool, inputSOL: parseFloat(sol) || 0.1, strategy })} disabled={loading} style={{ flex: 1, justifyContent: "center", padding: 12, fontSize: 13 }}>
          {loading ? "Signing..." : "Confirm Zap In ⚡"}
        </Btn>
      </div>
    </Modal>
  );
}

function ZapOutModal({ position, onClose, onConfirm, loading }) {
  const [pct, setPct] = useState(100);
  const [output, setOutput] = useState("allBaseToken");
  if (!position) return null;
  const name = `${position.tokenName0 || "?"}/${position.tokenName1 || "?"}`;
  const val = usd((parseFloat(position.currentValue) || 0) * pct / 100);
  return (
    <Modal title={`↩ Zap Out — ${name}`} color="var(--red)" onClose={onClose}>
      <Field label={`Withdraw — ${pct}% ≈ ${val}`}>
        <input type="range" min={10} max={100} step={10} value={pct} onChange={(e) => setPct(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--red)", marginBottom: 4 }} />
      </Field>
      <Field label="Receive as">
        <Select value={output} onChange={(e) => setOutput(e.target.value)} options={[["allBaseToken", "SOL (recommended — auto swap)"], ["both", "Both tokens (no swap)"], ["allToken0", `${position.tokenName0} only`], ["allToken1", `${position.tokenName1} only`]]} />
      </Field>
      <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 20 }}>
        <InfoRow label="You receive (est.)" value={val} valueColor="var(--green)" />
        <InfoRow label="Network fee" value="~0.002 SOL" />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
        <Btn variant="danger" onClick={() => onConfirm({ positionId: position.id, bps: pct * 100, output })} disabled={loading}
          style={{ flex: 1, justifyContent: "center", padding: 12, fontSize: 13, background: "var(--red)", color: "#fff", border: "none" }}>
          {loading ? "Signing..." : "Confirm Zap Out ↩"}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Pages ─────────────────────────────────────────────────────

function OverviewPage({ owner, positions, overview, loading, onZapIn, onZapOut, aiInsights }) {
  const tvl = positions.reduce((s, p) => s + (parseFloat(p.currentValue) || 0), 0);
  const fees = positions.reduce((s, p) => s + (p.collectedFee || 0) + (parseFloat(p.unCollectedFee) || 0), 0);
  const netPnl = overview?.total_pnl?.ALL || 0;
  const winRate = ((overview?.win_rate?.ALL || 0) * 100).toFixed(0);

  if (!owner) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>◈</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700, color: "var(--green)" }}>Connect your wallet</div>
      <div style={{ color: "var(--text2)", fontSize: 14 }}>View your LP positions, fees, and AI insights</div>
      <WalletMultiButton />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard label="Net PnL" value={usd(netPnl)} color={netPnl >= 0 ? "green" : "red"} sub={`${positions.length} open positions`} glow />
        <StatCard label="Total Value" value={usd(tvl)} color="amber" sub="Across all pools" glow />
        <StatCard label="Fees Earned" value={usd(fees)} color="blue" sub="Collected + pending" glow />
        <StatCard label="Win Rate" value={`${winRate}%`} color="purple" sub={`${overview?.total_lp || 0} total positions`} glow />
      </div>

      {aiInsights.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, rgba(0,255,136,.03) 0%, rgba(77,159,255,.03) 100%)", border: "1px solid rgba(0,255,136,.12)", borderRadius: "var(--radius)", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ background: "var(--green-dim)", border: "1px solid rgba(0,255,136,.2)", color: "var(--green)", fontSize: 10, padding: "3px 10px", borderRadius: 20, fontFamily: "var(--mono)", letterSpacing: ".05em" }}>✦ AI INSIGHTS</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Portfolio Intelligence</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {aiInsights.map((ins, i) => {
              const cfg = { good: ["var(--green-dim)", "var(--green)", "rgba(0,255,136,.12)", "◉"], warn: ["var(--amber-dim)", "var(--amber)", "rgba(255,181,71,.12)", "⚠"], info: ["var(--blue-dim)", "var(--blue)", "rgba(77,159,255,.12)", "✦"] }[ins.type] || ["var(--blue-dim)", "var(--blue)", "rgba(77,159,255,.12)", "✦"];
              return (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: "var(--radius-sm)", background: cfg[0], border: `1px solid ${cfg[2]}` }}>
                  <span style={{ color: cfg[1], fontSize: 16, flexShrink: 0, marginTop: 1 }}>{cfg[3]}</span>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}><strong style={{ color: "var(--text)" }}>{ins.title}: </strong><span style={{ color: "var(--text2)" }}>{ins.message}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && <div style={{ color: "var(--text2)", textAlign: "center", padding: 30 }}>Loading positions...</div>}

      {positions.length > 0 && (
        <Card title="Open Positions" action={<Btn variant="outline" onClick={() => {}}>+ Zap Into Pool</Btn>}>
          <Table
            cols={["Pool", "Value", "Fees Earned", "PnL", "Status", "Action"]}
            rows={positions.map((p) => {
              const name = `${p.tokenName0 || "?"}/${p.tokenName1 || "?"}`;
              const val = usd(parseFloat(p.currentValue) || 0);
              const fee = usd((p.collectedFee || 0) + (parseFloat(p.unCollectedFee) || 0));
              const pl = p.pnl?.percent;
              return [
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {[p.logo0, p.logo1].map((l, i) => l ? <img key={i} src={l} width={22} height={22} style={{ borderRadius: "50%", marginLeft: i ? -8 : 0, border: "2px solid var(--bg)" }} onError={(e) => e.target.style.display = "none"} /> : null)}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                    <div style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--mono)" }}>{p.protocol}</div>
                  </div>
                </div>,
                <span style={{ fontFamily: "var(--mono)" }}>{val}</span>,
                <span style={{ color: "var(--green)", fontFamily: "var(--mono)" }}>{fee}</span>,
                <span style={{ color: pl >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--mono)" }}>{pl != null ? pct(pl) : "—"}</span>,
                <Badge color={p.inRange ? "green" : "amber"}>{p.inRange ? "In Range" : "Out of Range"}</Badge>,
                <Btn variant="danger" onClick={() => onZapOut(p)}>Zap Out</Btn>
              ];
            })}
            empty="No open positions"
          />
        </Card>
      )}
    </div>
  );
}

function DiscoverPage({ onZapIn }) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("vol_24h");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/pools/discover?sortBy=${sort}&pageSize=18`)
      .then((d) => setPools(d.data || []))
      .catch(() => setPools([]))
      .finally(() => setLoading(false));
  }, [sort]);

  const apr = (p) => p.tvl && p.vol_24h && p.fee ? ((p.vol_24h * p.fee / p.tvl) * 365 * 100).toFixed(1) : "—";
  const k = (n) => n ? (n >= 1e6 ? "$" + (n / 1e6).toFixed(1) + "M" : "$" + (n / 1e3).toFixed(0) + "K") : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Pool Discovery</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Top Meteora Pools</div>
        </div>
        <div style={{ display: "flex", gap: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 4 }}>
          {[["vol_24h", "Volume"], ["tvl", "TVL"], ["fee_tvl_ratio", "Fee/TVL"]].map(([v, l]) => (
            <button key={v} onClick={() => setSort(v)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "var(--mono)", cursor: "pointer", border: "none", background: sort === v ? "var(--surface3)" : "transparent", color: sort === v ? "var(--green)" : "var(--text2)", transition: "all .15s" }}>{l}</button>
          ))}
        </div>
      </div>
      {loading
        ? <div style={{ color: "var(--text2)", textAlign: "center", padding: 40 }}>Loading pools...</div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {pools.map((p) => (
              <div key={p.pool} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 18, transition: "all .2s", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,255,136,.2)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{p.token0_symbol || "?"}/{p.token1_symbol || "?"}</div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>{p.protocol || "Meteora"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: "var(--green)" }}>{apr(p)}%</div>
                    <div style={{ fontSize: 10, color: "var(--text2)" }}>est. APR</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[["TVL", k(p.tvl)], ["Vol 24h", k(p.vol_24h)]].map(([label, val]) => (
                    <div key={label} style={{ background: "var(--surface2)", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "var(--text2)", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <Btn variant="outline" onClick={() => onZapIn(p)} style={{ width: "100%", justifyContent: "center", padding: 10 }}>⚡ Zap In</Btn>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

function AIPage({ positions, overview }) {
  const [msgs, setMsgs] = useState([{ role: "ai", text: "Hi! I'm LP Copilot. Ask me anything about Solana LP strategy, pool selection, impermanent loss, or when to zap in/out. 🚀" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(msg) {
    const m = (msg || input).trim();
    if (!m || loading) return;
    setInput("");
    setMsgs((s) => [...s, { role: "user", text: m }]);
    setLoading(true);
    try {
      const walletData = positions?.length ? { positions: positions.slice(0, 5), overview } : null;
      const r = await apiFetch("/ai/chat", { method: "POST", body: JSON.stringify({ message: m, walletData }) });
      setMsgs((s) => [...s, { role: "ai", text: r.reply }]);
    } catch (e) {
      setMsgs((s) => [...s, { role: "ai", text: `⚠ ${e.message}`, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  const QUICK = ["Best pools for 1 SOL right now?", "Explain impermanent loss simply", "When should I zap out?", "Spot vs Curve strategy?"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, background: "var(--green)", borderRadius: "50%", boxShadow: "0 0 8px var(--green)" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>AI Advisor — Ask LP Copilot</span>
          {positions.length > 0 && <Badge color="green">{positions.length} positions loaded</Badge>}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: "var(--mono)", background: m.role === "ai" ? "var(--green-dim)" : "var(--blue-dim)", border: `1px solid ${m.role === "ai" ? "rgba(0,255,136,.2)" : "rgba(77,159,255,.2)"}`, color: m.role === "ai" ? "var(--green)" : "var(--blue)" }}>
                {m.role === "ai" ? "✦" : "U"}
              </div>
              <div style={{ background: m.role === "user" ? "var(--surface3)" : "var(--surface2)", border: `1px solid ${m.error ? "rgba(255,77,106,.2)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: 13, lineHeight: 1.7, maxWidth: "78%", color: m.error ? "var(--red)" : "var(--text)" }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--green-dim)", border: "1px solid rgba(0,255,136,.2)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✦</div>
              <div style={{ color: "var(--text2)", fontSize: 12, fontFamily: "var(--mono)" }}>Thinking<span style={{ animation: "pulse 1s infinite" }}>...</span></div>
            </div>
          )}
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", gap: 10, flexShrink: 0 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about pools, IL, strategies, timing..."
            style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", padding: "12px 16px", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }} />
          <Btn onClick={() => send()} disabled={loading} style={{ padding: "12px 20px", fontSize: 13 }}>Send ↗</Btn>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        {QUICK.map((q) => (
          <button key={q} onClick={() => send(q)} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontFamily: "var(--mono)", cursor: "pointer", background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)", transition: "all .15s" }}
            onMouseEnter={(e) => { e.target.style.borderColor = "rgba(0,255,136,.25)"; e.target.style.color = "var(--green)"; }}
            onMouseLeave={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.color = "var(--text2)"; }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() || null;
  const [page, setPage] = useState("overview");
  const [positions, setPositions] = useState([]);
  const [overview, setOverview] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [zapInPool, setZapInPool] = useState(null);
  const [zapOutPos, setZapOutPos] = useState(null);
  const [zapInLoading, setZapInLoading] = useState(false);
  const [zapOutLoading, setZapOutLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000); };

  const loadData = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    try {
      const [posRes, ovRes] = await Promise.allSettled([
        apiFetch(`/positions/open?owner=${owner}`),
        apiFetch(`/positions/overview?owner=${owner}`)
      ]);
      const pos = posRes.status === "fulfilled" ? (posRes.value.data || []) : [];
      const ov = ovRes.status === "fulfilled" ? (ovRes.value.data || null) : null;
      setPositions(pos); setOverview(ov);
      if (pos.length > 0) {
        try {
          const ai = await apiFetch("/ai/analyze", { method: "POST", body: JSON.stringify({ positions: pos }) });
          setAiInsights(ai.insights || []);
        } catch {}
      }
    } catch (e) { showToast(`Load error: ${e.message}`, false); }
    finally { setLoading(false); }
  }, [owner]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleZapIn({ poolId, inputSOL, strategy }) {
    setZapInLoading(true);
    try {
      const prep = await apiFetch("/zap/in/prepare", { method: "POST", body: JSON.stringify({ poolId, owner, inputSOL, strategy }) });
      showToast(`⚡ Zap In prepared! Sign in wallet to confirm.`);
      setZapInPool(null);
    } catch (e) { showToast(`Zap In failed: ${e.message}`, false); }
    finally { setZapInLoading(false); }
  }

  async function handleZapOut({ positionId, bps, output }) {
    setZapOutLoading(true);
    try {
      const prep = await apiFetch("/zap/out/prepare", { method: "POST", body: JSON.stringify({ positionId, owner, bps, output }) });
      showToast(`↩ Zap Out prepared! Sign in wallet to confirm.`);
      setZapOutPos(null);
    } catch (e) { showToast(`Zap Out failed: ${e.message}`, false); }
    finally { setZapOutLoading(false); }
  }

  const NAV = [
    { id: "overview", icon: "◈", label: "Overview" },
    { id: "positions", icon: "⊞", label: "Positions" },
    { id: "discover", icon: "⊕", label: "Discover" },
    { id: "ai", icon: "✦", label: "AI Advisor" },
  ];

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Topbar ── */}
      <header style={{ height: 60, background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "var(--green-dim)", border: "1px solid rgba(0,255,136,.3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--green)" }}>◈</div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 700, color: "var(--green)" }}>LP Copilot</span>
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border2)" }} />
          <div style={{ display: "flex", gap: 2 }}>
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, transition: "all .15s", background: page === n.id ? "var(--green-dim)" : "transparent", color: page === n.id ? "var(--green)" : "var(--text2)" }}>
                <span>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,255,136,.06)", border: "1px solid rgba(0,255,136,.15)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontFamily: "var(--mono)", color: "var(--green)" }}>
            <div style={{ width: 6, height: 6, background: "var(--green)", borderRadius: "50%", boxShadow: "0 0 6px var(--green)" }} />Mainnet
          </div>
          {owner && <button onClick={loadData} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text2)", padding: "6px 12px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11 }}>↻ Refresh</button>}
          <WalletMultiButton />
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {page === "overview" && <OverviewPage owner={owner} positions={positions} overview={overview} loading={loading} onZapIn={setZapInPool} onZapOut={setZapOutPos} aiInsights={aiInsights} />}
          {page === "positions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>My Positions</div>
                <Btn variant="outline" onClick={() => setPage("discover")}>+ Zap Into New Pool</Btn>
              </div>
              <Card>
                <Table
                  cols={["Pool", "Value", "Fees", "PnL", "Range", "Action"]}
                  rows={positions.map((p) => {
                    const name = `${p.tokenName0 || "?"}/${p.tokenName1 || "?"}`;
                    const pl = p.pnl?.percent;
                    return [
                      <div>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--mono)" }}>{p.protocol}</div>
                      </div>,
                      <span style={{ fontFamily: "var(--mono)" }}>{usd(parseFloat(p.currentValue))}</span>,
                      <span style={{ color: "var(--green)", fontFamily: "var(--mono)" }}>{usd((p.collectedFee || 0) + (parseFloat(p.unCollectedFee) || 0))}</span>,
                      <span style={{ color: pl >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--mono)" }}>{pl != null ? pct(pl) : "—"}</span>,
                      <Badge color={p.inRange ? "green" : "amber"}>{p.inRange ? "In Range" : "Out"}</Badge>,
                      <Btn variant="danger" onClick={() => setZapOutPos(p)}>Zap Out</Btn>
                    ];
                  })}
                  empty={owner ? "No open positions found" : "Connect wallet to view positions"}
                />
              </Card>
            </div>
          )}
          {page === "discover" && <DiscoverPage onZapIn={setZapInPool} />}
          {page === "ai" && <div style={{ height: "calc(100vh - 108px)" }}><AIPage positions={positions} overview={overview} /></div>}
        </main>
      </div>

      {/* Modals */}
      <ZapInModal pool={zapInPool} onClose={() => setZapInPool(null)} onConfirm={handleZapIn} loading={zapInLoading} />
      <ZapOutModal position={zapOutPos} onClose={() => setZapOutPos(null)} onConfirm={handleZapOut} loading={zapOutLoading} />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, background: toast.ok ? "var(--green)" : "var(--red)", color: toast.ok ? "#000" : "#fff", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, padding: "12px 20px", borderRadius: "var(--radius-sm)", boxShadow: "0 8px 30px rgba(0,0,0,.4)", maxWidth: 400 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
