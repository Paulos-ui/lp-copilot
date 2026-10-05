# LP Copilot

**Solana liquidity intelligence that helps LPs understand, decide and act.**

LP Copilot is an accelerator-ready decision-support workspace for Solana liquidity providers. It combines live wallet/LP data, agent-powered portfolio reasoning and Meteora execution into one human-controlled workflow: **read → reason → review → approve → prove**.

## Why it exists

Liquidity providers have plenty of dashboards, but still have to translate fragmented position, pool, fee and risk data into a decision. LP Copilot reduces that gap without taking custody or pretending AI can guarantee an outcome.

## V2 product

- Editorial product homepage with a dedicated workspace
- Live Meteora LP portfolio view
- Portfolio health and evidence-led Claude insights
- Opportunity Radar for pool discovery
- Strategy Studio powered by Anthropic Claude
- Zap In / Zap Out transaction preparation
- Wallet approval remains mandatory for every transaction
- Jito-assisted transaction landing through the LP Agent flow
- Activity / proof surface for on-chain evidence
- Responsive UI designed for Build for Breakpoint / Colosseum demos

## Architecture

```text
Solana wallet
    │
    ▼
React + Vite workspace
    │
    ├── Portfolio / pools ──► Express API ──► LP Agent / Meteora data
    │
    ├── Strategy context ───► Express API ──► Anthropic Claude
    │
    └── Prepared tx ────────► wallet approval ──► Jito / Solana
```

The backend keeps provider keys server-side. Claude receives bounded portfolio context and is instructed to distinguish data from inference, avoid guaranteed-return language, and keep wallet approval in the loop.

## Local setup

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
LP_AGENT_API_KEY=your_lp_agent_key
ANTHROPIC_API_KEY=your_anthropic_key
CLAUDE_MODEL=claude-sonnet-4-5
FRONTEND_URL=http://localhost:3000
PORT=4000
```

Run:

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOLANA_RPC=https://your-solana-rpc.example
```

Run:

```bash
npm run dev
```

## Production deployment

**Backend:** deploy `backend/` to Railway or another Node host and set the backend environment variables.

**Frontend:** deploy `frontend/` to Vercel and set:

```env
VITE_API_URL=https://YOUR-BACKEND/api
VITE_SOLANA_RPC=https://YOUR-PRODUCTION-RPC
```

## Core execution flow

### Zap In

1. User selects a pool and SOL amount.
2. Backend asks LP Agent for pool state and prepared Meteora transactions.
3. Frontend presents the wallet signing request.
4. User explicitly signs.
5. Signed transactions are landed through the Jito-enabled LP Agent endpoint.
6. Result can be verified on Solana.

### Zap Out

The same human-in-the-loop pattern is used for position reduction: prepare → review → sign → land → verify.

## AI safety / product guardrails

Claude is a decision-support layer, not an autonomous custodian. AI output can be incomplete or wrong. LP Copilot keeps risk language visible and requires the user to verify transaction details before signing. Scores and recommendations are heuristics, not return forecasts.

## Built for

LP Copilot V2 is being developed for the Build for Breakpoint / Colosseum path in 2026, with a focus on a working Solana product, real-user feedback, retention and a five-minute demo that shows the full product loop.
