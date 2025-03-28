/**
 * Mapzy Vox IA - Módulo de Transcrição
 * Gerencia o processamento, armazenamento e manipulação de transcrições
 */

// Estado interno da transcrição atual (para melhor gerenciamento)
const transcriptionState = {
  text: "",
  processedText: "",
  processingType: "summary",
  id: null,
  title: "",
  isProcessing: false
};

// Inicializar o módulo de transcrição
function initTranscription() {
    console.log("Inicializando módulo de transcrição...");
    
    // Inicializar variáveis globais (mantendo para compatibilidade)
    window.transcribedText = "";
    window.processedText = "";
    window.currentProcessingType = "summary";
    window.currentTranscriptionId = null;
    
    // Configurar manipuladores de eventos
    setupEventListeners();
    
    console.log("Módulo de transcrição inicializado");
}

// Configurar todos os event listeners
function setupEventListeners() {
    // Botão de processar texto
    const processTextButton = document.getElementById('process-text');
    if (processTextButton) {
        processTextButton.addEventListener('click', processText);
    }
    
    // Configurar as opções de processamento
    const processingOptions = document.querySelectorAll('input[name="processingOption"]');
    processingOptions.forEach(option => {
        option.addEventListener('change', function() {
            // Atualizar tanto o estado interno quanto a variável global
            transcriptionState.processingType = this.value;
            window.currentProcessingType = this.value;
            
            // Atualizar seleção visual (opcional)
            document.querySelectorAll('.option-card').forEach(card => {
                card.classList.remove('selected');
            });
            this.closest('.option-card')?.classList.add('selected');
        });
    });
    
    // Configurar o botão de salvar transcrição
    const saveTranscriptionBtn = document.getElementById('saveTranscriptionBtn');
    if (saveTranscriptionBtn) {
        saveTranscriptionBtn.addEventListener('click', showSaveTranscriptionModal);
    }
    
    // Configurar o modal de salvar
    setupSaveModal();
}

// Configurar o modal de salvar
function setupSaveModal() {
    const saveModal = document.getElementById('save-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const confirmSaveBtn = document.getElementById('confirm-save-btn');
    
    if (!saveModal || !confirmSaveBtn) {
        console.warn("Elementos do modal de salvar não encontrados");
        return;
    }
    
    // Fechar o modal ao clicar no X
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            saveModal.style.display = 'none';
        });
    });
    
    // Fechar o modal ao clicar fora dele
    window.addEventListener('click', (event) => {
        if (event.target === saveModal) {
            saveModal.style.display = 'none';
        }
    });
    
    // Salvar a transcrição no Firebase
    confirmSaveBtn.addEventListener('click', saveTranscriptionToFirebase);
}

// Mostrar o modal para salvar transcrição
function showSaveTranscriptionModal() {
    const transcriptionText = document.getElementById('transcription-text');
    const saveModal = document.getElementById('save-modal');
    
    if (!transcriptionText || !saveModal) {
        console.error("Elementos necessários para salvar não encontrados");
        return;
    }
    
    const currentText = transcriptionText.textContent.trim();
    
    if (!currentText) {
        showError('Não há texto para salvar. Faça uma gravação primeiro.');
        return;
    }
    
    // Atualizar o estado interno e variáveis globais
    transcriptionState.text = currentText;
    window.transcribedText = currentText;
    
    // Limpar o input do título e abrir o modal
    const transcriptionTitleInput = document.getElementById('transcription-title');
    if (transcriptionTitleInput) {
        transcriptionTitleInput.value = '';
    }
    
    saveModal.style.display = 'flex';
}

