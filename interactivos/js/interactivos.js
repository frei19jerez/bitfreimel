// ============================
// Zona Interactiva - Freimel Jerez
// Archivo: /interactivos/interactivos.js
// ============================

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("hamburger");
  const menu = document.getElementById("nav-links");

  if (!btn || !menu) return;

  // Abrir menú
  const openMenu = () => {
    menu.classList.add("open");
    btn.classList.add("is-active");
    btn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden"; // bloquea scroll en móvil
  };

  // Cerrar menú
  const closeMenu = () => {
    menu.classList.remove("open");
    btn.classList.remove("is-active");
    btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  // Toggle
  btn.addEventListener("click", () => {
    menu.classList.contains("open") ? closeMenu() : openMenu();
  });

  // Cerrar al hacer clic en un enlace
  menu.addEventListener("click", (e) => {
    if (e.target.tagName === "A") closeMenu();
  });

  // Cerrar con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Reset en desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) closeMenu();
  });

  // ===== Año dinámico en el footer =====
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
