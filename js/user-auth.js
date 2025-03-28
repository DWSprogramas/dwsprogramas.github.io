// Funções de autenticação de usuário

// Verificar o estado de autenticação atual
function checkAuthState(callback) {
  console.log("Verificando estado de autenticação...");
  
  // Verificar se o Firebase está inicializado
  if (!firebase || !firebase.auth) {
    console.error("Firebase não está disponível. Verifique se os scripts do Firebase foram carregados corretamente.");
    return;
  }
  
  firebase.auth().onAuthStateChanged((user) => {
    console.log("Estado de autenticação:", user ? "Usuário autenticado" : "Usuário não autenticado");
    
    // Se estiver em uma página que requer autenticação e não houver usuário autenticado
    const isLoginPage = window.location.pathname.includes('login.html');
    
    if (!user && !isLoginPage) {
      console.log("Redirecionando para a página de login...");
      window.location.href = './login.html';
      return;
    }
    
    // Se estiver na página de login e houver usuário autenticado
    if (user && isLoginPage) {
      console.log("Usuário já autenticado. Redirecionando para a página principal...");
      window.location.href = './index.html';
      return;
    }
    
    if (callback && typeof callback === 'function') {
      callback(user);
    }
  });
}

// Atualizar informações do usuário na interface
function updateUserInfo(user) {
  if (!user) return;
  
  const userNameElement = document.getElementById('user-name');
  const userEmailElement = document.getElementById('user-email');
  const userPhotoElement = document.getElementById('user-photo');
  
  if (userNameElement) {
    userNameElement.textContent = user.displayName || user.email || 'Usuário';
  }
  
  if (userEmailElement) {
    userEmailElement.textContent = user.email || '';
  }
  
  if (userPhotoElement && user.photoURL) {
    userPhotoElement.src = user.photoURL;
    userPhotoElement.style.display = 'block';
  } else if (userPhotoElement) {
    // Se não tiver foto, mostrar inicial do nome
    const initials = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
    userPhotoElement.style.display = 'none';
    const userInitials = document.getElementById('user-initials');
    if (userInitials) {
      userInitials.textContent = initials;
      userInitials.style.display = 'flex';
    }
  }
}

// Carregar dados do usuário do Realtime Database
function loadUserData(userId) {
  if (!firebase || !firebase.database || !userId) {
    console.error('Firebase ou ID de usuário não disponíveis');
    return Promise.reject(new Error('Firebase ou ID de usuário não disponíveis'));
  }
  
  return firebase.database().ref('users/' + userId).once('value')
    .then((snapshot) => {
      return snapshot.val();
    })
    .catch((error) => {
      console.error('Erro ao carregar dados do usuário:', error);
      return null;
    });
}

// Logout do usuário
function logout() {
  if (!firebase || !firebase.auth) {
    console.error('Firebase não está disponível');
    return Promise.reject(new Error('Firebase não está disponível'));
  }
  
  return firebase.auth().signOut()
    .then(() => {
      console.log('Usuário deslogado com sucesso');
      window.location.href = './login.html';
    })
    .catch((error) => {
      console.error('Erro ao fazer logout:', error);
      showError('Erro ao fazer logout: ' + error.message);
      throw error;
    });
}

// Login com email e senha
function loginWithEmail(email, password) {
  if (!firebase || !firebase.auth) {
    console.error('Firebase não está disponível');
    showError('Firebase não está disponível. Verifique sua conexão com a internet.');
    return;
  }
  
  // Mostrar indicador de carregamento
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    const originalButtonContent = loginButton.innerHTML;
    loginButton.innerHTML = '<span class="material-icons">hourglass_top</span> Entrando...';
    loginButton.disabled = true;
  }
  
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Login bem-sucedido
      console.log('Login com email bem-sucedido:', userCredential.user.uid);
      window.location.href = './index.html';
    })
    .catch((error) => {
      console.error('Erro de login com email:', error);
      
      // Restaurar botão
      if (loginButton) {
        loginButton.innerHTML = '<span class="material-icons">login</span> Entrar';
        loginButton.disabled = false;
      }
      
      // Mostrar mensagem de erro apropriada
      let errorMessage = 'Erro ao fazer login. Verifique seu email e senha.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado. Verifique seu email ou crie uma conta.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta. Tente novamente.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido. Verifique o formato do email.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          break;
      }
      
      // Mostrar mensagem
      showError(errorMessage);
    });
}

