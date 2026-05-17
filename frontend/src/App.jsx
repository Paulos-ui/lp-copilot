import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function api(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" }, ...opts,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d;
}

// ── Formatters ────────────────────────────────────────────────
const usd = (n, compact = true) => {
  if (!n && n !== 0) return "$—";
  const v = Math.abs(Number(n));
  const s = compact && v >= 1e6 ? (v/1e6).toFixed(2)+"M"
          : compact && v >= 1e3 ? (v/1e3).toFixed(1)+"K"
          : v.toFixed(2);
  return (Number(n) < 0 ? "-$" : "$") + s;
};
const pct = (n) => n == null ? "—" : (n>=0?"+":"")+Number(n).toFixed(2)+"%";
const short = (s, l=6) => s ? s.slice(0,l)+"..."+s.slice(-4) : "";

// ── Base UI ───────────────────────────────────────────────────
const G = ({ children, style={} }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:16, ...style }}>{children}</div>
);

function Tag({ children, color="green" }) {
  const c = { green:["var(--gd)","var(--green)","rgba(0,255,136,.18)"], red:["var(--rd)","var(--red)","rgba(255,64,96,.18)"], amber:["var(--ad)","var(--amber)","rgba(255,170,0,.18)"], blue:["var(--bd)","var(--blue)","rgba(68,136,255,.18)"] }[color]||["var(--gd)","var(--green)","rgba(0,255,136,.18)"];
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontFamily:"var(--mono)", background:c[0], color:c[1], border:`1px solid ${c[2]}` }}><span style={{ width:5,height:5,borderRadius:"50%",background:"currentColor" }}/>{children}</span>;
}

function Btn({ children, onClick, variant="primary", disabled, full, style={} }) {
  const v = {
    primary:  { bg:"var(--green)", color:"#000", border:"none", fw:700 },
    danger:   { bg:"var(--rd)", color:"var(--red)", border:"1px solid rgba(255,64,96,.25)", fw:500 },
    ghost:    { bg:"transparent", color:"var(--t2)", border:"1px solid var(--b2)", fw:400 },
    outline:  { bg:"var(--gd)", color:"var(--green)", border:"1px solid rgba(0,255,136,.2)", fw:500 },
    subtle:   { bg:"var(--s2)", color:"var(--t2)", border:"1px solid var(--b1)", fw:400 },
  }[variant]||{};
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"8px 16px", borderRadius:"var(--r2)", fontFamily:"var(--mono)", fontSize:12,
      cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1, transition:"all .15s",
      background:v.bg, color:v.color, border:v.border, fontWeight:v.fw,
      width: full?"100%":undefined, ...style
    }} onMouseEnter={e=>{ if(!disabled) e.target.style.opacity=".85"; }}
       onMouseLeave={e=>{ e.target.style.opacity="1"; }}>
      {children}
    </button>
  );
}

function Card({ children, style={}, pad=true }) {
  return (
    <div style={{ background:"var(--s1)", border:"1px solid var(--b1)", borderRadius:"var(--r)", overflow:"hidden", ...style }}>
      {pad ? <div style={{ padding:20 }}>{children}</div> : children}
    </div>
  );
}

