// Funções para gerenciamento seguro da chave API e outros dados sensíveis

// Verificar se a chave API é válida
function isValidApiKey(apiKey) {
    return apiKey && typeof apiKey === 'string' && apiKey.startsWith('sk-');
}

// Salvar chave API localmente com expiração
function saveApiKeyLocally(apiKey) {
    // Usar a função do módulo de segurança
    const encryptedKey = window.securityUtils.encryptApiKey(apiKey);
    const expirationTime = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
    
    localStorage.setItem('openai_api_key_encrypted', encryptedKey);
    localStorage.setItem('openai_api_key_expiration', expirationTime.toString());
    
    // Para compatibilidade com o código existente
    localStorage.setItem('openai_api_key', apiKey);
}

// Obter chave API salva
function getApiKey() {
    // Verificar localStorage primeiro (versão criptografada)
    const encryptedKey = localStorage.getItem('openai_api_key_encrypted');
    const expirationTime = localStorage.getItem('openai_api_key_expiration');
    
    if (encryptedKey && expirationTime) {
        // Verificar se expirou
        if (Date.now() < parseInt(expirationTime)) {
            // Usar a função do módulo de segurança
            return window.securityUtils.decryptApiKey(encryptedKey);
        } else {
            // Remover chave expirada
            localStorage.removeItem('openai_api_key_encrypted');
            localStorage.removeItem('openai_api_key_expiration');
        }
    }
    
    // Compatibilidade com versão anterior (não criptografada)
    const legacyKey = localStorage.getItem('openai_api_key');
    if (legacyKey) {
        // Migrar para o novo formato
        if (isValidApiKey(legacyKey)) {
            saveApiKeyLocally(legacyKey);
            return legacyKey;
        }
    }
    
    // Chave não encontrada ou expirada
    return null;
}

// Carregar a chave API do Firebase
function loadApiKeyFromFirebase(userId) {
    return firebase.database().ref('MapzyVox/users/' + userId).once('value')
        .then((snapshot) => {
            const userData = snapshot.val();
            // Sanitizar dados para os logs
            console.log('Dados do usuário recuperados do Firebase:', 
                        window.securityUtils.sanitizeDataForLogs(userData));
                        
            if (userData && userData.apiKey) {
                try {
                    // Usar a função do módulo de segurança para descriptografar
                    const apiKey = window.securityUtils.decryptApiKey(userData.apiKey);
                    if (isValidApiKey(apiKey)) {
                        // Salvar localmente também
                        saveApiKeyLocally(apiKey);
                        return apiKey;
                    }
                } catch (e) {
                    console.error('Erro ao descriptografar chave do Firebase:', e);
                }
            }
            return null;
        })
        .catch((error) => {
            console.error('Erro ao carregar chave API do Firebase:', error);
            return null;
        });
}

// Carregar a chave API (tenta localStorage e depois Firebase)
function loadApiKey() {
    // Primeiro tenta carregar do localStorage
    const localApiKey = getApiKey();
    if (localApiKey) {
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
            apiKeyInput.value = localApiKey;
        }
        return true;
    }
    
    // Se não encontrou no localStorage e o usuário está logado, tenta carregar do Firebase
    const user = firebase.auth().currentUser;
    if (user) {
        loadApiKeyFromFirebase(user.uid)
            .then(apiKey => {
                if (apiKey) {
                    const apiKeyInput = document.getElementById('apiKey');
                    if (apiKeyInput) {
                        apiKeyInput.value = apiKey;
                    }
                }
            });
        return false;
    }
    
    return false;
}

// Função segura para usar a chave API em requisições
function useApiKeySecurely(callback) {
    const apiKey = getApiKey();
    if (!isValidApiKey(apiKey)) {
        return Promise.reject(new Error('Chave API inválida ou não configurada'));
    }
    
    // Chamar o callback com a chave API
    return callback(apiKey);
}

// Exportar funções para uso em outros arquivos
window.storageUtils = {
    isValidApiKey,
    saveApiKeyLocally,
    getApiKey,
    loadApiKeyFromFirebase,
    loadApiKey,
    useApiKeySecurely
};
