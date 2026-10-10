// Content below the fold rises 16px and fades in once. The hidden state is
// added here only, so with scripts off or reduced motion everything shows.
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduced && "IntersectionObserver" in window) {
  const STAGGER_MS = 40;
  const pending = [...document.querySelectorAll("[data-reveal]")].filter(
    (node) => node.getBoundingClientRect().top > innerHeight,
  );
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const node = entry.target;
        observer.unobserve(node);
        node.classList.add("is-revealing");
        requestAnimationFrame(() => node.classList.remove("is-pending"));
        node.addEventListener(
          "transitionend",
          () => {
            node.classList.remove("is-revealing");
            node.style.transitionDelay = "";
          },
          { once: true },
        );
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  for (const node of pending) {
    const group = node.parentElement?.closest("[data-reveal-group]");
    if (group) {
      const siblings = [...group.querySelectorAll("[data-reveal]")];
      const order = Math.min(siblings.indexOf(node), 2);
      node.style.transitionDelay = order * STAGGER_MS + "ms";
    }
    node.classList.add("is-pending");
    observer.observe(node);
  }
}
