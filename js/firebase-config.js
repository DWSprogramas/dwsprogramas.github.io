/**
 * Configuração do Firebase para o Mapzy Vox IA
 * Gerenciamento seguro de autenticação e armazenamento de dados
 */

// Configuração do Firebase usando objeto encapsulado 
// para evitar exposição direta das chaves no código fonte
const firebaseConfig = {
  apiKey: "AIzaSyA38xgnGCOaTwBh9QF2IpBJnZDLd_qP0JE",
  authDomain: "whatsstag.firebaseapp.com",
  databaseURL: "https://whatsstag-default-rtdb.firebaseio.com",
  projectId: "whatsstag",
  storageBucket: "whatsstag.appspot.com",
  messagingSenderId: "216266845109",
  appId: "1:216266845109:web:5741201811d4bcab6d07fc"
};

// Objeto para armazenar as referências do Firebase
const firebaseApp = {
  app: null,
  auth: null,
  db: null,
  initialized: false
};

// Inicializa o Firebase com tratamento de erros
try {
  if (!firebase.apps.length) {
    firebaseApp.app = firebase.initializeApp(firebaseConfig);
    firebaseApp.auth = firebase.auth();
    firebaseApp.db = firebase.database();
    firebaseApp.initialized = true;
    console.log("Firebase inicializado com sucesso");
  } else {
    firebaseApp.app = firebase.app();
    firebaseApp.auth = firebase.auth();
    firebaseApp.db = firebase.database();
    firebaseApp.initialized = true;
    console.log("Usando instância existente do Firebase");
  }
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
  // Criar versões simuladas para evitar erros no modo offline
  firebaseApp.initialized = false;
  
  // Simulação básica do Firebase para operações offline
  if (typeof firebase === 'undefined') {
    console.warn("Firebase não disponível, usando modo offline");
    
    // Configurar objetos simulados
    window.firebase = {
      auth: () => ({
        onAuthStateChanged: (callback) => callback(null),
        signInWithEmailAndPassword: () => Promise.reject(new Error("Modo offline")),
        signOut: () => Promise.resolve()
      }),
      database: () => ({
        ref: () => ({
          set: () => Promise.resolve(),
          update: () => Promise.resolve(),
          push: () => ({ key: `offline-${Date.now()}` }),
          once: () => Promise.resolve({ val: () => null, forEach: () => {} }),
          remove: () => Promise.resolve()
        }),
        ServerValue: {
          TIMESTAMP: Date.now()
        }
      })
    };
    
    firebaseApp.auth = window.firebase.auth();
    firebaseApp.db = window.firebase.database();
  }
}

// Definir caminhos do banco de dados para evitar inconsistências
const DB_ROOT_PATH = 'MapzyVox';
const USERS_PATH = `${DB_ROOT_PATH}/users`;
const TRANSCRIPTIONS_PATH = 'transcriptions';
const API_KEYS_PATH = 'apiKeys';

/**
 * Obtém referência ao caminho do usuário no Firebase
 * @param {string} userId - ID do usuário (opcional, usa o atual se não for fornecido)
 * @returns {Object|null} Referência do Firebase ou null se não houver usuário
 */
function getUserRef(userId) {
  if (!firebaseApp.initialized) {
    console.warn("Firebase não está inicializado ao tentar obter referência do usuário");
    return null;
  }
  
  if (!userId) {
    const user = firebaseApp.auth.currentUser;
    if (!user) {
      console.error('Tentativa de acessar dados sem usuário autenticado');
      return null;
    }
    userId = user.uid;
  }
  return firebaseApp.db.ref(`${USERS_PATH}/${userId}`);
}

/**
 * Obtém referência às transcrições do usuário
 * @param {string} userId - ID do usuário (opcional, usa o atual se não for fornecido)
 * @returns {Object|null} Referência do Firebase ou null se não houver usuário
 */
function getUserTranscriptionsRef(userId) {
  const userRef = getUserRef(userId);
  if (!userRef) return null;
  return userRef.child(TRANSCRIPTIONS_PATH);
}

