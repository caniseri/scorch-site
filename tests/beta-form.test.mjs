import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "parse5";
import { buildBetaPayload, sendBetaRequest } from "../beta-form.mjs";

const values = {
  email: " Runner@Example.com ",
  platform: "ios",
  city: " London ",
  intent: "race",
  website: "",
};

test("beta payload normalizes email, bounds optional data and excludes URL queries", () => {
  const { payload, errors } = buildBetaPayload({
    ...values,
    source_path: "/?private=1",
    token: "not-sent",
  });
  assert.deepEqual(errors, {});
  assert.deepEqual(payload, {
    email: "runner@example.com",
    platform: "ios",
    city: "London",
    intent: "race",
    source_path: "/",
    website: "",
  });
  assert.deepEqual(
    buildBetaPayload({ email: "a@b.com", platform: "android" }).payload,
    {
      email: "a@b.com",
      platform: "android",
      city: null,
      intent: null,
      source_path: "/",
      website: "",
    },
  );
});

test("invalid required and optional values have field-addressable errors", () => {
  for (const [key, value] of [
    ["email", ""],
    ["email", "a@b"],
    ["email", "a\n@b.com"],
    ["email", "a".repeat(65) + "@b.com"],
    ["platform", "web"],
    ["platform", ""],
    ["city", "a".repeat(81)],
    ["city", "a\u0000"],
    ["intent", ["solo"]],
  ]) {
    const result = buildBetaPayload({ ...values, [key]: value });
    assert.equal(result.payload, null);
    assert.ok(result.errors[key]);
  }
});

test("request uses the designated endpoint without cache, referrer, credentials or analytics", async () => {
  const { payload } = buildBetaPayload(values);
  let captured;
  await sendBetaRequest(payload, async (url, options) => {
    captured = { url, options };
    return { status: 204 };
  });
  assert.equal(
    captured.url,
    "https://kdmrabimbnetxhxdhwep.supabase.co/functions/v1/public-beta-request",
  );
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.cache, "no-store");
  assert.equal(captured.options.referrerPolicy, "no-referrer");
  assert.equal(captured.options.credentials, "omit");
  assert.deepEqual(JSON.parse(captured.options.body), payload);
  assert.ok(captured.options.signal instanceof AbortSignal);
});

test("only 204 succeeds; errors are generic and never echo the server", async () => {
  for (const status of [200, 400, 403, 429, 500, 503])
    await assert.rejects(
      sendBetaRequest({}, async () => ({ status })),
      /Beta request unavailable/,
    );
});

test("timeout aborts a stalled request and cleans up its timer", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  const pending = sendBetaRequest({}, async (_url, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(new Error("aborted"))),
    );
  });
  const rejection = assert.rejects(pending, /aborted/);
  context.mock.timers.tick(10000);
  await rejection;
  assert.equal(signal.aborted, true);
  context.mock.timers.reset();
});

test("network rejection is propagated and successful requests clear the timer", async (context) => {
  await assert.rejects(
    sendBetaRequest({}, async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  await sendBetaRequest({}, async (_url, options) => {
    signal = options.signal;
    return { status: 204 };
  });
  context.mock.timers.tick(10000);
  assert.equal(signal.aborted, false);
  context.mock.timers.reset();
});

test("only Home has a form; fallback and privacy disclosure remain in HTML", () => {
  const home = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const nodes = (node) => [node, ...(node.childNodes || []).flatMap(nodes)];
  const attr = (node, name) =>
    node.attrs?.find((value) => value.name === name)?.value;
  const forms = nodes(parse(home)).filter(
    (node) => attr(node, "data-beta-form") !== undefined,
  );
  assert.equal(forms.length, 1);
  assert.equal(attr(forms[0], "hidden"), "");
  assert.match(home, /Request iPhone access/);
  assert.match(home, /Request Android access/);
  assert.match(home, /We use your email only to send beta access/);
  assert.match(home, /href="\/privacy\/">Privacy policy/);
  for (const path of ["demo", "pilot-routes"]) {
    const page = readFileSync(
      new URL(`../${path}/index.html`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(page, /data-beta-form/);
    assert.ok(
      nodes(parse(page)).some(
        (node) =>
          attr(node, "class") === "button primary" &&
          attr(node, "href") === "/#beta",
      ),
    );
  }
});
