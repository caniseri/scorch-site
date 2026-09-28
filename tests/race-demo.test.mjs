import test from "node:test";
import assert from "node:assert/strict";
import { raceFrame, exampleClock } from "../race-demo.mjs";

test("fair start waits, chases and reaches the same expected finish", () => {
  assert.deepEqual(raceFrame("fair", 0), {
    elapsed: 0,
    steady: 0,
    fast: 0,
    fastWaiting: true,
    complete: false,
  });
  assert.equal(raceFrame("fair", 299).fast, 0);
  assert.equal(raceFrame("fair", 300).steady, 0.2);
  assert.equal(raceFrame("fair", 300).fastWaiting, false);
  assert.ok(raceFrame("fair", 1200).steady > raceFrame("fair", 1200).fast);
  assert.equal(raceFrame("fair", 1500).steady, 1);
  assert.equal(raceFrame("fair", 1500).fast, 1);
});
test("same start begins together but faster example finishes first", () => {
  assert.equal(raceFrame("same", 0).fastWaiting, false);
  assert.equal(raceFrame("same", 1200).fast, 1);
  assert.equal(raceFrame("same", 1200).steady, 0.8);
  assert.equal(raceFrame("same", 1500).complete, true);
});
test("progress never escapes the route and clock labels are wall-clock times", () => {
  assert.equal(raceFrame("fair", -20).steady, 0);
  assert.equal(raceFrame("same", 99999).fast, 1);
  assert.equal(exampleClock(0), "8:00 AM");
  assert.equal(exampleClock(300), "8:05 AM");
  assert.equal(exampleClock(1500), "8:25 AM");
});