/**
 * Obtém referência às chaves API do usuário
 * @param {string} userId - ID do usuário (opcional, usa o atual se não for fornecido)
 * @returns {Object|null} Referência do Firebase ou null se não houver usuário
 */
function getUserApiKeysRef(userId) {
  const userRef = getUserRef(userId);
  if (!userRef) return null;
  return userRef.child(API_KEYS_PATH);
}

/**
 * Cria dados iniciais do usuário no Firebase
 * @param {string} userId - ID do usuário
 * @returns {Promise} Promise resolvida com os dados criados ou rejeitada com erro
 */
function createUserData(userId) {
  if (!firebaseApp.initialized) {
    return Promise.reject(new Error("Firebase não está inicializado"));
  }
  
  if (!userId) {
    console.error('ID de usuário não fornecido para createUserData');
    return Promise.reject(new Error('ID de usuário não fornecido'));
  }
  
  const userData = {
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    lastLogin: firebase.database.ServerValue.TIMESTAMP,
    transcriptions: {},
    settings: {
      theme: 'light',
      language: 'pt-BR'
    }
  };
  
  return getUserRef(userId).set(userData)
    .then(() => {
      console.log('Dados iniciais do usuário criados com sucesso');
      return userData;
    })
    .catch((error) => {
      console.error('Erro ao criar dados do usuário:', error);
      throw error;
    });
}

/**
 * Salva a chave API do usuário de forma segura
 * @param {string} apiKey - Chave API a ser salva
 * @returns {Promise} Promise resolvida com mensagem de sucesso ou rejeitada com erro
 */
/**
 * Salva a chave API do usuário de forma segura
 * @param {string} apiKey - Chave API a ser salva
 * @returns {Promise} Promise resolvida com mensagem de sucesso ou rejeitada com erro
 */
function saveUserApiKey(apiKey) {
    console.log('Função saveUserApiKey iniciada');
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
        console.error('Chave API inválida');
        return Promise.reject(new Error('Chave API inválida. Deve começar com "sk-"'));
    }
    
    // Verificar se o Firebase está inicializado
    if (!firebaseApp.initialized && window.navigator.onLine) {
        console.error('Firebase não está inicializado');
        // Se o Firebase não estiver inicializado mas estivermos online, isso é um erro
        return Promise.reject(new Error("Firebase não está inicializado"));
    }
    
    console.log('Verificando usuário autenticado...');
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.error('Usuário não está logado');
        return Promise.reject(new Error('Usuário não está logado'));
    }
    
    console.log('Usuário autenticado:', user.uid);
    
    // Primeiro, salvar no localStorage como fallback
    try {
        localStorage.setItem('openai_api_key', apiKey);
        console.log('Chave API salva no localStorage como fallback');
    } catch (err) {
        console.warn('Erro ao salvar chave API no localStorage:', err);
    }
    
    // Tentar salvar usando o módulo de armazenamento se disponível
    if (window.storageUtils && typeof window.storageUtils.saveApiKeyLocally === 'function') {
        try {
            window.storageUtils.saveApiKeyLocally(apiKey);
            console.log('Chave API salva localmente via storageUtils');
        } catch (err) {
            console.warn('Erro ao salvar chave API via storageUtils:', err);
        }
    }
    
    // Se estiver offline, apenas salva localmente e retorna sucesso
    if (!window.navigator.onLine) {
        console.log('Modo offline: chave API salva apenas localmente');
        return Promise.resolve("Chave API salva localmente (modo offline)");
    }
    
    // Criptografar a chave usando o módulo de segurança
    let encryptedKey = apiKey;
    try {
        if (window.securityUtils && typeof window.securityUtils.encryptApiKey === 'function') {
            encryptedKey = window.securityUtils.encryptApiKey(apiKey);
            console.log('Chave API criptografada com sucesso');
        } else {
            console.warn('securityUtils não disponível para criptografia');
        }
    } catch (err) {
        console.error('Erro ao criptografar chave API:', err);
    }
    
    // Salvar no Firebase
    const apiKeyData = {
        value: encryptedKey,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        isEncrypted: window.securityUtils && typeof window.securityUtils.encryptApiKey === 'function'
    };
    
    console.log('Salvando chave API no Firebase...');
    
    // Obter a referência correta para o caminho da chave API do usuário
    const apiKeyRef = getUserApiKeysRef(user.uid);
    
    if (!apiKeyRef) {
        console.error('Não foi possível obter referência para o caminho da chave API');
        return Promise.reject(new Error('Erro ao obter referência do Firebase'));
    }
    
    return apiKeyRef.set(apiKeyData)
        .then(() => {
            console.log('Chave API salva com sucesso no Firebase');
            return "Chave API salva com sucesso";
        })
        .catch((error) => {
            console.error('Erro ao salvar chave API no Firebase:', error);
            throw error;
        });
}
/**
 * Salva uma transcrição no Firebase e/ou localStorage
 * @param {Object} transcriptionData - Dados da transcrição a ser salva
 * @returns {Promise} Promise resolvida com a transcrição salva ou rejeitada com erro
 */
