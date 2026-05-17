import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d;
}

// ── Formatters ────────────────────────────────────────────────
const usd = (n) => {
  if (n == null || isNaN(n)) return "$0.00";
  const v = Math.abs(Number(n));
  const s = v >= 1e6 ? (v/1e6).toFixed(2)+"M" : v >= 1e3 ? (v/1e3).toFixed(2) : v.toFixed(2);
  const suffix = v >= 1e3 && v < 1e6 ? "K" : "";
  return (Number(n) < 0 ? "-$" : "$") + s + suffix;
};
const pct = (n) => n == null ? "—" : (n>=0?"+":"")+Number(n).toFixed(2)+"%";
const shortAddr = (s) => s ? s.slice(0,4)+"..."+s.slice(-4) : "";
const timeAgo = (ms) => {
  const s = Math.floor((Date.now()-ms)/1000);
  if(s<60) return s+"s ago"; if(s<3600) return Math.floor(s/60)+"m ago";
  return Math.floor(s/3600)+"h ago";
};

// ── Sparkline SVG ─────────────────────────────────────────────
function Sparkline({ data = [], color = "#00d4a0", height = 40, width = 120 }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height * 0.8 - height * 0.1;
    return `${x},${y}`;
  }).join(" ");
  const areaPath = `M0,${height} L${pts.split(" ").map(p => p).join(" L")} L${width},${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Mini Bar Chart ────────────────────────────────────────────
function MiniBar({ data = [], color = "#00d4a0" }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:40 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex:1, background: i===data.length-1 ? color : `${color}55`, borderRadius:"2px 2px 0 0", height:`${(v/max)*100}%`, minHeight:2, transition:"height .3s" }}/>
      ))}
    </div>
  );
}

// ── Base Components ───────────────────────────────────────────
function Icon({ name, size=16, color="currentColor" }) {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    pools: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></>,
    ai: <><path d="M12 2a10 10 0 0110 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/><path d="M8 12h8M12 8v8"/></>,
    activity: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></>,
    trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    link: <><path d="M9 17H7A5 5 0 017 7h2"/><path d="M15 7h2a5 5 0 010 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></>,
    zapIn: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    warn: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

function Badge({ children, color="green", dot=true }) {
  const m = { green:["rgba(0,212,160,.1)","var(--green)","rgba(0,212,160,.2)"], red:["rgba(255,64,96,.1)","var(--red)","rgba(255,64,96,.2)"], amber:["rgba(255,170,0,.1)","var(--amber)","rgba(255,170,0,.2)"], blue:["rgba(68,136,255,.1)","var(--blue)","rgba(68,136,255,.2)"], purple:["rgba(153,102,255,.1)","var(--purple)","rgba(153,102,255,.2)"] }[color]||["rgba(0,212,160,.1)","var(--green)","rgba(0,212,160,.2)"];
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600, fontFamily:"var(--mono)", textTransform:"uppercase", letterSpacing:".05em", background:m[0], color:m[1], border:`1px solid ${m[2]}` }}>{dot&&<span style={{ width:5,height:5,borderRadius:"50%",background:"currentColor" }}/>}{children}</span>;
}

function Btn({ children, onClick, variant="primary", disabled, full, size="md", icon, style={} }) {
  const v = { primary:{bg:"var(--green)",color:"#000",border:"none",fw:700}, danger:{bg:"rgba(255,64,96,.1)",color:"var(--red)",border:"1px solid rgba(255,64,96,.25)",fw:500}, ghost:{bg:"transparent",color:"var(--t2)",border:"1px solid var(--b1)",fw:400}, outline:{bg:"var(--gd)",color:"var(--green)",border:"1px solid rgba(0,212,160,.25)",fw:500} }[variant]||{};
  const p = size==="sm"?"5px 10px":size==="lg"?"12px 24px":"8px 16px";
  const fs = size==="sm"?11:size==="lg"?14:12;
  return (
    <button onClick={onClick} disabled={disabled} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, padding:p, borderRadius:"var(--r3)", fontFamily:"var(--mono)", fontSize:fs, cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1, transition:"all .15s", width:full?"100%":undefined, background:v.bg, color:v.color, border:v.border, fontWeight:v.fw, ...style }}>
      {icon && <Icon name={icon} size={fs+2} color="currentColor"/>}{children}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────
function Modal({ open, onClose, title, color="var(--green)", children, width=460 }) {
  if (!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed",inset:0,background:"rgba(4,8,20,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)" }}>
      <div style={{ background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:"var(--r)",width,maxWidth:"95vw",boxShadow:"0 40px 100px rgba(0,0,0,.7)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid var(--b1)" }}>
          <div style={{ fontFamily:"var(--mono)",fontSize:14,fontWeight:700,color }}>{title}</div>
          <button onClick={onClose} style={{ background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:"var(--r3)",color:"var(--t2)",cursor:"pointer",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center" }}><Icon name="close" size={14}/></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:"block",fontSize:10,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".1em",fontFamily:"var(--mono)",marginBottom:8,fontWeight:600 }}>{label}</label>
      {children}
      {hint&&<div style={{ fontSize:11,color:"var(--t3)",marginTop:5 }}>{hint}</div>}
    </div>
  );
}

function StyledInput({ value, onChange, type="text", placeholder, min, step }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} step={step}
    style={{ width:"100%",background:"var(--s2)",border:"1px solid var(--b1)",color:"var(--t1)",padding:"11px 14px",borderRadius:"var(--r2)",fontFamily:"var(--mono)",fontSize:13,outline:"none",transition:"border .15s" }}
    onFocus={e=>e.target.style.borderColor="rgba(0,212,160,.4)"}
    onBlur={e=>e.target.style.borderColor="var(--b1)"}/>;
}

function StyledSelect({ value, onChange, options }) {
  return <select value={value} onChange={onChange}
    style={{ width:"100%",background:"var(--s2)",border:"1px solid var(--b1)",color:"var(--t1)",padding:"11px 14px",borderRadius:"var(--r2)",fontFamily:"var(--mono)",fontSize:13,outline:"none" }}>
    {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
  </select>;
}

function InfoRow({ label, value, valueColor }) {
  return <div style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--b1)",fontSize:12 }}>
    <span style={{ color:"var(--t2)" }}>{label}</span>
    <span style={{ color:valueColor||"var(--t1)",fontFamily:"var(--mono)",fontWeight:500 }}>{value}</span>
  </div>;
}

// ── Zap Modals ────────────────────────────────────────────────
function ZapInModal({ pool, onClose, onConfirm, loading }) {
  const [sol, setSol] = useState("0.5");
  const [strategy, setStrategy] = useState("Spot");
  if (!pool) return null;
  const name = `${pool.token0_symbol||"?"}/${pool.token1_symbol||"?"}`;
  return (
    <Modal open title={`⚡ Zap In — ${name}`} onClose={onClose}>
      <Field label="Amount in SOL" hint="Auto-swaps to provide balanced liquidity">
        <StyledInput type="number" value={sol} onChange={e=>setSol(e.target.value)} placeholder="0.5" min="0.01" step="0.1"/>
      </Field>
      <Field label="Strategy">
        <StyledSelect value={strategy} onChange={e=>setStrategy(e.target.value)} options={[["Spot","Spot — Uniform distribution (safest)"],["Curve","Curve — Concentrated around price"],["BidAsk","BidAsk — Edge concentrated (active)"]]}/>
      </Field>
      <div style={{ background:"var(--bg)",borderRadius:"var(--r2)",padding:"12px 14px",marginBottom:20 }}>
        <InfoRow label="Price impact" value="< 0.01%"/>
        <InfoRow label="Slippage tolerance" value="5%"/>
        <InfoRow label="Transaction routing" value="Jito Bundles" valueColor="var(--green)"/>
        <InfoRow label="Network fee" value="~0.002 SOL"/>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex:1 }}>Cancel</Btn>
        <Btn onClick={()=>onConfirm({poolId:pool.pool,inputSOL:parseFloat(sol)||0.1,strategy})} disabled={loading} style={{ flex:1,padding:12,fontSize:13 }}>
          {loading?"Processing...":"Confirm Zap In ⚡"}
        </Btn>
      </div>
    </Modal>
  );
}

function ZapOutModal({ position, onClose, onConfirm, loading }) {
  const [pct, setPct] = useState(100);
  const [output, setOutput] = useState("allBaseToken");
  if (!position) return null;
  const name = `${position.tokenName0||"?"}/${position.tokenName1||"?"}`;
  const val = usd((parseFloat(position.currentValue)||0)*pct/100);
  return (
    <Modal open title={`↩ Zap Out — ${name}`} color="var(--red)" onClose={onClose}>
      <Field label={`Withdraw — ${pct}% ≈ ${val}`}>
        <input type="range" min={10} max={100} step={10} value={pct} onChange={e=>setPct(Number(e.target.value))} style={{ width:"100%",accentColor:"var(--red)",cursor:"pointer",marginBottom:6 }}/>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--t2)" }}>
          <span>10%</span><span style={{ color:"var(--t1)",fontFamily:"var(--mono)",fontSize:15,fontWeight:700 }}>{val}</span><span>100%</span>
        </div>
      </Field>
      <Field label="Receive as">
        <StyledSelect value={output} onChange={e=>setOutput(e.target.value)} options={[["allBaseToken","SOL — auto-swap (recommended)"],["both","Both tokens"],["allToken0",`${position.tokenName0} only`],["allToken1",`${position.tokenName1} only`]]}/>
      </Field>
      <div style={{ background:"var(--bg)",borderRadius:"var(--r2)",padding:"12px 14px",marginBottom:20 }}>
        <InfoRow label="You receive" value={val} valueColor="var(--green)"/>
        <InfoRow label="Network fee" value="~0.002 SOL"/>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex:1 }}>Cancel</Btn>
        <Btn onClick={()=>onConfirm({positionId:position.id,bps:pct*100,output})} disabled={loading} style={{ flex:1,padding:12,fontSize:13,background:"var(--red)",color:"#fff",border:"none",fontWeight:700 }}>
          {loading?"Processing...":"Confirm Zap Out ↩"}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Dashboard Page ────────────────────────────────────────────
function Dashboard({ owner, positions, overview, loading, aiInsights, onZapOut }) {
  const tvl   = positions.reduce((s,p)=>s+(parseFloat(p.currentValue)||0),0);
  const fees  = positions.reduce((s,p)=>s+(p.collectedFee||0)+(parseFloat(p.unCollectedFee)||0),0);
  const netPnl= overview?.total_pnl?.ALL||0;
  const il    = positions.reduce((s,p)=>{ const v=(parseFloat(p.currentValue)||0)-(p.inputValue||0); return s+(v<0?v:0); },0);

  // Mock chart data — replace with real revenue API data
  const chartData = [42,38,51,47,62,58,71,68,75,72,84,91,88,95];
  const feeData   = [84,142,218,184,312,268,384];
  const days      = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const maxFee    = Math.max(...feeData);

  const STATS = [
    { label:"Total TVL", value:usd(tvl), delta:"+2.4% (24h)", deltaColor:"var(--green)", icon:"dollar", color:"var(--green)" },
    { label:"Fees Earned", value:usd(fees), delta:"+$384 today", deltaColor:"var(--green)", icon:"link", color:"var(--green)" },
    { label:"Net PnL", value:usd(netPnl), delta:pct(overview?.win_rate?.ALL*100||8.24), deltaColor:netPnl>=0?"var(--green)":"var(--red)", icon:"trending", color:netPnl>=0?"var(--green)":"var(--red)" },
    { label:"Impermanent Loss", value:usd(il), delta:"-1.0%", deltaColor:"var(--red)", icon:"info", color:"var(--red)" },
  ];

  if (!owner) return (
    <div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ textAlign:"center",maxWidth:380 }}>
        <div style={{ width:72,height:72,borderRadius:"50%",background:"var(--gd)",border:"1px solid rgba(0,212,160,.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:32 }}>◈</div>
        <div style={{ fontSize:22,fontWeight:700,marginBottom:10,color:"var(--green)",fontFamily:"var(--mono)" }}>LP Copilot</div>
        <div style={{ color:"var(--t2)",fontSize:14,lineHeight:1.7,marginBottom:28 }}>Connect your Phantom wallet to track positions, earn more fees, and get AI-powered LP advice on Solana.</div>
        <WalletMultiButton/>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      {/* Stat Cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14 }}>
        {STATS.map((s,i)=>(
          <div key={i} style={{ background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r)",padding:"20px 22px",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:0,right:0,width:80,height:80,background:s.color,borderRadius:"0 var(--r) 0 100%",opacity:.06 }}/>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
              <div style={{ fontSize:12,color:"var(--t2)",fontWeight:500 }}>{s.label}</div>
              <div style={{ width:32,height:32,borderRadius:"var(--r3)",background:`${s.color}15`,border:`1px solid ${s.color}25`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <Icon name={s.icon} size={14} color={s.color}/>
              </div>
            </div>
            <div style={{ fontSize:26,fontWeight:700,fontFamily:"var(--mono)",color:s.color,marginBottom:8,lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:12,color:s.deltaColor,display:"flex",alignItems:"center",gap:4 }}>
              <Icon name="trending" size={12} color={s.deltaColor}/>{s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:14 }}>
        {/* Portfolio Value Chart */}
        <div style={{ background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r)",padding:20 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
            <div>
              <div style={{ fontWeight:600,fontSize:14,marginBottom:3 }}>Portfolio Value</div>
              <div style={{ fontSize:11,color:"var(--t2)" }}>7-day TVL evolution</div>
            </div>
            <div style={{ display:"flex",gap:4,background:"var(--s2)",borderRadius:"var(--r3)",padding:3 }}>
              {["24H","7D","1M","All"].map(t=>(
                <button key={t} style={{ padding:"4px 10px",borderRadius:4,border:"none",cursor:"pointer",fontFamily:"var(--mono)",fontSize:10,fontWeight:600,background:t==="7D"?"var(--s3)":"transparent",color:t==="7D"?"var(--green)":"var(--t2)",transition:"all .15s" }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ position:"relative",height:160 }}>
            <svg width="100%" height="160" preserveAspectRatio="none" viewBox={`0 0 ${chartData.length-1} 100`}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4a0" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#00d4a0" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {(() => {
                const min=Math.min(...chartData), max=Math.max(...chartData), range=max-min||1;
                const pts=chartData.map((v,i)=>`${i},${100-((v-min)/range)*85-7.5}`);
                return <>
                  <path d={`M0,100 L${pts.join(" L")} L${chartData.length-1},100 Z`} fill="url(#chartGrad)"/>
                  <polyline points={pts.join(" ")} fill="none" stroke="#00d4a0" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx={pts[pts.length-1].split(",")[0]} cy={pts[pts.length-1].split(",")[1]} r="1.5" fill="#00d4a0"/>
                </>;
              })()}
            </svg>
          </div>
        </div>

        {/* Daily Fees */}
        <div style={{ background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r)",padding:20 }}>
          <div style={{ fontWeight:600,fontSize:14,marginBottom:4 }}>Daily Fees</div>
          <div style={{ fontSize:11,color:"var(--t2)",marginBottom:16 }}>Last 7 days</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {days.map((d,i)=>(
              <div key={d} style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ fontSize:11,color:"var(--t2)",width:28,fontFamily:"var(--mono)" }}>{d}</div>
                <div style={{ flex:1,height:6,background:"var(--s3)",borderRadius:3,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${(feeData[i]/maxFee)*100}%`,background:`linear-gradient(90deg, var(--green), var(--purple))`,borderRadius:3,transition:"width .5s" }}/>
                </div>
                <div style={{ fontSize:11,fontFamily:"var(--mono)",color:"var(--t1)",width:36,textAlign:"right" }}>${feeData[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <div style={{ background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r)",padding:20 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:32,height:32,borderRadius:"var(--r3)",background:"var(--gd)",border:"1px solid rgba(0,212,160,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>✦</div>
              <div>
                <div style={{ fontWeight:600,fontSize:14 }}>AI Insights</div>
                <div style={{ fontSize:11,color:"var(--t2)" }}>Claude analyzed your portfolio · {aiInsights.length} actions</div>
              </div>
            </div>
            <Btn variant="ghost" size="sm">View all ↗</Btn>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
            {aiInsights.map((ins,i)=>{
              const cfg={good:["var(--gd)","var(--green)","rgba(0,212,160,.12)","check"],warn:["var(--ad)","var(--amber)","rgba(255,170,0,.12)","warn"],info:["var(--bd)","var(--blue)","rgba(68,136,255,.12)","info"]}[ins.type]||["var(--bd)","var(--blue)","rgba(68,136,255,.12)","info"];
              return (
                <div key={i} style={{ background:cfg[0],border:`1px solid ${cfg[2]}`,borderRadius:"var(--r2)",padding:16 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                    <div style={{ width:28,height:28,borderRadius:"50%",background:cfg[2],display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Icon name={cfg[3]} size={13} color={cfg[1]}/>
                    </div>
                    <div style={{ fontSize:12,fontWeight:600,color:cfg[1] }}>{ins.title}</div>
                  </div>
                  <div style={{ fontSize:12,color:"var(--t2)",lineHeight:1.65 }}>{ins.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Positions Table */}
      {positions.length>0 && (
        <div style={{ background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r)",overflow:"hidden" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid var(--b1)" }}>
            <div>
              <div style={{ fontWeight:600,fontSize:14 }}>Open Positions</div>
              <div style={{ fontSize:11,color:"var(--t2)",marginTop:2 }}>Live across {positions.length} positions</div>
            </div>
          </div>
          <div style={{ padding:"0 20px" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Pool","Value","Fees","PnL","Status","Action"].map(h=><th key={h} style={{ fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".08em",padding:"12px 12px 12px 0",fontFamily:"var(--mono)",fontWeight:500,textAlign:"left",borderBottom:"1px solid var(--b1)" }}>{h}</th>)}</tr></thead>
              <tbody>
                {positions.map((p,i)=>{
                  const name=`${p.tokenName0||"?"}/${p.tokenName1||"?"}`;
                  const pl=p.pnl?.percent;
                  return <tr key={i} style={{ borderBottom:"1px solid var(--b1)",transition:"background .1s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"14px 12px 14px 0" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div style={{ width:36,height:36,borderRadius:"var(--r3)",background:"linear-gradient(135deg,var(--gd),var(--bd))",border:"1px solid var(--b1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontFamily:"var(--mono)",fontWeight:700,color:"var(--green)" }}>{name.slice(0,3)}</div>
                        <div><div style={{ fontWeight:600,fontSize:13 }}>{name}</div><div style={{ fontSize:11,color:"var(--t2)",fontFamily:"var(--mono)" }}>{p.protocol}</div></div>
                      </div>
                    </td>
                    <td style={{ padding:"14px 12px 14px 0",fontFamily:"var(--mono)",fontWeight:500 }}>{usd(parseFloat(p.currentValue))}</td>
                    <td style={{ padding:"14px 12px 14px 0",color:"var(--green)",fontFamily:"var(--mono)" }}>{usd((p.collectedFee||0)+(parseFloat(p.unCollectedFee)||0))}</td>
                    <td style={{ padding:"14px 12px 14px 0",color:pl>=0?"var(--green)":"var(--red)",fontFamily:"var(--mono)" }}>{pct(pl)}</td>
                    <td style={{ padding:"14px 12px 14px 0" }}><Badge color={p.inRange?"green":"amber"}>{p.inRange?"In Range":"Out of Range"}</Badge></td>
                    <td style={{ padding:"14px 0 14px 0" }}><Btn variant="danger" size="sm" onClick={()=>onZapOut(p)} icon="zapIn">Zap Out</Btn></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && !positions.length && <div style={{ textAlign:"center",padding:40,color:"var(--t2)" }}>Loading portfolio data...</div>}
    </div>
  );
}

// ── Pools Page ────────────────────────────────────────────────
function Pools({ onZapIn }) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [risk, setRisk] = useState("all");

  useEffect(()=>{
    setLoading(true);
    apiFetch(`/pools/discover?sortBy=vol_24h&pageSize=24`)
      .then(d=>setPools(d.data||[]))
      .catch(()=>setPools([]))
      .finally(()=>setLoading(false));
  },[]);

  const aprCalc = p => p.tvl&&p.vol_24h&&p.fee ? ((p.vol_24h*p.fee/p.tvl)*365*100) : 0;
  const fmt = n => !n?"—":n>=1e6?"$"+(n/1e6).toFixed(2)+"M":n>=1e3?"$"+(n/1e3).toFixed(1)+"K":"$"+n.toFixed(0);
  const riskOf = p => { const a=aprCalc(p); return a>100?"HIGH":a>40?"MEDIUM":"LOW"; };
  const riskColor = r => r==="HIGH"?"red":r==="MEDIUM"?"amber":"green";

  const filtered = pools.filter(p=>{
    if(filter!=="all" && p.protocol?.toLowerCase().indexOf(filter)===-1) return false;
    if(risk!=="all" && riskOf(p).toLowerCase()!==risk) return false;
    return true;
  });

  const mockSparkline = (seed) => Array.from({length:10},(_,i)=>40+Math.sin(i*0.8+seed)*20+Math.random()*10);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:20,fontWeight:700,marginBottom:4 }}>Pool Discovery</div>
          <div style={{ fontSize:12,color:"var(--t2)" }}>Live Meteora DLMM & DAMM V2 pools</div>
        </div>
      </div>

      {/* AI Recommendation Banner */}
      <div style={{ background:"linear-gradient(135deg,rgba(0,212,160,.08),rgba(153,102,255,.08))",border:"1px solid rgba(0,212,160,.15)",borderRadius:"var(--r)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:14 }}>
          <div style={{ width:38,height:38,borderRadius:"var(--r2)",background:"var(--gd)",border:"1px solid rgba(0,212,160,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>✦</div>
          <div>
            <div style={{ fontWeight:600,fontSize:13,marginBottom:3 }}>AI Pool Recommendation</div>
            <div style={{ fontSize:12,color:"var(--t2)" }}>Based on current market data, <span style={{ color:"var(--green)",fontWeight:600 }}>high-volume DLMM pools</span> offer the best fee capture right now.</div>
          </div>
        </div>
        <Btn variant="outline" size="sm">Customize Profile</Btn>
      </div>

      {/* Filters */}
      <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
        <span style={{ fontSize:12,color:"var(--t2)",marginRight:4 }}>Filters:</span>
        {[["all","All"],["dlmm","DLMM"],["damm","DAMM V2"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{ padding:"5px 14px",borderRadius:20,border:`1px solid ${filter===v?"rgba(0,212,160,.3)":"var(--b1)"}`,background:filter===v?"var(--gd)":"transparent",color:filter===v?"var(--green)":"var(--t2)",fontSize:12,cursor:"pointer",fontFamily:"var(--mono)",transition:"all .15s" }}>{l}</button>
        ))}
        <div style={{ width:1,height:20,background:"var(--b1)",margin:"0 4px" }}/>
        {[["all","Risk: All"],["low","Risk: Low"],["medium","Risk: Medium"],["high","Risk: High"]].map(([v,l])=>(
          <button key={v} onClick={()=>setRisk(v)} style={{ padding:"5px 14px",borderRadius:20,border:`1px solid ${risk===v?"rgba(0,212,160,.3)":"var(--b1)"}`,background:risk===v?"var(--gd)":"transparent",color:risk===v?"var(--green)":"var(--t2)",fontSize:12,cursor:"pointer",fontFamily:"var(--mono)",transition:"all .15s" }}>{l}</button>
        ))}
      </div>

      {/* Pool Grid */}
      {loading ? <div style={{ textAlign:"center",padding:60,color:"var(--t2)" }}>Loading pools...</div> :
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
          {filtered.map((p,i)=>{
            const apr=aprCalc(p);
            const r=riskOf(p);
            const rc=riskColor(r);
            const aprColor=r==="HIGH"?"var(--red)":r==="MEDIUM"?"var(--amber)":"var(--green)";
            const sparkData=mockSparkline(i*2.5);
            return (
              <div key={p.pool||i} style={{ background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r)",padding:16,transition:"all .2s",cursor:"pointer" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(0,212,160,.25)"; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 30px rgba(0,0,0,.3)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--b1)"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:14,marginBottom:5 }}>{p.token0_symbol||"?"}/{p.token1_symbol||"?"}</div>
                    <div style={{ display:"flex",gap:6 }}>
                      <Badge color="blue" dot={false}>{p.protocol?.includes("damm")?"DAMM V2":"DLMM"}</Badge>
                      <Badge color={rc} dot={false}>{r}</Badge>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:aprColor }}>{apr.toFixed(1)}%</div>
                    <div style={{ fontSize:10,color:"var(--t2)" }}>APR</div>
                  </div>
                </div>
                <div style={{ margin:"12px 0" }}>
                  <Sparkline data={sparkData} color={aprColor} height={40} width={200}/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8 }}>
                  {[["TVL",fmt(p.tvl)],["Vol 24h",fmt(p.vol_24h)],["Fees 24h",fmt(p.vol_24h&&p.fee?p.vol_24h*p.fee:0)],["Trend","▲ +12%"]].map(([k,v])=>(
                    <div key={k}>
                      <div style={{ fontSize:9,color:"var(--t3)",marginBottom:1,textTransform:"uppercase",letterSpacing:".08em" }}>{k}</div>
                      <div style={{ fontSize:12,fontFamily:"var(--mono)",fontWeight:600,color:k==="Trend"?"var(--green)":"var(--t1)" }}>{v}</div>
                    </div>
                  ))}
                </div>
                <Btn variant="outline" onClick={()=>onZapIn(p)} full icon="zapIn" style={{ padding:"9px 14px" }}>Zap In</Btn>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

// ── AI Advisor Page ───────────────────────────────────────────
function AIAdvisor({ positions, overview }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(()=>{
    // Load initial greeting with portfolio context
    const greeting = positions.length>0
      ? `Hey — I've loaded your ${positions.length} open positions across Meteora. Your portfolio is up ${overview?.win_rate?.ALL?((overview.win_rate.ALL*100).toFixed(2)+"%"):"8.24%"} net. What would you like to explore?`
      : "Hi! I'm LP Copilot AI. Connect your wallet and I'll analyze your positions. Or ask me anything about Solana LP strategy! 🚀";
    setMsgs([{ role:"ai", text:greeting }]);
  },[positions.length]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[msgs]);

  async function send(msg) {
    const m=(msg||input).trim();
    if(!m||loading) return;
    setInput("");
    setMsgs(s=>[...s,{role:"user",text:m}]);
    setLoading(true);
    try {
      const walletData=positions?.length?{positions:positions.slice(0,5),overview}:null;
      const r=await apiFetch("/ai/chat",{method:"POST",body:JSON.stringify({message:m,walletData})});
      setMsgs(s=>[...s,{role:"ai",text:r.reply}]);
    } catch(e) {
      setMsgs(s=>[...s,{role:"ai",text:`⚠ ${e.message}`,error:true}]);
    } finally { setLoading(false); }
  }

  const QUICK=["What's my best performing position?","Rebalance my out-of-range positions","Find me a pool with 100%+ APR and low IL","Compare DLMM vs DAMM V2 for SOL/USDC"];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",gap:14 }}>
      <div>
        <div style={{ fontSize:20,fontWeight:700,marginBottom:4 }}>AI Advisor</div>
        <div style={{ fontSize:12,color:"var(--t2)" }}>Powered by Groq · {positions.length>0?`with full portfolio context · ${positions.length} positions loaded`:"connect wallet for personalized advice"}</div>
      </div>
      <div style={{ flex:1,background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r)",display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden" }}>
        {/* Chat header */}
        <div style={{ padding:"14px 20px",borderBottom:"1px solid var(--b1)",display:"flex",alignItems:"center",gap:12,flexShrink:0 }}>
          <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,var(--gd),var(--bd))",border:"1px solid rgba(0,212,160,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>✦</div>
          <div>
            <div style={{ fontWeight:600,fontSize:13 }}>LP Copilot AI</div>
            <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:"var(--t2)" }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 6px var(--green)" }}/>
              Connected{positions.length>0?` · ${positions.length} positions loaded`:""}
            </div>
          </div>
        </div>
        {/* Messages */}
        <div style={{ flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:16 }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ display:"flex",gap:12,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row" }}>
              <div style={{ width:34,height:34,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontFamily:"var(--mono)",fontWeight:600,background:m.role==="ai"?"linear-gradient(135deg,var(--gd),var(--bd))":"var(--s3)",border:`1px solid ${m.role==="ai"?"rgba(0,212,160,.2)":"var(--b2)"}`,color:m.role==="ai"?"var(--green)":"var(--blue)" }}>
                {m.role==="ai"?"✦":"U"}
              </div>
              <div style={{ background:m.role==="user"?"var(--s3)":"var(--s2)",border:`1px solid ${m.error?"rgba(255,64,96,.2)":m.role==="user"?"var(--b2)":"var(--b1)"}`,borderRadius:m.role==="user"?"var(--r) var(--r3) var(--r) var(--r)":"var(--r3) var(--r) var(--r) var(--r)",padding:"12px 16px",maxWidth:"76%",fontSize:13,lineHeight:1.75,color:m.error?"var(--red)":"var(--t1)" }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{ display:"flex",gap:12,alignItems:"center" }}>
              <div style={{ width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,var(--gd),var(--bd))",border:"1px solid rgba(0,212,160,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--green)" }}>✦</div>
              <div style={{ background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:"var(--r3) var(--r) var(--r) var(--r)",padding:"12px 16px",color:"var(--t2)",fontSize:13 }}>Thinking...</div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        {/* Quick actions */}
        <div style={{ padding:"12px 20px",borderTop:"1px solid var(--b1)",display:"flex",gap:8,flexWrap:"wrap",flexShrink:0 }}>
          {QUICK.map(q=>(
            <button key={q} onClick={()=>send(q)} style={{ padding:"5px 12px",borderRadius:20,fontSize:11,fontFamily:"var(--mono)",cursor:"pointer",background:"var(--s2)",color:"var(--t2)",border:"1px solid var(--b1)",transition:"all .15s",whiteSpace:"nowrap" }}
              onMouseEnter={e=>{ e.target.style.borderColor="rgba(0,212,160,.25)"; e.target.style.color="var(--green)"; }}
              onMouseLeave={e=>{ e.target.style.borderColor="var(--b1)"; e.target.style.color="var(--t2)"; }}>
              {q}
            </button>
          ))}
        </div>
        {/* Input */}
        <div style={{ padding:"14px 20px",borderTop:"1px solid var(--b1)",display:"flex",gap:10,flexShrink:0 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
            placeholder="Ask about your positions, strategy, or pools..."
            style={{ flex:1,background:"var(--s2)",border:"1px solid var(--b1)",color:"var(--t1)",padding:"12px 16px",borderRadius:"var(--r2)",fontFamily:"var(--mono)",fontSize:13,outline:"none",transition:"border .15s" }}
            onFocus={e=>e.target.style.borderColor="rgba(0,212,160,.4)"}
            onBlur={e=>e.target.style.borderColor="var(--b1)"}/>
          <button onClick={()=>send()} disabled={loading} style={{ width:44,height:44,borderRadius:"var(--r2)",background:"var(--green)",border:"none",cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:loading?.6:1,transition:"opacity .15s" }}>
            <Icon name="send" size={16} color="#000"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity Page ─────────────────────────────────────────────
function Activity({ owner }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    if(!owner) return;
    setLoading(true);
    apiFetch(`/positions/logs?owner=${owner}`)
      .then(d=>setLogs(d.data||[]))
      .catch(()=>setLogs([]))
      .finally(()=>setLoading(false));
  },[owner]);

  const txIcon = (type) => {
    if(!type) return "activity";
    const t=type.toLowerCase();
    if(t.includes("zap_in")||t.includes("add")) return "zapIn";
    if(t.includes("zap_out")||t.includes("remove")) return "zapIn";
    if(t.includes("claim")||t.includes("fee")) return "link";
    if(t.includes("rebalance")) return "refresh";
    return "activity";
  };
  const txColor = (type) => {
    if(!type) return "var(--blue)";
    const t=type.toLowerCase();
    if(t.includes("zap_in")||t.includes("add")) return "var(--green)";
    if(t.includes("zap_out")||t.includes("remove")) return "var(--red)";
    if(t.includes("claim")) return "var(--amber)";
    return "var(--blue)";
  };
  const txLabel = (type) => {
    if(!type) return "Transaction";
    const t=type.toLowerCase();
    if(t.includes("zap_in")||t.includes("add")) return "Zap In";
    if(t.includes("zap_out")||t.includes("remove")) return "Zap Out";
    if(t.includes("claim")) return "Claim Fees";
    if(t.includes("rebalance")) return "Rebalance";
    return type;
  };

  const displayLogs = logs;

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      <div>
        <div style={{ fontSize:20,fontWeight:700,marginBottom:4 }}>Activity Log</div>
        <div style={{ fontSize:12,color:"var(--t2)" }}>All on-chain LP transactions</div>
      </div>
      <div style={{ background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r)",overflow:"hidden" }}>
        {loading && <div style={{ textAlign:"center",padding:40,color:"var(--t2)" }}>Loading activity...</div>}
        {!loading && !owner && <div style={{ textAlign:"center",padding:40,color:"var(--t2)" }}>Connect wallet to view your activity</div>}
        {!loading && displayLogs.map((log,i)=>{
          const type=log.type||log.action||"";
          const pool=log.pool||log.poolName||"";
          const amount=log.amount||log.value||0;
          const color=txColor(type);
          const label=txLabel(type);
          const tx=log.tx||log.txHash||"";
          const ts=log.time||log.timestamp||Date.now();
          return (
            <div key={i} style={{ display:"flex",alignItems:"center",gap:16,padding:"16px 20px",borderBottom:i<displayLogs.length-1?"1px solid var(--b1)":"none",transition:"background .1s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:40,height:40,borderRadius:"var(--r2)",background:`${color}12`,border:`1px solid ${color}25`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <Icon name={txIcon(type)} size={16} color={color}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600,fontSize:13,marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:12,color:"var(--t2)" }}>{pool} · {timeAgo(ts)}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"var(--mono)",fontWeight:700,fontSize:14,color,marginBottom:3 }}>{amount?usd(amount):""}</div>
                {tx&&<div style={{ fontSize:11,color:"var(--t2)",fontFamily:"var(--mono)",display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end" }}><span style={{ color:"var(--green)" }}>● Confirmed</span></div>}
              </div>
              {tx&&<a href={`https://solscan.io/tx/${tx.replace("...","")}`} target="_blank" rel="noreferrer" style={{ color:"var(--t2)",display:"flex",alignItems:"center" }}><Icon name="link" size={14}/></a>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────
export default function App() {
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58()||null;

  const [page, setPage]             = useState("dashboard");
  const [positions, setPositions]   = useState([]);
  const [overview, setOverview]     = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [zapInPool, setZapInPool]   = useState(null);
  const [zapOutPos, setZapOutPos]   = useState(null);
  const [zapInLoading, setZapInLoading]   = useState(false);
  const [zapOutLoading, setZapOutLoading] = useState(false);
  const [toast, setToast]           = useState(null);
  const [search, setSearch]         = useState("");

  const showToast = (msg,ok=true)=>{ setToast({msg,ok}); setTimeout(()=>setToast(null),4000); };

  const loadData = useCallback(async()=>{
    if(!owner) return;
    setLoading(true);
    try {
      const [posRes,ovRes]=await Promise.allSettled([
        apiFetch(`/positions/open?owner=${owner}`),
        apiFetch(`/positions/overview?owner=${owner}`),
      ]);
      const pos=posRes.status==="fulfilled"?(posRes.value.data||[]):[];
      const ov=ovRes.status==="fulfilled"?(ovRes.value.data||null):null;
      setPositions(pos); setOverview(ov);
      if(pos.length>0){
        apiFetch("/ai/analyze",{method:"POST",body:JSON.stringify({positions:pos})})
          .then(r=>setAiInsights(r.insights||[]))
          .catch(()=>{});
      }
    } catch(e){ showToast(`Error: ${e.message}`,false); }
    finally{ setLoading(false); }
  },[owner]);

  useEffect(()=>{ loadData(); },[loadData]);

  async function handleZapIn({poolId,inputSOL,strategy}){
    setZapInLoading(true);
    try {
      await apiFetch("/zap/in/prepare",{method:"POST",body:JSON.stringify({poolId,owner,inputSOL,strategy})});
      setZapInPool(null);
      showToast("⚡ Zap In prepared — approve in your wallet!");
    } catch(e){ showToast(`Zap In failed: ${e.message}`,false); }
    finally{ setZapInLoading(false); }
  }

  async function handleZapOut({positionId,bps,output}){
    setZapOutLoading(true);
    try {
      await apiFetch("/zap/out/prepare",{method:"POST",body:JSON.stringify({positionId,owner,bps,output})});
      setZapOutPos(null);
      showToast("↩ Zap Out prepared — approve in your wallet!");
    } catch(e){ showToast(`Zap Out failed: ${e.message}`,false); }
    finally{ setZapOutLoading(false); }
  }

  const NAV=[
    {id:"dashboard",icon:"dashboard",label:"Dashboard"},
    {id:"pools",icon:"pools",label:"Pools"},
    {id:"ai",icon:"ai",label:"AI Advisor"},
    {id:"activity",icon:"activity",label:"Activity"},
  ];

  return (
    <>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ width:"100vw",height:"100vh",display:"flex",overflow:"hidden",background:"var(--bg)" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width:220,background:"var(--sidebar)",borderRight:"1px solid var(--b1)",display:"flex",flexDirection:"column",flexShrink:0 }}>
          {/* Logo */}
          <div style={{ padding:"20px 18px 16px",borderBottom:"1px solid var(--b1)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:4 }}>
              <div style={{ width:34,height:34,borderRadius:"var(--r2)",background:"linear-gradient(135deg,rgba(0,212,160,.2),rgba(0,212,160,.05))",border:"1px solid rgba(0,212,160,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"var(--green)" }}>◈</div>
              <div>
                <div style={{ fontFamily:"var(--mono)",fontSize:14,fontWeight:700,color:"var(--green)",lineHeight:1 }}>LP Copilot</div>
                <div style={{ fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".1em",marginTop:2 }}>Meteora · Solana</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:2 }}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setPage(n.id)} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:"var(--r2)",border:"none",cursor:"pointer",width:"100%",textAlign:"left",transition:"all .15s",background:page===n.id?"var(--gd)":"transparent",color:page===n.id?"var(--green)":"var(--t2)",borderLeft:page===n.id?"2px solid var(--green)":"2px solid transparent" }}>
                <Icon name={n.icon} size={16} color="currentColor"/>
                <span style={{ fontFamily:"var(--mono)",fontSize:12,fontWeight:page===n.id?600:400 }}>{n.label}</span>
              </button>
            ))}
          </nav>

          {/* LP Agent badge */}
          <div style={{ margin:12,background:"linear-gradient(135deg,rgba(0,212,160,.06),rgba(0,212,160,.02))",border:"1px solid rgba(0,212,160,.15)",borderRadius:"var(--r2)",padding:"12px 14px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 6px var(--green)" }}/>
              <div style={{ fontSize:11,fontWeight:700,color:"var(--green)",fontFamily:"var(--mono)" }}>LP Agent</div>
            </div>
            <div style={{ fontSize:12,fontWeight:600,color:"var(--t1)",marginBottom:2 }}>Premium · Live</div>
            <div style={{ fontSize:10,color:"var(--t2)" }}>12 endpoints active</div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
          {/* Topbar */}
          <header style={{ height:56,borderBottom:"1px solid var(--b1)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0,background:"var(--sidebar)" }}>
            <div>
              <div style={{ fontWeight:700,fontSize:15 }}>
                {page==="dashboard"?"Portfolio Overview":page==="pools"?"Pool Discovery":page==="ai"?"AI Advisor":"Activity Log"}
              </div>
              <div style={{ fontSize:11,color:"var(--t2)",marginTop:1 }}>
                {page==="dashboard"&&owner?`Live across ${positions.length} positions · last sync just now`:""}
                {page==="pools"?"Live Meteora DLMM & DAMM V2 pools":""}
                {page==="ai"?"Powered by Groq · with full portfolio context":""}
                {page==="activity"?"All on-chain LP transactions":""}
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              {/* Search */}
              <div style={{ display:"flex",alignItems:"center",gap:8,background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r2)",padding:"7px 14px",width:220 }}>
                <Icon name="search" size={13} color="var(--t2)"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search pools, tokens..." style={{ background:"none",border:"none",outline:"none",color:"var(--t1)",fontSize:12,fontFamily:"var(--mono)",width:"100%" }}/>
                <span style={{ fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)",background:"var(--s2)",padding:"2px 5px",borderRadius:4 }}>⌘K</span>
              </div>
              {/* Bell */}
              <button style={{ width:34,height:34,borderRadius:"var(--r3)",background:"var(--s1)",border:"1px solid var(--b1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--t2)" }}>
                <Icon name="bell" size={15}/>
              </button>
              {/* Refresh */}
              {owner&&<button onClick={loadData} style={{ width:34,height:34,borderRadius:"var(--r3)",background:"var(--s1)",border:"1px solid var(--b1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--t2)" }}>
                <Icon name="refresh" size={15}/>
              </button>}
              {/* Wallet */}
              <WalletMultiButton/>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex:1,overflowY:"auto",padding:24 }}>
            {page==="dashboard" && <Dashboard owner={owner} positions={positions} overview={overview} loading={loading} aiInsights={aiInsights} onZapOut={setZapOutPos}/>}
            {page==="pools"     && <Pools onZapIn={setZapInPool}/>}
            {page==="ai"        && <div style={{ height:"calc(100vh - 104px)" }}><AIAdvisor positions={positions} overview={overview}/></div>}
            {page==="activity"  && <Activity owner={owner}/>}
          </main>
        </div>
      </div>

      {/* Modals */}
      <ZapInModal  pool={zapInPool}    onClose={()=>setZapInPool(null)}  onConfirm={handleZapIn}  loading={zapInLoading}/>
      <ZapOutModal position={zapOutPos} onClose={()=>setZapOutPos(null)} onConfirm={handleZapOut} loading={zapOutLoading}/>

      {/* Toast */}
      {toast&&(
        <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.ok?"var(--green)":"var(--red)",color:toast.ok?"#000":"#fff",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,padding:"12px 22px",borderRadius:"var(--r2)",boxShadow:"0 10px 40px rgba(0,0,0,.5)",animation:"fadeUp .2s ease",maxWidth:400 }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
