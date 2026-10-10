// A screen that changes state: one frame at a time, with previous and next.
// Without scripts every frame stays visible with its own caption.
const arrow =
  '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#arrow-right" /></svg>';

for (const stepper of document.querySelectorAll("[data-stepper]")) {
  const frames = [...stepper.querySelectorAll(".stepper-frame")];
  if (frames.length < 2) continue;
  const controls = document.createElement("div");
  controls.className = "stepper-controls";
  controls.innerHTML = `<button class="icon-button stepper-prev" type="button" aria-label="Previous state">${arrow}</button>
    <span class="num" data-position aria-live="polite"></span>
    <button class="icon-button" type="button" aria-label="Next state">${arrow}</button>`;
  const [prev, next] = controls.querySelectorAll("button");
  const position = controls.querySelector("[data-position]");
  const stack = document.createElement("div");
  stack.className = "stepper-stack";
  frames.forEach((frame) => stack.append(frame));
  stepper.prepend(stack);
  stack.after(controls);
  let current = 0;
  function show(index) {
    current = index;
    frames.forEach((frame, i) => {
      frame.classList.toggle("is-active", i === index);
      frame.inert = i !== index;
      frame.setAttribute("aria-hidden", String(i !== index));
    });
    const label =
      frames[index]
        .querySelector("figcaption")
        ?.textContent.replace(/\s+/g, " ")
        .replace(/^\s*\d+ \/ \d+\s*/, "")
        .trim() || "";
    position.textContent = `${index + 1} / ${frames.length} · ${label}`;
    const focused = document.activeElement;
    prev.disabled = index === 0;
    next.disabled = index === frames.length - 1;
    // Keep keyboard focus on a usable control when one end is reached.
    if (focused === next && next.disabled) prev.focus();
    if (focused === prev && prev.disabled) next.focus();
  }
  prev.addEventListener("click", () => show(Math.max(0, current - 1)));
  next.addEventListener("click", () =>
    show(Math.min(frames.length - 1, current + 1)),
  );
  stepper.classList.add("is-stepping");
  show(0);
}
