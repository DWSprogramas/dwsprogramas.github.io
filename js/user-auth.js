function checkAuthState(callback) {
  console.log("Verificando estado de autenticação...");

  firebase.auth().onAuthStateChanged((user) => {
    console.log("Estado de autenticação:", user ? "Usuário autenticado" : "Usuário não autenticado");

    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html') || currentPath.endsWith('/login') || currentPath.endsWith('/login.html');

    // Se já está redirecionando, evita múltiplas ações
    if (window._isRedirecting) {
      console.log("Redirecionamento já em andamento. Abortando.");
      return;
    }

    // Se o usuário NÃO está autenticado e NÃO está na página de login
    if (!user && !isLoginPage) {
      window._isRedirecting = true;
      console.log("Usuário não autenticado. Redirecionando para login...");
      if (typeof callback === 'function') callback(null);
      window.location.replace('./login.html');
      return;
    }

    // Se o usuário ESTÁ autenticado e ESTÁ na página de login
    if (user && isLoginPage) {
      window._isRedirecting = true;
      console.log("Usuário autenticado na tela de login. Redirecionando para index...");
      window.location.replace('./index.html?action=record');
      return;
    }

    // Se o usuário ESTÁ autenticado e NÃO está na tela de login
    if (user && !isLoginPage) {
      console.log("Usuário autenticado e fora da tela de login. Prosseguindo...");
      if (typeof callback === 'function') callback(user);
      return;
    }

    // Se o usuário NÃO está autenticado e ESTÁ na tela de login
    if (!user && isLoginPage) {
      console.log("Usuário não autenticado, mas na tela de login. Aguardando login...");
      if (typeof callback === 'function') callback(null);
    }
  });
}
