// routes/routine.js
import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { runEngine } from "../engineBridge.js";

export const routineRouter = Router();

function todayISO() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function rowToTask(row) {
  return {
    id: row.id,
    name: row.name,
    startTime: row.startTime,
    duration: row.duration,
    category: row.category,
    priority: row.priority,
    completedToday: !!row.completedToday,
    lastCompletedDate: row.lastCompletedDate,
  };
}

// GET /api/routine -- fetch the saved routine. No C++ involved.
routineRouter.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY startTime ASC").all();
  res.json({ tasks: rows.map(rowToTask) });
});

// POST /api/routine -- create a new task.
routineRouter.post("/", (req, res) => {
  const { name, startTime, duration, category, priority } = req.body || {};
  if (!name || !startTime || !duration) {
    return res.status(400).json({ error: "name, startTime, and duration are required" });
  }
  const id = nanoid(10);
  db.prepare(
    `INSERT INTO tasks (id, name, startTime, duration, category, priority)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name, startTime, duration, category || "Uncategorized", priority || "Medium");

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.status(201).json({ task: rowToTask(row) });
});

// PUT /api/routine/:id -- update an existing task.
routineRouter.put("/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const { name, startTime, duration, category, priority } = req.body || {};
  db.prepare(
    `UPDATE tasks SET name = ?, startTime = ?, duration = ?, category = ?, priority = ?
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    startTime ?? existing.startTime,
    duration ?? existing.duration,
    category ?? existing.category,
    priority ?? existing.priority,
    id
  );

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.json({ task: rowToTask(row) });
});

// DELETE /api/routine/:id
routineRouter.delete("/:id", (req, res) => {
  const { id } = req.params;
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ error: "Task not found" });
  res.status(204).end();
});

// POST /api/routine/complete/:id -- toggle a task complete for today, and
// record it in the logs table so analytics has history to crunch later.
routineRouter.post("/complete/:id", (req, res) => {
  const { id } = req.params;
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const date = todayISO();
  const nowCompleted = task.lastCompletedDate === date ? !task.completedToday : true;

  db.prepare(
    `UPDATE tasks SET completedToday = ?, lastCompletedDate = ? WHERE id = ?`
  ).run(nowCompleted ? 1 : 0, date, id);

  db.prepare(
    `INSERT INTO logs (date, taskId, taskName, category, priority, completed)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date, taskId) DO UPDATE SET completed = excluded.completed`
  ).run(date, id, task.name, task.category, task.priority, nowCompleted ? 1 : 0);

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.json({ task: rowToTask(row) });
});

// POST /api/routine/optimize -- the one endpoint that talks to C++.
// Body: { tasks: [...] } (optional -- defaults to the saved routine),
// Query: ?persist=true to write the suggested times back to the database.
routineRouter.post("/optimize", async (req, res) => {
  try {
    const tasks =
      req.body && Array.isArray(req.body.tasks) && req.body.tasks.length > 0
        ? req.body.tasks
        : db.prepare("SELECT * FROM tasks").all().map(rowToTask);

    const engineResult = await runEngine("optimize", { tasks });

    if (!engineResult.ok) {
      return res.status(500).json({ error: engineResult.error || "Engine returned an error" });
    }

    if (req.query.persist === "true") {
      const update = db.prepare("UPDATE tasks SET startTime = ? WHERE id = ?");
      const tx = db.transaction((items) => {
        for (const t of items) update.run(t.suggestedStartTime, t.id);
      });
      tx(engineResult.optimizedTasks);
    }

    res.json(engineResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
