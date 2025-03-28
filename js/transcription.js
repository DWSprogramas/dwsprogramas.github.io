// Inicializar o módulo de transcrição
function initTranscription() {
    // Inicializar variáveis globais
    window.transcribedText = "";
    window.processedText = "";
    window.currentProcessingType = "summary";
    window.currentTranscriptionId = null;
    
    // Configurar manipuladores de eventos
    const processTextButton = document.getElementById('processText');
    if (processTextButton) {
        processTextButton.addEventListener('click', processText);
    }
    
    // Configurar as opções de processamento
    const processingOptions = document.querySelectorAll('input[name="processingOption"]');
    processingOptions.forEach(option => {
        option.addEventListener('change', function() {
            window.currentProcessingType = this.value;
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
    const saveModal = document.getElementById('saveModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const confirmSaveBtn = document.getElementById('confirmSaveBtn');
    
    if (!saveModal || !closeModalBtn || !confirmSaveBtn) return;
    
    // Fechar o modal ao clicar no X
    closeModalBtn.addEventListener('click', () => {
        saveModal.style.display = 'none';
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
    if (!window.transcribedText || !window.transcribedText.trim()) {
        showError('Não há texto para salvar. Faça uma gravação primeiro.');
        return;
    }
    
    // Limpar o input do título e abrir o modal
    document.getElementById('transcriptionTitle').value = '';
    document.getElementById('saveModal').style.display = 'block';
}

// Salvar transcrição no Firebase
function saveTranscriptionToFirebase() {
    const title = document.getElementById('transcriptionTitle').value.trim() || 
                'Transcrição ' + new Date().toLocaleString();
    
    const transcriptionData = {
        text: window.transcribedText,
        processedText: window.processedText,
        processingType: window.currentProcessingType,
        title: title
    };
    
    // Se estamos editando uma transcrição existente
    if (window.currentTranscriptionId) {
        firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions/${window.currentTranscriptionId}`).update(transcriptionData)
            .then(() => {
                document.getElementById('saveModal').style.display = 'none';
                updateStatus('Transcrição atualizada com sucesso.');
            })
            .catch((error) => {
                console.error('Erro ao atualizar transcrição:', error);
                showError('Erro ao atualizar: ' + error.message);
            });
    } else {
        // Estamos salvando uma nova transcrição
        const transcriptionId = firebase.database().ref().child(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions`).push().key;
        
        // Adicionar ID e timestamp
        transcriptionData.id = transcriptionId;
        transcriptionData.createdAt = firebase.database.ServerValue.TIMESTAMP;
        
        // Salvar no caminho correto
        firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions/${transcriptionId}`).set(transcriptionData)
            .then(() => {
                document.getElementById('saveModal').style.display = 'none';
                updateStatus('Transcrição salva com sucesso.');
                window.currentTranscriptionId = transcriptionId;
            })
            .catch((error) => {
                console.error('Erro ao salvar transcrição:', error);
                showError('Erro ao salvar: ' + error.message);
            });
    }
}

// Função para transcrever o áudio
async function transcribeAudio(audioBlob) {
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
            window.transcribedText = data.text;
            
            // Exibir a transcrição
            document.getElementById('transcription').textContent = window.transcribedText;
            
            updateStatus("Transcrição concluída com sucesso.");
            return window.transcribedText;
            
        } catch (error) {
            throw new Error(error.message);
        }
    });
}

// Processar texto transcrito
function processText() {
    // Obter o texto atual do campo editável
    const currentText = document.getElementById('transcription').textContent.trim();
    
    if (!currentText) {
        showError("Não há texto para processar. Por favor, faça uma gravação primeiro ou insira um texto.");
        return;
    }
    
    // Verificar se temos uma chave API válida através da função segura
    window.storageUtils.useApiKeySecurely(async (apiKey) => {
        // Atualizar a variável transcribedText com o conteúdo possivelmente editado
        window.transcribedText = currentText;
        
        // Visual feedback - alterando a aparência do botão
        document.getElementById('processText').classList.add('active');
        
        // Obter a opção selecionada
        const selectedOption = document.querySelector('input[name="processingOption"]:checked').value;
        window.currentProcessingType = selectedOption;
        
        // Processar o texto
        try {
            updateStatus("Processando texto...");
            await processTranscribedText(window.transcribedText, selectedOption, apiKey);
            
            // Ativar o botão de salvar
            if (firebase.auth().currentUser) {
                document.getElementById('saveTranscriptionBtn').disabled = false;
            }
        } catch (error) {
            showError("Erro ao processar texto: " + error.message);
        } finally {
            // Remover a classe active após o processamento
            setTimeout(() => {
                document.getElementById('processText').classList.remove('active');
            }, 1000);
        }
    }).catch(error => {
        showError("Erro de autenticação ou chave API: " + error.message);
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
        
        // Criar payload para a API (não logar a chave API)
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
                'Authorization': `Bearer ${apiKey}`, // A chave API não é logada
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API da OpenAI retornou erro: ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        window.processedText = data.choices[0].message.content;
        
        // Exibir o resultado do processamento
        document.getElementById('processedOutput').textContent = window.processedText;
        
        updateStatus("Processamento concluído com sucesso.");
        return window.processedText;
        
    } catch (error) {
        throw new Error(error.message);
    }
}

// Carregar detalhes de uma transcrição
function loadTranscriptionDetails(id) {
    if (!firebase.auth().currentUser) {
        return;
    }
    
    // Buscar a transcrição específica
    firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions/${id}`)
        .once('value')
        .then((snapshot) => {
            const transcription = snapshot.val();
            if (transcription) {
                // Atualizar a interface com os dados da transcrição
                document.getElementById('transcription').textContent = transcription.text;
                document.getElementById('processedOutput').textContent = transcription.processedText;
                
                // Atualizar as variáveis globais
                window.transcribedText = transcription.text;
                window.processedText = transcription.processedText;
                window.currentProcessingType = transcription.processingType;
                window.currentTranscriptionId = id;
                
                // Selecionar o tipo de processamento correto
                document.querySelector(`input[name="processingOption"][value="${transcription.processingType}"]`).checked = true;
                
                // Ativar os botões
                document.getElementById('processText').disabled = false;
                document.getElementById('saveTranscriptionBtn').disabled = false;
                
                // Mudar para a aba do gravador
                document.querySelector('.tab[data-tab="recorder"]').click();
            }
        })
        .catch((error) => {
            console.error('Erro ao carregar detalhes da transcrição:', error);
            showError('Erro ao carregar detalhes: ' + error.message);
        });
}

// Excluir uma transcrição
function deleteTranscription(id) {
    if (!firebase.auth().currentUser) {
        return;
    }
    
    firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions/${id}`).remove()
        .then(() => {
            // Recarregar a lista após exclusão
            loadTranscriptionsList();
            
            // Se a transcrição atual foi excluída, limpar a interface
            if (window.currentTranscriptionId === id) {
                document.getElementById('transcription').textContent = '';
                document.getElementById('processedOutput').textContent = '';
                window.transcribedText = '';
                window.processedText = '';
                window.currentTranscriptionId = null;
                document.getElementById('processText').disabled = true;
                document.getElementById('saveTranscriptionBtn').disabled = false;
            }
        })
        .catch((error) => {
            console.error('Erro ao excluir transcrição:', error);
            showError('Erro ao excluir: ' + error.message);
        });
}

// Carregar lista de transcrições
function loadTranscriptionsList() {
    if (!firebase.auth().currentUser) {
        return;
    }
    
    firebase.database().ref(`MapzyVox/users/${firebase.auth().currentUser.uid}/transcriptions`)
        .orderByChild('createdAt')
        .once('value')
        .then((snapshot) => {
            const transcriptionList = document.getElementById('transcriptionList');
            if (!transcriptionList) return;
            
            transcriptionList.innerHTML = '';
            
            const transcriptions = [];
            snapshot.forEach((childSnapshot) => {
                transcriptions.push(childSnapshot.val());
            });
            
            // Ordenar transcrições (mais recentes primeiro)
            transcriptions.reverse();
            
            const noTranscriptions = document.getElementById('noTranscriptions');
            if (noTranscriptions) {
                if (transcriptions.length === 0) {
                    noTranscriptions.style.display = 'block';
                    return;
                } else {
                    noTranscriptions.style.display = 'none';
                }
            }
            
            transcriptions.forEach(item => {
                const li = document.createElement('li');
                li.className = 'transcription-item';
                li.innerHTML = `
                    <div class="transcription-title">${item.title}</div>
                    <div class="transcription-date">${new Date(item.createdAt).toLocaleString()}</div>
                    <div class="transcription-content">${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}</div>
                    <div class="transcription-controls">
                        <button class="view-btn" data-id="${item.id}">Ver</button>
                        <button class="delete-btn" data-id="${item.id}">Excluir</button>
                    </div>
                `;
                
                transcriptionList.appendChild(li);
                
                // Adicionar evento para visualizar
                li.querySelector('.view-btn').addEventListener('click', () => {
                    loadTranscriptionDetails(item.id);
                });
                
                // Adicionar evento para excluir
                li.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Tem certeza que deseja excluir esta transcrição?')) {
                        deleteTranscription(item.id);
                    }
                });
            });
        })
        .catch(error => {
            console.error('Erro ao carregar transcrições:', error);
            showError('Erro ao carregar transcrições: ' + error.message);
        });
}

// Exportar funções para uso em outros scripts
window.transcriptionUtils = {
    initTranscription,
    transcribeAudio,
    processText,
    processTranscribedText,
    loadTranscriptionDetails,
    deleteTranscription,
    loadTranscriptionsList,
    showSaveTranscriptionModal,
    saveTranscriptionToFirebase
};
