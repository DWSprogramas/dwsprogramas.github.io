/**
 * Mapzy Vox IA - Aplicativo principal
 * Gerencia o estado da aplicação, inicialização dos módulos e fluxo principal
 */

// Variáveis globais para compartilhar entre os módulos
window.transcribedText = "";
window.processedText = "";
window.currentProcessingType = "summary";
window.currentTranscriptionId = null;
window.appState = {
  isOnline: navigator.onLine,
  isPWA: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
  isInstallPromptShown: false,
  deferredInstallPrompt: null,
  lastUpdated: Date.now(),
  pendingOperations: []
};

// Log inicial
console.log("Aplicação Mapzy Vox IA - Inicializando...");

// Função principal de inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado, inicializando aplicação...');
  
  // Verificar se os módulos necessários foram carregados
  if (!checkRequiredModules()) {
    console.error('Módulos essenciais não foram carregados corretamente');
    document.getElementById('status-text').textContent = 'Erro: Falha ao carregar módulos';
    return;
  }
  
  // Remover itens expirados do armazenamento de forma segura
  removeExpiredItemsSafely();
  
  // Verificar autenticação antes de inicializar outros módulos
  initializeAuth();
});

/**
 * Verifica se todos os módulos necessários foram carregados
 * @returns {boolean} Se todos os módulos essenciais estão disponíveis
 */
function checkRequiredModules() {
  console.log('Verificando módulos essenciais...');
  
  const requiredModules = [
    { name: 'firebase', path: 'firebase' },
    { name: 'Firebase Auth', path: 'firebase.auth' },
    { name: 'Firebase Database', path: 'firebase.database' }
  ];
  
  const optionalModules = [
    { name: 'firebaseHelper', path: 'window.firebaseHelper' },
    { name: 'securityUtils', path: 'window.securityUtils' },
    { name: 'storageUtils', path: 'window.storageUtils' },
    { name: 'authUtils', path: 'window.authUtils' }
  ];
  
  // Verificar módulos essenciais
  let allRequiredLoaded = true;
  requiredModules.forEach(module => {
    const isLoaded = checkModule(module.path);
    console.log(`Módulo ${module.name}: ${isLoaded ? 'OK' : 'NÃO ENCONTRADO'}`);
    if (!isLoaded) allRequiredLoaded = false;
  });
  
  // Verificar módulos opcionais
  optionalModules.forEach(module => {
    const isLoaded = checkModule(module.path);
    console.log(`Módulo ${module.name}: ${isLoaded ? 'OK' : 'Não encontrado (opcional)'}`);
  });
  
  return allRequiredLoaded;
}

/**
 * Verifica se um módulo específico foi carregado
 * @param {string} modulePath - Caminho do módulo (e.g., 'firebase.auth')
 * @returns {boolean} Se o módulo está disponível
 */