// Salvar transcrição no Firebase
function saveTranscriptionToFirebase() {
    // Verificar se o usuário está autenticado
    if (!firebase.auth().currentUser) {
        showError("Você precisa estar logado para salvar uma transcrição.");
        return;
    }
    
    const titleInput = document.getElementById('transcription-title');
    const saveModal = document.getElementById('save-modal');
    
    if (!titleInput || !saveModal) {
        console.error("Elementos necessários para salvar não encontrados");
        return;
    }
    
    // Usar o estado interno para garantir consistência
    const text = transcriptionState.text || window.transcribedText;
    const processedText = transcriptionState.processedText || window.processedText;
    const processingType = transcriptionState.processingType || window.currentProcessingType;
    const id = transcriptionState.id || window.currentTranscriptionId;
    
    // Obter o título da transcrição
    const title = titleInput.value.trim() || 'Transcrição ' + new Date().toLocaleString();
    
    // Criar o objeto de dados da transcrição
    const transcriptionData = {
        text: text,
        processedText: processedText,
        processingType: processingType,
        title: title
    };
    
    // Se estamos editando uma transcrição existente
    if (id) {
        // Verificar se o helper do Firebase está disponível
        if (window.firebaseHelper && typeof window.firebaseHelper.updateTranscription === 'function') {
            window.firebaseHelper.updateTranscription(id, transcriptionData)
                .then(() => {
                    saveModal.style.display = 'none';
                    updateStatus('Transcrição atualizada com sucesso.');
                    
                    // Atualizar a transcrição na lista global
                    updateTranscriptionInList(id, {
                        ...transcriptionData,
                        updatedAt: Date.now()
                    });
                })
                .catch((error) => {
                    console.error('Erro ao atualizar transcrição:', error);
                    showError('Erro ao atualizar: ' + error.message);
                });
        } else {
            // Fallback para Firebase direto
            firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions/${id}`)
                .update({
                    ...transcriptionData,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                })
                .then(() => {
                    saveModal.style.display = 'none';
                    updateStatus('Transcrição atualizada com sucesso.');
                    
                    // Atualizar a lista se possível
                    updateTranscriptionInList(id, {
                        ...transcriptionData,
                        updatedAt: Date.now()
                    });
                })
                .catch((error) => {
                    console.error('Erro ao atualizar transcrição:', error);
                    showError('Erro ao atualizar: ' + error.message);
                });
        }
    } else {
        // Estamos salvando uma nova transcrição
        if (window.firebaseHelper && typeof window.firebaseHelper.saveTranscription === 'function') {
            window.firebaseHelper.saveTranscription(transcriptionData)
                .then((savedTranscription) => {
                    saveModal.style.display = 'none';
                    updateStatus('Transcrição salva com sucesso.');
                    
                    // Atualizar o ID da transcrição atual
                    transcriptionState.id = savedTranscription.id;
                    window.currentTranscriptionId = savedTranscription.id;
                    
                    // Adicionar à lista global
                    addTranscriptionToList(savedTranscription);
                })
                .catch((error) => {
                    console.error('Erro ao salvar transcrição:', error);
                    showError('Erro ao salvar: ' + error.message);
                });
        } else {
            // Fallback para Firebase direto
            const newTranscriptionRef = firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions`).push();
            const newTranscriptionId = newTranscriptionRef.key;
            
            const newTranscription = {
                ...transcriptionData,
                id: newTranscriptionId,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            newTranscriptionRef.set(newTranscription)
                .then(() => {
                    saveModal.style.display = 'none';
                    updateStatus('Transcrição salva com sucesso.');
                    
                    // Atualizar o ID da transcrição atual
                    transcriptionState.id = newTranscriptionId;
                    window.currentTranscriptionId = newTranscriptionId;
                    
                    // Adicionar à lista global com timestamp local
                    addTranscriptionToList({
                        ...newTranscription,
                        createdAt: Date.now()
                    });
                })
                .catch((error) => {
                    console.error('Erro ao salvar transcrição:', error);
                    showError('Erro ao salvar: ' + error.message);
                });
        }
    }
}

