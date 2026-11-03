type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const min = order[(process.env.LOG_LEVEL as Level) ?? "info"] ?? 20;

function log(level: Level, event: string, data?: Record<string, unknown>) {
  if (order[level] < min) return;
  const entry = { ts: new Date().toISOString(), level, event, ...data };
  const line = JSON.stringify(entry, (_k, v) => (v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v));
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Logger estruturado em JSON (uma linha por evento). */
export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => log("debug", event, data),
  info: (event: string, data?: Record<string, unknown>) => log("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => log("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => log("error", event, data),
};
