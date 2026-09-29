const API_ENDPOINT =
  "https://kdmrabimbnetxhxdhwep.supabase.co/functions/v1/public-race-invite";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePaceSecPerMeter(value) {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) {
    throw new Error("Enter pace as minutes:seconds, for example 5:30.");
  }

  const totalSeconds = Number(match[1]) * 60 + Number(match[2]);
  if (totalSeconds < 150 || totalSeconds > 1200) {
    throw new Error("Enter a recent 5K pace between 2:30/km and 20:00/km.");
  }
  return totalSeconds / 1000;
}

export function formatClock(seconds) {
  const rounded = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatPace(secPerM) {
  return `${formatClock(Number(secPerM) * 1000)}/km`;
}

export function buildFairStartPreview(race, athletePaceSecPerM) {
  if (!Number.isFinite(athletePaceSecPerM) || athletePaceSecPerM <= 0) {
    throw new Error("Enter a valid recent 5K pace.");
  }
  const distanceM = Number(race?.distance_m);
  const referencePace = Number(race?.reference_pace_sec_per_m);
  if (
    race?.handicap_mode !== "scratch" &&
    (!Number.isFinite(distanceM) ||
      distanceM <= 0 ||
      !Number.isFinite(referencePace) ||
      referencePace <= 0)
  ) {
    throw new Error(
      "This race is missing the pace data needed for a fair-start preview.",
    );
  }

  const fastestAllowed = Number(race?.min_pace_sec_per_m);
  const slowestAllowed = Number(race?.max_pace_sec_per_m);
  if (
    Number.isFinite(fastestAllowed) &&
    fastestAllowed > 0 &&
    athletePaceSecPerM < fastestAllowed
  ) {
    throw new Error(
      `This race is for runners at ${formatPace(fastestAllowed)} or slower.`,
    );
  }
  if (
    Number.isFinite(slowestAllowed) &&
    slowestAllowed > 0 &&
    athletePaceSecPerM > slowestAllowed
  ) {
    throw new Error(
      `This race requires ${formatPace(slowestAllowed)} or faster.`,
    );
  }

  const rawOffsetSec =
    race?.handicap_mode === "scratch"
      ? 0
      : distanceM * (athletePaceSecPerM - referencePace);
  const signedOffsetSec = Number(rawOffsetSec.toFixed(6));
  const offsetSec = Math.abs(signedOffsetSec);

  if (offsetSec < 1) {
    return {
      direction: "level",
      offsetSec: 0,
      offsetLabel: "0:00",
      statusLabel:
        race?.handicap_mode === "scratch"
          ? "Same start"
          : "At the reference start",
      detail:
        race?.handicap_mode === "scratch"
          ? "Everyone starts together. First across the finish wins."
          : "Your estimated start matches the race reference time. Other runners may start earlier or later.",
    };
  }
  if (signedOffsetSec > 0) {
    return {
      direction: "head-start",
      offsetSec,
      offsetLabel: formatClock(offsetSec),
      statusLabel: "Estimated earlier start",
      detail:
        "You are estimated to start this much before the race reference time. Other runners may start earlier or later.",
    };
  }
  return {
    direction: "chaser",
    offsetSec,
    offsetLabel: formatClock(offsetSec),
    statusLabel: "Estimated later start",
    detail:
      "You are estimated to start this much after the race reference time. Other runners may start earlier or later.",
  };
}

export function normalizeInviteFunnelId(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return uuidPattern.test(normalized) ? normalized : null;
}

export function resolveInviteFunnelId(
  token,
  suppliedFunnelId,
  historyState,
  createId,
) {
  const supplied = normalizeInviteFunnelId(suppliedFunnelId);
  if (supplied) return supplied;

  const state =
    historyState && typeof historyState === "object" ? historyState : null;
  const remembered =
    state?.scorchInviteToken === token
      ? normalizeInviteFunnelId(state.scorchInviteFunnelId)
      : null;
  if (remembered) return remembered;

  return normalizeInviteFunnelId(createId?.());
}

export function buildInviteDeepLink(token, funnelId) {
  if (!uuidPattern.test(String(token ?? ""))) {
    throw new Error("Invite token is invalid.");
  }
  const normalizedFunnelId = normalizeInviteFunnelId(funnelId);
  if (!normalizedFunnelId) {
    throw new Error("Invite flow is invalid.");
  }
  return `scorch://race-invite?token=${encodeURIComponent(token)}&fid=${encodeURIComponent(normalizedFunnelId)}`;
}

export function buildInviteFunnelEventPayload(token, funnelId, eventName) {
  if (
    !uuidPattern.test(String(token ?? "")) ||
    !normalizeInviteFunnelId(funnelId)
  ) {
    throw new Error("Invite funnel event is invalid.");
  }
  if (eventName !== "pace_entered") {
    throw new Error("Invite funnel event is invalid.");
  }
  return {
    token,
    funnel_id: normalizeInviteFunnelId(funnelId),
    event_name: eventName,
  };
}

async function recordInviteFunnelEvent(token, funnelId, eventName) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(
      buildInviteFunnelEventPayload(token, funnelId, eventName),
    ),
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) {
    throw new Error("Invite progress could not be recorded.");
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function formatRaceDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Start time in Catchfire";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "registration") return "Registration open";
  if (normalized === "scheduled") return "Field forming";
  if (normalized === "in_progress") return "Race in progress";
  if (normalized === "finalized" || normalized === "completed")
    return "Race complete";
  return "View status in Catchfire";
}

