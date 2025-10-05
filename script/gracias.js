// --- Script para la página de agradecimiento ---

// Animación o efectos simples
console.log("✅ Página de agradecimiento cargada correctamente.");

// Redirige automáticamente al inicio después de unos segundos
setTimeout(() => {
  window.location.href = "/";
}, 7000); // 7 segundos

// (Opcional) Mostrar cuenta regresiva
const link = document.querySelector('a[href="/"]');
if (link) {
  let segundos = 7;
  const textoOriginal = link.textContent;
  const interval = setInterval(() => {
    segundos--;
    link.textContent = `${textoOriginal} (${segundos}s)`;
    if (segundos <= 0) clearInterval(interval);
  }, 1000);
}
