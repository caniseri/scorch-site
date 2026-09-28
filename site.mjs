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
