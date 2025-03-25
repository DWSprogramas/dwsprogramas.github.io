// Verifica se o navegador suporta Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration.scope);
      })
      .catch(error => {
        console.error('Erro ao registrar Service Worker:', error);
      });
  });
}
