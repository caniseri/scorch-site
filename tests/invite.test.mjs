import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFairStartPreview,
  parsePaceSecPerMeter,
  requiresPace,
  validateInviteRace,
  normalizeInviteFunnelId,
  resolveInviteFunnelId,
  buildInviteDeepLink,
  buildInviteFunnelEventPayload,
  localPreviewRace,
  fetchInvite,
  inviteErrorMessage,
  formatDuration,
  createInviteFunnelId,
} from "../invite/invite.mjs";
const token = "12345678-1234-4234-8234-123456789abc";
const fid = "abcdefab-1234-4234-8234-123456789abc";
const other = "abcdefab-1234-4234-8234-123456789abd";
const fixture = (type) =>
  localPreviewRace(new URLSearchParams("fixture=1&case=" + type), "localhost");

test("unrestricted same start needs neither pace nor reference data to open", () => {
  const race = fixture("same");
  assert.equal(requiresPace(race), false);
  assert.equal(race.reference_pace_sec_per_m, null);
  assert.equal(validateInviteRace(race), race);
  assert.equal(buildFairStartPreview(race, 0.3).direction, "level");
});
test("pace-limited same starts still validate entry pace", () => {
  const race = fixture("limited");
  assert.equal(requiresPace(race), true);
  assert.throws(() => buildFairStartPreview(race, 0.2), /slower/);
  assert.throws(() => buildFairStartPreview(race, 0.5), /faster/);
  assert.equal(buildFairStartPreview(race, 0.3).offsetSec, 0);
});
test("fair-start preview is relative to reference, never a claim of first or final starter", () => {
  const race = fixture("fair");
  assert.equal(requiresPace(race), true);
  const head = buildFairStartPreview(race, 0.3);
  assert.equal(head.offsetSec, 300);
  assert.equal(head.direction, "head-start");
  assert.match(head.detail, /reference/);
  assert.doesNotMatch(head.detail, /final starter|leave first/);
  assert.equal(buildFairStartPreview(race, 0.2).direction, "chaser");
  assert.match(buildFairStartPreview(race, 0.24).detail, /Other runners/);
});
test("missing reference blocks only optional preview, not valid invite loading", () => {
  const race = fixture("missing-pace");
  assert.equal(validateInviteRace(race), race);
  assert.throws(
    () => buildFairStartPreview(race, 0.3),
    /missing the pace data/,
  );
});
test("invalid pace cannot produce a numeric preview", () => {
  for (const value of ["", "5.30", "5:70", "2:29", "20:01", "NaN"])
    assert.throws(() => parsePaceSecPerMeter(value));
  assert.equal(parsePaceSecPerMeter("5:30"), 0.33);
  for (const value of [NaN, Infinity, 0, -1, undefined])
    assert.throws(() => buildFairStartPreview(fixture("fair"), value));
});
test("unavailable races do not become joinable, but unmapped routes can be checked in app", () => {
  for (const type of ["expired", "past", "cancelled"])
    assert.throws(() => validateInviteRace(fixture(type)));
  for (const change of [
    { status: "in_progress" },
    { sport: "ride" },
    { entry_fee_cents: 100 },
    { name: null },
    { start_time: "bad" },
    { experience_type: "ghost" },
  ]) {
    assert.throws(() => validateInviteRace({ ...fixture("fair"), ...change }));
  }
  assert.equal(validateInviteRace(fixture("unmapped")).route_mapped, false);
});
test("fixtures are never enabled on the production hostname", () => {
  assert.equal(
    localPreviewRace(new URLSearchParams("fixture=1"), "scorchapp.xyz"),
    null,
  );
  assert.equal(localPreviewRace(new URLSearchParams(), "localhost"), null);
});
test("duration estimates cannot be confused with clock times, even over an hour", () => {
  assert.equal(formatDuration(450), "7 min 30 sec");
  assert.equal(formatDuration(4320), "1 hr 12 min");
});
test("a valid server response is not blocked by a browser clock ahead of the race", () => {
  assert.equal(
    validateInviteRace(fixture("fair"), Date.now() + 99 * 86400000, {
      serverValidated: true,
    }).name,
    "Saturday Park 5K",
  );
});
test("secure ID fallback works without randomUUID and never uses Math.random", () => {
  const id = createInviteFunnelId({
    getRandomValues: (bytes) => bytes.fill(17),
  });
  assert.ok(normalizeInviteFunnelId(id));
  assert.equal(createInviteFunnelId({}), null);
});
test("attribution is reused only for the same invitation and preserved in app link", () => {
  const state = { scorchInviteToken: token, scorchInviteFunnelId: fid };
  assert.equal(
    resolveInviteFunnelId(token, null, state, () => other),
    fid,
  );
  assert.equal(
    resolveInviteFunnelId(other, null, state, () => other),
    other,
  );
  assert.equal(
    resolveInviteFunnelId(token, other, state, () => fid),
    other,
  );
  assert.equal(normalizeInviteFunnelId(fid.toUpperCase()), fid);
  assert.equal(
    buildInviteDeepLink(token, fid),
    "scorch://race-invite?token=" + token + "&fid=" + fid,
  );
  assert.throws(() => buildInviteDeepLink("bad", fid));
  assert.throws(() => buildInviteDeepLink(token, "bad"));
});
test("pace event contains no raw pace, name or third-party destination", () => {
  assert.deepEqual(buildInviteFunnelEventPayload(token, fid, "pace_entered"), {
    token,
    funnel_id: fid,
    event_name: "pace_entered",
  });
  assert.throws(() => buildInviteFunnelEventPayload(token, fid, "joined"));
});
test("lookup preserves attribution and no-cache / no-referrer protections", async () => {
  let request;
  const race = await fetchInvite(token, fid, async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ race: fixture("fair") }),
    };
  });
  assert.equal(race.name, "Saturday Park 5K");
  assert.match(request.url, new RegExp("fid=" + fid));
  assert.equal(request.options.cache, "no-store");
  assert.equal(request.options.referrerPolicy, "no-referrer");
});
test("HTTP failures and malformed success responses do not render a successful invite", async () => {
  for (const status of [404, 409, 410, 429, 503]) {
    await assert.rejects(
      fetchInvite(token, fid, async () => ({
        ok: false,
        status,
        json: async () => ({ error: "untrusted message" }),
      })),
      (error) => {
        assert.equal(error.message, inviteErrorMessage(status));
        assert.equal(error.retryable, status >= 500 || status === 429);
        return true;
      },
    );
  }
  await assert.rejects(
    fetchInvite(token, fid, async () => ({
      ok: true,
      status: 200,
      json: async () => null,
    })),
  );
});
