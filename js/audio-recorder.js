// Variáveis para controle de gravação
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;

// Inicializar o módulo de gravação
function initAudioRecorder() {
    const startButton = document.getElementById('startRecording');
    const stopButton = document.getElementById('stopRecording');
    const recordingTimeSpan = document.getElementById('recordingTime');
    
    if (startButton) {
        startButton.addEventListener('click', startRecording);
    }
    
    if (stopButton) {
        stopButton.addEventListener('click', stopRecording);
    }
}

// Iniciar gravação
async function startRecording() {
    try {
        // Verificar se temos uma chave API válida
        const apiKey = getApiKey();
        if (!isValidApiKey(apiKey)) {
            showError("Chave API da OpenAI não encontrada. Por favor, forneça uma chave válida.");
            return;
        }
        
        // Visual feedback - adicionando classe active
        const startButton = document.getElementById('startRecording');
        startButton.classList.add('active');
        
        // Limpar gravações anteriores
        audioChunks = [];
        document.getElementById('transcription').textContent = "";
        document.getElementById('processedOutput').textContent = "";
        document.getElementById('processText').disabled = true;
        
        const saveTranscriptionBtn = document.getElementById('saveTranscriptionBtn');
        if (saveTranscriptionBtn) {
            saveTranscriptionBtn.disabled = true;
        }
        
        // Resetar o ID da transcrição atual
        window.currentTranscriptionId = null;
        window.transcribedText = "";
        window.processedText = "";
        
        // Solicitar acesso ao microfone
        updateStatus("Solicitando acesso ao microfone...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Configurar o gravador
        mediaRecorder = new MediaRecorder(stream);
        
        // Armazenar os chunks de áudio
        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });
        
        // Quando a gravação parar
        mediaRecorder.addEventListener('stop', async () => {
            // Parar o timer
            clearInterval(recordingTimer);
            
            // Atualizar UI
            startButton.disabled = false;
            startButton.classList.remove('active');
            document.getElementById('stopRecording').disabled = true;
            updateStatus("Gravação finalizada. Transcrevendo áudio...");
            
            try {
                // Criar um blob de áudio
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
                // Transcrever o áudio
                await transcribeAudio(audioBlob);
                
                // Ativar o botão de processamento se temos texto
                if (window.transcribedText && window.transcribedText.trim() !== "") {
                    document.getElementById('processText').disabled = false;
                    
                    // Adicionar um pequeno delay e um efeito visual para indicar que o texto pode ser editado
                    setTimeout(() => {
                        document.getElementById('transcription').classList.add('editable-highlight');
                        setTimeout(() => {
                            document.getElementById('transcription').classList.remove('editable-highlight');
                        }, 1000);
                    }, 500);
                }
            } catch (error) {
                showError("Erro ao transcrever áudio: " + error.message);
            }
            
            // Fechar as trilhas de áudio
            stream.getTracks().forEach(track => track.stop());
        });
        
        // Iniciar a gravação
        mediaRecorder.start();
        recordingStartTime = new Date();
        recordingTimer = setInterval(updateRecordingTime, 1000);
        updateRecordingTime();
        
        // Atualizar UI
        startButton.disabled = true;
        document.getElementById('stopRecording').disabled = false;
        updateStatus("Gravando áudio... Clique em 'Parar Gravação' quando terminar.");
        
    } catch (error) {
        document.getElementById('startRecording').classList.remove('active');
        showError("Erro ao iniciar gravação: " + error.message);
    }
}

// Parar gravação
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        updateStatus("Finalizando gravação...");
    }
}

// Atualizar o tempo de gravação
function updateRecordingTime() {
    const now = new Date();
    const elapsedSeconds = Math.floor((now - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    document.getElementById('recordingTime').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Resetar o estado de gravação
function resetRecordingState() {
    audioChunks = [];
    window.transcribedText = "";
    window.processedText = "";
    window.currentTranscriptionId = null;
    
    document.getElementById('transcription').textContent = "";
    document.getElementById('processedOutput').textContent = "";
    document.getElementById('processText').disabled = true;
    
    const saveTranscriptionBtn = document.getElementById('saveTranscriptionBtn');
    if (saveTranscriptionBtn) {
        saveTranscriptionBtn.disabled = true;
    }
}
