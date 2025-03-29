// Inicializar a interface de usuário
function initUI() {
    console.log("Inicializando UI...");
    
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
        console.log("Evento de logout registrado");
    }
    
    // Configurar o manipulador de evento para o botão de salvar chave API
    const saveApiKeyButton = document.getElementById('saveApiKey');
    if (saveApiKeyButton) {
        // Remover quaisquer manipuladores de eventos existentes para evitar duplicação
        const newSaveButton = saveApiKeyButton.cloneNode(true);
        saveApiKeyButton.parentNode.replaceChild(newSaveButton, saveApiKeyButton);
        
        // Adicionar o manipulador de evento
        newSaveButton.addEventListener('click', () => {
            console.log("Botão salvar API clicado");
            handleSaveApiKey();
        });
        
        console.log("Evento de salvar API key registrado");
    } else {
        console.warn("Botão de salvar API não encontrado no DOM");
    }
    
    // Verificar se a chave API já está disponível e habilitar botões se necessário
    checkApiKeyAndEnableRecording();
}

// Função para verificar se a chave API já está disponível e habilitar botões se for o caso
function checkApiKeyAndEnableRecording() {
    // Tentar obter a chave API diretamente do localStorage como fallback
    const apiKey = localStorage.getItem('openai_api_key');
    
    if (apiKey && apiKey.startsWith('sk-')) {
        console.log("Chave API válida encontrada, habilitando botão de gravação");
        
        // Mostrar a chave no campo de input
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
            apiKeyInput.value = apiKey;
        }
        
        // Habilitar botão de gravação
        const startRecordingButton = document.getElementById('startRecording');
        if (startRecordingButton) {
            startRecordingButton.disabled = false;
        }
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
    console.log("Função handleSaveApiKey chamada com chave:", apiKey ? "***" : "vazia");
    
    if (!apiKey) {
        showError("Por favor, insira uma chave API válida");
        return;
    }
    
    if (!apiKey.startsWith("sk-")) {
        showError("Chave API inválida. Deve começar com 'sk-'");
        return;
    }
    
    // Mostrar feedback visual
    const saveButton = document.getElementById('saveApiKey');
    const originalText = saveButton.textContent;
    saveButton.textContent = "Salvando...";
    saveButton.disabled = true;
    
    // Primeiro salvar localmente
    try {
        // Fallback para localStorage direto
        localStorage.setItem('openai_api_key', apiKey);
        console.log("Chave API salva no localStorage");
    } catch (err) {
        console.warn("Erro ao salvar no localStorage:", err);
    }
    
    // Também tenta usar o storageUtils se disponível
    if (window.storageUtils && typeof window.storageUtils.saveApiKeyLocally === 'function') {
        try {
            window.storageUtils.saveApiKeyLocally(apiKey);
            console.log("Chave API salva via storageUtils");
        } catch (err) {
            console.warn("Erro ao salvar via storageUtils:", err);
        }
    } 
    
    // Tentar salvar no Firebase
    if (window.firebaseHelper && typeof window.firebaseHelper.saveUserApiKey === 'function') {
        console.log("Chamando firebaseHelper.saveUserApiKey...");
        window.firebaseHelper.saveUserApiKey(apiKey)
            .then(() => {
                console.log("Chave API salva com sucesso no Firebase");
                updateStatus("Chave API salva com sucesso!");
                
                // Atualizar status de habilitação do botão de gravação
                const startRecordingButton = document.getElementById('startRecording');
                if (startRecordingButton) {
                    startRecordingButton.disabled = false;
                }
            })
            .catch((error) => {
                console.error("Erro ao salvar chave API no Firebase:", error);
                showError("Erro ao salvar chave API: " + error.message);
            })
            .finally(() => {
                // Restaurar o botão
                saveButton.textContent = originalText;
                saveButton.disabled = false;
            });
    } else {
        console.warn("firebaseHelper.saveUserApiKey não está disponível");
        
        // Mesmo sem Firebase, consideramos um sucesso local
        updateStatus("Chave API salva localmente com sucesso!");
        saveButton.textContent = originalText;
        saveButton.disabled = false;
        
        // Habilitar botão de gravação mesmo sem Firebase
        const startRecordingButton = document.getElementById('startRecording');
        if (startRecordingButton) {
            startRecordingButton.disabled = false;
        }
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
