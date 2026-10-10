import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "parse5";
import {
  BETA_ENDPOINT,
  MESSAGES,
  buildBetaPayload,
  sendBetaRequest,
  validateBetaFields,
} from "../beta-form.mjs";

const read = (path) =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8");
const elements = (node) => [node, ...(node.childNodes || []).flatMap(elements)];
const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;

test("requires a plausible email and a device", () => {
  assert.deepEqual(
    validateBetaFields({ email: " runner@example.com ", platform: "ios" }),
    {},
  );
  assert.deepEqual(validateBetaFields({ email: "", platform: "" }), {
    email: MESSAGES.email,
    platform: MESSAGES.platform,
  });
  for (const email of [
    "runner",
    "runner@",
    "a b@example.com",
    `${"a".repeat(250)}@x.io`,
  ]) {
    assert.equal(
      validateBetaFields({ email, platform: "android" }).email,
      MESSAGES.email,
    );
  }
  assert.equal(
    validateBetaFields({ email: "a@b.co", platform: "windows" }).platform,
    MESSAGES.platform,
  );
});

test("builds only the fields the function accepts, with source_path always /", () => {
  assert.deepEqual(
    buildBetaPayload({
      email: " Runner@Example.com ",
      platform: "ios",
      city: "  New   York ",
      intent: "race",
      website: "",
    }),
    {
      email: "Runner@Example.com",
      platform: "ios",
      city: "New York",
      intent: "race",
      source_path: "/",
      website: "",
    },
  );
  assert.deepEqual(
    buildBetaPayload({
      email: "a@b.co",
      platform: "android",
      city: "",
      intent: "paid",
    }),
    {
      email: "a@b.co",
      platform: "android",
      city: null,
      intent: null,
      source_path: "/",
      website: "",
    },
  );
  assert.equal(buildBetaPayload({ city: "x".repeat(120) }).city.length, 80);
});

test("posts JSON without cookies or referrer and succeeds only on 204", async () => {
  const calls = [];
  const fake = (status) => async (url, options) => {
    calls.push({ url, options });
    return { status };
  };
  assert.equal(await sendBetaRequest({ email: "a@b.co" }, fake(204)), true);
  assert.equal(calls[0].url, BETA_ENDPOINT);
  assert.match(
    BETA_ENDPOINT,
    /^https:\/\/[a-z]+\.supabase\.co\/functions\/v1\/public-beta-request$/,
  );
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.referrerPolicy, "no-referrer");
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: "a@b.co" });
  for (const status of [200, 400, 429, 503]) {
    assert.equal(await sendBetaRequest({}, fake(status)), false);
  }
  assert.equal(
    await sendBetaRequest({}, async () => {
      throw new TypeError("Failed to fetch");
    }),
    false,
  );
});

test("gives up after the timeout", async () => {
  const hanging = (_url, { signal }) =>
    new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(new Error("aborted"))),
    );
  assert.equal(await sendBetaRequest({}, hanging, 10), false);
});

test("the form lives only on Home, behind the no-script email links", () => {
  const home = elements(parse(read("index.html")));
  const forms = home.filter(
    (node) =>
      node.tagName === "form" && attr(node, "data-beta-form") !== undefined,
  );
  assert.equal(forms.length, 1);
  assert.ok(
    forms[0].attrs.some((a) => a.name === "hidden"),
    "the form starts hidden for no-script visitors",
  );
  const fallback = home.find(
    (node) => attr(node, "data-beta-fallback") !== undefined,
  );
  const hrefs = elements(fallback)
    .map((node) => attr(node, "href"))
    .filter(Boolean);
  assert.equal(
    hrefs.filter((href) => href.startsWith("mailto:support@catchfire.run"))
      .length,
    2,
  );
  const privacy = elements(forms[0]).find(
    (node) => node.tagName === "a" && attr(node, "href") === "/privacy/",
  );
  assert.ok(privacy, "the form links the privacy policy");
  const trap = elements(forms[0]).find(
    (node) => attr(node, "name") === "website",
  );
  assert.equal(attr(trap, "tabindex"), "-1");

  for (const page of ["demo/index.html", "pilot-routes/index.html"]) {
    const nodes = elements(parse(read(page)));
    assert.equal(
      nodes.filter((node) => node.tagName === "form").length,
      0,
      page,
    );
    assert.ok(
      nodes.some(
        (node) => node.tagName === "a" && attr(node, "href") === "/#beta",
      ),
      page,
    );
  }
});
