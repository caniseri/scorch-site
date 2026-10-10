// Race day, step by step: on wide screens one sticky plate cross-fades to the
// step that reaches the middle of the viewport. Narrow screens and pages
// without scripts keep the stacked steps, each with its own plate.
const wide = matchMedia("(min-width: 1024px)");

for (const section of document.querySelectorAll("[data-sequence]")) {
  const steps = [...section.querySelectorAll(".sequence-step")];
  const stage = document.createElement("div");
  stage.className = "sequence-stage";
  stage.setAttribute("aria-hidden", "true");
  const frame = document.createElement("div");
  frame.className = "stage-frame";
  const images = steps.map((step) => {
    const source = step.querySelector("img");
    const image = source.cloneNode();
    image.alt = "";
    image.loading = "lazy";
    frame.append(image);
    return image;
  });
  const caption = section.querySelector(".sequence-caption");
  stage.append(frame);
  if (caption) stage.append(caption.cloneNode(true));
  section.querySelector(".grid").append(stage);

  function activate(index) {
    steps.forEach((step, i) => step.classList.toggle("is-active", i === index));
    images.forEach((image, i) =>
      image.classList.toggle("is-active", i === index),
    );
  }
  activate(0);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) activate(steps.indexOf(entry.target));
    },
    { rootMargin: "-50% 0px -50% 0px" },
  );
  function apply() {
    section.classList.toggle("is-staged", wide.matches);
    if (wide.matches) steps.forEach((step) => observer.observe(step));
    else observer.disconnect();
  }
  wide.addEventListener("change", apply);
  apply();
}
