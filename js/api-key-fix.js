/**
 * Correção para o problema da chave API
 */
(function() {
  // Executar quando o documento estiver pronto
  document.addEventListener('DOMContentLoaded', function() {
    console.log("=== Correção da API Key iniciada ===");
    
    // Encontrar os elementos necessários
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveApiKey');
    const startRecordingButton = document.getElementById('startRecording');
    
    if (!apiKeyInput || !saveButton) {
      console.error("Elementos da API Key não encontrados!");
      return;
    }
    
    console.log("Elementos encontrados, aplicando correção...");
    
    // Verificar se já existe uma chave salva
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey && savedKey.startsWith('sk-')) {
      console.log("Chave API já existe no localStorage");
      apiKeyInput.value = savedKey;
      
      if (startRecordingButton) {
        startRecordingButton.disabled = false;
        console.log("Botão de gravação habilitado");
      }
    }
    
    // Substituir o botão para remover manipuladores antigos
    const newButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newButton, saveButton);
    
    // Adicionar o comportamento correto
    newButton.addEventListener('click', function() {
      console.log("Botão salvar API clicado");
      
      // Obter a chave
      const apiKey = apiKeyInput.value.trim();
      
      // Validar a chave
      if (!apiKey) {
        showErrorMessage("Por favor, insira uma chave API válida");
        return;
      }
      
      if (!apiKey.startsWith('sk-')) {
        showErrorMessage("Chave API inválida. Deve começar com 'sk-'");
        return;
      }
      
      // Feedback visual
      newButton.textContent = "Salvando...";
      newButton.disabled = true;
      
      // Salvar no localStorage
      localStorage.setItem('openai_api_key', apiKey);
      console.log("Chave API salva no localStorage");
      
      // Tentar salvar no Firebase
      if (window.firebaseHelper && typeof window.firebaseHelper.saveUserApiKey === 'function') {
        window.firebaseHelper.saveUserApiKey(apiKey)
          .then(() => {
            console.log("Chave API salva no Firebase");
            showSuccessMessage("Chave API salva com sucesso!");
          })
          .catch(error => {
            console.error("Erro ao salvar no Firebase:", error);
            showSuccessMessage("Chave API salva localmente.");
          })
          .finally(() => {
            // Restaurar o botão
            newButton.textContent = "Salvar Chave API";
            newButton.disabled = false;
            
            // Habilitar gravação
            if (startRecordingButton) {
              startRecordingButton.disabled = false;
            }
          });
      } else {
        // Sem Firebase, apenas concluir
        showSuccessMessage("Chave API salva localmente com sucesso!");
        newButton.textContent = "Salvar Chave API";
        newButton.disabled = false;
        
        if (startRecordingButton) {
          startRecordingButton.disabled = false;
        }
      }
    });
    
    console.log("=== Correção da API Key concluída ===");
  });
  
  // Funções auxiliares
  function showErrorMessage(message) {
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
  
  function showSuccessMessage(message) {
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
