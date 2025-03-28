/**
 * Configuração do Firebase para o Mapzy Vox IA
 * Gerenciamento seguro de autenticação e armazenamento de dados
 */

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA38xgnGCOaTwBh9QF2IpBJnZDLd_qP0JE",
  authDomain: "whatsstag.firebaseapp.com",
  databaseURL: "https://whatsstag-default-rtdb.firebaseio.com",
  projectId: "whatsstag",
  storageBucket: "whatsstag.appspot.com",
  messagingSenderId: "216266845109",
  appId: "1:216266845109:web:5741201811d4bcab6d07fc"
};

// Verificar se o Firebase já foi inicializado
if (typeof firebase === 'undefined') {
  console.error("Firebase SDK não encontrado. Verifique se os scripts foram carregados corretamente.");
}

// Objeto para armazenar as referências do Firebase
let auth, db, firebaseInitialized = false;

// Inicializar o Firebase com tratamento de erros
try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log("Firebase inicializado com sucesso");
    } else {
      console.log("Usando instância existente do Firebase");
    }
    
    // Obter referências
    auth = firebase.auth();
    db = firebase.database();
    firebaseInitialized = true;
  }
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
  firebaseInitialized = false;
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
  if (!firebaseInitialized) {
    console.warn("Firebase não está inicializado ao tentar obter referência do usuário");
    return null;
  }
  
  if (!userId) {
    const user = auth.currentUser;
    if (!user) {
      console.warn('Tentativa de acessar dados sem usuário autenticado');
      return null;
    }
    userId = user.uid;
  }
  return db.ref(`${USERS_PATH}/${userId}`);
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
 * Salva a chave API do usuário de forma segura
 * @param {string} apiKey - Chave API a ser salva
 * @returns {Promise} Promise resolvida com mensagem de sucesso ou rejeitada com erro
 */
function saveUserApiKey(apiKey) {
  if (!firebaseInitialized) {
    console.warn("Firebase não está inicializado ao tentar salvar chave API");
    return Promise.reject(new Error("Firebase não está inicializado"));
  }
  
  console.log('Função saveUserApiKey iniciada');
  const user = auth.currentUser;
  
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  console.log('Usuário autenticado:', user.uid);
  
  // Primeiro, salvar no localStorage
  try {
    localStorage.setItem('openai_api_key', apiKey);
    console.log('Chave API salva localmente');
  } catch (err) {
    console.warn('Erro ao salvar chave API localmente:', err);
  }
  
  // Salvar no Firebase
  return getUserRef(user.uid).child('apiKey').set(apiKey)
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
 * Salva uma transcrição no Firebase
 * @param {Object} transcriptionData - Dados da transcrição a ser salva
 * @returns {Promise} Promise resolvida com a transcrição salva ou rejeitada com erro
 */
function saveTranscription(transcriptionData) {
  if (!firebaseInitialized) {
    console.warn("Firebase não está inicializado ao tentar salvar transcrição");
    return Promise.reject(new Error("Firebase não está inicializado"));
  }
  
  // Verificar autenticação
  const user = auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  // Validar dados da transcrição
  if (!transcriptionData || !transcriptionData.text) {
    return Promise.reject(new Error('Dados de transcrição inválidos'));
  }
  
  // Usar ID existente ou criar um novo
  const transcriptionId = transcriptionData.id || getUserTranscriptionsRef(user.uid).push().key;
  
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
  
  // Salvar no Firebase
  return getUserTranscriptionsRef(user.uid).child(transcriptionId).set(transcription)
    .then(() => {
      console.log('Transcrição salva com sucesso:', transcriptionId);
      return transcription;
    })
    .catch(error => {
      console.error('Erro ao salvar transcrição:', error);
      throw error;
    });
}

/**
 * Busca todas as transcrições do usuário
 * @returns {Promise} Promise resolvida com array de transcrições ou rejeitada com erro
 */
function getUserTranscriptions() {
  if (!firebaseInitialized) {
    console.warn("Firebase não está inicializado ao tentar buscar transcrições");
    return Promise.reject(new Error("Firebase não está inicializado"));
  }
  
  const user = auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  // Buscar do Firebase
  return getUserTranscriptionsRef(user.uid)
    .once('value')
    .then((snapshot) => {
      const transcriptions = [];
      snapshot.forEach((childSnapshot) => {
        transcriptions.push(childSnapshot.val());
      });
      
      return transcriptions.sort((a, b) => b.createdAt - a.createdAt); // Mais recentes primeiro
    })
    .catch(error => {
      console.error('Erro ao buscar transcrições:', error);
      throw error;
    });
}

/**
 * Exclui uma transcrição
 * @param {string} transcriptionId - ID da transcrição a ser excluída
 * @returns {Promise} Promise resolvida com true em caso de sucesso ou rejeitada com erro
 */
function deleteTranscription(transcriptionId) {
  if (!firebaseInitialized) {
    console.warn("Firebase não está inicializado ao tentar excluir transcrição");
    return Promise.reject(new Error("Firebase não está inicializado"));
  }
  
  const user = auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  if (!transcriptionId) {
    return Promise.reject(new Error('ID de transcrição não fornecido'));
  }
  
  // Remover do Firebase
  return getUserTranscriptionsRef(user.uid).child(transcriptionId).remove()
    .then(() => {
      console.log('Transcrição excluída com sucesso:', transcriptionId);
      return true;
    })
    .catch(error => {
      console.error('Erro ao excluir transcrição:', error);
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
  if (!firebaseInitialized) {
    console.warn("Firebase não está inicializado ao tentar atualizar transcrição");
    return Promise.reject(new Error("Firebase não está inicializado"));
  }
  
  const user = auth.currentUser;
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
  
  // Atualizar no Firebase
  return getUserTranscriptionsRef(user.uid).child(transcriptionId).update(data)
    .then(() => {
      console.log('Transcrição atualizada com sucesso:', transcriptionId);
      return data;
    })
    .catch(error => {
      console.error('Erro ao atualizar transcrição:', error);
      throw error;
    });
}

/**
 * Carrega a chave API do usuário
 * @returns {Promise} Promise resolvida com a chave API ou null se não existir
 */
function loadUserApiKey() {
  if (!firebaseInitialized) {
    console.warn("Firebase não está inicializado ao tentar carregar chave API");
    
    // Tentar carregar do localStorage como fallback
    const localApiKey = localStorage.getItem('openai_api_key');
    return Promise.resolve(localApiKey);
  }
  
  const user = auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  // Verificar no Firebase
  return getUserRef(user.uid).child('apiKey').once('value')
    .then(snapshot => {
      const apiKey = snapshot.val();
      if (apiKey) {
        // Salvar também no localStorage para acesso offline
        try {
          localStorage.setItem('openai_api_key', apiKey);
        } catch (err) {
          console.warn('Erro ao salvar chave API localmente:', err);
        }
        return apiKey;
      }
      
      // Verificar localStorage como fallback
      return localStorage.getItem('openai_api_key');
    })
    .catch(error => {
      console.error('Erro ao carregar chave API:', error);
      
      // Tentar localStorage como fallback
      return localStorage.getItem('openai_api_key');
    });
}

// Exportar funções para uso em outros scripts
window.firebaseHelper = {
  isInitialized: () => firebaseInitialized,
  saveUserApiKey,
  saveTranscription,
  getUserTranscriptions,
  deleteTranscription,
  updateTranscription,
  loadUserApiKey
};

// Verificar se o Firebase foi inicializado corretamente
console.log("Estado da inicialização do Firebase:", firebaseInitialized ? "SUCESSO" : "FALHA");
