import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "parse5";
import {
  advanceExample,
  createExample,
  createPlayback,
  distanceAt,
  durationLabel,
  exampleFrame,
} from "../race-demo-model.mjs";

test("both pages load the shared demo with an honest fallback and always-visible disclosure", async () => {
  for (const [page, mode] of [
    ["index.html", "compact"],
    ["demo/index.html", "full"],
  ]) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.ok(html.includes(`data-race-demo="${mode}"`));
    assert.match(html, /race-demo\.mjs\?v=/);
    assert.match(html, /race-demo\.css\?v=/);
    const walk = (node) => [node, ...(node.childNodes || []).flatMap(walk)];
    const fallback = walk(parse(html, { scriptingEnabled: false })).find(
      (node) => node.tagName === "noscript",
    );
    assert.ok(fallback, `${page}: missing no-script fallback`);
    assert.match(
      walk(fallback)
        .map((node) => node.value || "")
        .join(" "),
      /fictional/i,
    );
  }
  const css = await readFile(
    new URL("../race-demo.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.chase-scene \.example-note\s*\{\s*display: block/);
});

test("fair starts wait for their own offsets on a shared distance scale", () => {
  const race = createExample();
  assert.deepEqual(
    race.runners.map((runner) => runner.start),
    [0, 150, 300],
  );
  assert.equal(exampleFrame(race, 0).leader, "ava");
  assert.equal(distanceAt(race.runners[1], 149), 0);
  assert.equal(exampleFrame(race, 150).runners[1].waiting, false);
  assert.ok(distanceAt(race.runners[0], 150) > 0);
  assert.equal(distanceAt(race.runners[2], 299), 0);
});

test("only a pass of the leader transfers the flame, including retaking it", () => {
  const race = createExample();
  assert.deepEqual(
    race.changes.map((event) => [event.from, event.leader]),
    [
      ["ava", "ben"],
      ["ben", "ava"],
    ],
  );
  for (const event of race.changes) {
    assert.equal(exampleFrame(race, event.time - 0.25).leader, event.from);
    assert.equal(exampleFrame(race, event.time).leader, event.leader);
  }
  assert.equal(race.changes[1].comeback, true);
  const pass = race.events.find((event) => event.kind === "pass");
  assert.ok(pass);
  assert.equal(
    exampleFrame(race, pass.time - 0.25).leader,
    exampleFrame(race, pass.time).leader,
  );
  assert.match(pass.text, /keeps the flame/);
});

test("first across wins, not fastest individual run; others still finish", () => {
  const race = createExample();
  assert.equal(race.winner.id, "ava");
  assert.deepEqual(
    race.finishOrder.map((runner) => runner.id),
    ["ava", "cleo", "ben"],
  );
  assert.equal(race.finishOrder[1].finish - race.winner.finish, 3);
  assert.ok(race.runners[2].duration < race.winner.duration);
  const firstFinish = exampleFrame(race, race.winner.finish);
  assert.equal(firstFinish.complete, false);
  assert.equal(
    firstFinish.runners.filter((runner) => runner.finished).length,
    1,
  );
  assert.equal(exampleFrame(race, race.end).leader, "ava");
  assert.ok(
    exampleFrame(race, race.end).runners.every((runner) => runner.finished),
  );
});

test("same start begins together without assigning the flame to an arbitrary tied runner", () => {
  const race = createExample("same");
  assert.deepEqual(
    race.runners.map((runner) => runner.start),
    [0, 0, 0],
  );
  assert.equal(exampleFrame(race, 0).leader, null);
  assert.equal(exampleFrame(race, 0.25).leader, "cleo");
  assert.equal(race.winner.id, "cleo");
  assert.deepEqual(
    race.chapters.map((chapter) => chapter.label),
    ["Start", "Chase", "Finish"],
  );
});

test("all frames keep identities stable, positions bounded, and the leader physically in front", () => {
  for (const mode of ["fair", "same"]) {
    const race = createExample(mode);
    for (let time = 0; time < race.end + 20; time += 1) {
      const frame = exampleFrame(race, time);
      assert.deepEqual(
        frame.runners.map(({ id, color }) => ({ id, color })),
        race.runners.map(({ id, color }) => ({ id, color })),
      );
      assert.ok(
        frame.runners.every(
          (runner) => runner.distance >= 0 && runner.distance <= 5,
        ),
      );
      if (frame.leader && time < race.winner.finish) {
        const leader = frame.runners.find(
          (runner) => runner.id === frame.leader,
        );
        assert.equal(
          leader.distance,
          Math.max(...frame.runners.map((runner) => runner.distance)),
        );
      }
    }
    assert.equal(exampleFrame(race, -200).time, 0);
    assert.equal(exampleFrame(race, Infinity).time, race.end);
    assert.equal(exampleFrame(race, NaN).time, 0);
  }
});

test("chapters correspond to the visible story and elapsed labels cannot look like wall-clock times", () => {
  const race = createExample();
  assert.match(
    exampleFrame(race, race.chapters[2].time).caption,
    /Ben passes Ava/,
  );
  assert.match(
    exampleFrame(race, race.chapters[3].time).caption,
    /takes the flame back/,
  );
  assert.match(
    exampleFrame(race, race.chapters[4].time).caption,
    /Everyone finishes/,
  );
  assert.equal(durationLabel(1775), "29:35");
  assert.equal(durationLabel(-4), "0:00");
  assert.equal(advanceExample(race, 500, 600000), 510);
  assert.equal(advanceExample(race, 1050, 100), 1052);
  assert.equal(advanceExample(race, race.end, 100), race.end);
});

test("pause and completion cancel animation; resuming has no hidden-tab time jump", () => {
  const pending = new Map(),
    deltas = [],
    states = [];
  let id = 0,
    complete = false;
  const playback = createPlayback({
    requestFrame(callback) {
      pending.set(++id, callback);
      return id;
    },
    cancelFrame(key) {
      pending.delete(key);
    },
    step(delta) {
      deltas.push(delta);
      return complete;
    },
    onState(state) {
      states.push(state);
    },
  });
  function frame(now) {
    const [key, callback] = pending.entries().next().value;
    pending.delete(key);
    callback(now);
  }
  assert.equal(pending.size, 0);
  playback.play();
  playback.play();
  assert.equal(pending.size, 1);
  frame(100);
  frame(116);
  assert.deepEqual(deltas, [0, 16]);
  playback.pause();
  assert.equal(pending.size, 0);
  assert.equal(playback.playing, false);
  playback.play();
  frame(500000);
  assert.equal(deltas.at(-1), 0);
  complete = true;
  frame(500016);
  assert.equal(pending.size, 0);
  assert.equal(playback.playing, false);
  assert.equal(states.at(-1), false);
});
