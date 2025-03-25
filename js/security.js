// Módulo de segurança para o MapzyVox

// Função para criptografar a chave API (criptografia simples para exemplo)
function encryptApiKey(apiKey) {
  // Usar uma técnica simples de criptografia reversível
  // Nota: Esta não é uma criptografia forte, é apenas um exemplo
  return btoa(apiKey.split('').reverse().join(''));
}

// Função para descriptografar a chave API
function decryptApiKey(encryptedKey) {
  try {
    return atob(encryptedKey).split('').reverse().join('');
  } catch (e) {
    console.error('Erro ao descriptografar chave');
    return '';
  }
}

// Função para sanitizar dados para logs (remover informações sensíveis)
function sanitizeDataForLogs(data) {
  if (!data) return data;
  
  const sanitized = {...data};
  
  // Sanitizar apiKey se existir
  if (sanitized.apiKey) {
    sanitized.apiKey = '******';
  }
  
  return sanitized;
}

// Exportar funções para uso em outros arquivos
window.securityUtils = {
  encryptApiKey,
  decryptApiKey,
  sanitizeDataForLogs
};
