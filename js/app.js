/**
 * Mapzy Vox IA - Script de inicialização principal
 * Ponto de entrada para a aplicação, coordenando o carregamento de módulos
 */

// Evento de carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado. Iniciando aplicação Mapzy Vox IA...');
  
  // Verificar se os elementos críticos da UI foram carregados
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  
  if (!splash || !app) {
    console.error('Elementos críticos da UI não encontrados. Verifique o HTML.');
    return;
  }
  
  // Configurar manipulador para o botão de menu móvel
  setupMobileMenu();
  
  // Verificar autenticação para continuar a inicialização
  checkAuthentication();
});

/**
 * Configurar o menu móvel
 */
function setupMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  
  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
    console.log('Menu móvel configurado com sucesso');
  } else {
    console.warn('Elementos do menu móvel não encontrados');
  }
}

/**
 * Verificar o estado de autenticação
 */
function checkAuthentication() {
  console.log('Verificando estado de autenticação...');
  
  if (!firebase || !firebase.auth) {
    console.error('Firebase Auth não está disponível');
    showSplashError('Erro: Serviço de autenticação indisponível');
    return;
  }
  
  // Verificar estado de autenticação
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log('Usuário autenticado:', user.email);
      initializeApp(user);
    } else {
      console.log('Usuário não autenticado. Redirecionando para login...');
      window.location.href = './login.html';
    }
  });
}

/**
 * Inicializar a aplicação
 */
function initializeApp(user) {
  console.log('Inicializando aplicação para usuário:', user.email);
  
  // Inicializar módulos em sequência controlada
  initializeModules()
    .then(() => loadUserData(user))
    .then(() => showApp())
    .catch(error => {
      console.error('Erro ao inicializar aplicação:', error);
      showSplashError('Erro ao inicializar: ' + error.message);
    });
}

/**
 * Inicializar módulos da aplicação
 */
async function initializeModules() {
  console.log('Inicializando módulos da aplicação...');
  
  // Inicializar transcription utils (Se disponível)
  if (window.transcriptionUtils && typeof window.transcriptionUtils.initTranscription === 'function') {
    window.transcriptionUtils.initTranscription();
    console.log('Módulo de transcrição inicializado');
  } else {
    console.warn('Módulo de transcrição não encontrado');
  }
  
  // Inicializar gravador de áudio (Se disponível)
  if (typeof window.initAudioRecorder === 'function') {
    window.initAudioRecorder();
    console.log('Módulo de gravação de áudio inicializado');
  } else {
    console.warn('Módulo de gravação de áudio não encontrado');
  }
  
  // Inicializar UI Handler (Se disponível)
  if (window.uiHandler && typeof window.uiHandler.setupEventListeners === 'function') {
    window.uiHandler.setupEventListeners();
    console.log('Módulo UI Handler inicializado');
  }
  
  // Configurar navegação
  setupNavigation();
  
  console.log('Módulos da aplicação inicializados com sucesso');
}

/**
 * Configurar navegação entre páginas
 */
function setupNavigation() {
  // Adicionar eventos de clique nos links de navegação
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      navigateTo(page);
    });
  });
  
  // Verificar hash na URL ao carregar
  const hash = window.location.hash.substring(1);
  if (hash && document.getElementById(`${hash}-page`)) {
    navigateTo(hash);
  } else {
    navigateTo('dashboard');
  }
  
  console.log('Navegação configurada com sucesso');
}

/**
 * Navegar para uma página específica
 */
function navigateTo(page) {
  // Verificar se a página existe
  if (!document.getElementById(`${page}-page`)) {
    console.warn(`Página ${page} não encontrada`);
    return;
  }
  
  // Esconder todas as páginas
  document.querySelectorAll('.page-content').forEach(p => {
    p.style.display = 'none';
  });
  
  // Remover classe ativa de todos os links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Mostrar a página selecionada
  const pageElement = document.getElementById(`${page}-page`);
  if (pageElement) {
    pageElement.style.display = 'block';
  }
  
  // Adicionar classe ativa ao link
  const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  // Atualizar título da página
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
  }
  
  // Fechar o menu móvel após a navegação
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth < 992) {
    sidebar.classList.remove('show');
  }
  
  // Atualizar URL com hash
  window.location.hash = page;
  
  // Carregar dados específicos da página
  if (page === 'history') {
    if (window.transcriptionUtils && typeof window.transcriptionUtils.loadTranscriptionsList === 'function') {
      window.transcriptionUtils.loadTranscriptionsList();
    }
  }
  
  console.log(`Navegado para página: ${page}`);
}