// Função para transcrever o áudio
async function transcribeAudio(audioBlob) {
    // Verificar se o blob de áudio é válido
    if (!audioBlob || !(audioBlob instanceof Blob)) {
        throw new Error("Erro ao capturar áudio. Tente novamente.");
    }
    
    try {
        // Obter a chave API de forma segura
        return window.storageUtils.useApiKeySecurely(async (apiKey) => {
            try {
                // Criar um FormData para enviar o arquivo
                const formData = new FormData();
                formData.append('file', audioBlob, 'recording.webm');
                formData.append('model', 'whisper-1');
                
                updateStatus("Enviando áudio para transcrição...");
                
                // Log seguro sem a chave API
                console.log("Enviando requisição para transcrição de áudio");
                
                // Enviar para a API da OpenAI
                const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}` // A chave API não é logada
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API da OpenAI retornou erro: ${errorData.error?.message || response.statusText}`);
                }
                
                const data = await response.json();
                const transcribedText = data.text;
                
                // Atualizar o estado interno e variáveis globais
                transcriptionState.text = transcribedText;
                window.transcribedText = transcribedText;
                
                // Exibir a transcrição
                const transcriptionTextElement = document.getElementById('transcription-text');
                if (transcriptionTextElement) {
                    transcriptionTextElement.textContent = transcribedText;
                }
                
                updateStatus("Transcrição concluída com sucesso.");
                return transcribedText;
            } catch (error) {
                console.error("Erro ao transcrever áudio:", error);
                throw error;
            }
        });
    } catch (error) {
        console.error("Erro ao obter chave API:", error);
        throw new Error("Erro ao transcrever: " + error.message);
    }
}

// Processar texto transcrito
function processText() {
    // Obter o texto atual do campo editável
    const transcriptionTextElement = document.getElementById('transcription-text');
    const processTextBtn = document.getElementById('process-text');
    const processedOutput = document.getElementById('processed-output');
    
    if (!transcriptionTextElement || !processTextBtn || !processedOutput) {
        console.error("Elementos necessários para processamento não encontrados");
        return;
    }
    
    const currentText = transcriptionTextElement.textContent.trim();
    
    if (!currentText) {
        showError("Não há texto para processar. Por favor, faça uma gravação primeiro ou insira um texto.");
        return;
    }
    
    // Verificar se temos uma chave API válida
    const apiKey = getApiKey();
    if (!apiKey) {
        showError("Chave API da OpenAI não encontrada. Por favor, forneça uma chave válida na página de configurações.");
        return;
    }
    
    // Atualizar o estado interno e variáveis globais
    transcriptionState.text = currentText;
    transcriptionState.isProcessing = true;
    window.transcribedText = currentText;
    
    // Visual feedback - alterando a aparência do botão
    processTextBtn.classList.add('active');
    processTextBtn.disabled = true;
    
    // Obter a opção selecionada
    const selectedOption = document.querySelector('input[name="processingOption"]:checked').value;
    transcriptionState.processingType = selectedOption;
    window.currentProcessingType = selectedOption;
    
    // Mostrar status de processamento
    updateStatus("Processando texto...");
    
    // Processar o texto
    processTranscribedText(currentText, selectedOption, apiKey)
        .then(processedText => {
            // Atualizar o estado com o texto processado
            transcriptionState.processedText = processedText;
            window.processedText = processedText;
            
            // Mostrar o resultado do processamento
            processedOutput.textContent = processedText;
            
            // Mostrar mensagem de sucesso
            updateStatus("Processamento concluído com sucesso.");
            
            // Ativar o botão de salvar
            const saveTranscriptionBtn = document.getElementById('saveTranscriptionBtn');
            if (saveTranscriptionBtn) {
                saveTranscriptionBtn.disabled = false;
            }
        })
        .catch(error => {
            showError("Erro ao processar texto: " + error.message);
        })
        .finally(() => {
            // Remover feedback visual e atualizar estado
            processTextBtn.classList.remove('active');
            processTextBtn.disabled = false;
            transcriptionState.isProcessing = false;
        });
}

