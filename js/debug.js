console.log("Iniciando depuração...");

// Verificar se o objeto firebaseHelper existe
console.log("firebaseHelper existe:", window.firebaseHelper !== undefined);
if (window.firebaseHelper) {
  console.log("Métodos disponíveis:", Object.keys(window.firebaseHelper));
  console.log("saveUserApiKey existe:", typeof window.firebaseHelper.saveUserApiKey === 'function');
}

// Verificar o botão de salvar API
const saveButton = document.getElementById('saveApiKey');
console.log("Botão de salvar API encontrado:", saveButton !== null);

// Testar o evento de clique manualmente
if (saveButton) {
  console.log("Adicionando evento de clique ao botão de salvar API");
  
  // Remover qualquer manipulador de evento existente (caso haja)
  const newButton = saveButton.cloneNode(true);
  saveButton.parentNode.replaceChild(newButton, saveButton);
  
  // Adicionar novo manipulador de evento
  newButton.addEventListener('click', function() {
    console.log("Botão de salvar API clicado!");
    
    const apiKeyInput = document.getElementById('apiKey');
    if (!apiKeyInput) {
      console.error("Campo de entrada da API key não encontrado!");
      return;
    }
    
    const apiKey = apiKeyInput.value.trim();
    console.log("Valor da API key (redacted):", apiKey ? "***" : "vazio");
    
    if (!apiKey) {
      console.error("Chave API está vazia!");
      return;
    }
    
    if (window.firebaseHelper && typeof window.firebaseHelper.saveUserApiKey === 'function') {
      console.log("Chamando saveUserApiKey...");
      window.firebaseHelper.saveUserApiKey(apiKey)
        .then(function() {
          console.log("Chave API salva com sucesso!");
          alert("Chave API salva com sucesso!");
        })
        .catch(function(error) {
          console.error("Erro ao salvar a chave API:", error);
          alert("Erro ao salvar a chave API: " + error.message);
        });
    } else {
      console.error("Função saveUserApiKey não encontrada!");
    }
  });
}