export function requiresPace(race) {
  return (
    race?.handicap_mode !== "scratch" ||
    Number(race?.min_pace_sec_per_m) > 0 ||
    Number(race?.max_pace_sec_per_m) > 0
  );
}

export function validateInviteRace(
  race,
  now = Date.now(),
  { serverValidated = false } = {},
) {
  if (
    !race ||
    typeof race !== "object" ||
    typeof race.name !== "string" ||
    !race.name.trim() ||
    race.sport !== "run" ||
    Number(race.entry_fee_cents) !== 0 ||
    race.status !== "scheduled" ||
    race.experience_type === "ghost" ||
    race.experience_type === "anytime"
  ) {
    throw new Error(
      "This invitation is not available for a scheduled free running race.",
    );
  }
  const start = new Date(race.start_time).getTime();
  const expiry = race.invite_expires_at
    ? new Date(race.invite_expires_at).getTime()
    : Infinity;
  if (
    !Number.isFinite(start) ||
    Number.isNaN(expiry) ||
    (!serverValidated && (start <= now || expiry <= now))
  ) {
    throw new Error(
      "This invitation is no longer available. Ask the host for an updated link.",
    );
  }
  return race;
}

export function inviteErrorMessage(status) {
  if (status === 404 || status === 410)
    return "This invitation is unavailable. It may have expired or the race may have changed. Ask the host for a fresh link.";
  if (status === 409)
    return "This challenge is not available in the current free running beta.";
  return "We could not load this invitation right now. Try again, or ask the host to confirm the link.";
}

export function localPreviewRace(search, hostname, now = Date.now()) {
  if (
    !["localhost", "127.0.0.1"].includes(hostname) ||
    search.get("fixture") !== "1"
  )
    return null;
  const type = search.get("case") || "fair";
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Saturday Park 5K",
    experience_type: "scheduled",
    sport: "run",
    distance_m: 5000,
    reference_pace_sec_per_m:
      type === "missing-pace" || type === "same" ? null : 0.24,
    start_time: new Date(
      now + (type === "past" ? -1 : 48 * 60 * 60 * 1000),
    ).toISOString(),
    status: type === "cancelled" ? "cancelled" : "scheduled",
    entry_fee_cents: 0,
    max_entries: 8,
    handicap_mode: ["same", "limited"].includes(type)
      ? "scratch"
      : "convergence",
    min_pace_sec_per_m: type === "limited" ? 0.25 : null,
    max_pace_sec_per_m: type === "limited" ? 0.4 : null,
    visibility: "private",
    invite_expires_at: new Date(
      now + (type === "expired" ? -1 : 7 * 24 * 60 * 60 * 1000),
    ).toISOString(),
    route_mapped: type !== "unmapped",
  };
}

