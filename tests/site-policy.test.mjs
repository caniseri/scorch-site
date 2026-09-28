import test from "node:test";
import assert from "node:assert/strict";
import { assertLocalScript } from "../scripts/site-policy.mjs";
test("external scripts cannot evade the static privacy gate", () => {
  assert.doesNotThrow(() => assertLocalScript("/site.mjs?v=20260928"));
  for (const url of [
    "https://tracker.example/a.js",
    "http://tracker.example/a.js",
    "//tracker.example/a.js",
    "data:text/javascript,alert(1)",
    "javascript:alert(1)",
  ]) {
    assert.throws(() => assertLocalScript(url));
  }
});
