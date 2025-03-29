/**
 * Correção definitiva para o problema da chave API
 */
(function() {
  // Executar após o DOM estar pronto
  document.addEventListener('DOMContentLoaded', function() {
    console.log("=== Correção da API Key iniciada ===");
    
    // 1. Verificar se os elementos necessários existem
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveApiKey');
    const startRecordingButton = document.getElementById('startRecording');
    
    if (!apiKeyInput || !saveButton) {
      console.error("Elementos necessários não encontrados!");
      return;
    }
    
    // 2. Se já existir uma chave API salva, carregá-la e habilitar o botão de gravação
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey && savedKey.startsWith('sk-')) {
      console.log("Chave API encontrada no localStorage");
      apiKeyInput.value = savedKey;
      
      if (startRecordingButton) {
        startRecordingButton.disabled = false;
        console.log("Botão de gravação habilitado baseado na chave API existente");
      }
    }
    
    // 3. Substituir completamente o comportamento do botão de salvar
    saveButton.onclick = null;
    saveButton.removeEventListener('click', handleSaveApiKey);
    
    // Criar um novo botão para substituir o existente
    const newButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newButton, saveButton);
    
    // 4. Adicionar o comportamento correto para salvar a chave API
    newButton.addEventListener('click', function() {
      console.log("Botão salvar chave API clicado");
      
      // Obter e validar a chave
      const apiKey = apiKeyInput.value.trim();
      
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
      
      // Salvar diretamente no localStorage
      localStorage.setItem('openai_api_key', apiKey);
      
      // Tentar também salvar no Firebase se disponível
      if (window.firebaseHelper && typeof window.firebaseHelper.saveUserApiKey === 'function') {
        window.firebaseHelper.saveUserApiKey(apiKey)
          .then(() => {
            showSuccessMessage("Chave API salva com sucesso!");
            console.log("Chave API salva no Firebase");
          })
          .catch(error => {
            console.error("Erro ao salvar no Firebase:", error);
            showSuccessMessage("Chave API salva localmente com sucesso!");
          })
          .finally(() => {
            // Restaurar botão
            newButton.textContent = "Salvar Chave API";
            newButton.disabled = false;
            
            // Habilitar gravação
            if (startRecordingButton) {
              startRecordingButton.disabled = false;
            }
          });
      } else {
        // Se não houver Firebase, apenas finalizar
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
