# 🛠️ Setup Guide — LP Copilot

Follow these steps in order. Should take about 10 minutes.

---

## Step 1 — Get your API Keys

You need 2 keys:

### LP Agent API Key
1. Go to https://portal.lpagent.io/
2. Sign up / log in
3. Click **API Keys** in the sidebar
4. Click **Create Key** → copy the key
5. (Hackathon) DM [@thanhle27](https://t.me/thanhle27) on Telegram with your email to get Premium access

### Anthropic API Key
1. Go to https://console.anthropic.com/
2. Sign up / log in
3. Go to **Settings → API Keys**
4. Click **Create Key** → copy the key

---

## Step 2 — Add Keys to the Backend

Open the file: `backend/.env`

It looks like this:
```
LP_AGENT_API_KEY=paste_your_lp_agent_key_here
ANTHROPIC_API_KEY=paste_your_anthropic_key_here
```

Replace `paste_your_lp_agent_key_here` with your LP Agent key.
Replace `paste_your_anthropic_key_here` with your Anthropic key.

Save the file. That's it — no quotes, no spaces around the `=`.

**Example of what it should look like when done:**
```
LP_AGENT_API_KEY=la_abc123xyz...
ANTHROPIC_API_KEY=sk-ant-abc123...
FRONTEND_URL=http://localhost:3000
PORT=4000
```

---

## Step 3 — Install & Run the Backend

Open a terminal in the project folder:

```bash
cd backend
npm install
npm run dev
```

You should see: `LP Copilot backend running on port 4000`

Leave this terminal open.

---

## Step 4 — Install & Run the Frontend

Open a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

You should see: `Local: http://localhost:3000`

---

## Step 5 — Open in Browser

Go to: **http://localhost:3000**

Click **Connect Wallet** → connect your Phantom wallet → your positions load automatically.

---

## Common Issues

**"LP_AGENT_API_KEY not set"** → You forgot to edit `backend/.env`. Check Step 2.

**"CORS error"** → Make sure backend is running on port 4000 and frontend on port 3000.

**"Wallet not connecting"** → Install the [Phantom browser extension](https://phantom.app/).

**Positions not loading** → Your wallet may have no Meteora positions yet. Go to Discover Pools and Zap In first.

---

## Project Structure

```
lp-copilot/
├── backend/
│   ├── .env              ← YOUR KEYS GO HERE (never commit this)
│   ├── .env.example      ← Template (safe to commit)
│   ├── server.js
│   ├── lib/lpAgent.js    ← All LP Agent API calls
│   └── routes/
│       ├── positions.js
│       ├── pools.js
│       ├── zap.js        ← Zap In / Zap Out flows
│       └── ai.js         ← Claude AI endpoints
└── frontend/
    ├── .env              ← Frontend config (no secrets)
    ├── src/
    │   ├── App.jsx       ← Main UI
    │   ├── main.jsx      ← Wallet adapter setup
    │   ├── lib/
    │   │   ├── api.js          ← Calls backend
    │   │   └── transactions.js ← Signs Solana txs
    │   └── hooks/
    │       ├── usePortfolio.js
    │       ├── usePools.js
    │       └── useZap.js
```
