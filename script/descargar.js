// --- Instalación de la PWA ---
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
const mensajeExito = document.getElementById('mensajeExito');

// Esperar a que cargue la página para verificar si ya está instalada
window.addEventListener('load', () => {
  const pwaInstalada = localStorage.getItem('pwa_instalada') === 'true';
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone; // iOS support

  if (pwaInstalada || isStandalone) {
    if (installBtn) installBtn.style.display = 'none';
    if (mensajeExito) mensajeExito.classList.add('oculto');
  }
});

// Detectar cuando el navegador permite instalar la PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (installBtn) {
    installBtn.style.display = 'inline-block';
    installBtn.classList.add('show-install');
  }
});

// Manejar el clic del botón de instalación
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ Usuario aceptó instalar la app');

      // Mostrar mensaje visual breve
      if (mensajeExito) {
        mensajeExito.classList.remove('oculto');
        mensajeExito.innerHTML = '🙌 ¡App instalada con éxito!';
      }

      // Guardar estado
      localStorage.setItem('pwa_instalada', 'true');

      // Ocultar mensaje después de 5 segundos
      setTimeout(() => {
        if (mensajeExito) mensajeExito.classList.add('oculto');
      }, 5000);
    } else {
      console.log('❌ Usuario canceló la instalación');
    }

    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

// Detectar instalación exitosa desde cualquier método
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA instalada correctamente');
  localStorage.setItem('pwa_instalada', 'true');
  if (installBtn) installBtn.style.display = 'none';
  if (mensajeExito) mensajeExito.classList.add('oculto');
});
// --- fin del script ---//