// Função para processar o texto transcrito
async function processTranscribedText(text, option, apiKey) {
    try {
        // Definir o prompt com base na opção selecionada
        let prompt;
        switch (option) {
            case 'summary':
                prompt = "Faça um resumo conciso e claro do seguinte texto:\n\n";
                break;
            case 'list':
                prompt = "Crie uma lista organizada dos principais tópicos e pontos importantes do seguinte texto:\n\n";
                break;
            case 'mindmap':
                prompt = "Crie um mapa mental em formato de texto do seguinte conteúdo, organizando os conceitos principais e suas relações hierárquicas:\n\n";
                break;
            default:
                prompt = "Resumo do seguinte texto:\n\n";
        }
        
        // Criar payload para a API
        const payload = {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "Você é um assistente especializado em organizar e processar informações de textos transcritos de áudio."
                },
                {
                    role: "user",
                    content: prompt + text
                }
            ],
            temperature: 0.5,
            max_tokens: 1000
        };
        
        updateStatus("Enviando texto para processamento...");
        
        // Log seguro sem a chave API
        console.log("Enviando requisição para processamento de texto");
        
        // Enviar para a API da OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API da OpenAI retornou erro: ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        const processedText = data.choices[0].message.content;
        
        return processedText;
    } catch (error) {
        console.error("Erro ao processar texto:", error);
        throw error;
    }
}

// Carregar detalhes de uma transcrição específica
function loadTranscriptionDetails(id) {
    console.log('Carregando detalhes da transcrição:', id);
    
    // Verificar se o Firebase e o usuário estão disponíveis
    if (!firebase || !firebase.auth().currentUser) {
        showError("Você precisa estar logado para carregar uma transcrição.");
        return;
    }
    
    // Verificar se a transcrição já está na lista global
    if (window.allTranscriptions) {
        const transcription = window.allTranscriptions.find(t => t.id === id);
        if (transcription) {
            loadTranscriptionToEditor(transcription);
            return;
        }
    }
    
    // Buscar a transcrição no Firebase
    firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions/${id}`)
        .once('value')
        .then((snapshot) => {
            const transcription = snapshot.val();
            if (transcription) {
                loadTranscriptionToEditor(transcription);
            } else {
                showError('Transcrição não encontrada');
            }
        })
        .catch((error) => {
            console.error('Erro ao carregar detalhes da transcrição:', error);
            showError('Erro ao carregar detalhes: ' + error.message);
        });
}

// Carregar uma transcrição no editor
function loadTranscriptionToEditor(transcription) {
    console.log('Carregando transcrição no editor:', transcription.id);
    
    const transcriptionText = document.getElementById('transcription-text');
    const processedOutput = document.getElementById('processed-output');
    const processTextBtn = document.getElementById('process-text');
    const saveTranscriptionBtn = document.getElementById('saveTranscriptionBtn');
    
    if (!transcriptionText || !processedOutput) {
        console.error('Elementos do editor não encontrados');
        return;
    }
    
    // Atualizar os campos do editor
    transcriptionText.textContent = transcription.text;
    processedOutput.textContent = transcription.processedText;
    
    // Atualizar o estado interno
    transcriptionState.text = transcription.text;
    transcriptionState.processedText = transcription.processedText;
    transcriptionState.processingType = transcription.processingType;
    transcriptionState.id = transcription.id;
    transcriptionState.title = transcription.title;
    
    // Atualizar variáveis globais
    window.transcribedText = transcription.text;
    window.processedText = transcription.processedText;
    window.currentProcessingType = transcription.processingType;
    window.currentTranscriptionId = transcription.id;
    
    // Selecionar o tipo de processamento correto
    const processingOption = document.querySelector(`input[name="processingOption"][value="${transcription.processingType}"]`);
    if (processingOption) {
        processingOption.checked = true;
        
        // Atualizar a seleção visual dos cards
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('selected');
        });
        processingOption.closest('.option-card')?.classList.add('selected');
    }
    
    // Ativar os botões
    if (processTextBtn) processTextBtn.disabled = false;
    if (saveTranscriptionBtn) saveTranscriptionBtn.disabled = false;
    
    // Mudar para a aba de gravação
    if (typeof window.uiHandler !== 'undefined' && 
        typeof window.uiHandler.navigateTo === 'function') {
        window.uiHandler.navigateTo('record');
    } else {
        // Fallback para navegação por abas
        const recorderTab = document.querySelector('.tab[data-tab="recorder"]');
        if (recorderTab) recorderTab.click();
    }
}

// Excluir uma transcrição
function deleteTranscription(id) {
    console.log('Excluindo transcrição:', id);
    
    // Verificar se o Firebase e o usuário estão disponíveis
    if (!firebase || !firebase.auth().currentUser) {
        showError("Você precisa estar logado para excluir uma transcrição.");
        return;
    }
    
    // Verificar se o helper do Firebase está disponível
    if (window.firebaseHelper && typeof window.firebaseHelper.deleteTranscription === 'function') {
        window.firebaseHelper.deleteTranscription(id)
            .then(() => {
                console.log('Transcrição excluída com sucesso:', id);
                
                // Remover da lista global
                removeTranscriptionFromList(id);
                
                // Limpar o editor se esta era a transcrição atual
                if (transcriptionState.id === id) {
                    resetTranscriptionState();
                }
                
                // Recarregar a lista de transcrições
                if (typeof loadTranscriptionsList === 'function') {
                    loadTranscriptionsList();
                }
                
                // Fechar o modal se estiver aberto
                const viewTranscriptionModal = document.getElementById('view-transcription-modal');
                if (viewTranscriptionModal && viewTranscriptionModal.style.display !== 'none') {
                    viewTranscriptionModal.style.display = 'none';
                }
                
                updateStatus('Transcrição excluída com sucesso!');
            })
            .catch(error => {
                console.error('Erro ao excluir transcrição:', error);
                showError('Erro ao excluir transcrição: ' + error.message);
            });
    } else {
        // Fallback para Firebase direto
        firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions/${id}`).remove()
            .then(() => {
                console.log('Transcrição excluída com sucesso:', id);
                
                // Remover da lista global
                removeTranscriptionFromList(id);
                
                // Limpar o editor se esta era a transcrição atual
                if (transcriptionState.id === id) {
                    resetTranscriptionState();
                }
                
                // Recarregar a lista de transcrições
                if (typeof loadTranscriptionsList === 'function') {
                    loadTranscriptionsList();
                }
                
                // Fechar o modal se estiver aberto
                const viewTranscriptionModal = document.getElementById('view-transcription-modal');
                if (viewTranscriptionModal && viewTranscriptionModal.style.display !== 'none') {
                    viewTranscriptionModal.style.display = 'none';
                }
                
                updateStatus('Transcrição excluída com sucesso!');
            })
            .catch(error => {
                console.error('Erro ao excluir transcrição:', error);
                showError('Erro ao excluir transcrição: ' + error.message);
            });
    }
}

