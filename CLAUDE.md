
# Groundswell

Real-time global sentiment map powered by Cloudflare's edge network.
Users submit one-line opinions on a topic; submissions are processed at the nearest edge node, sentiment-scored by Llama 3.3 via Workers AI, and plotted live on a world map. An AI narrator surfaces emerging global patterns in real-time.

## Architecture

```
Browser (React + Leaflet)
  │
  ├── WebSocket ──────────────────────► Durable Object (GroundswellRoom)
  │                                         │ owns global state
  │                                         │ fans out updates to all clients
  │                                         │ triggers AI narrator every 30s or N submissions
  │
  └── POST /submit ──────────────────► Worker (edge)
                                            │ reads cf.country, cf.colo from request
                                            │ calls Workers AI → sentiment score + theme
                                            └── reports into Durable Object
```

## Stack

- **Frontend:** React 18, Vite, Leaflet (`react-leaflet`), TailwindCSS
- **Backend:** Cloudflare Workers, Durable Objects, Workers AI (Llama 3.3)
- **State:** Durable Object (live session), KV (regional summaries cache)
- **Deploy:** Cloudflare Pages (frontend) + Workers (backend)

## Project Structure

```
groundswell/
├── CLAUDE.md
├── PROGRESS.md
├── FEATURES.json
├── frontend/               # React app → deployed to Cloudflare Pages
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Globe.jsx         # Leaflet world map with live markers
│   │   │   ├── SubmitBar.jsx     # One-line opinion input
│   │   │   ├── Narrator.jsx      # AI narration panel
│   │   │   └── LiveFeed.jsx      # Recent submissions sidebar
│   │   ├── hooks/
│   │   │   └── useGroundswell.js # WebSocket connection + state
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── worker/                 # Cloudflare Worker + Durable Object
    ├── src/
    │   ├── index.js              # Worker entry: routes /submit and /ws
    │   ├── GroundswellRoom.js    # Durable Object: global state + WS hub
    │   └── sentiment.js          # Workers AI sentiment scoring helper
    ├── wrangler.toml
    └── package.json
```

## Key Cloudflare Concepts Used

- `request.cf.country` — detect submission's country of origin at the edge
- `request.cf.colo` — which Cloudflare edge node processed the request
- `env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast")` — Workers AI
- `DurableObjectStub` — single global room, WebSocket fan-out
- `env.KV` — cache regional sentiment summaries

## Commands

```bash
# Frontend
cd frontend && npm install && npm run dev

# Worker (requires Wrangler)
cd worker && npm install && npx wrangler dev
```

## Environment Variables

```
# worker/wrangler.toml
GROUNDSWELL_ROOM = <durable object binding>
KV_SENTIMENT = <kv namespace binding>
```