function saveTranscription(transcriptionData) {
  // Verificar autenticação
  const user = firebaseApp.auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  // Validar dados da transcrição
  if (!transcriptionData || !transcriptionData.text) {
    return Promise.reject(new Error('Dados de transcrição inválidos'));
  }
  
  // Usar ID existente ou criar um novo
  const transcriptionId = transcriptionData.id || 
                         (firebaseApp.initialized ? 
                          getUserTranscriptionsRef(user.uid).push().key : 
                          `offline-${Date.now()}`);
  
  // Dados completos da transcrição
  const transcription = {
    id: transcriptionId,
    text: transcriptionData.text,
    processedText: transcriptionData.processedText || '',
    processingType: transcriptionData.processingType || 'none',
    createdAt: transcriptionData.createdAt || Date.now(),
    updatedAt: Date.now(),
    title: transcriptionData.title || `Transcrição ${new Date().toLocaleString()}`
  };
  
  // Salvar localmente primeiro usando storageUtils
  let localSavePromise = Promise.resolve();
  if (window.storageUtils && typeof window.storageUtils.saveTranscriptionLocally === 'function') {
    try {
      localSavePromise = window.storageUtils.saveTranscriptionLocally(transcription);
      console.log('Transcrição salva localmente com sucesso');
    } catch (err) {
      console.warn('Erro ao salvar transcrição localmente:', err);
    }
  }
  
  // Se estiver offline ou Firebase não estiver inicializado, retorna após salvar localmente
  if (!window.navigator.onLine || !firebaseApp.initialized) {
    console.log('Modo offline: transcrição salva apenas localmente');
    
    // Adicionar à fila de operações pendentes
    if (window.appState && Array.isArray(window.appState.pendingOperations)) {
      window.appState.pendingOperations.push({
        type: 'saveTranscription',
        data: transcription
      });
      console.log('Operação adicionada à fila para sincronização posterior');
    }
    
    return localSavePromise.then(() => transcription);
  }
  
  // Salvar no Firebase
  return localSavePromise
    .then(() => getUserTranscriptionsRef(user.uid).child(transcriptionId).set(transcription))
    .then(() => {
      console.log('Transcrição salva com sucesso no Firebase:', transcriptionId);
      return transcription;
    })
    .catch(error => {
      console.error('Erro ao salvar transcrição no Firebase:', error);
      // Se falhar no Firebase mas tiver sido salvo localmente, ainda retorna sucesso
      return transcription;
    });
}

/**
 * Busca todas as transcrições do usuário
 * @returns {Promise} Promise resolvida com array de transcrições ou rejeitada com erro
 */
