# Architecture

```
┌──────────────────┐      HTTP/JSON       ┌────────────────────────┐      stdin/stdout JSON     ┌────────────────────┐
│  React frontend   │  ───────────────▶   │  Node.js / Express API  │  ───────────────────────▶  │   C++ Core Engine    │
│  (client/)        │  ◀───────────────   │  (server/)               │  ◀───────────────────────  │   (cpp-engine/)      │
└──────────────────┘                      └────────────┬─────────────┘                            └────────────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │   SQLite     │
                                                  │ (server/data)│
                                                  └─────────────┘
```

## Why the "spawn a process per request" bridge

The brief lists two ways to combine Node.js and C++: a native N-API addon, or
a microservice that talks over stdio/sockets. This project uses the second
approach, implemented as **one short-lived child process per request**
(`server/src/engineBridge.js` calls `child_process.spawn`).

Trade-offs, so future contributors know why:

- **Simplicity & portability.** No native build step inside the Node.js
  process, no ABI coupling between Node's V8 version and the addon. The
  engine is just a regular console binary that anyone can build with `make`
  and run by hand to test (`echo '{"tasks":[...]}' | ./engine optimize`).
- **Process-per-request cost.** Spawning a process has overhead (a few
  milliseconds). For a personal routine tracker this is irrelevant; for a
  high-throughput service you'd switch to a persistent engine process
  listening on a Unix socket, or move to an N-API addon. The bridge module
  is the only place that would need to change.
- **Stateless engine.** The C++ engine never touches the database and keeps
  no state between calls — Node.js always sends the full payload it needs
  (the task list, or the full log history). This keeps the contract between
  the two languages simple: one JSON in, one JSON out, every time.

## The JSON contract

`POST /api/routine/optimize` sends:
```json
{ "tasks": [{ "id": "...", "name": "...", "startTime": "09:00", "duration": 60, "category": "Work", "priority": "High" }] }
```
and the engine returns:
```json
{ "ok": true, "conflicts": [...], "optimizedTasks": [...] }
```

`GET /api/analytics` sends the full `logs` history and the engine returns
streaks, category breakdown, and the consistency score. See
`cpp-engine/main.cpp` for the exact fields — it's deliberately kept short
and commented so it doubles as documentation.

## Why a hand-rolled JSON parser in C++

`cpp-engine/json_mini.hpp` is a small, dependency-free JSON value type
instead of pulling in a library like nlohmann/json. That keeps the engine
buildable with nothing but a standard C++17 compiler — no package manager,
no vendoring, no network access required to build the project. It only
supports the JSON shapes this app actually sends (flat objects/arrays of
strings, numbers, bools), which keeps it under 250 lines and easy to audit.
