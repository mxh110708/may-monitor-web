import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Checkbox, Flex, Heading, Select, Text, TextField } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { useRPC2Call } from "@/contexts/RPC2Context";
import { useNodeList } from "@/contexts/NodeListContext";
import { monitoringError } from "@/utils/monitoringStatus";
import { Link } from "react-router-dom";

type Rule = { id: string; name: string; enabled: boolean; kind: string; nodes: string[]; task_id?: number; region?: string; threshold: number; confirm: number; recover: number; window: number; cooldown_seconds: number; silence_until?: string };
type Policy = { delivery?: "local" | "email" | "none"; schema: number; enabled: boolean; local_receiver: string; rules: Rule[] };
type State = { rule_id: string; node: string; phase: string; active: boolean; value: number | null; evidence_at: string; silenced: boolean; delivery: string; delivery_attempts: number; delivery_error?: string };
type Status = { email?: string; policy: Policy; evaluated_at: string; total: number; states: State[]; pending: number; storage_error: boolean; source_error?: string; history: { event: { id: string; rule_name: string; node: string; kind: string }; status: string; attempts: number; at: string }[] };
type Probe = { id: number; name: string; type: string; interval: number; clients: string[] };
const empty: Policy = { schema: 1, enabled: false, local_receiver: "", rules: [] };
const kinds = ["offline", "latency", "failure_rate", "cpu", "memory", "disk"];

