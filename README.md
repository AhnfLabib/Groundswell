# Groundswell 🌍

> The world's pulse, live. Real-time global sentiment powered by Cloudflare's edge network.

Users submit a one-line opinion on a topic. Each submission is processed at the **nearest Cloudflare edge node**, sentiment-scored by **Llama 3.3 via Workers AI**, and plotted live on a world map. An AI narrator surfaces emerging global patterns in real-time.

---

## Architecture

```
Browser (React + Leaflet)
  │
  ├── WebSocket ──────────────────► GroundswellRoom (Durable Object)
  │                                     │ global state owner
  │                                     │ WebSocket fan-out to all clients
  │                                     └── triggers AI narrator every 30s / 10 submissions
  │
  └── POST /submit ───────────────► Worker (edge)
                                        │ reads cf.country, cf.colo
                                        │ Workers AI → sentiment score + theme
                                        └── ingests into Durable Object
```

## Cloudflare Products Used

| Product | Role |
|---|---|
| **Workers AI** (Llama 3.3) | Sentiment scoring + AI narration |
| **Durable Objects** | Global state hub + WebSocket fan-out |
| **Workers** | Edge routing, `cf` metadata extraction |
| **KV** | Regional sentiment summary cache |
| **Pages** | Frontend hosting |

---

## Local Development

### 1. Worker

```bash
cd worker
npm install
npx wrangler dev
# Worker runs on http://localhost:8787
```

> Make sure you're logged in: `npx wrangler login`
> Create a KV namespace first: `npx wrangler kv:namespace create KV_SENTIMENT`
> Paste the returned ID into `wrangler.toml`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# VITE_WORKER_URL=http://localhost:8787 (default)
npm run dev
# App runs on http://localhost:5173
```

---

## Deploy

### Worker
```bash
cd worker
npx wrangler deploy
```

### Frontend (Cloudflare Pages)
```bash
cd frontend
npm run build
# Upload dist/ to Cloudflare Pages dashboard
# Or: npx wrangler pages deploy dist
```

After deploying, update `ALLOWED_ORIGIN` in `wrangler.toml` to your Pages URL and `VITE_WORKER_URL` in your Pages environment variables to your Worker URL.

---

## Project Structure

```
groundswell/
├── CLAUDE.md              # Claude Code project context
├── PROGRESS.md            # Session-by-session changelog
├── FEATURES.json          # Feature tracker (passes: true/false)
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Globe.jsx        # Leaflet map with live sentiment markers
│   │   │   ├── SubmitBar.jsx    # Opinion input
│   │   │   ├── Narrator.jsx     # AI narration panel
│   │   │   └── LiveFeed.jsx     # Scrolling submissions sidebar
│   │   └── hooks/
│   │       └── useGroundswell.js  # WebSocket connection + state
│   └── package.json
└── worker/
    ├── src/
    │   ├── index.js             # Worker entry: /submit + /ws routing
    │   ├── GroundswellRoom.js   # Durable Object
    │   └── sentiment.js         # Workers AI sentiment helper
    └── wrangler.toml
```

---

## Key Design Decision

The `request.cf` object — Cloudflare's per-request edge metadata — is what makes this genuinely edge-native. Every submission knows exactly which country it came from and which Cloudflare colo processed it, with zero user input. The infrastructure is the feature.
