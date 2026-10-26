export type NodeStatus = "online" | "offline" | "waiting" | "stale" | "invalid" | "unknown";

export const nodeStatus = (record: any, now = Date.now()): NodeStatus => {
  if (!record || !record.time || !Number.isFinite(Date.parse(record.time))) return "waiting";
  const age = now - Date.parse(record.time);
  if (age > 90000 || age < -5000) return "stale";
  if (record.online !== true) return "offline";
  const fields = ["cpu", "ram", "swap", "load", "load5", "load15", "disk", "net_out", "net_in", "connections", "connections_udp", "uptime", "process"];
  if (fields.some(key => typeof record[key] !== "number" || !Number.isFinite(record[key]) || record[key] < 0) || record.cpu > 100 || !Number.isFinite(record.net_total_out ?? record.net_total_up) || !Number.isFinite(record.net_total_in ?? record.net_total_down)) return "invalid";
  return "online";
};

export const monitoringError = (error: unknown): "auth_error" | "unreachable" => {
  const value = error as { code?: number; status?: number };
  return value?.code === -32041 || value?.code === -32001 || value?.status === 401 || value?.status === 403 ? "auth_error" : "unreachable";
};