export default function MonitoringPage() {
  const { t } = useTranslation();
  const { call } = useRPC2Call();
  const { nodeList: availableNodes } = useNodeList();
  const nodeList = availableNodes ?? [];
  const [policy, setPolicy] = useState<Policy>(empty);
  const [status, setStatus] = useState<Status | null>(null);
  const [probes, setProbes] = useState<Probe[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offset, setOffset] = useState(0);
  const [evidence, setEvidence] = useState<any>(null);
  const dirty = useRef(false);
  const initialized = useRef(false);
  const [changed, setChanged] = useState(false);
  const names = new Map(nodeList.map(n => [n.uuid, n.name]));
  const version = useRef(0);
  const edit = (next: Policy) => { if (saving) return; dirty.current = true; setChanged(true); setSaved(false); setPolicy(next); };
  const editRule = (id: string, value: Partial<Rule>) => edit({ ...policy, rules: policy.rules.map(r => r.id === id ? { ...r, ...value } : r) });

  useEffect(() => {
    let stopped = false, running = false, timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      if (stopped || document.hidden || running) return;
      running = true;
      const requestVersion = version.current;
      try {
        const result: Status = await call("admin:getMonitoring", { offset, limit: 50 }, { timeout: 10000 });
        if (stopped || requestVersion !== version.current) return;
        setStatus(result); setError("");
        if (!initialized.current || !dirty.current) { setPolicy(result.policy); initialized.current = true; }
      } catch (failure) { if (!stopped) setError(monitoringError(failure)); }
      finally { running = false; if (!stopped && !document.hidden) timer = setTimeout(refresh, 15000); }
    };
    const visible = () => { clearTimeout(timer); if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    void refresh();
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, [call, offset]);
  useEffect(() => { let stopped = false; call("admin:getAllPingTasks").then((values: Probe[]) => { if (!stopped) setProbes(values); }).catch(() => {}); return () => { stopped = true; }; }, [call]);

  const save = async () => {
    setSaving(true); setError("");
    version.current++;
    try { const result: Status = await call("admin:setMonitoring", policy, { timeout: 10000 }); setStatus(result); setPolicy(result.policy); dirty.current = false; setChanged(false); setSaved(true); }
    catch (failure) { const code = (failure as { code?: number })?.code; setError(code === -32602 ? "invalid_policy" : monitoringError(failure)); }
    finally { version.current++; setSaving(false); }
  };
  return <div className="mx-auto max-w-6xl p-4 space-y-4" data-testid="monitoring-page">
    <Heading>{t("may.alerts")}</Heading>
    <Text as="p" color="gray">{t("may.direction")}</Text>
    {error && <Card role="alert"><Text color="red">{t(`may.${error}`)}</Text></Card>}
    {!status && !error && <Text>{t("may.loading")}</Text>}
    {status?.storage_error && <Text color="red">{t("may.storage_error")}</Text>}
    {status?.source_error && <Text color="orange">{t("may.source_error")}</Text>}
    <Card><Flex direction="column" gap="3">
      <label><Checkbox checked={policy.enabled} onCheckedChange={v => edit({ ...policy, enabled: v === true })} /> {t("may.enable")}</label>
      <label>{t("may.delivery_channel")}<Select.Root value={policy.delivery || "local"} onValueChange={value => edit({ ...policy, delivery: value as Policy["delivery"] })}><Select.Trigger aria-label={t("may.delivery_channel")} /><Select.Content>{["none", "local", "email"].map(value => <Select.Item key={value} value={value}>{t(`may.channel.${value}`)}</Select.Item>)}</Select.Content></Select.Root></label>
      {(policy.delivery || "local") === "local" && <><label>{t("may.receiver")}<TextField.Root aria-label={t("may.receiver")} placeholder="http://127.0.0.1:8765/events" value={policy.local_receiver} onChange={e => edit({ ...policy, local_receiver: e.target.value })} /></label>
      <Text size="2" color="gray">{t("may.receiver_help")}</Text></>}
      {policy.delivery === "email" && <Text size="2" role="status" color={status?.email === "configured" ? "gray" : "orange"}>{t(`may.email_${status?.email || "unconfigured"}`)}</Text>}
      {policy.delivery === "none" && <Text size="2" color="gray">{t("may.delivery_disabled_help")}</Text>}
      <Flex gap="3" wrap="wrap"><Button disabled={saving || !status || !changed} onClick={() => void save()}>{saving ? t("may.saving") : t("may.save")}</Button>{saved && <Text color="green" role="status">{t("may.saved")}</Text>}<Link to="/admin/ping">{t("may.probes")}</Link></Flex>
    </Flex></Card>
    <Flex justify="between"><Heading size="4">{t("may.rules")}</Heading><Button variant="soft" disabled={policy.rules.length >= 32 || !nodeList.length} onClick={() => edit({ ...policy, rules: [...policy.rules, { id: crypto.randomUUID(), name: t("may.new_rule"), enabled: false, kind: "offline", nodes: [nodeList[0].uuid], threshold: 0, confirm: 3, recover: 2, window: 5, cooldown_seconds: 300 }] })}>{t("may.add")}</Button></Flex>
    {policy.rules.map(rule => <Card key={rule.id}><details><summary className="cursor-pointer"><strong>{rule.name}</strong> · {t(`may.kind.${rule.kind}`)} · {rule.nodes.length} {t("may.nodes")}{rule.silence_until && Date.parse(rule.silence_until) > Date.now() && <Badge color="orange" className="ml-2">{t("may.muted")}</Badge>}</summary>
      <Flex direction="column" gap="3" mt="4">
        <label><Checkbox checked={rule.enabled} onCheckedChange={v => editRule(rule.id, { enabled: v === true })} /> {t("may.rule_enabled")}</label>
        <label>{t("may.name")}<TextField.Root value={rule.name} onChange={e => editRule(rule.id, { name: e.target.value })} maxLength={128} /></label>
        <label>{t("may.condition")}<Select.Root value={rule.kind} onValueChange={kind => editRule(rule.id, { kind, task_id: kind === "latency" || kind === "failure_rate" ? probes[0]?.id : undefined, threshold: kind === "offline" || kind === "latency" ? 0 : kind === "failure_rate" ? 40 : 90 })}><Select.Trigger /><Select.Content>{kinds.map(kind => <Select.Item key={kind} value={kind}>{t(`may.kind.${kind}`)}</Select.Item>)}</Select.Content></Select.Root></label>
        {(rule.kind === "latency" || rule.kind === "failure_rate") && <>
          <label>{t("may.probe")}<Select.Root value={String(rule.task_id || "")} onValueChange={id => editRule(rule.id, { task_id: Number(id) })}><Select.Trigger placeholder={t("may.select_probe")} /><Select.Content>{probes.map(p => <Select.Item key={p.id} value={String(p.id)}>{p.name} ({p.type.toUpperCase()}, {p.interval}s)</Select.Item>)}</Select.Content></Select.Root></label>
          <label>{t("may.region")}<TextField.Root value={rule.region || ""} maxLength={64} onChange={e => editRule(rule.id, { region: e.target.value })} /></label>
          <Text size="2" color="gray">{t("may.threshold_help")}</Text>
        </>}
        {rule.kind !== "offline" && <label>{t("may.threshold")} ({rule.kind === "latency" ? "ms" : "%"})<TextField.Root type="number" min={1} max={rule.kind === "latency" ? 3000 : 100} value={rule.threshold} onChange={e => editRule(rule.id, { threshold: Number(e.target.value) })} /></label>}
        <div className="grid sm:grid-cols-2 gap-3">{(["confirm", "recover", "cooldown_seconds", ...(rule.kind === "failure_rate" ? ["window"] : [])] as const).map(key => <label key={key}>{t(`may.${key}`)}<TextField.Root type="number" min={key === "cooldown_seconds" ? 0 : key === "window" ? 3 : 1} max={key === "cooldown_seconds" ? 86400 : key === "window" ? 20 : 10} value={rule[key as "confirm"]} onChange={e => editRule(rule.id, { [key]: Number(e.target.value) })} /></label>)}</div>
        <fieldset><legend>{t("may.node_scope")}</legend><div className="flex flex-wrap gap-3">{nodeList.map(node => <label key={node.uuid}><Checkbox checked={rule.nodes.includes(node.uuid)} onCheckedChange={checked => editRule(rule.id, { nodes: checked === true ? [...rule.nodes, node.uuid] : rule.nodes.filter(id => id !== node.uuid) })} /> {node.name}</label>)}</div></fieldset>
        <Flex gap="3" wrap="wrap"><Button variant="soft" onClick={() => editRule(rule.id, { silence_until: new Date(Date.now() + 3600000).toISOString() })}>{t("may.silence_hour")}</Button><Button variant="soft" onClick={() => editRule(rule.id, { silence_until: undefined })}>{t("may.resume")}</Button><Button variant="soft" color="red" onClick={() => edit({ ...policy, rules: policy.rules.filter(r => r.id !== rule.id) })}>{t("may.remove")}</Button></Flex>
      </Flex>
    </details></Card>)}
    <Heading size="4">{t("may.current")}</Heading>
    <Text size="2" color="gray">{status?.evaluated_at && !status.evaluated_at.startsWith("0001") ? new Date(status.evaluated_at).toLocaleString() : t("may.not_evaluated")}</Text>
    {status?.states.map(state => <Card key={`${state.rule_id}/${state.node}`}><Flex direction="column" gap="2">
      <Flex justify="between" gap="3" wrap="wrap"><Text weight="bold">{policy.rules.find(r => r.id === state.rule_id)?.name || state.rule_id} · {names.get(state.node) || t("may.unknown_node")}</Text><Badge color={state.active ? "red" : state.phase === "healthy" ? "green" : "gray"}>{t(`may.phase.${state.phase}`, { defaultValue: state.phase })}</Badge></Flex>
      <Text>{t("may.value")}: {state.value === null ? "—" : state.value.toFixed(1)} · {t("may.delivery")}: {t(`may.delivery_state.${state.delivery}`, { defaultValue: state.delivery })} ({state.delivery_attempts}/3){state.silenced ? ` · ${t("may.muted")}` : ""}</Text>
      <Text size="2" color="gray">{t("may.sample")}: {state.evidence_at.startsWith("0001") ? "—" : new Date(state.evidence_at).toLocaleString()}</Text>
      {policy.rules.find(r => r.id === state.rule_id)?.task_id && <Button size="1" variant="ghost" onClick={async () => { try { setEvidence(await call("admin:getProbeStatus", { node: state.node, task_id: policy.rules.find(r => r.id === state.rule_id)?.task_id })); } catch (failure) { setError(monitoringError(failure)); } }}>{t("may.evidence")}</Button>}
    </Flex></Card>)}
    {status?.states.length === 0 && <Text>{policy.enabled ? t("may.not_evaluated") : t("may.disabled")}</Text>}
    {!!status && status.total > 50 && <Flex gap="3"><Button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>←</Button><Text>{offset + 1}–{Math.min(offset + 50, status.total)} / {status.total}</Text><Button disabled={offset + 50 >= status.total} onClick={() => setOffset(offset + 50)}>→</Button></Flex>}
    {evidence && <Card><Heading size="3">{t("may.evidence")} · {String(evidence.type).toUpperCase()}</Heading><Text as="p">{t("may.direction")}</Text>{(evidence.samples || []).slice(-20).map((sample: any, index: number) => <Text as="p" size="2" key={index}>{new Date(sample.at).toLocaleString()} · {t(`may.phase.${sample.status}`, { defaultValue: sample.status })} · {sample.status === "ok" ? `${sample.value} ms` : "—"}{sample.http_status > 0 ? ` · HTTP ${sample.http_status}` : ""}</Text>)}<Button variant="soft" onClick={() => setEvidence(null)}>{t("may.close")}</Button></Card>}
    <details><summary>{t("may.history")} ({status?.history?.length || 0}/200)</summary>{status?.history?.slice().reverse().map(row => <Card key={row.event.id}><Text>{new Date(row.at).toLocaleString()} · {row.event.rule_name} · {names.get(row.event.node) || t("may.unknown_node")} · {t(`may.event.${row.event.kind}`)} · {t(`may.delivery_state.${row.status}`, { defaultValue: row.status })} ({row.attempts}/3)</Text></Card>)}</details>
  </div>;
}
