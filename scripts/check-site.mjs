import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";
import assert from "node:assert/strict";
import { assertLocalScript } from "./site-policy.mjs";
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const pages = [
  "index.html",
  "demo/index.html",
  "support/index.html",
  "pilot-routes/index.html",
  "privacy/index.html",
  "terms/index.html",
  "invite/index.html",
];
const walk = (node) => [node, ...(node.childNodes || []).flatMap(walk)];
const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
const documents = new Map();
for (const file of pages) {
  const html = await readFile(path.join(root, file), "utf8");
  const nodes = walk(parse(html));
  documents.set(file, { html, nodes });
  assert.equal(
    nodes.filter((node) => node.tagName === "h1").length,
    file.startsWith("invite") ? 3 : 1,
    file + ": heading hierarchy",
  );
  const ids = nodes.map((node) => attr(node, "id")).filter(Boolean);
  assert.equal(ids.length, new Set(ids).size, file + ": duplicate IDs");
  assert.ok(ids.includes("main"), file + ": skip target");
  for (const node of nodes) {
    if (node.tagName === "img") {
      assert.notEqual(attr(node, "alt"), undefined, file + ": image alt");
      assert.ok(
        attr(node, "width") && attr(node, "height"),
        file + ": image dimensions",
      );
    }
    if (node.tagName === "button") {
      assert.ok(
        attr(node, "aria-label") ||
          node.childNodes?.some(
            (child) => child.nodeName === "#text" && child.value.trim(),
          ),
        file + ": button name",
      );
    }
  }
  if (!file.startsWith("privacy") && !file.startsWith("terms")) {
    assert.doesNotMatch(
      html,
      /Weekly|Anytime|HOME.*EXPLORE.*CREATE.*PROFILE|exactly how far|iPhone.only/i,
      file + ": obsolete product claims",
    );
  }
}
for (const [file, { nodes }] of documents) {
  for (const node of nodes) {
    const value = attr(node, "src") || attr(node, "href");
    if (node.tagName === "script" && value) assertLocalScript(value);
    if (!value || /^(https?:|mailto:|scorch:)/.test(value)) continue;
    const url = new URL(value, "https://catchfire.run/" + file);
    const target = url.pathname.endsWith("/")
      ? url.pathname.slice(1) + "index.html"
      : url.pathname.slice(1);
    await stat(path.join(root, target)).catch(() => {
      throw new Error(file + ": missing " + value);
    });
    if (url.hash && documents.has(target)) {
      assert.ok(
        documents
          .get(target)
          .nodes.some((n) => attr(n, "id") === url.hash.slice(1)),
        file + ": missing anchor " + value,
      );
    }
  }
}
const home = documents.get("index.html").html;
for (const phrase of [
  "Run solo",
  "Race others",
  "Organize a race",
  "Same start",
  "Garmin Connect",
  "Request Android access",
  "Request iPhone access",
])
  assert.ok(home.includes(phrase), "Missing " + phrase);
const invite = documents.get("invite/index.html");
const resultNode = invite.nodes.find(
  (n) => attr(n, "id") === "fair-start-result",
);
assert.ok(
  !walk(resultNode).some((n) => attr(n, "id") === "open-scorch"),
  "Opening must not require a pace preview",
);
assert.match(invite.html, /name="referrer" content="no-referrer"/);
assert.match(invite.html, /noindex,nofollow/);
const privacy = documents.get("privacy/index.html").html;
for (const phrase of [
  "September 28, 2026",
  "Health Connect",
  "Apple Health",
  "Workout files",
  "Just runs stay on your phone",
])
  assert.ok(privacy.includes(phrase), "Privacy disclosure missing " + phrase);
const scope = JSON.parse(
  await readFile(path.join(root, "product-scope.json"), "utf8"),
);
assert.equal(
  scope.capabilities.find((c) => c.name === "Health Connect export").state,
  "development-only",
);
console.log(
  "Site checks passed: 7 pages, links/assets, anchors, basic semantics, invite handoff and product claims.",
);