// Login com Google
function loginWithGoogle() {
  if (!firebase || !firebase.auth) {
    console.error('Firebase não está disponível');
    showError('Firebase não está disponível. Verifique sua conexão com a internet.');
    return;
  }
  
  const provider = new firebase.auth.GoogleAuthProvider();
  
  // Mostrar indicador de carregamento
  const googleButton = document.getElementById('google-login');
  if (googleButton) {
    const originalButtonContent = googleButton.innerHTML;
    googleButton.innerHTML = '<span class="material-icons">hourglass_top</span> Conectando...';
    googleButton.disabled = true;
  }
  
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      // Login bem-sucedido
      const user = result.user;
      console.log('Login com Google bem-sucedido:', user.uid);
      
      // Verificar se é um novo usuário
      const isNewUser = result.additionalUserInfo && result.additionalUserInfo.isNewUser;
      if (isNewUser) {
        // Criar dados iniciais do usuário
        return createUserData(user.uid)
          .then(() => {
            // Redirecionar para a página principal
            window.location.href = './index.html';
          });
      } else {
        // Redirecionar para a página principal
        window.location.href = './index.html';
      }
    })
    .catch((error) => {
      console.error('Erro de login com Google:', error);
      
      // Restaurar botão
      if (googleButton) {
        googleButton.innerHTML = '<span class="material-icons google-icon">g_translate</span> Continuar com Google';
        googleButton.disabled = false;
      }
      
      // Mostrar mensagem de erro
      showError('Erro ao entrar com Google: ' + error.message);
    });
}

// Registrar novo usuário
function registerUser(email, password, name) {
  if (!firebase || !firebase.auth) {
    console.error('Firebase não está disponível');
    showError('Firebase não está disponível. Verifique sua conexão com a internet.');
    return;
  }
  
  // Mostrar indicador de carregamento
  const registerButton = document.getElementById('register-button');
  if (registerButton) {
    const originalButtonContent = registerButton.innerHTML;
    registerButton.innerHTML = '<span class="material-icons">hourglass_top</span> Registrando...';
    registerButton.disabled = true;
  }
  
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Conta criada com sucesso
      const user = userCredential.user;
      console.log('Usuário registrado com sucesso:', user.uid);
      
      // Atualizar o perfil do usuário com o nome
      return user.updateProfile({
        displayName: name
      }).then(() => {
        // Criar dados iniciais do usuário
        return createUserData(user.uid)
          .then(() => {
            // Redirecionar para a página principal
            window.location.href = './index.html';
          });
      });
    })
    .catch((error) => {
      console.error('Erro ao registrar usuário:', error);
      
      // Restaurar botão
      if (registerButton) {
        registerButton.innerHTML = '<span class="material-icons">person_add</span> Cadastrar';
        registerButton.disabled = false;
      }
      
      // Mostrar mensagem de erro apropriada
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email já está em uso. Tente fazer login.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido. Verifique o formato do email.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          break;
      }
      
      // Mostrar mensagem
      showError(errorMessage);
    });
}

// Criar estrutura inicial de dados do usuário
function createUserData(userId) {
  if (!firebase || !firebase.database || !userId) {
    console.error('Firebase ou ID de usuário não disponíveis');
    return Promise.reject(new Error('Firebase ou ID de usuário não disponíveis'));
  }
  
  const userData = {
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    settings: {
      theme: 'light',
      notifications: true
    },
    transcriptions: {
      count: 0
    },
    lastLogin: firebase.database.ServerValue.TIMESTAMP
  };
  
  return firebase.database().ref('users/' + userId).set(userData)
    .then(() => {
      console.log('Dados iniciais do usuário criados com sucesso');
      return userData;
    })
    .catch((error) => {
      console.error('Erro ao criar dados iniciais do usuário:', error);
      return Promise.reject(error);
    });
}

// Função para mostrar mensagens de erro
function showError(message) {
  console.error("ERRO:", message);
  
  // Verificar se já existe um elemento de mensagem
  let messageElement = document.getElementById('message-container');
  if (!messageElement) {
    // Cria o elemento se não existir
    messageElement = document.createElement('div');
    messageElement.id = 'message-container';
    messageElement.style.position = 'fixed';
    messageElement.style.top = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.zIndex = '9999';
    document.body.appendChild(messageElement);
  }
  
  // Limpa qualquer mensagem anterior
  messageElement.innerHTML = '';
  
  // Cria o elemento da nova mensagem
  const msg = document.createElement('div');
  msg.className = 'message message-error';
  msg.style.backgroundColor = '#e74c3c';
  msg.style.color = 'white';
  msg.style.padding = '12px 20px';
  msg.style.borderRadius = '4px';
  msg.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
  msg.style.margin = '5px 0';
  msg.textContent = message;
  
  // Adiciona à área de mensagens
  messageElement.appendChild(msg);
  
  // Remove após 4 segundos
  setTimeout(() => {
    msg.style.opacity = '0';
    msg.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      if (messageElement.contains(msg)) {
        messageElement.removeChild(msg);
      }
    }, 500);
  }, 4000);
}

// Adicionar estas funções ao objeto de exportação
window.authUtils = {
  checkAuthState,
  updateUserInfo,
  logout,
  loadUserData,
  loginWithEmail,
  loginWithGoogle,
  registerUser,
  showError,
  createUserData
};
