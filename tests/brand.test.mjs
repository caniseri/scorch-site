import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "parse5";
import { buildInviteDeepLink, localPreviewRace } from "../invite/invite.mjs";

const read = (path) =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8");
const elements = (node) => [node, ...(node.childNodes || []).flatMap(elements)];
const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;

test("every public page uses the Catchfire brand and canonical domain", () => {
  assert.equal(read("CNAME").trim(), "catchfire.run");
  for (const path of [
    "index.html",
    "demo/index.html",
    "pilot-routes/index.html",
    "support/index.html",
    "privacy/index.html",
    "terms/index.html",
    "invite/index.html",
  ]) {
    const nodes = elements(parse(read(path)));
    const title = nodes.find((n) => n.tagName === "title");
    assert.match(
      title.childNodes.map((n) => n.value || "").join(""),
      /Catchfire/i,
    );
    if (path === "invite/index.html") {
      const robots = nodes.find(
        (n) => n.tagName === "meta" && attr(n, "name") === "robots",
      );
      assert.match(attr(robots, "content"), /noindex/);
    } else {
      const canonical = nodes.find(
        (n) => n.tagName === "link" && attr(n, "rel") === "canonical",
      );
      assert.ok(canonical, path + " has a canonical URL");
      assert.equal(
        new URL(attr(canonical, "href")).origin,
        "https://catchfire.run",
      );
    }
    for (const node of nodes.filter((n) => n.tagName === "a")) {
      assert.ok(!/^https?:\/\/scorchapp\.xyz/.test(attr(node, "href") || ""));
    }
  }
});

test("old installed apps can still open invitations and production never serves fixtures", () => {
  const token = "12345678-1234-4234-8234-123456789abc";
  assert.match(
    buildInviteDeepLink(token, "abcdefab-1234-4234-8234-123456789abc"),
    /^scorch:\/\/race-invite\?/,
  );
  for (const hostname of [
    "catchfire.run",
    "www.catchfire.run",
    "scorchapp.xyz",
    "www.scorchapp.xyz",
  ]) {
    assert.equal(
      localPreviewRace(new URLSearchParams("fixture=1"), hostname),
      null,
    );
  }
});

test("legal continuity uses the owner-confirmed Catchfire contact addresses", () => {
  assert.match(read("privacy/index.html"), /new name for Scorch/);
  assert.match(read("privacy/index.html"), /mailto:legal@catchfire\.run/);
  assert.match(read("support/index.html"), /mailto:support@catchfire\.run/);
  for (const path of [
    "index.html",
    "demo/index.html",
    "pilot-routes/index.html",
    "support/index.html",
    "privacy/index.html",
    "terms/index.html",
  ]) {
    const links = elements(parse(read(path)))
      .filter((node) => node.tagName === "a")
      .map((node) => attr(node, "href") || "")
      .filter((href) => href.startsWith("mailto:"));
    assert.ok(links.length > 0, path + " has a contact link");
    for (const href of links) {
      assert.match(href, /^mailto:(support|legal)@catchfire\.run(?:\?|$)/, path);
    }
  }
});
