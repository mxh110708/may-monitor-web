import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeStatus, monitoringError } from "../src/utils/monitoringStatus.ts";

test("missing, stale, offline and invalid measurements remain distinct", () => {
  const now = Date.now();
  const value = { time: new Date(now).toISOString(), online: true, cpu: 1, ram: 1024, swap: 0, disk: 10, load: 0, load5: 0, load15: 0, net_out: 0, net_in: 0, net_total_up: 1, net_total_down: 2, connections: 0, connections_udp: 0, uptime: 1, process: 12 };
  assert.equal(nodeStatus(undefined, now), "waiting");
  assert.equal(nodeStatus(value, now), "online");
  assert.equal(nodeStatus({ ...value, online: false }, now), "offline");
  assert.equal(nodeStatus({ ...value, time: new Date(now - 91000).toISOString() }, now), "stale");
  assert.equal(nodeStatus({ ...value, cpu: undefined }, now), "invalid");
  assert.equal(nodeStatus({ ...value, cpu: NaN }, now), "invalid");
  assert.equal(nodeStatus({ ...value, time: new Date(now + 6000).toISOString() }, now), "stale");
});
test("auth failures are separate from service availability", () => {
  assert.equal(monitoringError({ code: -32041 }), "auth_error");
  assert.equal(monitoringError({ status: 401 }), "auth_error");
  assert.equal(monitoringError(new Error("network")), "unreachable");
});