// Editar uma transcrição
function editTranscription(id) {
    // Carregar a transcrição no editor
    loadTranscriptionDetails(id);
    
    // Fechar o modal se estiver aberto
    const viewTranscriptionModal = document.getElementById('view-transcription-modal');
    if (viewTranscriptionModal && viewTranscriptionModal.style.display !== 'none') {
        viewTranscriptionModal.style.display = 'none';
    }
}

// Visualizar uma transcrição
function viewTranscription(id) {
    console.log('Visualizando transcrição:', id);
    
    // Verificar se a transcrição está na lista global
    const transcription = window.allTranscriptions?.find(t => t.id === id);
    if (!transcription) {
        showError('Transcrição não encontrada');
        return;
    }
    
    // Verificar se os elementos do modal existem
    const viewTranscriptionModal = document.getElementById('view-transcription-modal');
    const modalTranscriptionTitle = document.getElementById('modal-transcription-title');
    const modalTranscriptionDate = document.getElementById('modal-transcription-date');
    const modalTranscriptionText = document.getElementById('modal-transcription-text');
    const modalProcessedText = document.getElementById('modal-processed-text');
    const modalProcessingType = document.getElementById('modal-processing-type');
    
    if (!viewTranscriptionModal || !modalTranscriptionTitle || !modalTranscriptionDate || 
        !modalTranscriptionText || !modalProcessedText || !modalProcessingType) {
        console.error('Elementos do modal de visualização não encontrados');
        return;
    }
    
    // Preencher o modal com os dados
    modalTranscriptionTitle.textContent = transcription.title;
    modalTranscriptionDate.textContent = new Date(transcription.createdAt).toLocaleString();
    modalTranscriptionText.textContent = transcription.text;
    modalProcessedText.textContent = transcription.processedText;
    
    // Formatar o tipo de processamento
    let processingType;
    switch (transcription.processingType) {
        case 'summary':
            processingType = 'Resumo';
            break;
        case 'list':
            processingType = 'Lista de Tópicos';
            break;
        case 'mindmap':
            processingType = 'Mapa Mental';
            break;
        default:
            processingType = transcription.processingType;
    }
    modalProcessingType.textContent = processingType;
    
    // Armazenar o ID atual
    transcriptionState.id = id;
    window.currentTranscriptionId = id;
    
    // Mostrar o modal
    viewTranscriptionModal.style.display = 'flex';
}

