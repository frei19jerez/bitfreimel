// --- Instalación de la PWA ---
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

// Escucha el evento cuando el navegador detecta que se puede instalar la PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Mostrar el botón si existe
  if (installBtn) {
    installBtn.style.display = 'inline-block';
    installBtn.classList.add('show-install');
  }
});

// Escuchar el clic del botón para mostrar el cuadro de instalación
if (installBtn) {
  installBtn.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') {
          console.log('✅ Usuario aceptó instalar la app');
          document.getElementById('mensajeExito')?.classList.remove('oculto');
        } else {
          console.log('❌ Usuario rechazó la instalación');
        }
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
  });
}