export async function fetchInvite(token, funnelId, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetcher(
      `${API_ENDPOINT}?token=${encodeURIComponent(token)}&fid=${encodeURIComponent(funnelId)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.race) {
      const error = new Error(
        inviteErrorMessage(response.ok ? 503 : response.status),
      );
      error.retryable =
        response.ok || response.status >= 500 || response.status === 429;
      throw error;
    }
    // The server checked deadlines using its clock; do not reject its response
    // because this browser's clock is fast. Native rechecks before joining.
    return validateInviteRace(payload.race, Date.now(), {
      serverValidated: true,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return [
    hours ? `${hours} hr` : "",
    minutes ? `${minutes} min` : "",
    remainder || !total ? `${remainder} sec` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function renderResult(preview) {
  setText("fair-start-label", preview.statusLabel);
  setText(
    "fair-start-value",
    preview.direction === "level"
      ? "Same time"
      : formatDuration(preview.offsetSec),
  );
  setText("fair-start-detail", preview.detail);
  document.getElementById("fair-start-result").hidden = false;
}

export function createInviteFunnelId(crypto = globalThis.crypto) {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto?.getRandomValues !== "function") return null;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function loadInvite() {
  const search = new URLSearchParams(window.location.search);
  const token = search.get("token")?.trim() ?? "";
  const sender = search.get("from")?.trim().slice(0, 30) ?? "";
  const suppliedFunnelId = normalizeInviteFunnelId(search.get("fid"));
  const funnelId = resolveInviteFunnelId(
    token,
    suppliedFunnelId,
    window.history.state,
    createInviteFunnelId,
  );
  const loading = document.getElementById("invite-loading");
  const errorPanel = document.getElementById("invite-error");
  const content = document.getElementById("invite-content");
  const retry = document.getElementById("invite-retry");
  retry?.addEventListener("click", () => window.location.reload());

  try {
    if (!uuidPattern.test(token) || !normalizeInviteFunnelId(funnelId)) {
      throw new Error(
        "This invite link is incomplete. Ask the race host to share it again.",
      );
    }
    if (!suppliedFunnelId) {
      try {
        window.history.replaceState(
          {
            ...(window.history.state && typeof window.history.state === "object"
              ? window.history.state
              : {}),
            scorchInviteToken: token,
            scorchInviteFunnelId: funnelId,
          },
          document.title,
        );
      } catch {
        // History persistence is optional; the handoff still uses this same ID.
      }
    }
    const fixtureRace = localPreviewRace(search, window.location.hostname);
    const race = fixtureRace
      ? validateInviteRace(fixtureRace)
      : await fetchInvite(token, funnelId);
    document.title = `${race.name.slice(0, 120)} | Catchfire invitation`;
    setText(
      "invite-kicker",
      sender ? `${sender} invited you` : "You're invited",
    );
    setText("race-name", race.name.slice(0, 120));
    setText("race-start", formatRaceDate(race.start_time));
    setText("race-status", statusLabel(race.status));
    const distance = Number(race.distance_m);
    setText(
      "race-distance",
      Number.isFinite(distance) && distance > 0
        ? `${(distance / 1000).toFixed(1)} km`
        : "Check in Catchfire",
    );
    const same = race.handicap_mode === "scratch";
    const paceRequired = requiresPace(race);
    setText("race-rule", same ? "Same start" : "Fair start");
    setText(
      "race-route",
      race.route_mapped === true ? "Mapped course" : "Check in Catchfire",
    );
    setText(
      "invite-description",
      same
        ? "Start together. Same route. First across wins."
        : "Your pace sets your start. Same route. First across wins.",
    );
    document.getElementById("route-warning").hidden =
      race.route_mapped === true;
    document.getElementById("pace-preview").hidden = !paceRequired;
    document.getElementById("same-start-note").hidden = paceRequired;
    const openScorch = document.getElementById("open-scorch");
    openScorch.href = buildInviteDeepLink(token, funnelId);
    if (same && paceRequired) {
      setText("pace-heading", "Check the pace range");
      setText(
        "pace-help",
        "This Same start race has pace limits. Check your recent 5K pace here, or review the entry requirements in Catchfire.",
      );
      setText("pace-submit", "Check pace");
    }
    const result = document.getElementById("fair-start-result");
    const paceError = document.getElementById("pace-error");
    document.getElementById("runner-pace")?.addEventListener("input", () => {
      result.hidden = true;
      paceError.hidden = true;
    });
    document
      .getElementById("pace-form")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        result.hidden = true;
        paceError.hidden = true;
        try {
          const pace = parsePaceSecPerMeter(
            document.getElementById("runner-pace")?.value,
          );
          const preview = buildFairStartPreview(race, pace);
          renderResult(preview);
          if (!fixtureRace)
            void recordInviteFunnelEvent(token, funnelId, "pace_entered").catch(
              () => undefined,
            );
        } catch (error) {
          paceError.textContent =
            error instanceof Error
              ? error.message
              : "Check your pace and try again.";
          paceError.hidden = false;
        }
      });
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.hidden = true;
    content.hidden = true;
    const network = error instanceof TypeError || error?.name === "AbortError";
    setText(
      "invite-error-title",
      network || error?.retryable
        ? "Invitation temporarily unavailable"
        : "Invitation unavailable",
    );
    setText(
      "invite-error-detail",
      network
        ? inviteErrorMessage(503)
        : error instanceof Error
          ? error.message
          : inviteErrorMessage(503),
    );
    retry.hidden = !(network || error?.retryable);
    errorPanel.hidden = false;
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined")
  void loadInvite();
