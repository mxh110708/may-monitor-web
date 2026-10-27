import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Callout,
  Checkbox,
  Container,
  Dialog,
  Flex,
  Heading,
  Progress,
  Text,
} from "@radix-ui/themes";
import {
  AlertTriangle,
  LoaderCircle,
  Play,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import GuideHeader from "@/components/GuideHeader";
import Loading from "@/components/loading";
import RestrictedLoginDialog, {
  type RestrictedAuthStatus,
} from "@/components/RestrictedLoginDialog";

const API_BASE = "/api/admin/database-migration";
const STRUCTURE_I18N = "metric_store_restructure";
const COMMON_I18N = "database_migration";
const RECLAIM_START_PROGRESS = 80;
const RECLAIM_PROGRESS_CAP = 99;
const RECLAIM_STEP_MS = 30_000;
const NORMAL_ROUTER_PROBE_MS = 1_000;

type MigrationStatus = {
  state:
    | "ready"
    | "copying"
    | "discarding"
    | "reclaiming"
    | "completed"
    | "failed";
  phase: string;
  progress: number;
  error?: string;
  current_metric?: string;
  rows_done?: number;
  rows_total?: number;
  metrics_done?: number;
  metrics_total?: number;
  before_bytes?: number;
  after_bytes?: number;
  saved_bytes?: number;
  saved_percent?: number;
};

type LoginMethods = Pick<
  RestrictedAuthStatus,
  "oauth_enabled" | "oauth_provider" | "password_login_enabled"
>;
type Me = Pick<RestrictedAuthStatus, "logged_in" | "username">;
type AuthStatus = LoginMethods & Me;
type APIResponse<T> = {
  status: "success" | "error";
  message?: string;
  data?: T;
};

class MigrationRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
    cache: "no-store",
  });
  const payload = (await response.json()) as APIResponse<T>;
  if (
    !response.ok ||
    payload.status !== "success" ||
    payload.data === undefined
  ) {
    throw new MigrationRequestError(
      response.status,
      payload.message || `HTTP ${response.status}`,
    );
  }
  return payload.data;
}

async function getMe(): Promise<Me> {
  const response = await fetch("/api/me", { cache: "no-store" });
  if (!response.ok) {
    throw new MigrationRequestError(response.status, `HTTP ${response.status}`);
  }
  return (await response.json()) as Me;
}

