const API_ENDPOINT = 'https://kdmrabimbnetxhxdhwep.supabase.co/functions/v1/public-race-invite';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePaceSecPerMeter(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) {
    throw new Error('Enter pace as minutes:seconds, for example 5:30.');
  }

  const totalSeconds = Number(match[1]) * 60 + Number(match[2]);
  if (totalSeconds < 150 || totalSeconds > 1200) {
    throw new Error('Enter a recent 5K pace between 2:30/km and 20:00/km.');
  }
  return totalSeconds / 1000;
}

export function formatClock(seconds) {
  const rounded = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function formatPace(secPerM) {
  return `${formatClock(Number(secPerM) * 1000)}/km`;
}

export function buildFairStartPreview(race, athletePaceSecPerM) {
  const distanceM = Number(race?.distance_m);
  const referencePace = Number(race?.reference_pace_sec_per_m);
  if (!Number.isFinite(distanceM) || distanceM <= 0 || !Number.isFinite(referencePace) || referencePace <= 0) {
    throw new Error('This race is missing the pace data needed for a fair-start preview.');
  }

  const fastestAllowed = Number(race?.min_pace_sec_per_m);
  const slowestAllowed = Number(race?.max_pace_sec_per_m);
  if (Number.isFinite(fastestAllowed) && fastestAllowed > 0 && athletePaceSecPerM < fastestAllowed) {
    throw new Error(`This race is for runners at ${formatPace(fastestAllowed)} or slower.`);
  }
  if (Number.isFinite(slowestAllowed) && slowestAllowed > 0 && athletePaceSecPerM > slowestAllowed) {
    throw new Error(`This race requires ${formatPace(slowestAllowed)} or faster.`);
  }

  const rawOffsetSec = race?.handicap_mode === 'scratch'
    ? 0
    : distanceM * (athletePaceSecPerM - referencePace);
  const signedOffsetSec = Number(rawOffsetSec.toFixed(6));
  const offsetSec = Math.abs(signedOffsetSec);

  if (offsetSec < 1) {
    return {
      direction: 'level',
      offsetSec: 0,
      offsetLabel: '0:00',
      statusLabel: 'Even start',
      detail: 'You leave together. First across the finish wins.',
    };
  }
  if (signedOffsetSec > 0) {
    return {
      direction: 'head-start',
      offsetSec,
      offsetLabel: formatClock(offsetSec),
      statusLabel: 'Your head start',
      detail: 'You leave first. The faster final starter chases.',
    };
  }
  return {
    direction: 'chaser',
    offsetSec,
    offsetLabel: formatClock(offsetSec),
    statusLabel: 'Your chase delay',
    detail: 'The first runner leaves. You chase them toward one finish.',
  };
}

export function normalizeInviteFunnelId(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return uuidPattern.test(normalized) ? normalized : null;
}

export function resolveInviteFunnelId(token, suppliedFunnelId, historyState, createId) {
  const supplied = normalizeInviteFunnelId(suppliedFunnelId);
  if (supplied) return supplied;

  const state = historyState && typeof historyState === 'object' ? historyState : null;
  const remembered = state?.scorchInviteToken === token
    ? normalizeInviteFunnelId(state.scorchInviteFunnelId)
    : null;
  if (remembered) return remembered;

  return normalizeInviteFunnelId(createId?.());
}

export function buildInviteDeepLink(token, funnelId) {
  if (!uuidPattern.test(String(token ?? ''))) {
    throw new Error('Invite token is invalid.');
  }
  const normalizedFunnelId = normalizeInviteFunnelId(funnelId);
  if (!normalizedFunnelId) {
    throw new Error('Invite flow is invalid.');
  }
  return `scorch://race-invite?token=${encodeURIComponent(token)}&fid=${encodeURIComponent(normalizedFunnelId)}`;
}

export function buildInviteFunnelEventPayload(token, funnelId, eventName) {
  if (!uuidPattern.test(String(token ?? '')) || !normalizeInviteFunnelId(funnelId)) {
    throw new Error('Invite funnel event is invalid.');
  }
  if (eventName !== 'pace_entered') {
    throw new Error('Invite funnel event is invalid.');
  }
  return {
    token,
    funnel_id: normalizeInviteFunnelId(funnelId),
    event_name: eventName,
  };
}

async function recordInviteFunnelEvent(token, funnelId, eventName) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(buildInviteFunnelEventPayload(token, funnelId, eventName)),
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) {
    throw new Error('Invite progress could not be recorded.');
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function formatRaceDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Start time in Scorch';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function statusLabel(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'registration') return 'Registration open';
  if (normalized === 'scheduled') return 'Field forming';
  if (normalized === 'in_progress') return 'Race in progress';
  if (normalized === 'finalized' || normalized === 'completed') return 'Race complete';
  return 'View status in Scorch';
}