function CardHeader({ title, sub, right }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:"1px solid var(--b1)" }}>
      <div>
        <div style={{ fontFamily:"var(--mono)", fontSize:13, fontWeight:600, color:"var(--t1)" }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:"var(--t2)", marginTop:3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Stat({ label, value, sub, color="green", icon }) {
  const cols = { green:"var(--green)", amber:"var(--amber)", blue:"var(--blue)", red:"var(--red)", purple:"var(--purple)" };
  const c = cols[color];
  return (
    <div style={{ background:"var(--s1)", border:"1px solid var(--b1)", borderRadius:"var(--r)", padding:"18px 20px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-16, right:-16, width:70, height:70, background:c, borderRadius:"50%", filter:"blur(30px)", opacity:.1 }}/>
      <div style={{ fontSize:11, color:"var(--t2)", textTransform:"uppercase", letterSpacing:".1em", fontFamily:"var(--mono)", marginBottom:10 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:700, fontFamily:"var(--mono)", color:c, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"var(--t2)", marginTop:8 }}>{sub}</div>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
function Modal({ open, onClose, title, color="var(--green)", children, width=440 }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(2,5,16,.9)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(6px)" }} onClick={e => e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"var(--s1)", border:"1px solid var(--b2)", borderRadius:"var(--r)", width, maxWidth:"95vw", boxShadow:"0 30px 80px rgba(0,0,0,.6)", animation:"fadeIn .15s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 22px", borderBottom:"1px solid var(--b1)" }}>
          <div style={{ fontFamily:"var(--mono)", fontSize:14, fontWeight:700, color }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--t2)", cursor:"pointer", fontSize:20, lineHeight:1, padding:"0 4px" }}>×</button>
        </div>
        <div style={{ padding:22 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:10, color:"var(--t2)", textTransform:"uppercase", letterSpacing:".1em", fontFamily:"var(--mono)", marginBottom:6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize:11, color:"var(--t3)", marginTop:4 }}>{hint}</div>}
    </div>
  );
}

function Input({ value, onChange, type="text", placeholder, min, max, step }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max} step={step}
      style={{ width:"100%", background:"var(--s2)", border:"1px solid var(--b2)", color:"var(--t1)", padding:"10px 14px", borderRadius:"var(--r2)", fontFamily:"var(--mono)", fontSize:13, outline:"none", transition:"border .15s" }}
      onFocus={e=>e.target.style.borderColor="rgba(0,255,136,.35)"}
      onBlur={e=>e.target.style.borderColor="var(--b2)"} />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      style={{ width:"100%", background:"var(--s2)", border:"1px solid var(--b2)", color:"var(--t1)", padding:"10px 14px", borderRadius:"var(--r2)", fontFamily:"var(--mono)", fontSize:13, outline:"none" }}>
      {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:12, borderBottom:"1px solid var(--b1)" }}>
      <span style={{ color:"var(--t2)" }}>{label}</span>
      <span style={{ color: color||"var(--t1)", fontFamily:"var(--mono)" }}>{value}</span>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────
function Table({ cols, rows, empty="No data" }) {
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <thead>
        <tr>
          {cols.map(c => <th key={c} style={{ fontSize:10, color:"var(--t3)", textTransform:"uppercase", letterSpacing:".1em", padding:"0 0 14px", fontFamily:"var(--mono)", fontWeight:400, textAlign:"left", paddingRight:12 }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <tr><td colSpan={cols.length} style={{ textAlign:"center", padding:"40px 0", color:"var(--t2)", fontSize:13 }}>{empty}</td></tr>
          : rows.map((row,i) => (
            <tr key={i} style={{ borderTop:"1px solid var(--b1)", transition:"background .1s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              {row.map((cell,j) => <td key={j} style={{ padding:"14px 12px 14px 0", verticalAlign:"middle" }}>{cell}</td>)}
            </tr>
          ))
        }
      </tbody>
    </table>
  );
}

// ── Zap In Modal ──────────────────────────────────────────────
function ZapInModal({ pool, onClose, onConfirm, loading }) {
  const [sol, setSol] = useState("0.5");
  const [strategy, setStrategy] = useState("Spot");
  const name = pool ? `${pool.token0_symbol||"?"}/${pool.token1_symbol||"?"}` : "";
  return (
    <Modal open={!!pool} onClose={onClose} title={`⚡ Zap In — ${name}`}>
      <Field label="Amount (SOL)" hint="Minimum 0.01 SOL">
        <Input type="number" value={sol} onChange={e=>setSol(e.target.value)} placeholder="0.5" min="0.01" step="0.1"/>
      </Field>
      <Field label="Liquidity Strategy">
        <Select value={strategy} onChange={e=>setStrategy(e.target.value)} options={[
          ["Spot",   "Spot — uniform distribution (recommended)"],
          ["Curve",  "Curve — concentrated around current price"],
          ["BidAsk", "BidAsk — concentrated at price extremes"],
        ]}/>
      </Field>
      <div style={{ background:"var(--bg2)", borderRadius:"var(--r2)", padding:"12px 14px", marginBottom:20 }}>
        <InfoRow label="Slippage tolerance" value="5%"/>
        <InfoRow label="Price impact" value="< 0.01%"/>
        <InfoRow label="Transaction routing" value="Jito bundles" color="var(--green)"/>
        <InfoRow label="Network fee" value="~0.002 SOL"/>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex:1, justifyContent:"center" }}>Cancel</Btn>
        <Btn onClick={()=>onConfirm({ poolId:pool.pool, inputSOL:parseFloat(sol)||0.1, strategy })} disabled={loading} style={{ flex:1, justifyContent:"center", padding:12 }}>
          {loading ? "Processing..." : "Confirm Zap In ⚡"}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Zap Out Modal ─────────────────────────────────────────────
function ZapOutModal({ position, onClose, onConfirm, loading }) {
  const [pct, setPct] = useState(100);
  const [output, setOutput] = useState("allBaseToken");
  const name = position ? `${position.tokenName0||"?"}/${position.tokenName1||"?"}` : "";
  const estVal = usd((parseFloat(position?.currentValue)||0) * pct/100);
  return (
    <Modal open={!!position} onClose={onClose} title={`↩ Zap Out — ${name}`} color="var(--red)">
      <Field label={`Withdraw percentage — ${pct}%`}>
        <input type="range" min={10} max={100} step={10} value={pct} onChange={e=>setPct(Number(e.target.value))}
          style={{ width:"100%", accentColor:"var(--red)", cursor:"pointer" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--t2)", marginTop:6 }}>
          <span>10%</span><span style={{ color:"var(--t1)", fontFamily:"var(--mono)", fontSize:14, fontWeight:600 }}>{estVal}</span><span>100%</span>
        </div>
      </Field>
      <Field label="Receive tokens as">
        <Select value={output} onChange={e=>setOutput(e.target.value)} options={[
          ["allBaseToken", "SOL — auto-swap everything (recommended)"],
          ["both",         "Both tokens — no swap"],
          ["allToken0",    `${position?.tokenName0||"Token A"} only`],
          ["allToken1",    `${position?.tokenName1||"Token B"} only`],
        ]}/>
      </Field>
      <div style={{ background:"var(--bg2)", borderRadius:"var(--r2)", padding:"12px 14px", marginBottom:20 }}>
        <InfoRow label="Estimated receive" value={estVal} color="var(--green)"/>
        <InfoRow label="Unclaimed fees" value={usd((position?.collectedFee||0)+(parseFloat(position?.unCollectedFee)||0))} color="var(--green)"/>
        <InfoRow label="Network fee" value="~0.002 SOL"/>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex:1 }}>Cancel</Btn>
        <Btn onClick={()=>onConfirm({ positionId:position.id, bps:pct*100, output })} disabled={loading}
          style={{ flex:1, padding:12, background:"var(--red)", color:"#fff", border:"none", fontWeight:700 }}>
          {loading ? "Processing..." : "Confirm Zap Out ↩"}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Overview Page ─────────────────────────────────────────────
function Overview({ owner, positions, overview, loading, aiInsights, onZapOut, setPage }) {
  const tvl  = positions.reduce((s,p) => s+(parseFloat(p.currentValue)||0), 0);
  const fees = positions.reduce((s,p) => s+(p.collectedFee||0)+(parseFloat(p.unCollectedFee)||0), 0);
  const netPnl = overview?.total_pnl?.ALL || 0;
  const wins   = ((overview?.win_rate?.ALL||0)*100).toFixed(0);

  if (!owner) return (
    <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:16, filter:"drop-shadow(0 0 30px var(--green))" }}>◈</div>
        <div style={{ fontFamily:"var(--mono)", fontSize:22, fontWeight:700, color:"var(--green)", marginBottom:8 }}>LP Copilot</div>
        <div style={{ color:"var(--t2)", fontSize:14, marginBottom:28, maxWidth:320 }}>Connect your Phantom wallet to track positions, discover pools, and get AI-powered LP advice</div>
        <WalletMultiButton/>
      </div>
    </div>
  );

  return (
    <G>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <Stat label="Net PnL" value={usd(netPnl)} color={netPnl>=0?"green":"red"} sub={`${positions.length} open positions`}/>
        <Stat label="Total Value" value={usd(tvl)} color="amber" sub="Across all pools"/>
        <Stat label="Fees Earned" value={usd(fees)} color="blue" sub="Collected + pending"/>
        <Stat label="Win Rate" value={`${wins}%`} color="purple" sub={`${overview?.total_lp||0} total positions`}/>
      </div>

      {aiInsights.length > 0 && (
        <div style={{ background:"linear-gradient(135deg,rgba(0,255,136,.04),rgba(68,136,255,.04))", border:"1px solid rgba(0,255,136,.1)", borderRadius:"var(--r)", padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:8, height:8, background:"var(--green)", borderRadius:"50%", boxShadow:"0 0 8px var(--green)" }}/>
            <span style={{ fontFamily:"var(--mono)", fontSize:12, fontWeight:600, color:"var(--green)", textTransform:"uppercase", letterSpacing:".05em" }}>AI Portfolio Intelligence</span>
          </div>
          <G style={{ gap:8 }}>
            {aiInsights.map((ins,i) => {
              const cfg = { good:["var(--gd)","var(--green)","rgba(0,255,136,.1)","◉"], warn:["var(--ad)","var(--amber)","rgba(255,170,0,.1)","⚠"], info:["var(--bd)","var(--blue)","rgba(68,136,255,.1)","◆"] }[ins.type]||["var(--bd)","var(--blue)","rgba(68,136,255,.1)","◆"];
              return (
                <div key={i} style={{ display:"flex", gap:12, padding:"12px 14px", borderRadius:"var(--r2)", background:cfg[0], border:`1px solid ${cfg[2]}` }}>
                  <span style={{ color:cfg[1], fontSize:15, flexShrink:0 }}>{cfg[3]}</span>
                  <div style={{ fontSize:13, lineHeight:1.65 }}><strong style={{ color:"var(--t1)" }}>{ins.title}:</strong> <span style={{ color:"var(--t2)" }}>{ins.message}</span></div>
                </div>
              );
            })}
          </G>
        </div>
      )}

      {loading && <div style={{ textAlign:"center", padding:30, color:"var(--t2)" }}>Loading positions...</div>}

      {positions.length > 0 && (
        <Card pad={false}>
          <CardHeader title="Open Positions" sub={`${positions.length} active`} right={<Btn variant="outline" onClick={()=>setPage("discover")}>+ Zap In</Btn>}/>
          <div style={{ padding:"0 20px" }}>
            <Table cols={["Pool","Value","Fees","PnL","Status","Action"]}
              rows={positions.map(p => {
                const name = `${p.tokenName0||"?"}/${p.tokenName1||"?"}`;
                const pl = p.pnl?.percent;
                return [
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--s2)", border:"1px solid var(--b1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontFamily:"var(--mono)", color:"var(--green)", fontWeight:700 }}>{name.slice(0,3)}</div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>{name}</div>
                      <div style={{ fontSize:11, color:"var(--t2)", fontFamily:"var(--mono)" }}>{p.protocol}</div>
                    </div>
                  </div>,
                  <span style={{ fontFamily:"var(--mono)", fontWeight:500 }}>{usd(parseFloat(p.currentValue))}</span>,
                  <span style={{ color:"var(--green)", fontFamily:"var(--mono)" }}>{usd((p.collectedFee||0)+(parseFloat(p.unCollectedFee)||0))}</span>,
                  <span style={{ color:pl>=0?"var(--green)":"var(--red)", fontFamily:"var(--mono)" }}>{pct(pl)}</span>,
                  <Tag color={p.inRange?"green":"amber"}>{p.inRange?"In Range":"Out of Range"}</Tag>,
                  <Btn variant="danger" onClick={()=>onZapOut(p)}>Zap Out</Btn>
                ];
              })}
            />
          </div>
        </Card>
      )}
    </G>
  );
}

// ── Discover Page ─────────────────────────────────────────────
function Discover({ onZapIn }) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("vol_24h");

  useEffect(() => {
    setLoading(true);
    api(`/pools/discover?sortBy=${sort}&pageSize=18`)
      .then(d => setPools(d.data||[]))
      .catch(()=>setPools([]))
      .finally(()=>setLoading(false));
  }, [sort]);

  const aprCalc = p => p.tvl&&p.vol_24h&&p.fee ? ((p.vol_24h*p.fee/p.tvl)*365*100).toFixed(1) : "—";
  const fmt = n => !n ? "—" : n>=1e6 ? "$"+(n/1e6).toFixed(1)+"M" : "$"+(n/1e3).toFixed(0)+"K";

  return (
    <G>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:11, color:"var(--t2)", fontFamily:"var(--mono)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:4 }}>Pool Discovery</div>
          <div style={{ fontSize:22, fontWeight:700 }}>Top Meteora Pools</div>
        </div>
        <div style={{ display:"flex", gap:4, background:"var(--s1)", border:"1px solid var(--b1)", borderRadius:"var(--r2)", padding:4 }}>
          {[["vol_24h","Volume"],["tvl","TVL"],["fee_tvl_ratio","Fee/TVL"]].map(([v,l])=>(
            <button key={v} onClick={()=>setSort(v)} style={{ padding:"6px 14px", borderRadius:5, border:"none", cursor:"pointer", fontFamily:"var(--mono)", fontSize:11, transition:"all .15s", background:sort===v?"var(--s3)":"transparent", color:sort===v?"var(--green)":"var(--t2)" }}>{l}</button>
          ))}
        </div>
      </div>
      {loading
        ? <div style={{ textAlign:"center", padding:60, color:"var(--t2)" }}>Loading pools...</div>
        : <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {pools.map(p => {
              const apr = aprCalc(p);
              const aprNum = parseFloat(apr);
              const aprColor = aprNum>100?"var(--red)":aprNum>30?"var(--amber)":"var(--green)";
              return (
                <div key={p.pool} style={{ background:"var(--s1)", border:"1px solid var(--b1)", borderRadius:"var(--r)", padding:18, transition:"all .2s", cursor:"pointer" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(0,255,136,.25)"; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 30px rgba(0,0,0,.3)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--b1)"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{p.token0_symbol||"?"}/{p.token1_symbol||"?"}</div>
                      <div style={{ fontSize:11, color:"var(--t2)" }}>{p.protocol||"Meteora"}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"var(--mono)", fontSize:20, fontWeight:700, color:aprColor }}>{apr}%</div>
                      <div style={{ fontSize:10, color:"var(--t2)" }}>APR est.</div>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                    {[["TVL",fmt(p.tvl)],["Vol 24h",fmt(p.vol_24h)]].map(([k,v])=>(
                      <div key={k} style={{ background:"var(--s2)", borderRadius:"var(--r2)", padding:"8px 10px" }}>
                        <div style={{ fontSize:10, color:"var(--t2)", marginBottom:2 }}>{k}</div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:13, fontWeight:600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <Btn variant="outline" onClick={()=>onZapIn(p)} full style={{ padding:10 }}>⚡ Zap In</Btn>
                </div>
              );
            })}
          </div>
      }
    </G>
  );
}

// ── Positions Page ────────────────────────────────────────────
function Positions({ owner, positions, onZapOut, setPage }) {
  return (
    <G>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:11, color:"var(--t2)", fontFamily:"var(--mono)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:4 }}>LP Positions</div>
          <div style={{ fontSize:22, fontWeight:700 }}>My Open Positions</div>
        </div>
        <Btn variant="outline" onClick={()=>setPage("discover")}>+ Zap Into New Pool</Btn>
      </div>
      <Card pad={false}>
        <div style={{ padding:"0 20px" }}>
          <Table cols={["Pool","Value","Fees Earned","PnL","Status","Action"]}
            rows={positions.map(p => {
              const name = `${p.tokenName0||"?"}/${p.tokenName1||"?"}`;
              const pl = p.pnl?.percent;
              return [
                <div>
                  <div style={{ fontWeight:600 }}>{name}</div>
                  <div style={{ fontSize:11, color:"var(--t2)", fontFamily:"var(--mono)" }}>{p.protocol} · {((p.poolInfo?.fee||0)/10000).toFixed(2)}%</div>
                </div>,
                <span style={{ fontFamily:"var(--mono)", fontWeight:500 }}>{usd(parseFloat(p.currentValue))}</span>,
                <span style={{ color:"var(--green)", fontFamily:"var(--mono)" }}>{usd((p.collectedFee||0)+(parseFloat(p.unCollectedFee)||0))}</span>,
                <span style={{ color:pl>=0?"var(--green)":"var(--red)", fontFamily:"var(--mono)" }}>{pct(pl)}</span>,
                <Tag color={p.inRange?"green":"amber"}>{p.inRange?"In Range":"Out of Range"}</Tag>,
                <Btn variant="danger" onClick={()=>onZapOut(p)}>Zap Out</Btn>
              ];
            })}
            empty={owner ? "No open positions. Zap in to get started." : "Connect your wallet to view positions."}
          />
        </div>
      </Card>
    </G>
  );
}

// ── AI Page ───────────────────────────────────────────────────
function AIAdvisor({ positions, overview }) {
  const [msgs, setMsgs] = useState([{
    role:"ai",
    text:"Hi! I'm LP Copilot 🚀 I can help you with pool selection, impermanent loss, zap timing, and strategy optimization. What would you like to know?"
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  async function send(msg) {
    const m = (msg||input).trim();
    if (!m||loading) return;
    setInput("");
    setMsgs(s => [...s, { role:"user", text:m }]);
    setLoading(true);
    try {
      const walletData = positions?.length ? { positions: positions.slice(0,5), overview } : null;
      const r = await api("/ai/chat", { method:"POST", body:JSON.stringify({ message:m, walletData }) });
      setMsgs(s => [...s, { role:"ai", text:r.reply }]);
    } catch(e) {
      setMsgs(s => [...s, { role:"ai", text:`⚠ ${e.message}`, error:true }]);
    } finally { setLoading(false); }
  }

  const QUICK = [
    "Best pools for 1 SOL?",
    "Explain impermanent loss",
    "When to zap out?",
    "Spot vs Curve strategy?",
    "How to maximize fees?",
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:12 }}>
      <Card pad={false} style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
        <CardHeader
          title="AI Advisor"
          sub={positions.length>0 ? `${positions.length} positions loaded as context` : "Connect wallet for personalized advice"}
          right={<div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontFamily:"var(--mono)", color:"var(--green)" }}><div style={{ width:6, height:6, background:"var(--green)", borderRadius:"50%", boxShadow:"0 0 6px var(--green)" }}/>Online</div>}
        />
        <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          {msgs.map((m,i) => (
            <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", flexDirection:m.role==="user"?"row-reverse":"row" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontFamily:"var(--mono)", fontWeight:600, background:m.role==="ai"?"var(--gd)":"var(--bd)", border:`1px solid ${m.role==="ai"?"rgba(0,255,136,.2)":"rgba(68,136,255,.2)"}`, color:m.role==="ai"?"var(--green)":"var(--blue)" }}>
                {m.role==="ai" ? "✦" : "U"}
              </div>
              <div style={{ background:m.role==="user"?"var(--s3)":"var(--s2)", border:`1px solid ${m.error?"rgba(255,64,96,.2)":"var(--b1)"}`, borderRadius:m.role==="user"?"var(--r) var(--r2) var(--r) var(--r)":"var(--r2) var(--r) var(--r) var(--r)", padding:"12px 16px", maxWidth:"78%", fontSize:13, lineHeight:1.7, color:m.error?"var(--red)":"var(--t1)" }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--gd)", border:"1px solid rgba(0,255,136,.2)", color:"var(--green)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✦</div>
              <div style={{ background:"var(--s2)", border:"1px solid var(--b1)", borderRadius:"var(--r2) var(--r) var(--r) var(--r)", padding:"12px 16px", color:"var(--t2)", fontSize:13 }}>
                Thinking<span style={{ fontFamily:"var(--mono)" }}>...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        <div style={{ padding:"14px 20px", borderTop:"1px solid var(--b1)", display:"flex", gap:10 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
            placeholder="Ask about pools, strategies, impermanent loss..."
            style={{ flex:1, background:"var(--s2)", border:"1px solid var(--b2)", color:"var(--t1)", padding:"11px 16px", borderRadius:"var(--r2)", fontFamily:"var(--mono)", fontSize:13, outline:"none", transition:"border .15s" }}
            onFocus={e=>e.target.style.borderColor="rgba(0,255,136,.35)"}
            onBlur={e=>e.target.style.borderColor="var(--b2)"}/>
          <Btn onClick={()=>send()} disabled={loading} style={{ padding:"11px 20px", fontSize:13 }}>Send ↗</Btn>
        </div>
      </Card>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {QUICK.map(q => (
          <button key={q} onClick={()=>send(q)} style={{ padding:"7px 14px", borderRadius:20, fontSize:11, fontFamily:"var(--mono)", cursor:"pointer", background:"var(--s1)", color:"var(--t2)", border:"1px solid var(--b1)", transition:"all .15s" }}
            onMouseEnter={e=>{ e.target.style.borderColor="rgba(0,255,136,.25)"; e.target.style.color="var(--green)"; }}
            onMouseLeave={e=>{ e.target.style.borderColor="var(--b1)"; e.target.style.color="var(--t2)"; }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────
export default function App() {
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() || null;

  const [page, setPage]           = useState("overview");
  const [positions, setPositions] = useState([]);
  const [overview, setOverview]   = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [zapInPool, setZapInPool] = useState(null);
  const [zapOutPos, setZapOutPos] = useState(null);
  const [zapInLoading, setZapInLoading]   = useState(false);
  const [zapOutLoading, setZapOutLoading] = useState(false);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),4000); };

  const loadData = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    try {
      const [posRes, ovRes] = await Promise.allSettled([
        api(`/positions/open?owner=${owner}`),
        api(`/positions/overview?owner=${owner}`),
      ]);
      const pos = posRes.status==="fulfilled" ? (posRes.value.data||[]) : [];
      const ov  = ovRes.status==="fulfilled"  ? (ovRes.value.data||null) : null;
      setPositions(pos); setOverview(ov);
      if (pos.length > 0) {
        api("/ai/analyze", { method:"POST", body:JSON.stringify({ positions:pos }) })
          .then(r => setAiInsights(r.insights||[]))
          .catch(()=>{});
      }
    } catch(e) { showToast(`Error: ${e.message}`, false); }
    finally { setLoading(false); }
  }, [owner]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleZapIn({ poolId, inputSOL, strategy }) {
    setZapInLoading(true);
    try {
      await api("/zap/in/prepare", { method:"POST", body:JSON.stringify({ poolId, owner, inputSOL, strategy }) });
      setZapInPool(null);
      showToast("⚡ Zap In prepared — approve in your wallet!");
    } catch(e) { showToast(`Zap In failed: ${e.message}`, false); }
    finally { setZapInLoading(false); }
  }

  async function handleZapOut({ positionId, bps, output }) {
    setZapOutLoading(true);
    try {
      await api("/zap/out/prepare", { method:"POST", body:JSON.stringify({ positionId, owner, bps, output }) });
      setZapOutPos(null);
      showToast("↩ Zap Out prepared — approve in your wallet!");
    } catch(e) { showToast(`Zap Out failed: ${e.message}`, false); }
    finally { setZapOutLoading(false); }
  }

  const NAV = [
    { id:"overview",  icon:"◈", label:"Overview" },
    { id:"positions", icon:"⊞", label:"Positions" },
    { id:"discover",  icon:"⊕", label:"Discover" },
    { id:"ai",        icon:"✦", label:"AI Advisor" },
  ];

  return (
    <>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ width:"100vw", height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--bg)" }}>

        {/* ── Topbar ── */}
        <header style={{ height:58, background:"var(--s1)", borderBottom:"1px solid var(--b1)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", flexShrink:0, zIndex:50 }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:"var(--gd)", border:"1px solid rgba(0,255,136,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, color:"var(--green)" }}>◈</div>
              <span style={{ fontFamily:"var(--mono)", fontSize:15, fontWeight:700, color:"var(--green)" }}>LP Copilot</span>
            </div>
            <div style={{ width:1, height:20, background:"var(--b2)" }}/>
            {/* Nav tabs */}
            <div style={{ display:"flex", gap:2 }}>
              {NAV.map(n => (
                <button key={n.id} onClick={()=>setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:"var(--r2)", border:"none", cursor:"pointer", fontFamily:"var(--mono)", fontSize:12, transition:"all .15s", background:page===n.id?"var(--gd)":"transparent", color:page===n.id?"var(--green)":"var(--t2)", borderBottom:page===n.id?"2px solid var(--green)":"2px solid transparent" }}>
                  <span>{n.icon}</span>{n.label}
                </button>
              ))}
            </div>
          </div>
          {/* Right side */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(0,255,136,.05)", border:"1px solid rgba(0,255,136,.12)", borderRadius:20, padding:"5px 12px", fontSize:11, fontFamily:"var(--mono)", color:"var(--green)" }}>
              <div style={{ width:6, height:6, background:"var(--green)", borderRadius:"50%", boxShadow:"0 0 6px var(--green)" }}/>Mainnet
            </div>
            {owner && (
              <button onClick={loadData} title="Refresh data" style={{ background:"var(--s2)", border:"1px solid var(--b1)", borderRadius:"var(--r2)", color:"var(--t2)", padding:"7px 12px", cursor:"pointer", fontFamily:"var(--mono)", fontSize:11, transition:"all .15s" }}
                onMouseEnter={e=>{ e.target.style.color="var(--t1)"; e.target.style.borderColor="var(--b2)"; }}
                onMouseLeave={e=>{ e.target.style.color="var(--t2)"; e.target.style.borderColor="var(--b1)"; }}>
                ↻ Refresh
              </button>
            )}
            <WalletMultiButton/>
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ flex:1, overflowY:"auto", padding:24, minHeight:0 }}>
          {page==="overview"  && <Overview owner={owner} positions={positions} overview={overview} loading={loading} aiInsights={aiInsights} onZapOut={setZapOutPos} setPage={setPage}/>}
          {page==="positions" && <Positions owner={owner} positions={positions} onZapOut={setZapOutPos} setPage={setPage}/>}
          {page==="discover"  && <Discover onZapIn={setZapInPool}/>}
          {page==="ai"        && <div style={{ height:"calc(100vh - 106px)" }}><AIAdvisor positions={positions} overview={overview}/></div>}
        </main>
      </div>

      {/* Modals */}
      <ZapInModal  pool={zapInPool}   onClose={()=>setZapInPool(null)}  onConfirm={handleZapIn}  loading={zapInLoading}/>
      <ZapOutModal position={zapOutPos} onClose={()=>setZapOutPos(null)} onConfirm={handleZapOut} loading={zapOutLoading}/>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background:toast.ok?"var(--green)":"var(--red)", color:toast.ok?"#000":"#fff", fontFamily:"var(--mono)", fontSize:12, fontWeight:700, padding:"12px 22px", borderRadius:"var(--r2)", boxShadow:"0 10px 40px rgba(0,0,0,.5)", maxWidth:380, animation:"fadeIn .2s ease" }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
