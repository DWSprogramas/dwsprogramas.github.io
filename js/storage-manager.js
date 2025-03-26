// Funções para gerenciamento seguro da chave API e outros dados sensíveis

// Constantes para gerenciamento de armazenamento
const STORAGE_KEYS = {
  API_KEY: 'mapzyvox_api_key_encrypted',
  API_KEY_EXPIRATION: 'mapzyvox_api_key_expiration',
  API_KEY_LEGACY: 'openai_api_key',
  THEME: 'mapzyvox_theme',
  USER_PREFERENCES: 'mapzyvox_user_preferences',
  RECENT_TRANSCRIPTIONS: 'mapzyvox_recent_transcriptions'
};

// Duração padrão do cache para itens (em milisegundos)
const DEFAULT_CACHE_DURATION = {
  API_KEY: 24 * 60 * 60 * 1000, // 24 horas
  USER_PREFERENCES: 30 * 24 * 60 * 60 * 1000, // 30 dias
  RECENT_TRANSCRIPTIONS: 7 * 24 * 60 * 60 * 1000 // 7 dias
};

// Verificar se a chave API é válida
function isValidApiKey(apiKey) {
  return apiKey && typeof apiKey === 'string' && apiKey.startsWith('sk-') && apiKey.length > 20;
}

// Salvar chave API localmente com expiração
function saveApiKeyLocally(apiKey) {
  if (!isValidApiKey(apiKey)) {
    console.error('Tentativa de salvar uma chave API inválida');
    return false;
  }
  
  try {
    // Usar a função do módulo de segurança
    const encryptedKey = window.securityUtils?.encryptApiKey(apiKey) || btoa(apiKey);
    const expirationTime = Date.now() + DEFAULT_CACHE_DURATION.API_KEY;
    
    localStorage.setItem(STORAGE_KEYS.API_KEY, encryptedKey);
    localStorage.setItem(STORAGE_KEYS.API_KEY_EXPIRATION, expirationTime.toString());
    
    // Para compatibilidade com o código existente
    localStorage.setItem(STORAGE_KEYS.API_KEY_LEGACY, apiKey);
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar chave API localmente:', error);
    return false;
  }
}

// Obter chave API salva
function getApiKey() {
  try {
    // Verificar localStorage primeiro (versão criptografada)
    const encryptedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    const expirationTime = localStorage.getItem(STORAGE_KEYS.API_KEY_EXPIRATION);
    
    if (encryptedKey && expirationTime) {
      // Verificar se expirou
      if (Date.now() < parseInt(expirationTime)) {
        // Usar a função do módulo de segurança
        const apiKey = window.securityUtils?.decryptApiKey(encryptedKey) || atob(encryptedKey);
        if (isValidApiKey(apiKey)) {
          return apiKey;
        }
      } else {
        // Remover chave expirada
        removeExpiredItems();
      }
    }
    
    // Compatibilidade com versão anterior (não criptografada)
    const legacyKey = localStorage.getItem(STORAGE_KEYS.API_KEY_LEGACY);
    if (legacyKey && isValidApiKey(legacyKey)) {
      // Migrar para o novo formato
      saveApiKeyLocally(legacyKey);
      return legacyKey;
    }
    
    // Chave não encontrada ou expirada
    return null;
  } catch (error) {
    console.error('Erro ao obter chave API:', error);
    return null;
  }
}

// Carregar a chave API do Firebase
function loadApiKeyFromFirebase() {
  // Verificar se firebaseHelper está disponível
  if (!window.firebaseHelper || !window.firebaseHelper.loadUserApiKey) {
    console.error('Firebase helper não está disponível');
    return Promise.reject(new Error('Firebase helper não está disponível'));
  }
  
  return window.firebaseHelper.loadUserApiKey()
    .then(apiKey => {
      if (apiKey && isValidApiKey(apiKey)) {
        // Salvar localmente também
        saveApiKeyLocally(apiKey);
        return apiKey;
      }
      return null;
    })
    .catch(error => {
      console.error('Erro ao carregar chave API do Firebase:', error);
      return null;
    });
}

