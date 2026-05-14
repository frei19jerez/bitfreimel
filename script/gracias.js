// --- Script para la página de agradecimiento ---

// Evitar que este script afecte otras páginas
if (!location.pathname.includes("gracias.html")) {
  console.warn("⛔ gracias.js evitado fuera de la página de agradecimiento.");
  return;
}

console.log("🎉 Página de agradecimiento cargada correctamente.");

// Segundos antes de redirigir
let segundos = 7;

// Seleccionamos el link de volver al inicio SOLO en gracias.html
const link = document.querySelector('a[href="/"]');

// Guarda el texto original, si existe
const textoOriginal = link ? link.textContent : "Volver al inicio";

// Cuenta regresiva
const interval = setInterval(() => {
  segundos--;

  if (link) {
    link.textContent = `${textoOriginal} (${segundos}s)`;
  }

  if (segundos <= 0) {
    clearInterval(interval);
  }
}, 1000);

// Redirige automáticamente al inicio
setTimeout(() => {
  window.location.href = "/";
}, segundos * 1000);
