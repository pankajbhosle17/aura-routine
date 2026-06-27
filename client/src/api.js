// api.js -- thin fetch wrapper for the AuraRoutine API.
const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getRoutine: () => request("/routine"),
  createTask: (task) => request("/routine", { method: "POST", body: JSON.stringify(task) }),
  updateTask: (id, task) =>
    request(`/routine/${id}`, { method: "PUT", body: JSON.stringify(task) }),
  deleteTask: (id) => request(`/routine/${id}`, { method: "DELETE" }),
  completeTask: (id) => request(`/routine/complete/${id}`, { method: "POST" }),
  optimize: (tasks, persist = false) =>
    request(`/routine/optimize${persist ? "?persist=true" : ""}`, {
      method: "POST",
      body: JSON.stringify({ tasks }),
    }),
  getAnalytics: () => request("/analytics"),
};