// Carregar a chave API (tenta localStorage e depois Firebase)
function loadApiKey() {
  // Primeiro tenta carregar do localStorage
  const localApiKey = getApiKey();
  if (localApiKey) {
    // Tentar preencher o campo de entrada de API, se existir
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
      apiKeyInput.value = localApiKey;
    }
    
    console.log('Chave API carregada do armazenamento local');
    return Promise.resolve(localApiKey);
  }
  
  // Se não encontrou no localStorage, tenta carregar do Firebase
  console.log('Chave API não encontrada localmente, tentando carregar do Firebase...');
  return loadApiKeyFromFirebase()
    .then(apiKey => {
      if (apiKey) {
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
          apiKeyInput.value = apiKey;
        }
        
        console.log('Chave API carregada do Firebase');
        return apiKey;
      }
      
      console.log('Chave API não encontrada no Firebase');
      return null;
    });
}

// Função segura para usar a chave API em requisições
function useApiKeySecurely(callback) {
  return loadApiKey()
    .then(apiKey => {
      if (!apiKey || !isValidApiKey(apiKey)) {
        throw new Error('Chave API inválida ou não configurada');
      }
      
      // Chamar o callback com a chave API
      return callback(apiKey);
    });
}

// Salvar preferências do usuário
function saveUserPreferences(preferences) {
  if (!preferences) return false;
  
  try {
    const serialized = JSON.stringify(preferences);
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, serialized);
    
    // Definir expiração
    const expirationTime = Date.now() + DEFAULT_CACHE_DURATION.USER_PREFERENCES;
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES + '_expiration', expirationTime.toString());
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar preferências do usuário:', error);
    return false;
  }
}

// Carregar preferências do usuário
function getUserPreferences() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (!serialized) return null;
    
    // Verificar expiração
    const expirationTime = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES + '_expiration');
    if (expirationTime && Date.now() > parseInt(expirationTime)) {
      // Remover item expirado
      localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
      localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES + '_expiration');
      return null;
    }
    
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Erro ao carregar preferências do usuário:', error);
    return null;
  }
}

// Salvar transcrições recentes no armazenamento local
function saveRecentTranscriptions(transcriptions, limit = 5) {
  if (!Array.isArray(transcriptions)) return false;
  
  try {
    // Limitar a quantidade armazenada localmente
    const limitedTranscriptions = transcriptions.slice(0, limit);
    
    // Remover dados desnecessários para economizar espaço
    const simplified = limitedTranscriptions.map(t => ({
      id: t.id,
      title: t.title,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      preview: t.text ? t.text.substring(0, 100) : ''
    }));
    
    const serialized = JSON.stringify(simplified);
    localStorage.setItem(STORAGE_KEYS.RECENT_TRANSCRIPTIONS, serialized);
    
    // Definir expiração
    const expirationTime = Date.now() + DEFAULT_CACHE_DURATION.RECENT_TRANSCRIPTIONS;
    localStorage.setItem(STORAGE_KEYS.RECENT_TRANSCRIPTIONS + '_expiration', expirationTime.toString());
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar transcrições recentes:', error);
    return false;
  }
}

// Carregar transcrições recentes
function getRecentTranscriptions() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.RECENT_TRANSCRIPTIONS);
    if (!serialized) return [];
    
    // Verificar expiração
    const expirationTime = localStorage.getItem(STORAGE_KEYS.RECENT_TRANSCRIPTIONS + '_expiration');
    if (expirationTime && Date.now() > parseInt(expirationTime)) {
      // Remover item expirado
      localStorage.removeItem(STORAGE_KEYS.RECENT_TRANSCRIPTIONS);
      localStorage.removeItem(STORAGE_KEYS.RECENT_TRANSCRIPTIONS + '_expiration');
      return [];
    }
    
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Erro ao carregar transcrições recentes:', error);
    return [];
  }
}

