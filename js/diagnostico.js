/**
 * Ferramenta simples de diagnóstico para o Mapzy Vox IA
 * Para depuração temporária
 */

(function() {
  // Criar elemento de log flutuante
  const logContainer = document.createElement('div');
  logContainer.id = 'debug-log';
  logContainer.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 300px;
    max-height: 200px;
    overflow-y: auto;
    background-color: rgba(0, 0, 0, 0.7);
    color: #0f0;
    font-family: monospace;
    font-size: 11px;
    padding: 8px;
    border-radius: 4px;
    z-index: 9999;
    display: none;
  `;
  
  // Botão para mostrar/ocultar logs
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Debug';
  toggleButton.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background-color: #3498db;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 12px;
    cursor: pointer;
    z-index: 10000;
  `;
  
  // Contador de erros para o badge
  let errorCount = 0;
  const errorBadge = document.createElement('span');
  errorBadge.style.cssText = `
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: red;
    color: white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    display: none;
  `;
  toggleButton.appendChild(errorBadge);
  
  // Adicionar ao documento quando estiver pronto
  function addDebugElements() {
    document.body.appendChild(logContainer);
    document.body.appendChild(toggleButton);
    
    // Evento para mostrar/ocultar
    toggleButton.addEventListener('click', () => {
      if (logContainer.style.display === 'none') {
        logContainer.style.display = 'block';
        toggleButton.textContent = 'Fechar';
        errorBadge.style.display = 'none';
        errorCount = 0;
      } else {
        logContainer.style.display = 'none';
        toggleButton.textContent = 'Debug';
      }
    });
  }
  
  if (document.body) {
    addDebugElements();
  } else {
    window.addEventListener('DOMContentLoaded', addDebugElements);
  }
  
  // Função para adicionar log
  function addLog(message, type = 'info') {
    if (!document.getElementById('debug-log')) {
      return; // Log ainda não está pronto
    }
    
    const entry = document.createElement('div');
    entry.style.marginBottom = '3px';
    entry.style.wordBreak = 'break-word';
    
    // Definir cor com base no tipo
    switch (type) {
      case 'error':
        entry.style.color = '#ff5252';
        // Incrementar contador de erros se o log não estiver visível
        if (logContainer.style.display === 'none') {
          errorCount++;
          errorBadge.textContent = errorCount > 9 ? '9+' : errorCount;
          errorBadge.style.display = 'flex';
        }
        break;
      case 'warn':
        entry.style.color = '#ffb300';
        break;
      case 'success':
        entry.style.color = '#69f0ae';
        break;
      default:
        entry.style.color = '#0f0';
    }
    
    // Timestamp
    const time = new Date().toTimeString().split(' ')[0];
    entry.textContent = `[${time}] ${message}`;
    
    // Adicionar ao container
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }
  
  // Substituir console.log para capturar mensagens
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    addLog(message, 'info');
  };
  
  console.error = function(...args) {
    originalConsoleError.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    addLog(message, 'error');
  };
  
  console.warn = function(...args) {
    originalConsoleWarn.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    addLog(message, 'warn');
  };
  
  // Capturar erros não tratados
  window.addEventListener('error', event => {
    addLog(`ERRO: ${event.message} (${event.filename}:${event.lineno})`, 'error');
  });
  
  window.addEventListener('unhandledrejection', event => {
    addLog(`Promessa rejeitada: ${event.reason}`, 'error');
  });
  
  // Verificar status do Firebase
  function checkFirebaseStatus() {
    addLog('Verificando status do Firebase...', 'info');
    
    if (typeof firebase === 'undefined') {
      addLog('Firebase não está definido!', 'error');
      return;
    }
    
    addLog('Firebase está disponível', 'success');
    
    if (typeof firebase.auth === 'function') {
      addLog('Firebase Auth está disponível', 'success');
      
      if (firebase.auth().currentUser) {
        addLog(`Usuário autenticado: ${firebase.auth().currentUser.email}`, 'success');
      } else {
        addLog('Nenhum usuário autenticado', 'warn');
      }
    } else {
      addLog('Firebase Auth NÃO está disponível!', 'error');
    }
    
    if (typeof firebase.database === 'function') {
      addLog('Firebase Database está disponível', 'success');
    } else {
      addLog('Firebase Database NÃO está disponível!', 'error');
    }
  }
  
  // Verificar status dos módulos
  function checkModules() {
    addLog('Verificando módulos da aplicação...', 'info');
    
    const modules = [
      'firebaseHelper',
      'authUtils',
      'storageUtils',
      'securityUtils',
      'transcriptionUtils'
    ];
    
    modules.forEach(module => {
      if (window[module]) {
        addLog(`${module} está disponível`, 'success');
      } else {
        addLog(`${module} NÃO está disponível!`, 'error');
      }
    });
  }
  
  // Exportar funções para console
  window.debugTools = {
    checkFirebase: checkFirebaseStatus,
    checkModules: checkModules,
    log: addLog
  };
  
  // Executar verificações iniciais após carregamento
  window.addEventListener('load', () => {
    addLog('Página carregada. Verificando status...', 'info');
    setTimeout(() => {
      checkFirebaseStatus();
      checkModules();
    }, 1000);
  });
  
  addLog('Ferramenta de diagnóstico inicializada', 'success');
})();
