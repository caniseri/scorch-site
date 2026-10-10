import "/reveal.mjs?v=20261010";

const header = document.querySelector("[data-header]");
const menu = document.querySelector(".menu-toggle");
const links = document.getElementById("site-links");
function closeMenu() {
  menu?.setAttribute("aria-expanded", "false");
  menu?.setAttribute("aria-label", "Open navigation");
  links?.classList.remove("is-open");
}
menu?.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
  links?.classList.toggle("is-open", open);
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menu?.getAttribute("aria-expanded") === "true"
  ) {
    closeMenu();
    menu.focus();
  }
});
links?.addEventListener("click", closeMenu);
document.querySelectorAll(".links a").forEach((link) => {
  if (link.getAttribute("href") === location.pathname)
    link.setAttribute("aria-current", "page");
});

// The header gains its hairline once the page scrolls.
function markScrolled() {
  header?.classList.toggle("is-scrolled", scrollY > 8);
}
addEventListener("scroll", markScrolled, { passive: true });
markScrolled();

// In-page indexes mark the section that holds the middle of the viewport.
for (const index of document.querySelectorAll("[data-index]")) {
  const anchors = [...index.querySelectorAll('a[href^="#"]')];
  const targets = anchors
    .map((anchor) => document.getElementById(anchor.hash.slice(1)))
    .filter(Boolean);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const anchor of anchors)
          anchor.setAttribute(
            "aria-current",
            String(anchor.hash === "#" + entry.target.id),
          );
      }
    },
    { rootMargin: "-45% 0px -54% 0px" },
  );
  targets.forEach((target) => observer.observe(target));
}

if (document.querySelector("[data-chapter]"))
  import("/progress.mjs?v=20261010");
if (document.querySelector("[data-stepper]")) import("/stepper.mjs?v=20261010");
if (document.querySelector("[data-beta-form]"))
  import("/beta-form.mjs?v=20261010");
