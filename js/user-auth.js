// Funções de autenticação de usuário

// Verificar o estado de autenticação atual
function checkAuthState(callback) {
  console.log("Verificando estado de autenticação...");
  
  firebase.auth().onAuthStateChanged((user) => {
    console.log("Estado de autenticação:", user ? "Usuário autenticado" : "Usuário não autenticado");
    
    // Se estiver em uma página que requer autenticação e não houver usuário autenticado
    if (!user && !window.location.pathname.includes('login.html')) {
      console.log("Redirecionando para a página de login...");
      window.location.href = './login.html';
    }
    
    // Se estiver na página de login e houver usuário autenticado
    if (user && window.location.pathname.includes('login.html')) {
      console.log("Usuário já autenticado. Redirecionando para a página principal...");
      window.location.href = './index.html';
    }
    
    if (callback) {
      callback(user);
    }
  });
}

// Atualizar informações do usuário na interface
function updateUserInfo(user) {
  const userNameElement = document.getElementById('user-name');
  const userEmailElement = document.getElementById('user-email');
  const userPhotoElement = document.getElementById('user-photo');
  
  if (userNameElement && user) {
    userNameElement.textContent = user.displayName || 'Usuário';
  }
  
  if (userEmailElement && user) {
    userEmailElement.textContent = user.email || '';
  }
  
  if (userPhotoElement && user) {
    if (user.photoURL) {
      userPhotoElement.src = user.photoURL;
      userPhotoElement.style.display = 'block';
    } else {
      // Se não tiver foto, mostrar inicial do nome
      const initials = (user.displayName || 'U').charAt(0).toUpperCase();
      userPhotoElement.style.display = 'none';
      const userInitials = document.getElementById('user-initials');
      if (userInitials) {
        userInitials.textContent = initials;
        userInitials.style.display = 'flex';
      }
    }
  }
}

// Carregar dados do usuário do Realtime Database
function loadUserData(userId) {
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
  firebase.auth().signOut()
    .then(() => {
      console.log('Usuário deslogado com sucesso');
      window.location.href = './login.html';
    })
    .catch((error) => {
      console.error('Erro ao fazer logout:', error);
      showError('Erro ao fazer logout: ' + error.message);
    });
}

// Login com email e senha
function loginWithEmail(email, password) {
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
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado. Verifique seu email ou crie uma conta.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta. Tente novamente.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido. Verifique o formato do email.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
      }
      
      // Mostrar mensagem
      showError(errorMessage);
    });
}

// Login com Google
function loginWithGoogle() {
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
      const isNewUser = result.additionalUserInfo.isNewUser;
      if (isNewUser) {
        // Criar dados iniciais do usuário
        createUserData(user.uid);
      }
      
      // Redirecionar para a página principal
      window.location.href = './index.html';
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
        createUserData(user.uid);
        
        // Redirecionar para a página principal
        window.location.href = './index.html';
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
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso. Tente fazer login.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido. Verifique o formato do email.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      }
      
      // Mostrar mensagem
      showError(errorMessage);
    });
}

// Criar estrutura inicial de dados do usuário
function createUserData(userId) {
  const userData = {
    createdAt: new Date().toISOString(),
    settings: {
      theme: 'light',
      notifications: true
    },
    transcriptions: {
      count: 0
    }
  };
  
  return firebase.database().ref('users/' + userId).set(userData)
    .then(() => {
      console.log('Dados iniciais do usuário criados com sucesso');
      return userData;
    })
    .catch((error) => {
      console.error('Erro ao criar dados iniciais do usuário:', error);
      return null;
    });
}

// Função para mostrar mensagens de erro
function showError(message) {
  // Verifica se já existe um elemento de mensagem
  let messageElement = document.getElementById('message-container');
  if (!messageElement) {
    // Cria o elemento se não existir
    messageElement = document.createElement('div');
    messageElement.id = 'message-container';
    document.body.appendChild(messageElement);
  }
  
  // Limpa qualquer mensagem anterior
  messageElement.innerHTML = '';
  
  // Cria o elemento da nova mensagem
  const msg = document.createElement('div');
  msg.className = 'message message-error';
  msg.textContent = message;
  
  // Adiciona à área de mensagens
  messageElement.appendChild(msg);
  
  // Remove após 4 segundos
  setTimeout(() => {
    msg.classList.add('fade-out');
    setTimeout(() => {
      if (messageElement.contains(msg)) {
        messageElement.removeChild(msg);
      }
    }, 500);
  }, 4000);
}

document.addEventListener('DOMContentLoaded', function() {
  // Checar a autenticação com modificações
  if (window.authUtils && typeof window.authUtils.checkAuthState === 'function') {
    window.authUtils.checkAuthState(function(user) {
      const loginButton = document.getElementById('loginButton');
      const logoutButton = document.getElementById('logoutButton');
      const userNameElement = document.getElementById('userName');
      const userEmailElement = document.getElementById('userEmail');
      
      if (user) {
        console.log('Usuário autenticado:', user.email);
        
        // Usar updateUserInfo para preencher detalhes
        window.authUtils.updateUserInfo(user);
        
        // Atualizar informações do usuário
        userNameElement.textContent = user.displayName || 'Usuário';
        userEmailElement.textContent = user.email;
        
        // Mostrar botão de logout, ocultar botão de login
        loginButton.style.display = 'none';
        logoutButton.style.display = 'flex';
      } else {
        console.log('Usuário não autenticado');
        
        // Mostrar botão de login, ocultar botão de logout
        loginButton.style.display = 'flex';
        logoutButton.style.display = 'none';
        
        // Redefinir textos de usuário
        userNameElement.textContent = 'Fazer Login';
        userEmailElement.textContent = 'Clique para acessar';
      }
    });
  } else {
    console.warn('Módulo de autenticação não encontrado');
  }
});

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
