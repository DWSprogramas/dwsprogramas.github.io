// Script específico para corrigir o carregamento de transcrições
(function() {
  // Função para mostrar as transcrições do Firebase
  function loadAndDisplayTranscriptions() {
    console.log("Carregando transcrições diretamente...");
    
    // Verificar se o Firebase está disponível
    if (!window.firebase || !firebase.auth) {
      console.error("Firebase não está disponível");
      return;
    }
    
    // Obter usuário atual
    const user = firebase.auth().currentUser;
    if (!user) {
      console.error("Usuário não está autenticado");
      return;
    }
    
    console.log("ID do usuário:", user.uid);
    
    // Elementos da UI
    const transcriptionList = document.getElementById('transcriptionList');
    const noTranscriptions = document.getElementById('noTranscriptions');
    
    if (!transcriptionList) {
      console.error("Lista de transcrições não encontrada no DOM");
      return;
    }
    
    // Exibir mensagem de carregamento
    transcriptionList.innerHTML = '<li class="loading">Carregando transcrições...</li>';
    
    // Caminho direto baseado na estrutura do seu Firebase
    const dbPath = `users/${user.uid}/transcriptions`;
    console.log("Tentando carregar de:", dbPath);
    
    firebase.database().ref(dbPath).once('value')
      .then(snapshot => {
        console.log("Dados recebidos:", snapshot.exists() ? "Sim" : "Não");
        
        if (!snapshot.exists() || snapshot.numChildren() === 0) {
          // Tentar caminho alternativo
          const altPath = `MapzyVox/users/${user.uid}/transcriptions`;
          console.log("Caminho alternativo:", altPath);
          return firebase.database().ref(altPath).once('value');
        }
        
        return snapshot;
      })
      .then(snapshot => {
        if (!snapshot.exists() || snapshot.numChildren() === 0) {
          console.log("Nenhuma transcrição encontrada");
          transcriptionList.innerHTML = '';
          if (noTranscriptions) noTranscriptions.style.display = 'block';
          return;
        }
        
        console.log("Transcrições encontradas:", snapshot.numChildren());
        
        if (noTranscriptions) noTranscriptions.style.display = 'none';
        
        // Limpar a lista
        transcriptionList.innerHTML = '';
        
        // Converter snapshot para array
        const transcriptions = [];
        snapshot.forEach(childSnapshot => {
          const data = childSnapshot.val();
          // Verificar se os dados são válidos
          if (data) {
            transcriptions.push({
              id: childSnapshot.key,
              ...data
            });
          } else {
            console.warn("Transcrição inválida:", childSnapshot.key);
          }
        });
        
        console.log("Total de transcrições válidas:", transcriptions.length);
        
        // Ordenar por data (mais recentes primeiro)
        transcriptions.sort((a, b) => {
          const dateA = a.createdAt || 0;
          const dateB = b.createdAt || 0;
          return dateB - dateA;
        });
        
        // Mostrar cada transcrição
        transcriptions.forEach(item => {
          // Log detalhado para depuração
          console.log("Transcrição:", item.id, {
            title: item.title || "Sem título",
            date: item.createdAt ? new Date(item.createdAt).toLocaleString() : "Data desconhecida",
            textLength: item.text ? item.text.length : 0
          });
          
          const li = document.createElement('li');
          li.className = 'transcription-item';
          
          const title = item.title || 'Transcrição sem título';
          const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Data desconhecida';
          const text = item.text || '';
          const preview = text.substring(0, 100) + (text.length > 100 ? '...' : '');
          
          li.innerHTML = `
            <div class="transcription-title">${title}</div>
            <div class="transcription-date">${date}</div>
            <div class="transcription-content">${preview}</div>
            <div class="transcription-controls">
              <button class="view-btn" data-id="${item.id}">Ver</button>
              <button class="delete-btn" data-id="${item.id}">Excluir</button>
            </div>
          `;
          
          // Adicionar manipuladores de eventos
          li.querySelector('.view-btn').addEventListener('click', function() {
            console.log("Visualizar transcrição:", item.id);
            // Você pode adicionar código para visualizar a transcrição aqui
            if (window.transcriptionUtils && typeof window.transcriptionUtils.loadTranscriptionDetails === 'function') {
              window.transcriptionUtils.loadTranscriptionDetails(item.id);
            }
          });
          
          li.querySelector('.delete-btn').addEventListener('click', function() {
            console.log("Excluir transcrição:", item.id);
            if (confirm('Tem certeza que deseja excluir esta transcrição?')) {
              if (window.transcriptionUtils && typeof window.transcriptionUtils.deleteTranscription === 'function') {
                window.transcriptionUtils.deleteTranscription(item.id);
                // Remover da lista
                li.remove();
              }
            }
          });
          
          transcriptionList.appendChild(li);
        });
        
        if (transcriptions.length === 0) {
          transcriptionList.innerHTML = '<li>Nenhuma transcrição encontrada</li>';
        }
      })
      .catch(error => {
        console.error("Erro ao carregar transcrições:", error);
        transcriptionList.innerHTML = `<li>Erro ao carregar transcrições: ${error.message}</li>`;
      });
  }
  
  // Executar o carregamento quando a aba de histórico for clicada
  document.addEventListener('DOMContentLoaded', function() {
    const historyTab = document.getElementById('tab-history');
    if (historyTab) {
      historyTab.addEventListener('click', function() {
        console.log("Tab Histórico clicada, carregando transcrições...");
        loadAndDisplayTranscriptions();
      });
    }
    
    // Se a URL já tiver #history, carregar imediatamente
    if (window.location.hash === '#history') {
      console.log("Iniciando na aba de histórico, carregando transcrições...");
      loadAndDisplayTranscriptions();
    }
  });
})();
