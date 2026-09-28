// One-time vendoring from the app's installed, licensed Lucide package.
import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";
import path from "node:path";
const source = process.argv[2];
if (!source)
  throw new Error("Pass the installed lucide-react-native package directory.");
const names = [
  "footprints",
  "users-round",
  "flag",
  "arrow-up-right",
  "arrow-right",
  "play",
  "pause",
  "rotate-ccw",
  "menu",
  "x",
  "check",
  "timer",
  "route",
  "target",
  "swords",
  "calendar-plus",
  "download",
  "smartphone",
  "shield-check",
  "chevron-down",
];
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
const symbols = [];
for (const name of names) {
  const code = await readFile(
    path.join(source, "dist/cjs/icons", `${name}.js`),
    "utf8",
  );
  const sandbox = {
    module: { exports: null },
    require: () => (_name, nodes) => nodes,
  };
  vm.runInNewContext(code, sandbox);
  const nodes = sandbox.module.exports;
  symbols.push(
    `<symbol id="${name}" viewBox="0 0 24 24">${nodes
      .map(
        ([tag, attrs]) =>
          `<${tag} ${Object.entries(attrs)
            .filter(([key]) => key !== "key")
            .map(([key, value]) => `${key}="${escape(value)}"`)
            .join(" ")}/>`,
      )
      .join("")}</symbol>`,
  );
}
await writeFile(
  new URL("../assets/icons.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("\n")}</svg>\n`,
);
await writeFile(
  new URL("../assets/LUCIDE-LICENSE.txt", import.meta.url),
  await readFile(path.join(source, "LICENSE")),
);