function localPreviewRace(search) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal || search.get('fixture') !== '1') return null;
  return {
    id: 'local-preview',
    name: 'Saturday Park 5K',
    experience_type: 'scheduled',
    sport: 'run',
    distance_m: 5000,
    reference_pace_sec_per_m: 0.24,
    start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    entry_fee_cents: 0,
    max_entries: 8,
    handicap_mode: 'convergence',
    min_pace_sec_per_m: null,
    max_pace_sec_per_m: null,
    visibility: 'private',
    invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    route_mapped: true,
  };
}

function renderResult(preview, runnerName) {
  const result = document.getElementById('fair-start-result');
  const firstNode = document.getElementById('stagger-first');
  const lastNode = document.getElementById('stagger-last');
  const safeRunnerName = runnerName.trim() || 'You';

  setText('fair-start-label', preview.statusLabel);
  setText('fair-start-value', preview.offsetLabel);
  setText('fair-start-detail', preview.detail);

  firstNode?.classList.toggle('stagger-node-hot', preview.direction !== 'chaser');
  lastNode?.classList.toggle('stagger-node-hot', preview.direction === 'chaser');

  if (preview.direction === 'head-start') {
    setText('stagger-first-name', safeRunnerName);
    setText('stagger-first-time', '0:00');
    setText('stagger-last-name', 'Final starter');
    setText('stagger-last-time', `+${preview.offsetLabel}`);
  } else if (preview.direction === 'chaser') {
    setText('stagger-first-name', 'First starter');
    setText('stagger-first-time', '0:00');
    setText('stagger-last-name', safeRunnerName);
    setText('stagger-last-time', `+${preview.offsetLabel}`);
  } else {
    setText('stagger-first-name', safeRunnerName);
    setText('stagger-first-time', '0:00');
    setText('stagger-last-name', 'Field');
    setText('stagger-last-time', '0:00');
  }

  if (result) result.hidden = false;
  result?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function loadInvite() {
  const search = new URLSearchParams(window.location.search);
  const token = search.get('token')?.trim() ?? '';
  const sender = search.get('from')?.trim().slice(0, 30) ?? '';
  const suppliedFunnelId = normalizeInviteFunnelId(search.get('fid'));
  const funnelId = resolveInviteFunnelId(
    token,
    suppliedFunnelId,
    window.history.state,
    () => globalThis.crypto?.randomUUID?.(),
  );
  const loading = document.getElementById('invite-loading');
  const errorPanel = document.getElementById('invite-error');
  const content = document.getElementById('invite-content');

  try {
    if (!uuidPattern.test(token) || !normalizeInviteFunnelId(funnelId)) {
      throw new Error('This invite link is incomplete. Ask the race host to share it again.');
    }

    if (!suppliedFunnelId) {
      try {
        window.history.replaceState(
          {
            ...(window.history.state && typeof window.history.state === 'object'
              ? window.history.state
              : {}),
            scorchInviteToken: token,
            scorchInviteFunnelId: funnelId,
          },
          document.title,
        );
      } catch {
        // Analytics continuity must never block an invite preview.
      }
    }

    const fixtureRace = localPreviewRace(search);
    let race = fixtureRace;
    if (!race) {
      const response = await fetch(
        `${API_ENDPOINT}?token=${encodeURIComponent(token)}&fid=${encodeURIComponent(funnelId)}`,
        {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.race) {
        throw new Error(payload.error || 'This invite has expired or is no longer available.');
      }
      race = payload.race;
    }

    document.title = `${race.name} | Scorch Challenge`;
    setText('invite-kicker', sender ? `${sender} challenged you` : 'A runner challenged you');
    setText('race-name', race.name || 'Scorch Race');
    setText('race-start', formatRaceDate(race.start_time));
    setText('race-status', statusLabel(race.status));
    setText('race-distance', `${(Number(race.distance_m) / 1000).toFixed(1)} km`);
    setText('race-rule', race.handicap_mode === 'scratch' ? 'Same start' : 'Fair start');
    setText('race-route', race.route_mapped ? 'Mapped' : 'Check in app');

    const openScorch = document.getElementById('open-scorch');
    if (openScorch) openScorch.href = buildInviteDeepLink(token, funnelId);

    const paceForm = document.getElementById('pace-form');
    paceForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const paceError = document.getElementById('pace-error');
      try {
        const paceValue = document.getElementById('runner-pace')?.value;
        const runnerName = document.getElementById('runner-name')?.value ?? '';
        const preview = buildFairStartPreview(race, parsePaceSecPerMeter(paceValue));
        if (paceError) paceError.hidden = true;
        renderResult(preview, runnerName);
        if (!fixtureRace) {
          void recordInviteFunnelEvent(token, funnelId, 'pace_entered').catch(() => undefined);
        }
      } catch (error) {
        if (paceError) {
          paceError.textContent = error instanceof Error ? error.message : 'Check your pace and try again.';
          paceError.hidden = false;
        }
      }
    });

    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.hidden = true;
    setText('invite-error-detail', error instanceof Error ? error.message : 'Ask the race host for a fresh invite link.');
    errorPanel.hidden = false;
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  void loadInvite();
}
