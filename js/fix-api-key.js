/**
 * Script de correção para o problema de salvamento da chave API
 * Inclua este script APÓS todos os outros scripts em index.html, logo antes do fechamento do body
 */

(function() {
  console.log("==== Script de correção da API Key iniciado ====");
  
  // Aguardar o carregamento completo do DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFix);
  } else {
    initFix();
  }
  
  function initFix() {
    // 1. Diagnóstico inicial
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    
    console.log("Input da API Key encontrado:", apiKeyInput !== null);
    console.log("Botão de salvar API encontrado:", saveApiKeyButton !== null);
    
    if (!apiKeyInput || !saveApiKeyButton) {
      console.error("Elementos essenciais não encontrados. Correção não pode ser aplicada.");
      return;
    }

    // 2. Remover handlers existentes e substituir o botão
    console.log("Removendo manipuladores de eventos anteriores...");
    const newSaveButton = saveApiKeyButton.cloneNode(true);
    saveApiKeyButton.parentNode.replaceChild(newSaveButton, saveApiKeyButton);
    
    // 3. Implementar a nova função de salvamento
    newSaveButton.addEventListener('click', function() {
      console.log("Clique no botão de salvar API Key interceptado pelo script de correção");
      
      // Obter a chave
      const apiKey = apiKeyInput.value.trim();
      
      // Validar a chave
      if (!apiKey) {
        showError("Por favor, insira uma chave API válida");
        return;
      }
      
      if (!apiKey.startsWith("sk-")) {
        showError("Chave API inválida. Deve começar com 'sk-'");
        return;
      }
      
      // Feedback visual
      console.log("Valor da API key é válido, salvando...");
      const originalText = newSaveButton.textContent;
      newSaveButton.textContent = "Salvando...";
      newSaveButton.disabled = true;
      
      // 1. Salvar diretamente no localStorage para garantir
      try {
        localStorage.setItem('openai_api_key', apiKey);
        console.log("Chave API salva diretamente no localStorage");
      } catch (err) {
        console.warn("Erro ao salvar no localStorage:", err);
      }
      
      // 2. Usar o método do storageUtils se disponível
      if (window.storageUtils && typeof window.storageUtils.saveApiKeyLocally === 'function') {
        try {
          window.storageUtils.saveApiKeyLocally(apiKey);
          console.log("Chave API salva via storageUtils");
        } catch (err) {
          console.warn("Erro ao salvar via storageUtils:", err);
        }
      }
      
      // 3. Usar Firebase se disponível
      let firebaseSavePromise;
      if (window.firebaseHelper && typeof window.firebaseHelper.saveUserApiKey === 'function') {
        console.log("Tentando salvar via Firebase...");
        
        firebaseSavePromise = window.firebaseHelper.saveUserApiKey(apiKey)
          .then(() => {
            console.log("Chave API salva com sucesso no Firebase");
            return true;
          })
          .catch(error => {
            console.error("Erro ao salvar no Firebase:", error);
            return false;
          });
      } else {
        firebaseSavePromise = Promise.resolve(false);
      }
      
      // Finalizar o processo
      firebaseSavePromise
        .then(savedInFirebase => {
          // Restaurar botão
          newSaveButton.textContent = originalText;
          newSaveButton.disabled = false;
          
          // Mostrar mensagem de sucesso
          if (savedInFirebase) {
            showSuccess("Chave API salva com sucesso no Firebase!");
          } else {
            showSuccess("Chave API salva localmente com sucesso!");
          }
          
          // Habilitar o botão de gravação
          const startRecordingButton = document.getElementById('startRecording');
          if (startRecordingButton) {
            startRecordingButton.disabled = false;
            console.log("Botão de gravação habilitado");
          }
        });
    });
    
    // 4. Verificar se já existe uma chave API e habilitar a gravação
    console.log("Verificando se já existe uma chave API salva...");
    const savedApiKey = localStorage.getItem('openai_api_key');
    
    if (savedApiKey) {
      console.log("Chave API encontrada no localStorage");
      
      // Preencher o campo
      apiKeyInput.value = savedApiKey;
      
      // Habilitar gravação
      const startRecordingButton = document.getElementById('startRecording');
      if (startRecordingButton) {
        startRecordingButton.disabled = false;
        console.log("Botão de gravação habilitado com base na chave existente");
      }
    }
    
    console.log("==== Script de correção da API Key concluído ====");
  }
  
  // Funções auxiliares
  function showError(message) {
    const errorDiv = document.getElementById('error');
    const statusDiv = document.getElementById('status');
    
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
    
    if (statusDiv) {
      statusDiv.textContent = 'Pronto para gravar. Clique em "Iniciar Gravação".';
    }
    
    console.error("Erro:", message);
  }
  
  function showSuccess(message) {
    const errorDiv = document.getElementById('error');
    const statusDiv = document.getElementById('status');
    
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
    
    if (statusDiv) {
      statusDiv.textContent = message;
    }
    
    console.log("Sucesso:", message);
  }
})();
