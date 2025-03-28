/**
 * Mapzy Vox IA - Gerenciador de Autenticação
 * Responsável por gerenciar autenticação, login e registro de usuários
 */

// Estado de autenticação
const authState = {
  user: null,
  isLoading: true,
  error: null
};

// Inicializar módulo de autenticação
function initAuth() {
  console.log('Inicializando módulo de autenticação...');
  
  // Verificar se o Firebase está disponível
  if (!firebase || !firebase.auth) {
    console.error('Firebase Auth não está disponível');
    return;
  }
  
  // Adicionar listener para mudanças no estado de autenticação
  firebase.auth().onAuthStateChanged(handleAuthStateChanged);
  
  // Verificar se estamos na página de login
  if (window.location.pathname.includes('login.html')) {
    setupLoginPage();
  }
  
  console.log('Módulo de autenticação inicializado');
}

// Manipular mudanças no estado de autenticação
function handleAuthStateChanged(user) {
  console.log('Estado de autenticação alterado:', user ? 'Usuário autenticado' : 'Não autenticado');
  
  // Atualizar o estado
  authState.user = user;
  authState.isLoading = false;
  
  // Verificar se estamos na página de login
  const isLoginPage = window.location.pathname.includes('login.html');
  
  if (user) {
    // Usuário está autenticado
    if (isLoginPage) {
      // Redirecionar para a página principal se estiver na página de login
      console.log('Usuário já autenticado. Redirecionando para a página principal...');
      window.location.href = './index.html';
    } else {
      // Atualizar a interface com informações do usuário
      updateUserInfo(user);
    }
  } else {
    // Usuário não está autenticado
    if (!isLoginPage) {
      // Redirecionar para a página de login se não estiver na página de login
      console.log('Usuário não autenticado. Redirecionando para login...');
      window.location.href = './login.html';
    }
  }
  
  // Disparar evento de mudança de autenticação
  window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
}

// Configurar a página de login
function setupLoginPage() {
  // Verificar se os elementos existem
  const loginButton = document.getElementById('login-button');
  const googleLoginButton = document.getElementById('google-login');
  const registerButton = document.getElementById('register-button');
  const forgotPasswordLink = document.getElementById('forgot-password');
  
  // Configurar botão de login
  if (loginButton) {
    loginButton.addEventListener('click', handleEmailLogin);
  }
  
  // Configurar botão de login com Google
  if (googleLoginButton) {
    googleLoginButton.addEventListener('click', handleGoogleLogin);
  }
  
  // Configurar botão de registro
  if (registerButton) {
    registerButton.addEventListener('click', handleRegister);
  }
  
  // Configurar link de recuperação de senha
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', handleForgotPassword);
  }
  
  // Permitir envio do formulário de login pressionando Enter
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && loginButton) {
        loginButton.click();
      }
    });
  }
  
  // Permitir envio do formulário de registro pressionando Enter
  const confirmPasswordInput = document.getElementById('reg-password-confirm');
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && registerButton) {
        registerButton.click();
      }
    });
  }
}

// Login com email e senha
function handleEmailLogin() {
  // Obter valores dos campos
  const email = document.getElementById('email')?.value?.trim();
  const password = document.getElementById('password')?.value;
  
  if (!email || !password) {
    showError('Por favor, preencha todos os campos');
    return;
  }
  
  // Mostrar indicador de carregamento
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    const originalButtonContent = loginButton.innerHTML;
    loginButton.innerHTML = '<span class="material-icons">hourglass_top</span> Entrando...';
    loginButton.disabled = true;
    
    // Fazer login
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Login bem-sucedido, a navegação será feita pelo onAuthStateChanged
        console.log('Login com email bem-sucedido:', userCredential.user.uid);
      })
      .catch((error) => {
        console.error('Erro de login com email:', error);
        
        // Restaurar botão
        loginButton.innerHTML = originalButtonContent;
        loginButton.disabled = false;
        
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
        
        showError(errorMessage);
      });
  }
}

// Login com Google
function handleGoogleLogin() {
  // Mostrar indicador de carregamento
  const googleButton = document.getElementById('google-login');
  if (googleButton) {
    const originalButtonContent = googleButton.innerHTML;
    googleButton.innerHTML = '<span class="material-icons">hourglass_top</span> Conectando...';
    googleButton.disabled = true;
    
    // Criar provedor do Google
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Fazer login com popup
    firebase.auth().signInWithPopup(provider)
      .then((result) => {
        // Login bem-sucedido
        const user = result.user;
        console.log('Login com Google bem-sucedido:', user.uid);
        
        // Verificar se é um novo usuário
        const isNewUser = result.additionalUserInfo?.isNewUser;
        if (isNewUser) {
          // Criar dados iniciais do usuário
          return createUserData(user.uid)
            .then(() => {
              // Redirecionamento será feito pelo onAuthStateChanged
              console.log('Dados iniciais do usuário criados com sucesso');
            });
        }
      })
      .catch((error) => {
        console.error('Erro de login com Google:', error);
        
        // Restaurar botão
        googleButton.innerHTML = originalButtonContent;
        googleButton.disabled = false;
        
        // Mostrar mensagem de erro
        showError('Erro ao entrar com Google: ' + error.message);
      });
  }
}