function checkModule(modulePath) {
  try {
    const parts = modulePath.split('.');
    let obj = window;
    
    for (const part of parts) {
      if (!obj || obj[part] === undefined) return false;
      obj = obj[part];
    }
    
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Remove itens expirados do armazenamento local com tratamento de erro
 */
function removeExpiredItemsSafely() {
  try {
    if (window.storageUtils && typeof window.storageUtils.removeExpiredItems === 'function') {
      // Verificar se a função retorna uma Promise antes de usar .catch
      const result = window.storageUtils.removeExpiredItems();
      if (result && typeof result.catch === 'function') {
        result.catch(err => {
          console.warn('Erro ao remover itens expirados:', err);
        });
      }
    }
  } catch (err) {
    console.warn('Erro ao limpar armazenamento:', err);
  }
}

/**
 * Inicializa o sistema de autenticação e verifica o estado do usuário
 */
function initializeAuth() {
  console.log('Iniciando verificação de autenticação...');
  
  // Verificar se o Firebase Auth está disponível
  if (!firebase || !firebase.auth) {
    console.error('Firebase Auth não está disponível');
    document.getElementById('status-text').textContent = 'Erro: Serviço de autenticação indisponível';
    return;
  }
  
  firebase.auth().onAuthStateChanged((user) => {
    console.log("Estado de autenticação:", user ? "Logado como " + (user.email || user.uid) : "Não logado");
    
    if (user) {
      // Usuário está logado
      console.log('Usuário autenticado, configurando interface...');
      
      // Inicializar a aplicação após autenticação
      initializeApp(user);
    } else {
      console.log('Usuário não autenticado, redirecionando para login...');
      window.location.href = './login.html';
    }
  });
}

/**
 * Inicializa a aplicação após confirmação de autenticação
 * @param {Object} user - Objeto do usuário autenticado
 */
function initializeApp(user) {
  try {
    // Configurar a interface com informações do usuário
    updateUserInfo(user);
    
    // Carregar dados do usuário
    loadUserData(user.uid);
    
    // Inicializar módulos da aplicação
    initializeModules();
    
    // Mostrar a aplicação principal
    setTimeout(() => {
      console.log('Mostrando a aplicação principal...');
      if (typeof window.uiHandler !== 'undefined' && 
          typeof window.uiHandler.showApp === 'function') {
        window.uiHandler.showApp();
      } else {
        // Fallback caso uiHandler não esteja disponível
        showApp();
      }
    }, 1000); // Pequeno atraso para garantir que tudo esteja carregado
    
  } catch (error) {
    console.error('Erro ao inicializar aplicação:', error);
    document.getElementById('status-text').textContent = 'Erro ao inicializar: ' + error.message;
  }
}

/**
 * Atualiza a interface com informações do usuário
 * @param {Object} user - Objeto do usuário autenticado
 */
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

/**
 * Carrega dados do usuário do Firebase
 * @param {string} userId - ID do usuário autenticado
 */
function loadUserData(userId) {
  console.log('Carregando dados para userId:', userId);
  
  // Mostrar spinners de carregamento
  const recentSpinner = document.getElementById('recent-transcriptions-spinner');
  const allSpinner = document.getElementById('all-transcriptions-spinner');
  
  if (recentSpinner) recentSpinner.style.display = 'block';
  if (allSpinner) allSpinner.style.display = 'block';
  
  try {
    // Verificar se o helper do Firebase está disponível
    if (window.firebaseHelper && typeof window.firebaseHelper.getUserTranscriptions === 'function') {
      window.firebaseHelper.getUserTranscriptions()
        .then(transcriptions => {
          // Esconder spinners
          if (recentSpinner) recentSpinner.style.display = 'none';
          if (allSpinner) allSpinner.style.display = 'none';
          
          // Armazenar transcrições globalmente
          window.allTranscriptions = transcriptions;
          
          // Atualizar interface com os dados
          updateUIWithUserData(transcriptions);
        })
        .catch(error => {
          console.error('Erro ao carregar transcrições:', error);
          // Esconder spinners
          if (recentSpinner) recentSpinner.style.display = 'none';
          if (allSpinner) allSpinner.style.display = 'none';
          // Mostrar mensagem de erro
          showErrorMessage('Não foi possível carregar suas transcrições. Por favor, tente novamente mais tarde.');
        });
    } else {
      console.warn('firebaseHelper.getUserTranscriptions não está disponível');
      // Esconder spinners
      if (recentSpinner) recentSpinner.style.display = 'none';
      if (allSpinner) allSpinner.style.display = 'none';
    }
    
    // Carregar chave API do usuário
    loadApiKey();
  } catch (error) {
    console.error('Erro ao carregar dados do usuário:', error);
    // Esconder spinners
    if (recentSpinner) recentSpinner.style.display = 'none';
    if (allSpinner) allSpinner.style.display = 'none';
  }
}

/**
 * Atualiza a interface com os dados do usuário
 * @param {Array} transcriptions - Lista de transcrições do usuário
 */
function updateUIWithUserData(transcriptions) {
  try {
    // Atualizar estatísticas se houver uma função para isso
    if (typeof updateStats === 'function') {
      updateStats(transcriptions);
    } else {
      updateStatistics(transcriptions);
    }
    
    // Carregar transcrições recentes se houver uma função para isso
    if (typeof loadRecentTranscriptions === 'function') {
      loadRecentTranscriptions(transcriptions);
    } else {
      // Implementação inline como fallback
      loadRecentTranscriptionsInline(transcriptions);
    }
    
    console.log('Interface atualizada com dados do usuário');
  } catch (error) {
    console.error('Erro ao atualizar interface com dados do usuário:', error);
  }
}

/**
 * Implementação de backup para atualizar estatísticas
 * @param {Array} transcriptions - Lista de transcrições do usuário
 */
function updateStatistics(transcriptions) {
  // Total de transcrições
  const totalTranscriptionsSpan = document.getElementById('total-transcriptions');
  if (totalTranscriptionsSpan) {
    totalTranscriptionsSpan.textContent = transcriptions.length;
  }
  
  // Última atividade
  const latestActivitySpan = document.getElementById('latest-activity');
  if (latestActivitySpan && transcriptions.length > 0) {
    const latestDate = new Date(Math.max(...transcriptions.map(t => t.createdAt)));
    const now = new Date();
    const diffDays = Math.floor((now - latestDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      latestActivitySpan.textContent = 'Hoje';
    } else if (diffDays === 1) {
      latestActivitySpan.textContent = 'Ontem';
    } else {
      latestActivitySpan.textContent = `${diffDays} dias atrás`;
    }
  } else if (latestActivitySpan) {
    latestActivitySpan.textContent = '-';
  }
  
  // Tamanho dos dados salvos
  const savedDataSpan = document.getElementById('saved-data');
  if (savedDataSpan) {
    let totalSize = 0;
    transcriptions.forEach(t => {
      // Estimativa aproximada do tamanho dos textos em bytes
      totalSize += (t.text?.length || 0) + (t.processedText?.length || 0) + 
                  (t.title?.length || 0) + 100; // 100 bytes extras para metadados
    });
    
    if (totalSize < 1024) {
      savedDataSpan.textContent = `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
      savedDataSpan.textContent = `${Math.round(totalSize / 1024)} KB`;
    } else {
      savedDataSpan.textContent = `${Math.round(totalSize / (1024 * 1024) * 10) / 10} MB`;
    }
  }
}

/**
 * Implementação de backup para carregar transcrições recentes
 * @param {Array} transcriptions - Lista de transcrições do usuário
 */
function loadRecentTranscriptionsInline(transcriptions) {
  const recentList = document.getElementById('recent-transcriptions');
  const emptyState = document.getElementById('empty-state-recent');
  
  if (!recentList) return;
  
  recentList.innerHTML = '';
  
  if (transcriptions.length === 0) {
    // Mostrar estado vazio
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }
  
  // Esconder estado vazio
  if (emptyState) emptyState.style.display = 'none';
  
  // Mostrar as 5 transcrições mais recentes
  const recentTranscriptions = [...transcriptions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
  
  recentTranscriptions.forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    
    const html = `
      <div class="history-item-header">
        <div class="history-item-title">${item.title}</div>
        <div class="history-item-date">${new Date(item.createdAt).toLocaleString()}</div>
      </div>
      <div class="history-item-preview">${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}</div>
      <div class="history-item-actions">
        <button class="btn btn-secondary btn-sm view-btn" data-id="${item.id}">
          <i class="material-icons-round">visibility</i>
          <span>Ver</span>
        </button>
        <button class="btn btn-secondary btn-sm edit-btn" data-id="${item.id}">
          <i class="material-icons-round">edit</i>
          <span>Editar</span>
        </button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}">
          <i class="material-icons-round">delete</i>
          <span>Excluir</span>
        </button>
      </div>
    `;
    
    li.innerHTML = html;
    
    // Adicionar eventos aos botões se as funções necessárias estiverem disponíveis
    const viewButtons = li.querySelectorAll('.view-btn');
    const editButtons = li.querySelectorAll('.edit-btn');
    const deleteButtons = li.querySelectorAll('.delete-btn');
    
    viewButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (typeof viewTranscription === 'function') {
          viewTranscription(id);
        } else {
          console.warn('Função viewTranscription não encontrada');
        }
      });
    });
    
    editButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (typeof editTranscription === 'function') {
          editTranscription(id);
        } else {
          console.warn('Função editTranscription não encontrada');
        }
      });
    });
    
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm('Tem certeza que deseja excluir esta transcrição?')) {
          if (typeof deleteTranscription === 'function') {
            deleteTranscription(id);
          } else {
            console.warn('Função deleteTranscription não encontrada');
          }
        }
      });
    });
    
    // O item inteiro também abre o modal de visualização
    li.addEventListener('click', () => {
      const id = li.querySelector('.view-btn').getAttribute('data-id');
      if (typeof viewTranscription === 'function') {
        viewTranscription(id);
      } else {
        console.warn('Função viewTranscription não encontrada');
      }
    });
    
    recentList.appendChild(li);
  });
}

/**
 * Inicializa os módulos da aplicação
 */
function initializeModules() {
  try {
    console.log('Inicializando módulos da aplicação...');
    
    // Inicializar gravador de áudio se disponível
    if (typeof window.initAudioRecorder === 'function') {
      window.initAudioRecorder();
    } else if (typeof initAudioRecorder === 'function') {
      initAudioRecorder();
    } else {
      console.warn('Módulo de gravação de áudio não encontrado');
    }
    
    // Inicializar transcrição se disponível
    if (window.transcriptionUtils && typeof window.transcriptionUtils.initTranscription === 'function') {
      window.transcriptionUtils.initTranscription();
    } else if (typeof initTranscription === 'function') {
      initTranscription();
    } else {
      console.warn('Módulo de transcrição não encontrado');
    }
    
    // Verificar parâmetros da URL
    handleUrlParams();
    
    console.log('Módulos da aplicação inicializados');
  } catch (error) {
    console.error('Erro ao inicializar módulos:', error);
  }
}

/**
 * Carregar a chave API do usuário
 */
function loadApiKey() {
  try {
    // Primeiro tentar localStorage
    const savedApiKey = localStorage.getItem('openai_api_key');
    
    // Preencher campo se existir
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput && savedApiKey) {
      apiKeyInput.value = savedApiKey;
    }
    
    // Tentar carregar do Firebase
    if (window.firebaseHelper && typeof window.firebaseHelper.loadUserApiKey === 'function') {
      window.firebaseHelper.loadUserApiKey()
        .then(apiKey => {
          if (apiKey && apiKeyInput) {
            apiKeyInput.value = apiKey;
          }
        })
        .catch(error => {
          console.error('Erro ao carregar chave API:', error);
        });
    }
  } catch (error) {
    console.error('Erro ao carregar chave API:', error);
  }
}

/**
 * Processar parâmetros da URL
 */
function handleUrlParams() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Se houver um ID na URL, carregar a transcrição
    const transcriptionId = urlParams.get('id');
    if (transcriptionId && window.transcriptionUtils && 
        typeof window.transcriptionUtils.loadTranscriptionDetails === 'function') {
      window.transcriptionUtils.loadTranscriptionDetails(transcriptionId);
    }
    
    // Se houver uma ação na URL, executá-la
    const action = urlParams.get('action');
    if (action === 'record') {
      window.uiHandler.navigateTo('record');
    } else if (action === 'history') {
      window.uiHandler.navigateTo('history');
    }
  } catch (error) {
    console.error('Erro ao processar parâmetros da URL:', error);
  }
}

/**
 * Exibir mensagem de erro
 * @param {string} message - Mensagem de erro
 */
function showErrorMessage(message) {
  try {
    // Criar elemento de mensagem se não existir
    let errorElement = document.getElementById('error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = 'error-message';
      errorElement.style.position = 'fixed';
      errorElement.style.top = '20px';
      errorElement.style.left = '50%';
      errorElement.style.transform = 'translateX(-50%)';
      errorElement.style.backgroundColor = '#f44336';
      errorElement.style.color = 'white';
      errorElement.style.padding = '10px 20px';
      errorElement.style.borderRadius = '5px';
      errorElement.style.zIndex = '9999';
      errorElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      document.body.appendChild(errorElement);
    }
    
    // Definir a mensagem e mostrar
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Auto-esconder após 5 segundos
    setTimeout(() => {
      errorElement.style.opacity = '0';
      errorElement.style.transition = 'opacity 0.5s ease';
      
      // Remover após fade out
      setTimeout(() => {
        errorElement.style.display = 'none';
        errorElement.style.opacity = '1';
      }, 500);
    }, 5000);
  } catch (error) {
    console.error('Erro ao mostrar mensagem de erro:', error);
    alert(message); // Fallback para alert nativo
  }
}

/**
 * Função de fallback para exibir a aplicação
 */
function showApp() {
  console.log('Executando showApp() (fallback)...');
  
  // Verificar se os elementos existem
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  
  if (!splash || !app) {
    console.error('Elementos splash ou app não encontrados!');
    return;
  }
  
  // Adicionar logs para verificar o estado antes da alteração
  console.log('Estado inicial - splash:', splash.className, splash.style.display);
  console.log('Estado inicial - app:', app.className, app.style.display);
  
  // Esconder a tela de carregamento e mostrar a aplicação
  splash.classList.add('hidden');
  app.classList.remove('hidden');
  
  // Verificação adicional para garantir que a aplicação esteja visível
  setTimeout(() => {
    // Se a aplicação ainda não estiver visível, forçar com estilos inline
    if (app.classList.contains('hidden') || 
        window.getComputedStyle(app).display === 'none' ||
        !splash.classList.contains('hidden')) {
      console.warn('Aplicação ainda oculta após alteração de classes, forçando exibição com estilos inline...');
      splash.style.display = 'none';
      app.style.display = 'flex';
      app.style.opacity = '1';
    }
  }, 100);
  
  console.log('Estado após alteração - splash:', splash.className, splash.style.display);
  console.log('Estado após alteração - app:', app.className, app.style.display);
}

// Exportar funções para uso em outros arquivos
window.appUtils = {
  checkRequiredModules,
  updateUserInfo,
  loadUserData,
  showErrorMessage,
  handleUrlParams
};