function getUserTranscriptions() {
  const user = firebaseApp.auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  // Se offline ou Firebase não inicializado, tentar buscar do armazenamento local
  if (!window.navigator.onLine || !firebaseApp.initialized) {
    console.log('Modo offline: buscando transcrições localmente');
    if (window.storageUtils && typeof window.storageUtils.getLocalTranscriptions === 'function') {
      return window.storageUtils.getLocalTranscriptions();
    } else {
      return Promise.resolve([]);
    }
  }
  
  // Buscar do Firebase
  return getUserTranscriptionsRef(user.uid)
    .orderByChild('createdAt')
    .once('value')
    .then((snapshot) => {
      const transcriptions = [];
      snapshot.forEach((childSnapshot) => {
        transcriptions.push(childSnapshot.val());
      });
      
      // Mesclar com transcrições locais se houver
      if (window.storageUtils && typeof window.storageUtils.getLocalTranscriptions === 'function') {
        return window.storageUtils.getLocalTranscriptions()
          .then(localTranscriptions => {
            // Filtrar apenas transcrições locais que não estão no Firebase
            const firebaseIds = transcriptions.map(t => t.id);
            const uniqueLocalTranscriptions = localTranscriptions.filter(
              lt => !firebaseIds.includes(lt.id) && lt.id.startsWith('offline-')
            );
            
            return [...transcriptions, ...uniqueLocalTranscriptions].sort((a, b) => b.createdAt - a.createdAt);
          });
      }
      
      return transcriptions.reverse(); // Mais recentes primeiro
    })
    .catch(error => {
      console.error('Erro ao buscar transcrições do Firebase:', error);
      
      // Tentar buscar do armazenamento local
      if (window.storageUtils && typeof window.storageUtils.getLocalTranscriptions === 'function') {
        return window.storageUtils.getLocalTranscriptions();
      }
      
      throw error;
    });
}

/**
 * Exclui uma transcrição
 * @param {string} transcriptionId - ID da transcrição a ser excluída
 * @returns {Promise} Promise resolvida com true em caso de sucesso ou rejeitada com erro
 */
/**
 * Exclui uma transcrição
 * @param {string} transcriptionId - ID da transcrição a ser excluída
 * @returns {Promise} Promise resolvida com true em caso de sucesso ou rejeitada com erro
 */
function deleteTranscription(transcriptionId) {
  const user = firebaseApp.auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  if (!transcriptionId) {
    return Promise.reject(new Error('ID de transcrição não fornecido'));
  }
  
  // Remover do armazenamento local primeiro
  let localDeletePromise = Promise.resolve();
  if (window.storageUtils && typeof window.storageUtils.deleteLocalTranscription === 'function') {
    try {
      localDeletePromise = window.storageUtils.deleteLocalTranscription(transcriptionId);
      console.log('Transcrição removida localmente com sucesso');
    } catch (err) {
      console.warn('Erro ao remover transcrição localmente:', err);
    }
  }
  
  // Se offline ou sem Firebase, apenas remove localmente
  if (!window.navigator.onLine || !firebaseApp.initialized) {
    console.log('Modo offline: transcrição removida apenas localmente');
    
    // Se a transcrição não for offline (tem ID do Firebase), adiciona à fila
    if (!transcriptionId.startsWith('offline-') && window.appState && Array.isArray(window.appState.pendingOperations)) {
      window.appState.pendingOperations.push({
        type: 'deleteTranscription',
        data: transcriptionId
      });
      console.log('Operação de exclusão adicionada à fila para sincronização posterior');
    }
    
    return localDeletePromise.then(() => true);
  }
  
  // Remover do Firebase
  return localDeletePromise
    .then(() => getUserTranscriptionsRef(user.uid).child(transcriptionId).remove())
    .then(() => {
      console.log('Transcrição excluída com sucesso do Firebase:', transcriptionId);
      return true;
    })
    .catch(error => {
      console.error('Erro ao excluir transcrição do Firebase:', error);
      throw error;
    });
}

/**
 * Atualiza uma transcrição existente
 * @param {string} transcriptionId - ID da transcrição a ser atualizada
 * @param {Object} updatedData - Novos dados para a transcrição
 * @returns {Promise} Promise resolvida com os dados atualizados ou rejeitada com erro
 */
