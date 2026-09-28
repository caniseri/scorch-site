import assert from "node:assert/strict";
export function assertLocalScript(value) {
  const url = new URL(value, "https://scorchapp.xyz/");
  assert.ok(
    value.startsWith("/") &&
      !value.startsWith("//") &&
      url.origin === "https://scorchapp.xyz",
    "Scripts must be local, root-relative assets, including on invite pages",
  );
}
