import assert from "node:assert/strict";
export function assertLocalScript(value) {
  const url = new URL(value, "https://catchfire.run/");
  assert.ok(
    value.startsWith("/") &&
      !value.startsWith("//") &&
      url.origin === "https://catchfire.run",
    "Scripts must be local, root-relative assets, including on invite pages",
  );
}