/**
 * Carregar dados do usuário
 */
function loadUserData(user) {
  console.log('Carregando dados do usuário...');
  
  // Atualizar informações do usuário na interface
  updateUserInfo(user);
  
  // Mostrar spinners de carregamento
  const recentSpinner = document.getElementById('recent-transcriptions-spinner');
  const allSpinner = document.getElementById('all-transcriptions-spinner');
  
  if (recentSpinner) recentSpinner.style.display = 'block';
  if (allSpinner) allSpinner.style.display = 'block';
  
  // Carregar transcrições do usuário via Firebase Helper
  if (window.firebaseHelper && typeof window.firebaseHelper.getUserTranscriptions === 'function') {
    return window.firebaseHelper.getUserTranscriptions()
      .then(transcriptions => {
        console.log(`Carregadas ${transcriptions.length} transcrições`);
        
        // Armazenar todas as transcrições
        window.allTranscriptions = transcriptions;
        
        // Atualizar estatísticas
        updateStats(transcriptions);
        
        // Carregar transcrições recentes
        loadRecentTranscriptions(transcriptions);
        
        // Esconder spinners
        if (recentSpinner) recentSpinner.style.display = 'none';
        if (allSpinner) allSpinner.style.display = 'none';
        
        // Verificar parâmetros da URL
        handleUrlParams();
        
        return transcriptions;
      })
      .catch(error => {
        console.error('Erro ao carregar transcrições:', error);
        
        // Esconder spinners
        if (recentSpinner) recentSpinner.style.display = 'none';
        if (allSpinner) allSpinner.style.display = 'none';
        
        // Mostrar estado vazio
        const emptyStateRecent = document.getElementById('empty-state-recent');
        if (emptyStateRecent) emptyStateRecent.style.display = 'flex';
        
        return [];
      });
  } else {
    console.warn('firebaseHelper.getUserTranscriptions não está disponível');
    
    // Esconder spinners
    if (recentSpinner) recentSpinner.style.display = 'none';
    if (allSpinner) allSpinner.style.display = 'none';
    
    return Promise.resolve([]);
  }
}

/**
 * Atualizar informações do usuário na interface
 */
function updateUserInfo(user) {
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
}

/**
 * Atualizar estatísticas no dashboard
 */
