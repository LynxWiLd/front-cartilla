const BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

function send(level, message, meta) {
  try {
    const body = { level, message, meta, url: location.href, userAgent: navigator.userAgent };
    fetch(`${BASE}/api/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
  }
}

export const frontendLogger = {
  error: (msg, meta) => { console.error(msg, meta); send("error", msg, meta); },
  warn: (msg, meta) => { console.warn(msg, meta); send("warn", msg, meta); },
  info: (msg, meta) => { console.info(msg, meta); send("info", msg, meta); },
  debug: (msg, meta) => { console.debug(msg, meta); send("debug", msg, meta); },
};

window.onerror = (msg, source, line, col, err) => {
  frontendLogger.error("Global error", {
    message: msg, source, line, col,
    stack: err?.stack,
  });
};

window.addEventListener("unhandledrejection", (e) => {
  frontendLogger.error("Unhandled promise rejection", {
    message: e.reason?.message || String(e.reason),
    stack: e.reason?.stack,
  });
});
