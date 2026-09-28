export const RACE_DURATION_SEC = 1500;
export function raceFrame(mode, seconds) {
  const elapsed = Math.max(
    0,
    Math.min(RACE_DURATION_SEC, Number(seconds) || 0),
  );
  const delay = mode === "same" ? 0 : 300;
  return {
    elapsed,
    steady: Math.min(1, elapsed / 1500),
    fast: Math.max(0, Math.min(1, (elapsed - delay) / 1200)),
    fastWaiting: elapsed < delay,
    complete: elapsed >= RACE_DURATION_SEC,
  };
}
export function exampleClock(seconds) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `8:${String(minutes).padStart(2, "0")} AM`;
}
function mount(root) {
  let mode = "fair";
  let elapsed = 0;
  let playing = false;
  let lastFrame = null;
  let animation = 0;
  const play = root.querySelector("[data-play]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const outcome = root.querySelector("[data-outcome]");
  function setPlaying(value) {
    playing = value;
    lastFrame = null;
    play.setAttribute(
      "aria-label",
      value ? "Pause race example" : "Play race example",
    );
    play.title = play.getAttribute("aria-label");
    play
      .querySelector("use")
      .setAttribute("href", `/assets/icons.svg#${value ? "pause" : "play"}`);
    cancelAnimationFrame(animation);
    if (playing) animation = requestAnimationFrame(tick);
  }
  function render() {
    const frame = raceFrame(mode, elapsed);
    for (const runner of ["steady", "fast"]) {
      root.querySelector(`[data-runner="${runner}"]`).style.left =
        `${frame[runner] * 100}%`;
      root.querySelector(`[data-fill="${runner}"]`).style.width =
        `${frame[runner] * 100}%`;
      root.querySelector(`[data-distance="${runner}"]`).textContent =
        `${(frame[runner] * 5).toFixed(2)} km`;
      root.querySelector(`[data-state="${runner}"]`).textContent =
        frame[runner] >= 1
          ? "Finished"
          : runner === "fast" && frame.fastWaiting
            ? "Waiting at the start"
            : frame[runner] === 0
              ? "Ready at the start"
              : "On the course";
    }
    root.querySelector("[data-clock]").textContent = exampleClock(elapsed);
    const message = frame.complete
      ? mode === "fair"
        ? "Same expected finish. The actual race is yours."
        : "Same start. The faster example finishes first."
      : mode === "fair"
        ? "A 5-minute head start. No shortcut."
        : "No head starts. First across wins.";
    if (outcome.textContent !== message) outcome.textContent = message;
  }
  function tick(now) {
    if (!playing) return;
    if (lastFrame !== null)
      elapsed = Math.min(
        RACE_DURATION_SEC,
        elapsed + (Math.min(100, now - lastFrame) / 1000) * 75,
      );
    lastFrame = now;
    render();
    if (elapsed >= RACE_DURATION_SEC) setPlaying(false);
    else animation = requestAnimationFrame(tick);
  }
  function choose(next) {
    mode = next;
    elapsed = 0;
    setPlaying(false);
    root
      .querySelectorAll("[data-mode]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.mode === mode),
        ),
      );
    root.querySelector('[data-start="fast"]').textContent =
      mode === "fair" ? "8:05 AM" : "8:00 AM";
    root.querySelector("#demo-title").textContent =
      mode === "fair"
        ? "Different paces. A shared finish."
        : "One start. All out.";
    root.querySelector("#demo-explanation").textContent =
      mode === "fair"
        ? "The steadier runner starts first. The faster runner waits, then chases."
        : "Both runners start together. Pace does not change your start time.";
    root
      .querySelector(".course")
      .setAttribute(
        "aria-label",
        mode === "fair"
          ? "Example five-kilometre race. Steady starts at 8:00 AM and Faster at 8:05 AM. Both are predicted to finish at 8:25 AM."
          : "Example five-kilometre race. Both start at 8:00 AM. Faster finishes at 8:20 AM and Steady at 8:25 AM.",
      );
    render();
  }
  play.addEventListener("click", () => {
    if (elapsed >= RACE_DURATION_SEC) elapsed = 0;
    setPlaying(!playing);
    render();
  });
  root.querySelector("[data-replay]").addEventListener("click", () => {
    elapsed = 0;
    render();
    setPlaying(!reduced.matches);
  });
  root
    .querySelectorAll("[data-mode]")
    .forEach((button) =>
      button.addEventListener("click", () => choose(button.dataset.mode)),
    );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setPlaying(false);
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) setPlaying(false);
  });
  // Animate only once, only when the example is actually visible.
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        if (!reduced.matches && elapsed === 0) setPlaying(true);
      }
    },
    { threshold: 0.55 },
  );
  observer.observe(root);
  choose(mode);
}
if (typeof document !== "undefined")
  document.querySelectorAll("[data-race-demo]").forEach(mount);
