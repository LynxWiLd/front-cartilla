import { frontendLogger } from "./lib/logger.js";

const BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const API_PREFIX = "/api";

function headers() {
  const h = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function api(path, options = {}) {
  const fullPath = path.startsWith(API_PREFIX) ? path : `${API_PREFIX}${path}`;
  const res = await fetch(`${BASE}${fullPath}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const msg = err.error || "Error de conexión";
    frontendLogger.error(`API ${options.method || "GET"} ${path} ${res.status}`, { error: msg, status: res.status });
    throw new Error(msg);
  }
  return res.json();
}

export function apiPost(path, body) {
  return api(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPut(path, body) {
  return api(path, { method: "PUT", body: JSON.stringify(body) });
}

export function apiDelete(path) {
  return api(path, { method: "DELETE" });
}