function updateStats(transcriptions) {
  // Total de transcrições
  const totalTranscriptionsSpan = document.getElementById('total-transcriptions');
  if (totalTranscriptionsSpan) {
    totalTranscriptionsSpan.textContent = transcriptions.length;
  }
  
  // Última atividade
  const latestActivitySpan = document.getElementById('latest-activity');
  if (latestActivitySpan) {
    if (transcriptions.length > 0) {
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
    } else {
      latestActivitySpan.textContent = '-';
    }
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
 * Carregar transcrições recentes
 */
function loadRecentTranscriptions(transcriptions) {
  const recentList = document.getElementById('recent-transcriptions');
  if (!recentList) return;
  
  recentList.innerHTML = '';
  
  if (!transcriptions || transcriptions.length === 0) {
    // Mostrar estado vazio
    const emptyStateRecent = document.getElementById('empty-state-recent');
    if (emptyStateRecent) emptyStateRecent.style.display = 'flex';
    return;
  }
  
  // Esconder estado vazio
  const emptyStateRecent = document.getElementById('empty-state-recent');
  if (emptyStateRecent) emptyStateRecent.style.display = 'none';
  
  // Mostrar as 5 transcrições mais recentes
  const recentTranscriptions = [...transcriptions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
  
  recentTranscriptions.forEach(item => {
    if (window.transcriptionUtils && typeof window.transcriptionUtils.createTranscriptionListItem === 'function') {
      // Usar a função do módulo de transcrição se disponível
      const li = window.transcriptionUtils.createTranscriptionListItem(item);
      recentList.appendChild(li);
    } else {
      // Fallback caso a função não esteja disponível
      const li = createTranscriptionItem(item);
      recentList.appendChild(li);
    }
  });
}

/**
 * Carregar todas as transcrições (para a página de histórico)
 */
function loadAllTranscriptions(searchTerm = '') {
  const list = document.getElementById('all-transcriptions-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  let filteredTranscriptions = window.allTranscriptions || [];
  
  // Filtrar por termo de busca se fornecido
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredTranscriptions = filteredTranscriptions.filter(t => 
      t.title.toLowerCase().includes(term) || 
      t.text.toLowerCase().includes(term) ||
      t.processedText.toLowerCase().includes(term)
    );
  }
  
  // Ordenar por data (mais recentes primeiro)
  filteredTranscriptions.sort((a, b) => b.createdAt - a.createdAt);
  
  if (filteredTranscriptions.length === 0) {
    // Mostrar estado vazio
    const emptyStateAll = document.getElementById('empty-state-all');
    if (emptyStateAll) emptyStateAll.style.display = 'flex';
    return;
  }
  
  // Esconder estado vazio
  const emptyStateAll = document.getElementById('empty-state-all');
  if (emptyStateAll) emptyStateAll.style.display = 'none';
  
  // Adicionar cada transcrição à lista
  filteredTranscriptions.forEach(item => {
    if (window.transcriptionUtils && typeof window.transcriptionUtils.createTranscriptionListItem === 'function') {
      // Usar a função do módulo de transcrição se disponível
      const li = window.transcriptionUtils.createTranscriptionListItem(item);
      list.appendChild(li);
    } else {
      // Fallback caso a função não esteja disponível
      const li = createTranscriptionItem(item);
      list.appendChild(li);
    }
  });
}

/**
 * Criar um item de lista de transcrição
 */
function createTranscriptionItem(item) {
  const li = document.createElement('li');
  li.className = 'history-item';
  
  // Escapar o HTML por segurança
  const title = escapeHTML(item.title);
  const preview = escapeHTML(item.text.substring(0, 100)) + (item.text.length > 100 ? '...' : '');
  
  const html = `
    <div class="history-item-header">
      <div class="history-item-title">${title}</div>
      <div class="history-item-date">${new Date(item.createdAt).toLocaleString()}</div>
    </div>
    <div class="history-item-preview">${preview}</div>
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
  
  // Adicionar eventos aos botões
  const viewBtn = li.querySelector('.view-btn');
  if (viewBtn) {
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.transcriptionUtils && typeof window.transcriptionUtils.viewTranscription === 'function') {
        window.transcriptionUtils.viewTranscription(item.id);
      }
    });
  }
  
  const editBtn = li.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.transcriptionUtils && typeof window.transcriptionUtils.editTranscription === 'function') {
        window.transcriptionUtils.editTranscription(item.id);
      }
    });
  }
  
  const deleteBtn = li.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Tem certeza que deseja excluir esta transcrição?')) {
        if (window.transcriptionUtils && typeof window.transcriptionUtils.deleteTranscription === 'function') {
          window.transcriptionUtils.deleteTranscription(item.id);
        }
      }
    });
  }
  
  // O item inteiro também abre o modal de visualização
  li.addEventListener('click', () => {
    if (window.transcriptionUtils && typeof window.transcriptionUtils.viewTranscription === 'function') {
      window.transcriptionUtils.viewTranscription(item.id);
    }
  });
  
  return li;
}

/**
 * Processar parâmetros da URL
 */
function handleUrlParams() {
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
    navigateTo('record');
  } else if (action === 'history') {
    navigateTo('history');
  }
}

/**
 * Mostrar a aplicação ocultando a tela de carregamento
 */
function showApp() {
  console.log('Exibindo aplicação principal...');
  
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  
  if (!splash || !app) {
    console.error('Elementos splash ou app não encontrados!');
    return;
  }
  
  // Adicionar logs para verificar o estado antes da alteração
  console.log('Estado inicial - splash:', splash.className);
  console.log('Estado inicial - app:', app.className);
  
  // Esconder a tela de carregamento e mostrar a aplicação
  splash.classList.add('hidden');
  app.classList.remove('hidden');
  
  // Garantir que a aplicação esteja visível (necessário em alguns navegadores)
  setTimeout(() => {
    if (app.classList.contains('hidden') || window.getComputedStyle(app).display === 'none') {
      console.warn('A aplicação ainda pode estar oculta. Forçando exibição com estilos inline...');
      splash.style.display = 'none';
      app.style.display = 'flex';
    }
  }, 100);
  
  console.log('Estado após alteração - splash:', splash.className);
  console.log('Estado após alteração - app:', app.className);
}

/**
 * Mostrar erro na tela de carregamento
 */
function showSplashError(message) {
  const statusText = document.getElementById('status-text');
  if (statusText) {
    statusText.textContent = message;
    statusText.style.color = '#e74c3c';
  }
}

/**
 * Escapar caracteres HTML para evitar XSS
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Exportar funções para uso global
window.appIndex = {
  navigateTo,
  loadRecentTranscriptions,
  loadAllTranscriptions,
  updateStats,
  showApp
};