// Remover todos os itens expirados do armazenamento local
function removeExpiredItems() {
  try {
    const now = Date.now();
    
    // Verificar cada item com '_expiration'
    Object.keys(localStorage).forEach(key => {
      if (key.endsWith('_expiration')) {
        const expirationTime = parseInt(localStorage.getItem(key));
        if (now > expirationTime) {
          // Remover o item expirado e sua entrada de expiração
          const baseKey = key.replace('_expiration', '');
          localStorage.removeItem(baseKey);
          localStorage.removeItem(key);
          console.log(`Item removido por expiração: ${baseKey}`);
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao remover itens expirados:', error);
    return false;
  }
}

// Limpar dados de armazenamento específicos para o usuário atual ao fazer logout
function clearUserStorage() {
  try {
    // Não limpar todas as chaves do localStorage, apenas as relacionadas ao usuário
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    localStorage.removeItem(STORAGE_KEYS.API_KEY_EXPIRATION);
    localStorage.removeItem(STORAGE_KEYS.API_KEY_LEGACY);
    localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
    localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES + '_expiration');
    localStorage.removeItem(STORAGE_KEYS.RECENT_TRANSCRIPTIONS);
    localStorage.removeItem(STORAGE_KEYS.RECENT_TRANSCRIPTIONS + '_expiration');
    
    console.log('Dados de usuário removidos do armazenamento local');
    return true;
  } catch (error) {
    console.error('Erro ao limpar armazenamento do usuário:', error);
    return false;
  }
}

// Retornar o uso estimado de armazenamento pela aplicação
function getStorageUsage() {
  try {
    let totalSize = 0;
    let itemCount = 0;
    
    // Calcular o uso total
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('mapzyvox_')) {
        const value = localStorage.getItem(key);
        totalSize += (key.length + value.length) * 2; // Aproximadamente 2 bytes por caractere
        itemCount++;
      }
    });
    
    // Converter para KB ou MB para melhor leitura
    let formattedSize;
    if (totalSize < 1024) {
      formattedSize = `${totalSize} bytes`;
    } else if (totalSize < 1024 * 1024) {
      formattedSize = `${(totalSize / 1024).toFixed(2)} KB`;
    } else {
      formattedSize = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    }
    
    return {
      bytes: totalSize,
      formatted: formattedSize,
      itemCount: itemCount
    };
  } catch (error) {
    console.error('Erro ao calcular uso de armazenamento:', error);
    return {
      bytes: 0,
      formatted: '0 bytes',
      itemCount: 0
    };
  }
}

// Verificar se o armazenamento está quase cheio
function checkStorageQuota() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      return navigator.storage.estimate()
        .then(estimate => {
          const percentUsed = (estimate.usage / estimate.quota) * 100;
          return {
            total: estimate.quota,
            used: estimate.usage,
            available: estimate.quota - estimate.usage,
            percentUsed: percentUsed,
            isAlmostFull: percentUsed > 80, // Alerta se mais de 80% estiver em uso
            formatted: {
              total: formatBytes(estimate.quota),
              used: formatBytes(estimate.usage),
              available: formatBytes(estimate.quota - estimate.usage)
            }
          };
        });
    }
    
    return Promise.resolve(null); // API não suportada
  } catch (error) {
    console.error('Erro ao verificar cota de armazenamento:', error);
    return Promise.resolve(null);
  }
}

// Função auxiliar para formatar bytes em unidades legíveis
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Exportar funções para uso em outros arquivos
window.storageUtils = {
  isValidApiKey,
  saveApiKeyLocally,
  getApiKey,
  loadApiKeyFromFirebase,
  loadApiKey,
  useApiKeySecurely,
  saveUserPreferences,
  getUserPreferences,
  saveRecentTranscriptions,
  getRecentTranscriptions,
  removeExpiredItems,
  clearUserStorage,
  getStorageUsage,
  checkStorageQuota,
  formatBytes
};