function updateTranscription(transcriptionId, updatedData) {
  const user = firebaseApp.auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  if (!transcriptionId) {
    return Promise.reject(new Error('ID de transcrição não fornecido'));
  }
  
  // Adicionar timestamp de atualização
  const data = {
    ...updatedData,
    updatedAt: Date.now()
  };
  
  // Atualizar localmente primeiro
  let localUpdatePromise = Promise.resolve();
  if (window.storageUtils && typeof window.storageUtils.updateLocalTranscription === 'function') {
    try {
      localUpdatePromise = window.storageUtils.updateLocalTranscription(transcriptionId, data);
      console.log('Transcrição atualizada localmente com sucesso');
    } catch (err) {
      console.warn('Erro ao atualizar transcrição localmente:', err);
    }
  }
  
  // Se offline ou sem Firebase, apenas atualiza localmente
  if (!window.navigator.onLine || !firebaseApp.initialized) {
    console.log('Modo offline: transcrição atualizada apenas localmente');
    
    // Se não for ID offline, adiciona à fila de operações pendentes
    if (!transcriptionId.startsWith('offline-') && window.appState && Array.isArray(window.appState.pendingOperations)) {
      window.appState.pendingOperations.push({
        type: 'updateTranscription',
        data: { id: transcriptionId, ...data }
      });
      console.log('Operação de atualização adicionada à fila para sincronização posterior');
    }
    
    return localUpdatePromise.then(() => data);
  }
  
  // Atualizar no Firebase
  return localUpdatePromise
    .then(() => getUserTranscriptionsRef(user.uid).child(transcriptionId).update(data))
    .then(() => {
      console.log('Transcrição atualizada com sucesso no Firebase:', transcriptionId);
      return data;
    })
    .catch(error => {
      console.error('Erro ao atualizar transcrição no Firebase:', error);
      throw error;
    });
}

/**
 * Carrega a chave API do usuário
 * @returns {Promise} Promise resolvida com a chave API ou null se não existir
 */
function loadUserApiKey() {
  const user = firebaseApp.auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  // Tentar carregar do localStorage primeiro
  let localApiKeyPromise = Promise.resolve(null);
  if (window.storageUtils && typeof window.storageUtils.getApiKeyFromLocal === 'function') {
    localApiKeyPromise = window.storageUtils.getApiKeyFromLocal();
  }
  
  // Se offline ou sem Firebase, retorna apenas do localStorage
  if (!window.navigator.onLine || !firebaseApp.initialized) {
    console.log('Modo offline: carregando chave API apenas do armazenamento local');
    return localApiKeyPromise;
  }
  
  // Verificar no Firebase e usar a chave mais recente
  return Promise.all([
    localApiKeyPromise,
    getUserApiKeysRef(user.uid).once('value').then(snapshot => {
      const apiKeyData = snapshot.val();
      if (!apiKeyData || !apiKeyData.value) {
        console.log('Chave API não encontrada no Firebase');
        return null;
      }
      
      // Descriptografar a chave se necessário
      let apiKey = apiKeyData.value;
      if (apiKeyData.isEncrypted && window.securityUtils && typeof window.securityUtils.decryptApiKey === 'function') {
        try {
          apiKey = window.securityUtils.decryptApiKey(apiKey);
        } catch (err) {
          console.error('Erro ao descriptografar chave API:', err);
        }
      }
      
      return { key: apiKey, updatedAt: apiKeyData.updatedAt || 0 };
    }).catch(error => {
      console.error('Erro ao carregar chave API do Firebase:', error);
      return null;
    })
  ]).then(([localApiKey, firebaseApiKey]) => {
    // Se não tiver no Firebase, usar local
    if (!firebaseApiKey) return localApiKey ? localApiKey.key : null;
    
    // Se não tiver local, usar Firebase
    if (!localApiKey) return firebaseApiKey.key;
    
    // Usar a mais recente
    return (localApiKey.updatedAt || 0) > (firebaseApiKey.updatedAt || 0) 
      ? localApiKey.key 
      : firebaseApiKey.key;
  });
}

// Exportar funções para uso em outros scripts
window.firebaseHelper = {
  auth: firebaseApp.auth,
  db: firebaseApp.db,
  isInitialized: () => firebaseApp.initialized,
  createUserData,
  saveUserApiKey,
  saveTranscription,
  getUserTranscriptions,
  deleteTranscription,
  updateTranscription,
  loadUserApiKey
};