// Carregar lista de transcrições
function loadTranscriptionsList() {
    // Verificar se o Firebase e o usuário estão disponíveis
    if (!firebase || !firebase.auth().currentUser) {
        console.warn("Usuário não autenticado ao tentar carregar lista de transcrições");
        return;
    }
    
    const transcriptionList = document.getElementById('transcriptionList');
    if (!transcriptionList) {
        console.warn("Elemento de lista de transcrições não encontrado");
        return;
    }
    
    // Mostrar indicador de carregamento se disponível
    const loadingSpinner = document.getElementById('transcriptions-loading');
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions`)
        .orderByChild('createdAt')
        .once('value')
        .then((snapshot) => {
            // Limpar lista atual
            transcriptionList.innerHTML = '';
            
            const transcriptions = [];
            snapshot.forEach((childSnapshot) => {
                transcriptions.push(childSnapshot.val());
            });
            
            // Armazenar na lista global se não existir
            if (!window.allTranscriptions) {
                window.allTranscriptions = transcriptions;
            }
            
            // Ordenar transcrições (mais recentes primeiro)
            transcriptions.sort((a, b) => b.createdAt - a.createdAt);
            
            // Verificar se há transcrições para mostrar
            const noTranscriptions = document.getElementById('noTranscriptions');
            if (noTranscriptions) {
                if (transcriptions.length === 0) {
                    noTranscriptions.style.display = 'block';
                    
                    if (loadingSpinner) loadingSpinner.style.display = 'none';
                    return;
                } else {
                    noTranscriptions.style.display = 'none';
                }
            }
            
            // Adicionar cada transcrição à lista
            transcriptions.forEach(item => {
                const li = createTranscriptionListItem(item);
                transcriptionList.appendChild(li);
            });
            
            // Esconder indicador de carregamento
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        })
        .catch(error => {
            console.error('Erro ao carregar transcrições:', error);
            showError('Erro ao carregar transcrições: ' + error.message);
            
            // Esconder indicador de carregamento
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        });
}

// Criar um item de lista de transcrição
function createTranscriptionListItem(item) {
    const li = document.createElement('li');
    li.className = 'transcription-item';
    
    // Usar concatenação de strings em vez de template literals para maior compatibilidade
    const html = 
        '<div class="transcription-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="transcription-date">' + new Date(item.createdAt).toLocaleString() + '</div>' +
        '<div class="transcription-content">' + escapeHtml(item.text.substring(0, 100)) + (item.text.length > 100 ? '...' : '') + '</div>' +
        '<div class="transcription-controls">' +
            '<button class="btn-view" data-id="' + item.id + '">Ver</button>' +
            '<button class="btn-edit" data-id="' + item.id + '">Editar</button>' +
            '<button class="btn-delete" data-id="' + item.id + '">Excluir</button>' +
        '</div>';
    
    li.innerHTML = html;
    
    // Adicionar evento para visualizar
    const viewBtn = li.querySelector('.btn-view');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            viewTranscription(item.id);
        });
    }
    
    // Adicionar evento para editar
    const editBtn = li.querySelector('.btn-edit');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editTranscription(item.id);
        });
    }
    
    // Adicionar evento para excluir
    const deleteBtn = li.querySelector('.btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Tem certeza que deseja excluir esta transcrição?')) {
                deleteTranscription(item.id);
            }
        });
    }
    
    // O item inteiro também abre o modal de visualização
    li.addEventListener('click', () => {
        viewTranscription(item.id);
    });
    
    return li;
}

// Adicionar uma transcrição à lista global
function addTranscriptionToList(transcription) {
    // Verificar se a lista global existe
    if (!window.allTranscriptions) {
        window.allTranscriptions = [];
    }
    
    // Adicionar a transcrição
    window.allTranscriptions.push(transcription);
    
    // Atualizar as visualizações na interface
    updateViews();
}

// Atualizar uma transcrição na lista global
function updateTranscriptionInList(id, updatedData) {
    // Verificar se a lista global existe
    if (!window.allTranscriptions) {
        return;
    }
    
    // Encontrar o índice da transcrição
    const index = window.allTranscriptions.findIndex(t => t.id === id);
    if (index !== -1) {
        // Atualizar a transcrição
        window.allTranscriptions[index] = {
            ...window.allTranscriptions[index],
            ...updatedData
        };
        
        // Atualizar as visualizações na interface
        updateViews();
    }
}

// Remover uma transcrição da lista global
function removeTranscriptionFromList(id) {
    // Verificar se a lista global existe
    if (!window.allTranscriptions) {
        return;
    }
    
    // Filtrar a transcrição
    window.allTranscriptions = window.allTranscriptions.filter(t => t.id !== id);
    
    // Atualizar as visualizações na interface
    updateViews();
}

// Atualizar visualizações na interface
function updateViews() {
    // Verificar se temos funções para atualizar as visualizações
    if (typeof updateStats === 'function') {
        updateStats(window.allTranscriptions);
    }
    
    if (typeof loadRecentTranscriptions === 'function') {
        loadRecentTranscriptions(window.allTranscriptions);
    }
    
    // Se a página atual for histórico, atualizar a lista
    const currentPage = window.location.hash.substring(1) || 'dashboard';
    if (currentPage === 'history' && typeof loadAllTranscriptions === 'function') {
        loadAllTranscriptions();
    }
}

// Resetar o estado da transcrição
function resetTranscriptionState() {
    // Limpar o estado interno
    transcriptionState.text = "";
    transcriptionState.processedText = "";
    transcriptionState.processingType = "summary";
    transcriptionState.id = null;
    transcriptionState.title = "";
    transcriptionState.isProcessing = false;
    
    // Atualizar variáveis globais
    window.transcribedText = "";
    window.processedText = "";
    window.currentProcessingType = "summary";
    window.currentTranscriptionId = null;
    
    // Limpar os campos da interface
    const transcriptionText = document.getElementById('transcription-text');
    const processedOutput = document.getElementById('processed-output');
    const processTextBtn = document.getElementById('process-text');
    const saveTranscriptionBtn = document.getElementById('saveTranscriptionBtn');
    
    if (transcriptionText) transcriptionText.textContent = '';
    if (processedOutput) processedOutput.textContent = '';
    if (processTextBtn) processTextBtn.disabled = true;
    if (saveTranscriptionBtn) saveTranscriptionBtn.disabled = true;
}

// Obter chave API usando a função do storageUtils
function getApiKey() {
    if (window.storageUtils && typeof window.storageUtils.getApiKey === 'function') {
        return window.storageUtils.getApiKey();
    }
    
    // Fallback: tentar pegar do localStorage diretamente
    return localStorage.getItem('openai_api_key');
}

// Mostrar mensagem de status
function updateStatus(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
    } else {
        console.log('Status:', message);
    }
}

// Mostrar mensagem de erro
function showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Esconder após 5 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        console.error('Erro:', message);
        
        // Verificar se há uma função global de exibição de erros
        if (typeof window.showErrorMessage === 'function') {
            window.showErrorMessage(message);
        } else {
            alert(message); // Fallback para alert
        }
    }
}

// Função auxiliar para escapar HTML em strings
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Exportar funções para uso em outros scripts
// Mantém a mesma interface pública para compatibilidade
window.transcriptionUtils = {
    initTranscription,
    transcribeAudio,
    processText,
    processTranscribedText,
    loadTranscriptionDetails,
    deleteTranscription,
    loadTranscriptionsList,
    showSaveTranscriptionModal,
    saveTranscriptionToFirebase,
    editTranscription,
    viewTranscription,
    resetTranscriptionState
};
