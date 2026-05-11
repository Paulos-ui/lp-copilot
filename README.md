# 🚀 LP Copilot — AI-Powered LP Portfolio Dashboard

> Built for the LP Agent Hackathon | Meteora DLMM + DAMM V2 | Solana

LP Copilot is an intelligent portfolio tracker and advisor for Liquidity Providers on Solana. It combines real-time LP Agent data with Claude AI to give you actionable insights, one-click Zap In/Out, and personalized strategy recommendations.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Portfolio Dashboard** | Real-time TVL, fees, PnL, IL across all positions |
| **AI Portfolio Analysis** | Claude analyzes your positions and surfaces actionable insights |
| **Pool Discovery** | Browse 1000s of Meteora pools with live APR, volume, TVL |
| **AI Pool Recommendations** | Tell the AI your risk profile — it picks the best pools |
| **Zap In** | One-click add liquidity to any pool using just SOL |
| **Zap Out** | Withdraw with preview quotes, choose output token |
| **AI Advisor Chat** | Ask LP strategy questions with full portfolio context |
| **Transaction History** | Full log of all LP activity |

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Chart.js |
| Backend | Node.js, Express 5 |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Blockchain | `@solana/wallet-adapter-react`, `@solana/web3.js` |
| LP Data | LP Agent Open API |
| TX Landing | LP Agent Jito bundle integration |

---

## 📡 LP Agent API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /lp-positions/opening` | Open positions for wallet |
| `GET /lp-positions/overview` | Portfolio metrics & win rate |
| `GET /lp-positions/revenue` | PnL over time (7D/1M) |
| `GET /lp-positions/logs` | Transaction history |
| `GET /pools/discover` | Pool discovery with filters |
| `GET /pools/:id/info` | Pool details + active bin |
| `GET /pools/:id/top-lpers` | Top LP providers (Premium) |
| `POST /pools/:id/add-tx` | **Zap-In** — generate txs |
| `POST /pools/landing-add-tx` | **Zap-In** — land via Jito |
| `POST /position/decrease-quotes` | **Zap-Out** — preview quotes |
| `POST /position/decrease-tx` | **Zap-Out** — generate txs |
| `POST /position/landing-decrease-tx` | **Zap-Out** — land via Jito |

---

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/lp-copilot
cd lp-copilot
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and fill in your env vars
cp ../.env.example .env
# Edit .env: add LP_AGENT_API_KEY and ANTHROPIC_API_KEY

npm run dev
# Backend runs on http://localhost:4000
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy env
echo "VITE_API_URL=http://localhost:4000/api" > .env

npm run dev
# Frontend runs on http://localhost:3000
```

### 4. Get Your API Keys

- **LP Agent API key**: Register at https://portal.lpagent.io/ then DM [@thanhle27](https://t.me/thanhle27) for premium hackathon access
- **Anthropic API key**: https://console.anthropic.com

---

## 📁 Project Structure

```
lp-copilot/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── lib/
│   │   └── lpAgent.js         # LP Agent API client (all endpoints)
│   └── routes/
│       ├── positions.js       # /api/positions/* 
│       ├── pools.js           # /api/pools/*
│       ├── zap.js             # /api/zap/in|out/prepare|land
│       └── ai.js              # /api/ai/chat|analyze|pool-recommendation
├── frontend/
│   └── src/
│       ├── lib/
│       │   ├── api.js         # Frontend API client
│       │   └── transactions.js # Wallet signing + Zap flow
│       └── hooks/
│           ├── usePortfolio.js # Portfolio data + AI insights
│           ├── usePools.js     # Pool discovery
│           └── useZap.js       # Zap In/Out with wallet signing
└── .env.example
```

---

## 🔄 Zap In Flow

```
User enters SOL amount
       ↓
GET /pools/:id/info  →  find active bin
       ↓
POST /pools/:id/add-tx  →  unsigned txs
       ↓
wallet.signTransaction()  →  signed txs  
       ↓
POST /pools/landing-add-tx  →  Jito bundles  →  On-chain ✅
```

## 🔄 Zap Out Flow

```
User selects position + %
       ↓
POST /position/decrease-quotes  →  preview
       ↓
POST /position/decrease-tx  →  unsigned txs
       ↓
wallet.signTransaction()  →  signed txs
       ↓
POST /position/landing-decrease-tx  →  Jito  →  On-chain ✅
```

---

## 🤖 AI Features

### Portfolio Analysis
The AI analyzes your open positions and generates 3 specific insights:
- Identifies underperforming positions (out of range, IL > fees)
- Highlights opportunities (high APR pools, compounding candidates)
- Warns about risk concentrations

### Pool Recommendations
Input your risk profile (low/medium/high) and budget → AI scores and ranks pools from LP Agent's discovery endpoint, explaining the reasoning.

### Chat Advisor
Ask any LP question with your full portfolio as context. Examples:
- "Should I zap out of my BONK/SOL position?"
- "What's the best strategy for a volatile market?"
- "Explain my impermanent loss in simple terms"

---

## 📸 Demo

> Connect Phantom wallet → see live positions → Zap In to a pool → Zap Out with one click → Ask AI for advice

---

## 🏆 Hackathon Submission

- ✅ Uses multiple LP Agent endpoints
- ✅ Zap-In integrated (generate + land via Jito)
- ✅ Zap-Out integrated (quotes + generate + land via Jito)
- ✅ AI agent layer using LP data for insights
- ✅ Clear demo flow

Built with ❤️ for the LP Agent Hackathon