async function normalRouterAvailable(): Promise<boolean> {
  try {
    const response = await fetch("/ping", {
      cache: "no-store",
      redirect: "manual",
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

export default function DatabaseMigration() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en-US";
  const formatNumber = useCallback(
    (value: number) => new Intl.NumberFormat(locale).format(value),
    [locale],
  );
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [pageError, setPageError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [probeActive, setProbeActive] = useState(false);
  const [reclaimStartedAt, setReclaimStartedAt] = useState<number | null>(null);
  const [reclaimNow, setReclaimNow] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [methods, me] = await Promise.all([
        request<LoginMethods>("/auth"),
        getMe(),
      ]);
      setAuth({ ...methods, ...me });
      if (!me.logged_in) {
        setStatus(null);
        return;
      }
      const next = await request<MigrationStatus>("/status");
      setStatus(next);
      setPageError("");
    } catch (error) {
      if (error instanceof MigrationRequestError && error.status === 401) {
        setAuth((current) =>
          current ? { ...current, logged_in: false } : current,
        );
      }
      setPageError(
        error instanceof Error
          ? error.message
          : t(`${COMMON_I18N}.network_error`),
      );
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (
      status?.state !== "copying" &&
      status?.state !== "discarding" &&
      status?.state !== "reclaiming"
    ) {
      return;
    }
    const timer = window.setInterval(() => void refresh(), 700);
    return () => window.clearInterval(timer);
  }, [refresh, status?.state]);

  const prefix = STRUCTURE_I18N;
  const active =
    status?.state === "copying" ||
    status?.state === "discarding" ||
    status?.state === "reclaiming";
  const canStart =
    auth?.logged_in &&
    !!status &&
    (status.state === "ready" || status.state === "failed") &&
    !busy;
  const canDiscard =
    auth?.logged_in &&
    !!status &&
    (status.state === "ready" || status.state === "failed") &&
    !busy;

  const simulatedProgress =
    probeActive && reclaimStartedAt !== null
      ? Math.min(
          RECLAIM_PROGRESS_CAP,
          RECLAIM_START_PROGRESS +
            Math.floor(
              Math.max(0, reclaimNow - reclaimStartedAt) / RECLAIM_STEP_MS,
            ),
        )
      : status?.state === "completed"
        ? RECLAIM_PROGRESS_CAP
        : null;
  const displayedProgress = simulatedProgress ?? status?.progress ?? 0;
  const upgradeWaiting =
    (probeActive ||
      status?.state === "reclaiming" ||
      status?.state === "completed");

  useEffect(() => {
    if (status?.state === "failed") {
      setProbeActive(false);
      setReclaimStartedAt(null);
      return;
    }
    const startsProbe =
      status?.state === "reclaiming" || status?.state === "completed";
    if (!startsProbe || probeActive) return;
    setProbeActive(true);
    setReclaimStartedAt(
      status?.state === "completed"
        ? Date.now() -
            (RECLAIM_PROGRESS_CAP - RECLAIM_START_PROGRESS) * RECLAIM_STEP_MS
        : Date.now(),
    );
    setReclaimNow(Date.now());
  }, [status?.state, probeActive]);

  useEffect(() => {
    if (!probeActive) return;
    const timer = window.setInterval(() => setReclaimNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [probeActive]);

  useEffect(() => {
    if (!probeActive) return;
    let stopped = false;
    const check = async () => {
      if (stopped) return;
      if (await normalRouterAvailable()) {
        stopped = true;
        window.location.replace("/");
      }
    };
    void check();
    const timer = window.setInterval(
      () => void check(),
      NORMAL_ROUTER_PROBE_MS,
    );
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [probeActive]);

  const phaseText = useMemo(() => {
    if (!status) return "";
    if (status.state === "discarding") return t(`${STRUCTURE_I18N}.phase_discarding`);
    if (status.state === "reclaiming" || status.state === "completed") return t(`${STRUCTURE_I18N}.phase_reclaiming`);
    return t(`${STRUCTURE_I18N}.phase_copying`);
  }, [status, t]);

  const start = async () => {
    setBusy(true);
    setPageError("");
    try {
      await request<Record<string, never>>("/start", {
        method: "POST",

      });
      setConfirmOpen(false);
      await refresh();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t(`${COMMON_I18N}.request_failed`),
      );
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    setBusy(true);
    setPageError("");
    try {
      await request<Record<string, never>>("/discard", { method: "POST" });
      setDiscardOpen(false);
      setConfirmDiscard(false);
      await refresh();
    } catch (error) {
      setDiscardOpen(false);
      setConfirmDiscard(false);
      setPageError(
        error instanceof Error
          ? error.message
          : t(`${COMMON_I18N}.request_failed`),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="km-page-database-migration min-h-screen bg-[var(--color-background)] text-[var(--gray-12)]">
      <header
        className="km-database-migration-header border-b bg-[var(--color-panel-solid)]"
        style={{ borderColor: "var(--gray-a5)" }}
      >
        <Container size="3" px={{ initial: "4", sm: "6" }} py="3">
          <GuideHeader />
        </Container>
      </header>

      <Container
        size="3"
        px={{ initial: "4", sm: "6" }}
        py={{ initial: "6", sm: "8" }}
      >
        <Flex direction="column" gap="5">
          <div>
            <Heading size="7" weight="bold">
              {t(`${prefix}.title`)}
            </Heading>
          </div>

          {pageError && (
            <Callout.Root color="red" variant="surface">
              <Callout.Icon>
                <AlertTriangle size={18} />
              </Callout.Icon>
              <Callout.Text>{pageError}</Callout.Text>
            </Callout.Root>
          )}

          {auth?.logged_in && status?.state === "failed" && status.error && (
            <Callout.Root color="red" variant="surface">
              <Callout.Icon>
                <AlertTriangle size={18} />
              </Callout.Icon>
              <Callout.Text>
                <Text as="div" weight="bold">
                  {t(`${COMMON_I18N}.failed_title`)}
                </Text>
                <Text as="div" mt="1">
                  {status.error}
                </Text>
              </Callout.Text>
            </Callout.Root>
          )}

          {auth?.logged_in && (active || upgradeWaiting) && status && (
            <Flex direction="column" gap="3">
              <Flex justify="between" align="baseline" gap="3" wrap="wrap">
                <Text weight="bold">{phaseText}</Text>
                <Text size="2" color="gray" className="tabular-nums">
                  {new Intl.NumberFormat(locale, {
                    maximumFractionDigits: 1,
                  }).format(displayedProgress)}
                  %
                </Text>
              </Flex>
              <Progress value={displayedProgress} size="3" />
              {(status.state === "copying" || status.state === "discarding") && (
                <Text size="2" color="gray">
                  {status.state === "copying"
                      ? t(`${STRUCTURE_I18N}.copy_detail`, {
                          rows: formatNumber(status.rows_done ?? 0),
                          total: formatNumber(status.rows_total ?? 0),
                          metrics: formatNumber(status.metrics_done ?? 0),
                          metricTotal: formatNumber(status.metrics_total ?? 0),
                          metric: status.current_metric || "-",
                        })
                      : t(`${STRUCTURE_I18N}.discard_detail`)}
                </Text>
              )}
            </Flex>
          )}

          {auth?.logged_in && !active && status?.state !== "completed" && (
            <Flex justify="end" gap="3" wrap="wrap">
                <Button
                  size="3"
                  variant="soft"
                  color="red"
                  disabled={!canDiscard}
                  onClick={() => setDiscardOpen(true)}
                >
                  <Trash2 size={17} />
                  {t(`${STRUCTURE_I18N}.discard`)}
                </Button>
              <Button
                size="3"
                disabled={!canStart}
                onClick={() => setConfirmOpen(true)}
              >
                <Play size={17} />
                {t(`${prefix}.start`)}
              </Button>
            </Flex>
          )}

          {auth?.logged_in && !status && (
            <Callout.Root color="gray" variant="surface">
              <Loading compact />
            </Callout.Root>
          )}
        </Flex>
      </Container>

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>
{t(`${STRUCTURE_I18N}.confirm_title`)}
          </Dialog.Title>
          <Dialog.Description>
{t(`${STRUCTURE_I18N}.confirm_description`)}
          </Dialog.Description>
          <Flex justify="end" gap="3" mt="5" wrap="wrap">
            <Dialog.Close>
              <Button variant="soft" color="gray" disabled={busy}>
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
            <Button
              disabled={busy}
              onClick={() => void start()}
            >
              {busy && <LoaderCircle size={16} className="animate-spin" />}
{t(`${STRUCTURE_I18N}.start`)}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={discardOpen}
        onOpenChange={(open) => {
          setDiscardOpen(open);
          if (!open) setConfirmDiscard(false);
        }}
      >
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>{t(`${STRUCTURE_I18N}.discard_title`)}</Dialog.Title>
          <Dialog.Description>
            {t(`${STRUCTURE_I18N}.discard_description`)}
          </Dialog.Description>
          <Flex direction="column" gap="3" mt="4">
            <Confirmation
              checked={confirmDiscard}
              onCheckedChange={setConfirmDiscard}
              color="red"
              description={t(`${STRUCTURE_I18N}.discard_warning`)}
              label={t(`${STRUCTURE_I18N}.discard_confirm`)}
            />
          </Flex>
          <Flex justify="end" gap="3" mt="5">
            <Dialog.Close>
              <Button variant="soft" color="gray" disabled={busy}>
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              disabled={busy || !confirmDiscard}
              onClick={() => void discard()}
            >
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              <Trash2 size={16} />
              {t(`${STRUCTURE_I18N}.discard_action`)}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <RestrictedLoginDialog
        auth={auth}
        requestFailedKey={`${COMMON_I18N}.request_failed`}
        onAuthenticated={refresh}
      />
    </main>
  );
}

function Confirmation({
  checked,
  onCheckedChange,
  color,
  description,
  label,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  color: "amber" | "red";
  description: string;
  label: string;
}) {
  return (
    <label
      className="flex items-start gap-3 border p-3"
      style={{
        borderColor: `var(--${color}-a6)`,
        background: `var(--${color}-a2)`,
        borderRadius: "var(--radius-2)",
      }}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        mt="1"
      />
      <span>
        <Text as="div" size="2">
          {description}
        </Text>
        <Text as="div" size="2" weight="bold" mt="1">
          {label}
        </Text>
      </span>
    </label>
  );
}
