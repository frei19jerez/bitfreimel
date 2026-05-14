// --- Instalación de la PWA (versión optimizada) ---
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
const mensajeExito = document.getElementById('mensajeExito');

// Detectar si ya está instalada
window.addEventListener('load', () => {
  const pwaInstalada = localStorage.getItem('pwa_instalada') === 'true';
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone;

  if (pwaInstalada || isStandalone) {
    if (installBtn) installBtn.style.display = 'none';
    if (mensajeExito) mensajeExito.classList.add('oculto');
  }
});

// Esperar al navegador para permitir instalación
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (installBtn) {
    installBtn.style.display = 'inline-block';
    installBtn.classList.add('show-install');
  }
});

// Cuando el usuario toca el botón
if (installBtn) {
  installBtn.addEventListener('click', async () => {

    if (!deferredPrompt) {
      console.warn("⚠ No existe deferredPrompt, no se puede instalar.");
      installBtn.style.display = 'none';
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      console.log('✅ Usuario aceptó instalar la app');

      // Mostrar mensaje
      if (mensajeExito) {
        mensajeExito.classList.remove('oculto');
        mensajeExito.innerHTML = '🙌 ¡App instalada con éxito!';
      }

      localStorage.setItem('pwa_instalada', 'true');

      setTimeout(() => {
        if (mensajeExito) mensajeExito.classList.add('oculto');
      }, 5000);

    } else {
      console.log('❌ Usuario canceló la instalación');
    }

    // Reset
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

// Cuando la app se instala desde cualquier método
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA instalada correctamente');
  localStorage.setItem('pwa_instalada', 'true');

  if (installBtn) installBtn.style.display = 'none';
  if (mensajeExito) mensajeExito.classList.add('oculto');
});

// --- fin del script ---//
