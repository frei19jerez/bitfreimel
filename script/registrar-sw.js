if ('serviceWorker' in navigator) {

  window.addEventListener('load', () => {

    navigator.serviceWorker.register('/script/service-worker.js')
      .then(reg => {
        console.log('SW registrado:', reg.scope);
      })
      .catch(err => console.warn('Error registrando SW:', err));

  });

}
