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
    if (window.storageUtils && typeof window.storageUtils.saveApiKeyLocally === 'function') {
        window.storageUtils.saveApiKeyLocally(apiKey);
        console.log("Chave API salva localmente");
    } else {
        console.warn("storageUtils não disponível para salvar localmente");
        // Fallback para localStorage direto
        localStorage.setItem('openai_api_key', apiKey);
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
    
    if (!statusDiv || !errorDiv) {
        console.error("Elementos de status não encontrados no DOM");
        return;
    }
    
    if (isError) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        statusDiv.textContent = 'Pronto para gravar. Clique em "Iniciar Gravação".';
    } else {
        statusDiv.textContent = message;
        errorDiv.style.display = 'none';
    }
    
    // Adicionar um pequeno efeito visual
    statusDiv.style.animation = 'highlight 1s ease';
    setTimeout(() => {
        statusDiv.style.animation = '';
    }, 1000);
}

// Mostrar erro
function showError(message) {
    console.error("Erro:", message);
    updateStatus(message, true);
}
