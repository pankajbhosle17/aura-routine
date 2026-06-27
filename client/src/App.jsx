import React, { useEffect, useState, useCallback } from "react";
import TodayView from "./components/TodayView.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import { api } from "./api.js";

const todayLabel = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});

export default function App() {
  const [tab, setTab] = useState("today");
  const [tasks, setTasks] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState(null);

  const loadRoutine = useCallback(async () => {
    try {
      const data = await api.getRoutine();
      setTasks(data.tasks);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    loadRoutine();
  }, [loadRoutine]);

  useEffect(() => {
    if (tab === "analytics") loadAnalytics();
  }, [tab, loadAnalytics]);

  async function handleCreate(task) {
    try {
      await api.createTask(task);
      await loadRoutine();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleComplete(id) {
    try {
      await api.completeTask(id);
      await loadRoutine();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteTask(id);
      await loadRoutine();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleOptimize() {
    setOptimizing(true);
    setError(null);
    try {
      const result = await api.optimize(tasks, true);
      setConflicts(result.conflicts || []);
      await loadRoutine();
    } catch (err) {
      setError(err.message);
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="brand">Aura<span>Routine</span></h1>
          <div className="today-label">{todayLabel}</div>
        </div>
        <nav className="tab-nav">
          <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>
            Today
          </button>
          <button className={tab === "analytics" ? "active" : ""} onClick={() => setTab("analytics")}>
            Analytics
          </button>
        </nav>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {tab === "today" ? (
        <TodayView
          tasks={tasks}
          conflicts={conflicts}
          onCreate={handleCreate}
          onToggleComplete={handleToggleComplete}
          onDelete={handleDelete}
          onOptimize={handleOptimize}
          optimizing={optimizing}
        />
      ) : (
        <AnalyticsDashboard analytics={analytics} loading={loadingAnalytics} />
      )}

      <footer className="app-footer">AuraRoutine · React + Node/Express + C++ engine</footer>
    </div>
  );
}
