// Inicializar a interface de usuário
// Inicializar a interface de usuário
function initUI() {
    // Configurar navegação por abas
    setupTabs();
    
    // Configurar elementos editáveis
    setupEditableFields();
    
    // Configurar instalação PWA
    setupPWAInstall();
    
    // Mostrar informações do usuário se estiver logado
    mostrarInfoUsuario();
    
    // Adicionar manipulador de evento para o botão de logout
    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // Configurar o manipulador de evento para o botão de salvar chave API
    const saveApiKeyButton = document.getElementById('saveApiKey');
    if (saveApiKeyButton) {
        saveApiKeyButton.addEventListener('click', handleSaveApiKey);
    }
}

// Função para mostrar informações do usuário na interface
function mostrarInfoUsuario() {
    console.log('Verificando usuário para mostrar informações...');
    
    // Verificar se o Firebase está disponível
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const usuarioAtual = firebase.auth().currentUser;
        
        if (usuarioAtual) {
            console.log('Usuário autenticado:', usuarioAtual.email);
            
            // Mostrar elementos que devem ser visíveis apenas para usuários logados
            const elementosLogados = document.querySelectorAll('.auth-logged-in');
            elementosLogados.forEach(el => {
                el.style.display = 'block';
            });
            
            // Atualizar o email do usuário em todos os elementos com ID userEmail
            const elementosEmail = document.querySelectorAll('#userEmail');
            elementosEmail.forEach(el => {
                el.textContent = usuarioAtual.email;
            });
            
            // Atualizar o nome do usuário se disponível
            const nomeUsuario = usuarioAtual.displayName || 'Usuário';
            const elementosNome = document.querySelectorAll('#userName');
            elementosNome.forEach(el => {
                el.textContent = nomeUsuario;
            });
            
            // Adicionar avatar ou iniciais se disponível
            if (elementosNome.length > 0 && usuarioAtual.photoURL) {
                const elementosAvatar = document.querySelectorAll('.user-avatar');
                elementosAvatar.forEach(el => {
                    el.src = usuarioAtual.photoURL;
                    el.style.display = 'block';
                });
            } else {
                // Mostrar iniciais
                const iniciais = (nomeUsuario.charAt(0) || 'U').toUpperCase();
                const elementosIniciais = document.querySelectorAll('.user-initials');
                elementosIniciais.forEach(el => {
                    el.textContent = iniciais;
                    el.style.display = 'flex';
                });
            }
        } else {
            console.log('Nenhum usuário autenticado');
            
            // Esconder elementos que devem ser visíveis apenas para usuários logados
            const elementosLogados = document.querySelectorAll('.auth-logged-in');
            elementosLogados.forEach(el => {
                el.style.display = 'none';
            });
        }
    } else {
        console.error('Firebase Auth não está disponível');
    }
}

// Configurar abas de navegação
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover classe ativa de todas as abas
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Adicionar classe ativa à aba clicada
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId + 'Tab').classList.add('active');
            
            // Se a aba for histórico, carregar as transcrições
            if (tabId === 'history') {
                loadTranscriptionsList();
            }
        });
    });
}

// Configurar campos editáveis
function setupEditableFields() {
    const editableElements = document.querySelectorAll('.editable');
    editableElements.forEach(el => {
        el.addEventListener('focus', () => {
            el.style.borderColor = '#3498db';
            el.style.boxShadow = '0 0 5px rgba(52, 152, 219, 0.5)';
        });
        
        el.addEventListener('blur', () => {
            el.style.borderColor = '#ccc';
            el.style.boxShadow = 'none';
            
            // Se for o campo de transcrição, atualizar o estado de habilitação do botão de processar
            if (el.id === 'transcription') {
                document.getElementById('processText').disabled = el.textContent.trim() === '';
            }
        });
    });
}

// Configurar instalação PWA
function setupPWAInstall() {
    const pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
    const installButton = document.getElementById('installButton');
    const dismissButton = document.getElementById('dismissButton');
    
    // Variável para armazenar o evento beforeinstallprompt
    let deferredPrompt;
    
    // Detectar se o app já está instalado ou pode ser instalado
    window.addEventListener('beforeinstallprompt', (e) => {
        // Previne o comportamento padrão
        e.preventDefault();
        // Armazena o evento para que possa ser acionado mais tarde
        deferredPrompt = e;
        // Mostra o banner de instalação
        pwaInstallPrompt.style.display = 'block';
    });
    
    // Lidar com o botão de instalação
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            // Mostra o prompt de instalação
            deferredPrompt.prompt();
            
            // Espera pelo resultado
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} a instalação`);
            
            // Limpa a variável, pois o prompt só pode ser usado uma vez
            deferredPrompt = null;
            
            // Esconde o banner
            pwaInstallPrompt.style.display = 'none';
        });
    }
    
    // Lidar com o botão de dispensar
    if (dismissButton) {
        dismissButton.addEventListener('click', () => {
            pwaInstallPrompt.style.display = 'none';
        });
    }
    
    // Verificar se o app já está instalado
    window.addEventListener('appinstalled', () => {
        // Esconde o banner
        pwaInstallPrompt.style.display = 'none';
        deferredPrompt = null;
        console.log('PWA foi instalado');
    });
}

// Em ui-controller.js
 function loadTranscriptionsList() {
  // Chamar a implementação do módulo de transcrição
  if (window.transcriptionUtils && window.transcriptionUtils.loadTranscriptionsList) {
    window.transcriptionUtils.loadTranscriptionsList();
  } else {
    console.error('Módulo de transcrição não disponível');
  }
}


// Manipulador para o botão de salvar chave API
function handleSaveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (apiKey && apiKey.startsWith("sk-")) {
        // Salvar localmente
        window.storageUtils.saveApiKeyLocally(apiKey);
        
        // Salvar no Firebase se o usuário estiver logado
        if (firebase.auth().currentUser) {
            window.firebaseHelper.saveUserApiKey(apiKey)
                .then(() => {
                    updateStatus("Chave API salva com sucesso!");
                })
                .catch((error) => {
                    showError("Erro ao salvar chave API: " + error.message);
                });
        } else {
            updateStatus("Chave API salva localmente com sucesso!");
        }
    } else {
        showError("Chave API inválida. Deve começar com 'sk-'");
    }
}

// Atualizar status
function updateStatus(message, isError = false) {
    const statusDiv = document.getElementById('status');
    const errorDiv = document.getElementById('error');
    
    if (isError) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        statusDiv.textContent = 'Pronto para gravar. Clique em "Iniciar Gravação".';
    } else {
        statusDiv.textContent = message;
        errorDiv.style.display = 'none';
    }
}

// Mostrar erro
function showError(message) {
    updateStatus(message, true);
}
