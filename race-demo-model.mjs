export const COURSE_KM = 5;
const EXAMPLE_RUNNERS = [
  {
    id: "ava",
    name: "Ava",
    color: "#7cc7de",
    pace: 360,
    splits: [365, 372, 375, 345, 318],
  },
  {
    id: "ben",
    name: "Ben",
    color: "#b6a8e4",
    pace: 330,
    splits: [316, 318, 320, 362, 335],
  },
  {
    id: "cleo",
    name: "Cleo",
    color: "#89c9a5",
    pace: 300,
    splits: [300, 298, 296, 294, 290],
  },
];

export function durationLabel(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export function distanceAt(runner, seconds) {
  let elapsed = Math.max(0, seconds - runner.start);
  let distance = 0;
  for (const split of runner.splits) {
    if (elapsed <= split) return distance + elapsed / split;
    elapsed -= split;
    distance += 1;
  }
  return COURSE_KM;
}

export function createExample(mode = "fair") {
  const referencePace = Math.max(
    ...EXAMPLE_RUNNERS.map((runner) => runner.pace),
  );
  const runners = EXAMPLE_RUNNERS.map((runner) => {
    const start =
      mode === "same" ? 0 : (referencePace - runner.pace) * COURSE_KM;
    const duration = runner.splits.reduce((sum, split) => sum + split, 0);
    return {
      ...runner,
      splits: [...runner.splits],
      start,
      duration,
      finish: start + duration,
    };
  });
  const finishOrder = [...runners].sort((a, b) => a.finish - b.finish);
  const winner = finishOrder[0];
  const first = mode === "same" ? null : runners[0];
  const events = [
    {
      time: 0,
      leader: first?.id ?? null,
      kind: "start",
      text:
        mode === "same"
          ? "One start for everyone. First across the line wins."
          : "Ava starts first. Ben and Cleo wait for their own starts.",
    },
  ];
  for (const runner of runners.filter((item) => item.start > 0)) {
    events.push({
      time: runner.start,
      kind: "start",
      text: `${runner.name} starts ${durationLabel(runner.start)} after Ava. The chase is on.`,
    });
  }
  const changes = [];
  const held = new Set(first ? [first.id] : []);
  let leader = first;
  let previousOrder = [];
  // This fictional replay has exact splits, not noisy or delayed GPS data.
  // Sample only until the first finish, then keep the flame with the winner.
  for (let time = 0.25; time <= winner.finish; time += 0.25) {
    const order = runners
      .filter((runner) => time > runner.start)
      .sort((a, b) => distanceAt(b, time) - distanceAt(a, time));
    const candidate = order[0];
    if (
      candidate &&
      candidate.id !== leader?.id &&
      (!leader || distanceAt(candidate, time) > distanceAt(leader, time))
    ) {
      const comeback = held.has(candidate.id);
      const event = {
        time,
        leader: candidate.id,
        from: leader?.id ?? null,
        kind: "lead",
        comeback,
        text: leader
          ? `${candidate.name} passes ${leader.name} and ${comeback ? "takes the flame back" : "takes the flame"}.`
          : `${candidate.name} takes the lead. The flame marks who's in front.`,
      };
      events.push(event);
      changes.push(event);
      held.add(candidate.id);
      leader = candidate;
    }
    for (let i = 1; i < order.length; i += 1) {
      for (let j = i + 1; j < order.length; j += 1) {
        const a = previousOrder.indexOf(order[i].id),
          b = previousOrder.indexOf(order[j].id);
        if (a >= 0 && b >= 0 && a > b)
          events.push({
            time,
            kind: "pass",
            text: `${order[i].name} passes ${order[j].name}. ${leader.name} stays in front and keeps the flame.`,
          });
      }
    }
    previousOrder = order.map((runner) => runner.id);
  }
  events.push({
    time: 660,
    kind: "chase",
    text:
      mode === "same"
        ? "Same start, same route. Everyone is still in the race."
        : "The gaps are closing. A head start is not a shortcut.",
  });
  finishOrder.forEach((runner, index) =>
    events.push({
      time: runner.finish,
      kind: "finish",
      text:
        index === 0
          ? `${runner.name} crosses first and wins. The others keep racing.`
          : index === runners.length - 1
            ? `Everyone finishes. ${winner.name} wins${mode === "fair" ? ` by ${durationLabel(finishOrder[1].finish - winner.finish)}` : ""}.`
            : `${runner.name} finishes ${durationLabel(runner.finish - winner.finish)} behind ${winner.name}.`,
    }),
  );
  events.sort((a, b) => a.time - b.time);
  const end = Math.max(...runners.map((runner) => runner.finish));
  const chapters = [
    { label: "Start", time: 0 },
    { label: "Chase", time: 750 },
  ];
  const takeover = changes.find((event) => event.from);
  const comeback = changes.find((event) => event.comeback);
  if (takeover)
    chapters.push({ label: "Lead change", time: takeover.time + 3 });
  if (comeback) chapters.push({ label: "Comeback", time: comeback.time + 3 });
  chapters.push({ label: "Finish", time: end });
  return {
    mode,
    runners,
    winner,
    finishOrder,
    first,
    events,
    changes,
    chapters,
    end,
  };
}

export function exampleFrame(example, seconds) {
  const time = Math.max(0, Math.min(example.end, Number(seconds) || 0));
  const event = example.events.findLast((item) => item.time <= time);
  const change = example.changes.findLast((item) => item.time <= time);
  const leader =
    time >= example.winner.finish
      ? example.winner.id
      : (change?.leader ?? example.first?.id ?? null);
  return {
    time,
    leader,
    caption: event.text,
    complete: time >= example.end,
    runners: example.runners.map((runner) => ({
      ...runner,
      distance: distanceAt(runner, time),
      waiting: time < runner.start,
      finished: time >= runner.finish,
    })),
  };
}

export function advanceExample(example, seconds, deltaMs) {
  // A delayed animation frame must never skip a whole chapter or the finish.
  const delta = Math.max(0, Math.min(100, Number(deltaMs) || 0)) / 1000;
  const nearEvent = example.events.some(
    (event) =>
      ["lead", "pass", "finish"].includes(event.kind) &&
      seconds >= event.time - 20 &&
      seconds < event.time + 8,
  );
  return Math.min(example.end, seconds + delta * (nearEvent ? 20 : 100));
}

export function createPlayback({ requestFrame, cancelFrame, step, onState }) {
  let active = false,
    request = null,
    previous = null;
  function stop() {
    active = false;
    previous = null;
    if (request !== null) cancelFrame(request);
    request = null;
    onState(false);
  }
  function tick(now) {
    request = null;
    if (!active) return;
    const complete = step(previous === null ? 0 : now - previous);
    previous = now;
    if (complete) stop();
    else if (active) request = requestFrame(tick);
  }
  return {
    get playing() {
      return active;
    },
    play() {
      if (active) return;
      active = true;
      previous = null;
      onState(true);
      request = requestFrame(tick);
    },
    pause: stop,
  };
}