// Registro de novo usuário
function handleRegister() {
  // Obter valores dos campos
  const name = document.getElementById('reg-name')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim();
  const password = document.getElementById('reg-password')?.value;
  const confirmPassword = document.getElementById('reg-password-confirm')?.value;
  
  if (!name || !email || !password || !confirmPassword) {
    showError('Por favor, preencha todos os campos');
    return;
  }
  
  if (password !== confirmPassword) {
    showError('As senhas não conferem');
    return;
  }
  
  // Mostrar indicador de carregamento
  const registerButton = document.getElementById('register-button');
  if (registerButton) {
    const originalButtonContent = registerButton.innerHTML;
    registerButton.innerHTML = '<span class="material-icons">hourglass_top</span> Registrando...';
    registerButton.disabled = true;
    
    // Criar conta
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
              // Redirecionamento será feito pelo onAuthStateChanged
              console.log('Dados iniciais do usuário criados com sucesso');
            });
        });
      })
      .catch((error) => {
        console.error('Erro ao registrar usuário:', error);
        
        // Restaurar botão
        registerButton.innerHTML = originalButtonContent;
        registerButton.disabled = false;
        
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
        
        showError(errorMessage);
      });
  }
}

// Recuperação de senha
function handleForgotPassword(e) {
  e.preventDefault();
  
  // Obter o email
  const email = document.getElementById('email')?.value?.trim();
  
  if (!email) {
    showError('Por favor, digite seu e-mail');
    return;
  }
  
  // Enviar email de recuperação
  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      alert('Um email de redefinição de senha foi enviado para ' + email);
    })
    .catch((error) => {
      console.error('Erro ao enviar email de redefinição:', error);
      
      let errorMessage = 'Erro ao enviar email de redefinição.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Não há usuário registrado com este email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido. Verifique o formato do email.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
          break;
      }
      
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
    stats: {
      transcriptionsCount: 0,
      totalRecordingTime: 0
    },
    lastLogin: firebase.database.ServerValue.TIMESTAMP
  };
  
  return firebase.database().ref(`MapzyVox/users/${userId}`).set(userData)
    .then(() => {
      console.log('Dados iniciais do usuário criados com sucesso');
      return userData;
    })
    .catch((error) => {
      console.error('Erro ao criar dados iniciais do usuário:', error);
      return Promise.reject(error);
    });
}

// Atualizar a interface com informações do usuário
function updateUserInfo(user) {
  try {
    // Atualizar nome do usuário
    const userNameElements = document.querySelectorAll('#user-name');
    userNameElements.forEach(element => {
      if (element) element.textContent = user.displayName || user.email || "Usuário";
    });
    
    // Atualizar email
    const userEmailElements = document.querySelectorAll('#user-email');
    userEmailElements.forEach(element => {
      if (element) element.textContent = user.email || "";
    });
    
    // Atualizar email no perfil
    const profileEmail = document.getElementById('profile-email');
    if (profileEmail) {
      profileEmail.textContent = user.email || "";
    }
    
    // Atualizar avatar
    const userPhoto = document.getElementById('user-photo');
    const userInitials = document.getElementById('user-initials');
    
    if (userPhoto && userInitials) {
      if (user.photoURL) {
        userPhoto.src = user.photoURL;
        userPhoto.style.display = 'block';
        userInitials.style.display = 'none';
      } else {
        // Mostrar iniciais
        const name = user.displayName || user.email || "Usuário";
        const initial = name.charAt(0).toUpperCase();
        userInitials.textContent = initial;
        userInitials.style.display = 'flex';
        userPhoto.style.display = 'none';
      }
    }
    
    console.log('Informações do usuário atualizadas na interface');
  } catch (error) {
    console.error('Erro ao atualizar informações do usuário:', error);
  }
}

// Fazer logout
function logout() {
  console.log('Fazendo logout...');
  
  // Verificar se o Firebase está disponível
  if (!firebase || !firebase.auth) {
    console.error('Firebase Auth não está disponível');
    return Promise.reject(new Error('Firebase Auth não está disponível'));
  }
  
  return firebase.auth().signOut()
    .then(() => {
      console.log('Logout realizado com sucesso');
      // Limpar dados locais
      if (window.storageUtils && typeof window.storageUtils.clearUserStorage === 'function') {
        window.storageUtils.clearUserStorage();
      }
      
      // Redirecionar para login
      window.location.href = './login.html';
    })
    .catch((error) => {
      console.error('Erro ao fazer logout:', error);
      showError('Erro ao fazer logout: ' + error.message);
      return Promise.reject(error);
    });
}

// Exibir mensagem de erro
function showError(message) {
  try {
    // Verificar se temos uma função global de exibição de erros
    if (window.showErrorMessage && typeof window.showErrorMessage === 'function') {
      window.showErrorMessage(message);
      return;
    }
    
    // Criar elemento de mensagem
    let messageElement = document.getElementById('message-container');
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.id = 'message-container';
      messageElement.style.position = 'fixed';
      messageElement.style.top = '20px';
      messageElement.style.left = '50%';
      messageElement.style.transform = 'translateX(-50%)';
      messageElement.style.zIndex = '9999';
      document.body.appendChild(messageElement);
    }
    
    // Limpar qualquer mensagem anterior
    messageElement.innerHTML = '';
    
    // Criar o elemento da nova mensagem
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
  } catch (error) {
    console.error('Erro ao mostrar mensagem de erro:', error);
    // Fallback para alert nativo
    alert(message);
  }
}

// Exportar funções para uso em outros arquivos
window.authHandler = {
  initAuth,
  logout,
  isAuthenticated: () => !!authState.user,
  getCurrentUser: () => authState.user,
  updateUserInfo
};

// Inicializar automaticamente
document.addEventListener('DOMContentLoaded', initAuth);
