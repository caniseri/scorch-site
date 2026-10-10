import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

// Optional local tool: PLAYWRIGHT_MODULE may point at an existing installation.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const port = process.env.PORT || "4217";
const root = new URL("../", import.meta.url).pathname;
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: port },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
try {
  await new Promise((ready, reject) => {
    server.stdout.once("data", ready);
    server.once("error", reject);
    server.once("exit", (code) => reject(new Error(`Preview exited: ${code}`)));
  });
  browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  });
  const output = resolve(root, "docs/beta-signup/screenshots");
  mkdirSync(output, { recursive: true });
  const errors = [];
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    let mode = "sending";
    let release;
    let requests = 0;
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "127.0.0.1") return route.continue();
      if (url.pathname === "/functions/v1/public-beta-request") {
        requests++;
        assert.equal(route.request().method(), "POST");
        const body = route.request().postDataJSON();
        assert.equal(body.email, "runner@example.invalid");
        if (mode === "sending")
          await new Promise((resolveRequest) => {
            release = resolveRequest;
          });
        return route.fulfill({
          status: mode === "error" ? 503 : 204,
          headers: {
            "Access-Control-Allow-Origin": `http://127.0.0.1:${port}`,
          },
          body: "",
        });
      }
      throw new Error(`Unexpected external request: ${url.origin}`);
    });
    await page.goto(`http://127.0.0.1:${port}/#beta`);
    const form = page.locator("[data-beta-form]");
    await form.waitFor({ state: "visible" });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const capture = async (state) => {
      const height = await page
        .locator("#beta")
        .evaluate((element) => element.getBoundingClientRect().height);
      await page.setViewportSize({ width, height: Math.ceil(height) + 160 });
      await page.evaluate(() =>
        window.scrollTo(
          0,
          document.querySelector("#beta").getBoundingClientRect().top +
            scrollY -
            100,
        ),
      );
      await page.locator("#beta").screenshot({
        path: resolve(output, `${width}-${state}.png`),
        animations: "disabled",
      });
      await page.setViewportSize({ width, height: 1000 });
    };
    await capture("idle");
    await form.getByRole("button", { name: "Request access" }).click();
    assert.equal(
      await page.locator("#beta-email").getAttribute("aria-invalid"),
      "true",
    );
    assert.equal(requests, 0);
    assert.equal(
      await page
        .locator("#beta-email")
        .evaluate((element) => element === document.activeElement),
      true,
    );
    await page.locator("#beta-email").fill("runner@example.invalid");
    const ios = form.locator('input[value="ios"]');
    await ios.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await form.locator('input[value="android"]').isChecked(),
      true,
    );
    await page.keyboard.press("ArrowLeft");
    assert.equal(await ios.isChecked(), true);
    await page.locator("#beta-city").fill("Boston");
    await page.locator("#beta-intent").selectOption("solo");
    await page.locator("#beta-email").focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        document.querySelector("[data-beta-form]").dataset.state === "sending",
    );
    await page.waitForFunction(
      () =>
        document.querySelector("[data-beta-form]").getAttribute("aria-busy") ===
        "true",
    );
    await capture("sending");
    assert.equal(await form.getByRole("button").isDisabled(), true);
    await form.evaluate((element) =>
      element.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
    assert.equal(requests, 1);
    release();
    await page.waitForFunction(
      () => document.querySelector("[data-beta-form]").dataset.state === "sent",
    );
    assert.match(
      await form.locator("[data-beta-status]").textContent(),
      /Thanks/,
    );
    assert.equal(
      await form
        .locator("[data-beta-status]")
        .evaluate((element) => element === document.activeElement),
      true,
    );
    await capture("sent");
    await page.reload();
    await form.waitFor({ state: "visible" });
    mode = "error";
    await page.locator("#beta-email").fill("runner@example.invalid");
    await form.getByText("Android", { exact: true }).click();
    await form.getByRole("button", { name: "Request access" }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-beta-form]").dataset.state === "error",
    );
    assert.equal(await form.getByRole("button").isDisabled(), false);
    assert.equal(
      await form
        .locator("[data-beta-status]")
        .evaluate((element) => element === document.activeElement),
      true,
    );
    assert.equal(
      await page.locator("#beta-email").inputValue(),
      "runner@example.invalid",
    );
    assert.equal(
      await form
        .getByRole("link", { name: "Email support@catchfire.run instead." })
        .getAttribute("href"),
      "mailto:support@catchfire.run",
    );
    await capture("error");
    mode = "success";
    await form.getByRole("button", { name: "Request access" }).click();
    await page.waitForFunction(
      () => document.querySelector("[data-beta-form]").dataset.state === "sent",
    );
    await context.close();
  }
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/#beta`);
  assert.equal(await page.locator("[data-beta-form]").isVisible(), false);
  assert.equal(
    await page.getByRole("link", { name: "Request iPhone access" }).isVisible(),
    true,
  );
  assert.equal(
    await page
      .getByRole("link", { name: "Request Android access" })
      .isVisible(),
    true,
  );
  assert.deepEqual(errors, []);
  const failedModule = await browser.newContext({
    viewport: { width: 320, height: 667 },
  });
  const fallbackPage = await failedModule.newPage();
  await fallbackPage.route("**/beta-form.mjs*", (route) => route.abort());
  await fallbackPage.goto(`http://127.0.0.1:${port}/#beta`);
  assert.equal(
    await fallbackPage.locator("[data-beta-form]").isVisible(),
    false,
  );
  assert.equal(
    await fallbackPage
      .getByRole("link", { name: "Request iPhone access" })
      .isVisible(),
    true,
  );
  console.log(
    "PASS: 12 screenshots; field errors, no overflow, keyboard radios/Enter, focus, duplicate prevention, error retry, no-JS and failed-module fallback. All network submissions intercepted; no live requests.",
  );
} finally {
  await browser?.close();
  if (server.pid && server.exitCode === null && server.signalCode === null) {
    const exited = new Promise((resolveExit) =>
      server.once("exit", resolveExit),
    );
    server.kill("SIGTERM");
    await exited;
  }
}
