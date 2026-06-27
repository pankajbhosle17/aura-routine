# AuraRoutine

A daily routine tracker with a twist: scheduling conflicts and habit
analytics are computed by a small **C++ engine**, called from a **Node.js /
Express** API, and displayed in a **React** frontend.

```
React (client/)  ⇄  Node.js/Express (server/)  ⇄  C++ engine (cpp-engine/)
                              ⇄ SQLite (server/data/)
```

- **Smart Scheduler** — detects overlapping tasks and suggests a conflict-free
  order, weighted by priority.
- **Analytics & streaks** — current streak, longest streak, per-category
  completion rates, and a weighted "Consistency Score".
- **Day Ring** — a 24-hour dial visualizing today's schedule (the app's
  signature visual, reused as a gauge on the Analytics tab).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the three layers
talk to each other and why.

## Project structure

```
aura-routine/
├── cpp-engine/      # C++ scheduling + analytics engine (stdin/stdout JSON)
│   ├── main.cpp
│   ├── json_mini.hpp
│   └── Makefile
├── server/          # Node.js / Express API + SQLite
│   └── src/
└── client/          # React (Vite) frontend
    └── src/
```

## Prerequisites

- Node.js 18+
- A C++17 compiler (`g++` or `clang++`) and `make`
- No external services required — SQLite is a local file, no database
  server to install.

## Setup & run (development)

**1. Build the C++ engine**
```bash
cd cpp-engine
make
make test     # optional: runs a quick smoke test and prints sample JSON
cd ..
```

**2. Start the API server**
```bash
cd server
npm install
cp .env.example .env     # defaults work out of the box
npm run dev               # http://localhost:4000
```

**3. Start the React frontend** (in a second terminal)
```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` requests
to the Express server on port 4000 (see `client/vite.config.js`).

## Using the app

1. **Today** tab — add tasks (name, start time, duration, category,
   priority), check them off as you go, and hit **Optimize my day** to send
   the schedule to the C++ engine. Conflicting tasks get flagged and
   lower-priority ones are automatically re-sequenced after the conflict.
2. **Analytics** tab — once you've completed a few tasks across a few days,
   this tab shows your streaks, consistency score, and a per-category
   completion breakdown — all computed by the C++ engine from your logged
   history.

## API reference

| Method | Endpoint | Talks to C++? | Description |
|---|---|---|---|
| GET | `/api/routine` | No | List saved tasks |
| POST | `/api/routine` | No | Create a task |
| PUT | `/api/routine/:id` | No | Update a task |
| DELETE | `/api/routine/:id` | No | Delete a task |
| POST | `/api/routine/complete/:id` | No | Toggle today's completion + log it |
| POST | `/api/routine/optimize` | **Yes** | Detect conflicts, suggest a re-sequenced schedule |
| GET | `/api/analytics` | **Yes** | Streaks, category breakdown, consistency score |

## Testing the C++ engine standalone

The engine is a plain console program, so you can poke it directly without
Node.js at all:
```bash
echo '{"tasks":[{"id":"a","name":"Run","startTime":"07:00","duration":30,"category":"Fitness","priority":"High"}]}' \
  | ./cpp-engine/engine optimize
```

## Notes on this implementation

- **Storage:** SQLite via `better-sqlite3` (a single file at
  `server/data/aura-routine.db`, created automatically on first run). Swap in
  MongoDB by replacing `server/src/db.js` and the queries in
  `server/src/routes/*.js` — the rest of the app doesn't need to change.
- **Node ⇄ C++ bridge:** the "microservice over stdio" approach from the
  brief, implemented as one short-lived process per request rather than a
  native addon. Details and trade-offs in `docs/ARCHITECTURE.md`.
- **No external JS dependencies in the C++ engine:** it ships its own ~250
  line JSON parser (`cpp-engine/json_mini.hpp`) so the whole project builds
  with nothing but a C++17 compiler and Node.js — no package manager needed
  on the C++ side.

## Ideas for extending this

- Charting: feed `categoryBreakdown` / a 7-day history into Recharts or
  Chart.js on the Analytics tab.
- Live reminders: open a WebSocket from Express to the client and push a
  notification when a task's `startTime` is approaching.
- Swap the per-request process spawn for a persistent engine process (Unix
  socket) if you need lower latency at higher request volume.
