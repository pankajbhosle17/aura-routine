// routes/analytics.js
import { Router } from "express";
import { db } from "../db.js";
import { runEngine } from "../engineBridge.js";

export const analyticsRouter = Router();

// GET /api/analytics -- pulls the full log history from SQLite and hands it
// to the C++ engine to crunch streaks, category breakdowns, and the
// consistency score.
analyticsRouter.get("/", async (req, res) => {
  try {
    const logs = db
      .prepare("SELECT date, taskId, category, priority, completed FROM logs ORDER BY date ASC")
      .all()
      .map((row) => ({ ...row, completed: !!row.completed }));

    const engineResult = await runEngine("analytics", { logs });

    if (!engineResult.ok) {
      return res.status(500).json({ error: engineResult.error || "Engine returned an error" });
    }

    res.json(engineResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
