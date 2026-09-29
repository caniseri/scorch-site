import {
  COURSE_KM,
  advanceExample,
  createExample,
  createPlayback,
  durationLabel,
  exampleFrame,
} from "./race-demo-model.mjs";

function mount(root) {
  const detailed = root.dataset.raceDemo === "full";
  const scene = root.querySelector("[data-chase-scene]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let example = createExample(),
    seconds = 0,
    visible = false,
    autoPlayed = false;
  let lastLeader = null,
    transfer = null,
    nodes = [];
  const icon = (name) =>
    `<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#${name}" /></svg>`;
  scene.innerHTML = `
    <div class="chase-status"><span class="chase-clock"><span>Since first start</span><b data-clock>0:00</b></span>
      <span class="chase-key"><img src="/assets/mark.png" width="20" height="20" alt="" />In front</span></div>
    <svg class="chase-course" role="img" aria-label="Fictional runners on the same five-kilometre route"></svg>
    <p class="chase-caption" data-outcome aria-live="polite" aria-atomic="true"></p>
    <div class="chase-controls"><div class="transport">
      <button class="icon-button" data-play aria-label="Play race example" title="Play race example">${icon("play")}</button>
      <button class="icon-button" data-replay aria-label="Replay race example" title="Replay race example">${icon("rotate-ccw")}</button>
      <span class="chase-time-note">Time compressed</span></div>
      ${
        detailed
          ? '<div class="chase-chapters" role="group" aria-label="Race moments"></div>'
          : '<a class="text-link" href="/demo/#flame-chase">Explore the chase ' +
            icon("arrow-right") +
            "</a>"
      }</div>
    ${detailed ? '<div class="chase-results"><table><caption>Example finish order</caption><thead><tr><th scope="col">Place</th><th scope="col">Runner</th><th scope="col">Run time</th><th scope="col">Finish gap</th></tr></thead><tbody></tbody></table><p class="fine">Run time starts at each runner\'s own start. Finish gap is measured behind the winner.</p></div>' : ""}
    <p class="example-note">Illustrative race. Fictional runners. The flame explains the lead; it is not live app tracking.</p>`;
  const svg = scene.querySelector(".chase-course"),
    caption = scene.querySelector("[data-outcome]");
  const playButton = scene.querySelector("[data-play]"),
    clock = scene.querySelector("[data-clock]");
  const NS = "http://www.w3.org/2000/svg";
  function element(tag, attrs, parent = svg, text) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs))
      node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }
  let geometry, flame;
  function build() {
    const width = Math.round(svg.getBoundingClientRect().width);
    if (!width) return;
    const narrow = width < 520;
    geometry = { x0: narrow ? 66 : 90, x1: width - 28, y0: 70, lane: 64 };
    svg.setAttribute("viewBox", `0 0 ${width} 228`);
    svg.replaceChildren();
    for (let km = 0; km <= COURSE_KM; km += 1) {
      const x = xAt(km);
      element("line", {
        x1: x,
        x2: x,
        y1: 36,
        y2: 212,
        class: km === COURSE_KM ? "chase-finish" : "chase-grid",
      });
      element(
        "text",
        {
          x,
          y: 17,
          "text-anchor":
            km === 0 ? "start" : km === COURSE_KM ? "end" : "middle",
          class: "chase-axis",
        },
        svg,
        km === 0
          ? "Start"
          : km === COURSE_KM
            ? "Finish"
            : narrow
              ? String(km)
              : `${km} km`,
      );
      if (km === 0 || km === COURSE_KM)
        element(
          "text",
          {
            x,
            y: 32,
            "text-anchor": km === 0 ? "start" : "end",
            class: "chase-axis",
          },
          svg,
          `${km} km`,
        );
    }
    nodes = example.runners.map((runner, index) => {
      const y = geometry.y0 + index * geometry.lane;
      element(
        "text",
        { x: 0, y: y + 4, class: "chase-name", fill: runner.color },
        svg,
        runner.name,
      );
      element("line", {
        x1: geometry.x0,
        x2: geometry.x1,
        y1: y,
        y2: y,
        class: "chase-rail",
      });
      const trail = element("line", {
        x1: geometry.x0,
        x2: geometry.x0,
        y1: y,
        y2: y,
        stroke: runner.color,
        class: "chase-trail",
      });
      const group = element("g", {});
      const dot = element(
        "circle",
        { r: 12, fill: runner.color, stroke: runner.color, "stroke-width": 2 },
        group,
      );
      const initial = element(
        "text",
        { "text-anchor": "middle", y: 4, class: "chase-initial" },
        group,
        runner.name[0],
      );
      const wait = element("text", { x: 18, y: 4, class: "chase-wait" }, group);
      return { trail, group, dot, initial, wait, y };
    });
    flame = element("g", { "aria-hidden": "true" });
    element(
      "circle",
      { r: 17, fill: "none", stroke: "var(--ember)", "stroke-width": 2 },
      flame,
    );
    element(
      "image",
      { href: "/assets/mark.png", x: -11, y: -41, width: 22, height: 22 },
      flame,
    );
    lastLeader = null;
    render(false);
  }
  function xAt(distance) {
    return geometry.x0 + (distance / COURSE_KM) * (geometry.x1 - geometry.x0);
  }
  function render(animate) {
    if (!geometry) return;
    const frame = exampleFrame(example, seconds);
    clock.textContent = durationLabel(seconds);
    if (caption.textContent !== frame.caption) {
      caption.textContent = frame.caption;
      svg.setAttribute(
        "aria-label",
        `Five-kilometre example race. ${frame.caption}`,
      );
    }
    frame.runners.forEach((runner, index) => {
      const node = nodes[index],
        x = xAt(runner.distance);
      node.group.setAttribute("transform", `translate(${x},${node.y})`);
      node.trail.setAttribute("x2", x);
      node.dot.setAttribute(
        "fill",
        runner.waiting ? "var(--bg)" : runner.color,
      );
      node.dot.setAttribute(
        "stroke-dasharray",
        runner.waiting ? "3 3" : "none",
      );
      node.initial.style.fill = runner.waiting ? runner.color : "var(--bg)";
      node.wait.textContent = runner.waiting
        ? `in ${durationLabel(runner.start - seconds)}`
        : "";
    });
    const leaderIndex = frame.runners.findIndex(
      (runner) => runner.id === frame.leader,
    );
    flame.style.display = leaderIndex < 0 ? "none" : "";
    if (leaderIndex >= 0) {
      flame.setAttribute(
        "transform",
        `translate(${xAt(frame.runners[leaderIndex].distance)},${nodes[leaderIndex].y})`,
      );
      if (
        lastLeader &&
        lastLeader !== frame.leader &&
        animate &&
        !reduced.matches
      ) {
        transfer?.cancel();
        transfer = flame.animate([{ opacity: 0.25 }, { opacity: 1 }], {
          duration: 320,
          easing: "ease-out",
        });
      }
    }
    lastLeader = frame.leader;
    if (detailed) {
      const active = example.chapters.findLast(
        (chapter) => chapter.time <= seconds,
      );
      scene
        .querySelectorAll("[data-moment]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(button.textContent === active.label),
          ),
        );
      for (const row of scene.querySelectorAll("tbody tr")) {
        const runner = example.runners.find(
          (item) => item.id === row.dataset.runner,
        );
        const finished = seconds >= runner.finish;
        row.cells[0].textContent = finished
          ? String(example.finishOrder.indexOf(runner) + 1)
          : "-";
        row.cells[2].textContent = finished
          ? durationLabel(runner.duration)
          : "-";
        row.cells[3].textContent = !finished
          ? "Racing"
          : runner.id === example.winner.id
            ? "Winner"
            : `+${durationLabel(runner.finish - example.winner.finish)}`;
        if (seconds < runner.start) row.cells[3].textContent = "Waiting";
        if (seconds === 0)
          row.cells[3].textContent = runner.start ? "Waiting" : "Ready";
      }
      const body = scene.querySelector("tbody");
      const order = frame.complete ? example.finishOrder : example.runners;
      if (body.dataset.order !== (frame.complete ? "finish" : "start")) {
        for (const runner of order)
          body.append(body.querySelector(`[data-runner="${runner.id}"]`));
        body.dataset.order = frame.complete ? "finish" : "start";
      }
    }
  }
  const playback = createPlayback({
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
    step(delta) {
      seconds = advanceExample(example, seconds, delta);
      render(true);
      return seconds >= example.end;
    },
    onState(playing) {
      const label = playing ? "Pause race example" : "Play race example";
      playButton.setAttribute("aria-label", label);
      playButton.title = label;
      playButton
        .querySelector("use")
        .setAttribute(
          "href",
          `/assets/icons.svg#${playing ? "pause" : "play"}`,
        );
      if (!playing) transfer?.cancel();
    },
  });
  function seek(time) {
    playback.pause();
    seconds = time;
    render(false);
  }
  function choose(mode) {
    playback.pause();
    example = createExample(mode);
    seconds = 0;
    root
      .querySelectorAll("[data-mode]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.mode === mode),
        ),
      );
    root.querySelector("[data-explanation]").textContent =
      mode === "same"
        ? "Everyone starts together. Same route. First across wins."
        : "Your pace sets your start. Same route. First across wins.";
    if (detailed) {
      const chapters = scene.querySelector(".chase-chapters");
      chapters.replaceChildren();
      for (const chapter of example.chapters) {
        const button = document.createElement("button");
        button.dataset.moment = "";
        button.textContent = chapter.label;
        button.addEventListener("click", () => seek(chapter.time));
        chapters.append(button);
      }
      scene.querySelector("tbody").innerHTML = example.runners
        .map(
          (runner) =>
            `<tr data-runner="${runner.id}"><td></td><th scope="row"><span style="color:${runner.color}">${runner.name}</span></th><td></td><td></td></tr>`,
        )
        .join("");
      scene.querySelector("tbody").dataset.order = "start";
    }
    build();
  }
  root.querySelectorAll("[data-mode]").forEach((button) =>
    button.addEventListener("click", () => {
      autoPlayed = true;
      choose(button.dataset.mode);
    }),
  );
  playButton.addEventListener("click", () => {
    autoPlayed = true;
    if (playback.playing) playback.pause();
    else {
      if (seconds >= example.end) seek(0);
      playback.play();
    }
  });
  scene.querySelector("[data-replay]").addEventListener("click", () => {
    autoPlayed = true;
    seek(0);
    if (!reduced.matches) playback.play();
  });
  function autoPlay() {
    if (visible && !document.hidden && !reduced.matches && !autoPlayed) {
      autoPlayed = true;
      playback.play();
    }
  }
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (!visible) playback.pause();
      else autoPlay();
    },
    { threshold: 0.4 },
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) playback.pause();
    else autoPlay();
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) playback.pause();
  });
  const resize = new ResizeObserver(() => {
    transfer?.cancel();
    build();
  });
  choose("fair");
  observer.observe(svg);
  resize.observe(svg);
}

if (typeof document !== "undefined")
  document.querySelectorAll("[data-race-demo]").forEach(mount);
