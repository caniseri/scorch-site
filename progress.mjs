// Course ruler as page progress: each chapter of the page is a marker on a
// 0K-5K ruler fixed to the bottom of wide screens. The marker follows the
// scroll; each chapter marker is a link. Narrow screens keep their own index.
const chapters = [...document.querySelectorAll("[data-chapter][id]")];
const wide = matchMedia("(min-width: 1024px)");

if (chapters.length > 2) {
  const TICKS =
    "M0 0V8M20 0V4M40 0V4M60 0V4M80 0V4M100 0V8M120 0V4M140 0V4M160 0V4M180 0V4M200 0V8M220 0V4M240 0V4M260 0V4M280 0V4M300 0V8M320 0V4M340 0V4M360 0V4M380 0V4M400 0V8M420 0V4M440 0V4M460 0V4M480 0V4M500 0V8";
  const nav = document.createElement("nav");
  nav.className = "progress";
  nav.setAttribute("aria-label", "Page progress");
  nav.innerHTML = `<p class="progress-now" aria-hidden="true"><span class="num" data-count></span><span data-name></span></p>
    <div class="progress-track"><span class="progress-end">0K</span>
      <div class="progress-rail"><svg viewBox="0 0 500 8" preserveAspectRatio="none" aria-hidden="true"><path d="${TICKS}" /></svg>
        <span class="progress-fill" data-fill></span><ol></ol></div>
      <span class="progress-end">5K</span></div>`;
  const list = nav.querySelector("ol");
  const links = chapters.map((chapter, index) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + chapter.id;
    link.setAttribute(
      "aria-label",
      `${index + 1} of ${chapters.length}: ${chapter.dataset.chapter}`,
    );
    link.title = chapter.dataset.chapter;
    item.append(link);
    list.append(item);
    return link;
  });
  document.body.append(nav);
  const fill = nav.querySelector("[data-fill]");
  const count = nav.querySelector("[data-count]");
  const name = nav.querySelector("[data-name]");
  const footer = document.querySelector(".footer");
  let footerVisible = false;

  function place() {
    const max = document.documentElement.scrollHeight - innerHeight;
    chapters.forEach((chapter, index) => {
      const top = chapter.getBoundingClientRect().top + scrollY;
      links[index].parentElement.style.left =
        `${Math.min(100, (top / max) * 100)}%`;
    });
  }
  function update() {
    const max = document.documentElement.scrollHeight - innerHeight;
    fill.style.width = `${Math.min(100, Math.max(0, (scrollY / max) * 100))}%`;
    const middle = scrollY + innerHeight * 0.4;
    let active = 0;
    chapters.forEach((chapter, index) => {
      if (chapter.getBoundingClientRect().top + scrollY <= middle)
        active = index;
    });
    links.forEach((link, index) =>
      index === active
        ? link.setAttribute("aria-current", "true")
        : link.removeAttribute("aria-current"),
    );
    count.textContent = `${String(active + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;
    name.textContent = chapters[active].dataset.chapter;
  }
  function apply() {
    const on = wide.matches && !footerVisible;
    nav.classList.toggle("is-on", on);
    document.body.classList.toggle("has-progress", wide.matches);
  }
  let frame = 0;
  addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  new ResizeObserver(() => {
    place();
    update();
  }).observe(document.body);
  if (footer)
    new IntersectionObserver((entries) => {
      footerVisible = entries[0].isIntersecting;
      apply();
    }).observe(footer);
  wide.addEventListener("change", apply);
  place();
  update();
  apply();
}
