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

// Inicializa o Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exporta os serviços específicos para usar em outros arquivos
const auth = firebase.auth();
const db = firebase.database();

// Definir caminhos do banco de dados para evitar inconsistências
const DB_ROOT_PATH = 'MapzyVox';
const USERS_PATH = `${DB_ROOT_PATH}/users`;
const TRANSCRIPTIONS_PATH = 'transcriptions';

// Função para obter referência ao caminho do usuário
function getUserRef(userId) {
  if (!userId) {
    const user = auth.currentUser;
    if (!user) {
      console.error('Tentativa de acessar dados sem usuário autenticado');
      return null;
    }
    userId = user.uid;
  }
  return db.ref(`${USERS_PATH}/${userId}`);
}

// Função para obter referência às transcrições do usuário
function getUserTranscriptionsRef(userId) {
  const userRef = getUserRef(userId);
  if (!userRef) return null;
  return userRef.child(TRANSCRIPTIONS_PATH);
}

// Função para criar dados iniciais do usuário
function createUserData(userId) {
  if (!userId) {
    console.error('ID de usuário não fornecido para createUserData');
    return Promise.reject(new Error('ID de usuário não fornecido'));
  }
  
  const userData = {
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    lastLogin: firebase.database.ServerValue.TIMESTAMP,
    transcriptions: {}
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

// Função para salvar a API key do usuário
function saveUserApiKey(apiKey) {
  console.log('Função saveUserApiKey iniciada');
  const user = auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  console.log('Usuário autenticado:', user.uid);
  
  // Primeiro, salvar no localStorage usando o storageUtils
  if (window.storageUtils && typeof window.storageUtils.saveApiKeyLocally === 'function') {
    window.storageUtils.saveApiKeyLocally(apiKey);
  } else {
    console.warn('storageUtils não disponível para salvar localmente');
  }
  
  // Criptografar a chave usando o módulo de segurança
  let encryptedKey = apiKey;
  if (window.securityUtils && typeof window.securityUtils.encryptApiKey === 'function') {
    encryptedKey = window.securityUtils.encryptApiKey(apiKey);
  } else {
    console.warn('securityUtils não disponível para criptografia');
  }
  
  // Salvar no Firebase
  return getUserRef(user.uid).update({
    apiKey: encryptedKey,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP
  })
  .then(() => {
    console.log('Chave API salva com sucesso');
    return "Chave API salva com sucesso";
  })
  .catch((error) => {
    console.error('Erro ao salvar chave API:', error);
    throw error;
  });
}

// Função para salvar uma transcrição
function saveTranscription(transcriptionData) {
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
  const transcriptionId = transcriptionData.id || 
                         getUserTranscriptionsRef(user.uid).push().key;
  
  // Dados completos da transcrição
  const transcription = {
    id: transcriptionId,
    text: transcriptionData.text,
    processedText: transcriptionData.processedText || '',
    processingType: transcriptionData.processingType || 'none',
    createdAt: transcriptionData.createdAt || firebase.database.ServerValue.TIMESTAMP,
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
    title: transcriptionData.title || `Transcrição ${new Date().toLocaleString()}`
  };
  
  // Salvar no banco de dados
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

// Função para buscar todas as transcrições do usuário
function getUserTranscriptions() {
  const user = auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  return getUserTranscriptionsRef(user.uid)
    .orderByChild('createdAt')
    .once('value')
    .then((snapshot) => {
      const transcriptions = [];
      snapshot.forEach((childSnapshot) => {
        transcriptions.push(childSnapshot.val());
      });
      return transcriptions.reverse(); // Mais recentes primeiro
    });
}

// Função para excluir uma transcrição
function deleteTranscription(transcriptionId) {
  const user = auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  if (!transcriptionId) {
    return Promise.reject(new Error('ID de transcrição não fornecido'));
  }
  
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

// Função para atualizar uma transcrição
function updateTranscription(transcriptionId, updatedData) {
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
    updatedAt: firebase.database.ServerValue.TIMESTAMP
  };
  
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

// Função para carregar a chave API do usuário
function loadUserApiKey() {
  const user = auth.currentUser;
  if (!user) {
    console.error('Usuário não está logado');
    return Promise.reject(new Error('Usuário não está logado'));
  }
  
  return getUserRef(user.uid).once('value')
    .then(snapshot => {
      const userData = snapshot.val();
      if (!userData || !userData.apiKey) {
        console.log('Chave API não encontrada para o usuário');
        return null;
      }
      
      // Descriptografar a chave
      let apiKey = userData.apiKey;
      if (window.securityUtils && typeof window.securityUtils.decryptApiKey === 'function') {
        apiKey = window.securityUtils.decryptApiKey(apiKey);
      }
      
      return apiKey;
    })
    .catch(error => {
      console.error('Erro ao carregar chave API:', error);
      throw error;
    });
}

// Exportar funções para uso em outros scripts
window.firebaseHelper = {
  auth,
  db,
  createUserData,
  saveUserApiKey,
  saveTranscription,
  getUserTranscriptions,
  deleteTranscription,
  updateTranscription,
  loadUserApiKey
};
