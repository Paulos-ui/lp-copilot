# 🚀 LP Copilot — AI-Powered LP Portfolio Dashboard

> Built for the LP Agent Hackathon | Meteora DLMM + DAMM V2 | Solana

LP Copilot is an intelligent portfolio tracker and advisor for Liquidity Providers on Solana. It combines real-time LP Agent data with Claude AI to give actionable insights, one-click Zap In/Out, and personalized strategy recommendations.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Portfolio Dashboard** | Real-time TVL, fees, PnL, IL across all positions |
| **AI Portfolio Analysis** | Claude analyzes your positions and surfaces actionable insights |
| **Pool Discovery** | Browse Meteora pools with live APR, volume, TVL |
| **AI Pool Recommendations** | Tell the AI your risk profile — it picks the best pools |
| **Zap In** | One-click add liquidity to any pool using just SOL |
| **Zap Out** | Withdraw with preview quotes, choose output token |
| **AI Advisor Chat** | Ask LP strategy questions with your full portfolio as context |
| **Transaction History** | Full log of all LP activity |

---

## 📁 Project Structure

```
lp-copilot/
│
├── backend/                        ← Node.js + Express API server
│   ├── .env                        ← YOUR SECRET KEYS GO HERE (not on GitHub)
│   ├── server.js                   ← App entry point
│   ├── lib/
│   │   └── lpAgent.js              ← LP Agent API client (all 12 endpoints)
│   └── routes/
│       ├── positions.js            ← /api/positions/*
│       ├── pools.js                ← /api/pools/*
│       ├── zap.js                  ← /api/zap/in|out/prepare|land
│       └── ai.js                   ← /api/ai/chat|analyze|pool-recommendation
│
├── frontend/                       ← React + Vite frontend
│   ├── .env                        ← Frontend env vars
│   └── src/
│       ├── lib/
│       │   ├── api.js              ← Frontend API client
│       │   └── transactions.js     ← Wallet signing + Zap flows
│       └── hooks/
│           ├── usePortfolio.js     ← Portfolio data + AI insights
│           ├── usePools.js         ← Pool discovery
│           └── useZap.js           ← Zap In/Out with wallet adapter
│
├── .env.example                    ← Template showing all env vars needed
├── .gitignore                      ← Excludes node_modules + .env files
├── package.json                    ← Root convenience scripts
└── README.md                       ← This file
```

---

## STEP 1 — Get Your API Keys

You need 2 keys before running anything.

### LP Agent API Key
1. Go to https://portal.lpagent.io/
2. Sign up and copy your API key from the dashboard
3. For Premium hackathon access: DM @thanhle27 on Telegram with your email

### Anthropic API Key (for AI features)
1. Go to https://console.anthropic.com
2. Click "API Keys" in the left sidebar
3. Click "Create Key" and copy it — starts with sk-ant-...

---

## STEP 2 — Add Keys to backend/.env

Open `backend/.env` in any text editor (Notepad, VS Code, etc.).

You will see:
```
LP_AGENT_API_KEY=paste_your_lp_agent_key_here
ANTHROPIC_API_KEY=paste_your_anthropic_key_here
```

Replace the placeholder text with your actual keys:
```
LP_AGENT_API_KEY=abc123youractuallpagentkey
ANTHROPIC_API_KEY=sk-ant-api03-youractualanthropickey
```

Save the file. This file is in .gitignore — Git will never upload it to GitHub.

---

## STEP 3 — Install and Run

Open a terminal in the lp-copilot folder.

```bash
# Install backend
cd backend
npm install

# Install frontend (new terminal tab)
cd frontend
npm install
```

Run backend (Terminal 1):
```bash
cd backend
npm run dev
# Running on http://localhost:4000
```

Run frontend (Terminal 2):
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

Open http://localhost:3000 in your browser.

---

## STEP 4 — Push to GitHub

```bash
cd lp-copilot
git init
git add .
git commit -m "initial commit — LP Copilot"
git remote add origin https://github.com/YOUR_USERNAME/lp-copilot
git push -u origin main
```

What gets pushed: all code, README, .env.example
What stays private: backend/.env (your actual keys — .gitignore protects this)

---

## LP Agent API Endpoints Used

| Endpoint | Purpose |
|---|---|
| GET /lp-positions/opening | Open positions for wallet |
| GET /lp-positions/overview | Portfolio metrics and win rate |
| GET /lp-positions/revenue | PnL over time (7D/1M) |
| GET /lp-positions/logs | Transaction history |
| GET /pools/discover | Pool discovery with filters |
| GET /pools/:id/info | Pool details and active bin |
| GET /pools/:id/top-lpers | Top LP providers (Premium) |
| POST /pools/:id/add-tx | Zap-In: generate unsigned txs |
| POST /pools/landing-add-tx | Zap-In: land via Jito bundles |
| POST /position/decrease-quotes | Zap-Out: preview quotes |
| POST /position/decrease-tx | Zap-Out: generate unsigned txs |
| POST /position/landing-decrease-tx | Zap-Out: land via Jito bundles |

---

## Hackathon Checklist

- Uses multiple LP Agent API endpoints
- Zap-In fully integrated (generate + sign + land via Jito)
- Zap-Out fully integrated (quotes + generate + sign + land via Jito)
- AI agent layer powered by real LP Agent data
- Clear demo flow for judges
