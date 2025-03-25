// Script para verificar a estrutura do projeto
console.log("===== VERIFICANDO ESTRUTURA DO PROJETO =====");

// Verificar se os módulos estão disponíveis globalmente
const modulos = [
    { nome: 'firebaseHelper', alternativa: 'firebase' },
    { nome: 'securityUtils', alternativa: null },
    { nome: 'storageUtils', alternativa: null },
    { nome: 'authUtils', alternativa: null },
    { nome: 'transcriptionUtils', alternativa: null }
];

function verificarModulos() {
    console.log("Verificando módulos globais...");
    let todosCorretos = true;
    
    modulos.forEach(modulo => {
        const disponivel = window[modulo.nome] !== undefined;
        console.log(`- Módulo ${modulo.nome}: ${disponivel ? 'DISPONÍVEL ✅' : 'NÃO DISPONÍVEL ❌'}`);
        
        if (!disponivel) {
            todosCorretos = false;
            if (modulo.alternativa) {
                const alternativaDisponivel = window[modulo.alternativa] !== undefined;
                console.log(`  Alternativa ${modulo.alternativa}: ${alternativaDisponivel ? 'DISPONÍVEL ✅' : 'NÃO DISPONÍVEL ❌'}`);
            }
        }
    });
    
    return todosCorretos;
}

// Verificar se os arquivos CSS necessários estão carregados
function verificarCSS() {
    console.log("Verificando arquivos CSS...");
    
    // Tenta encontrar a folha de estilo styles.css
    const stylesheets = Array.from(document.styleSheets);
    const stylesCSS = stylesheets.some(sheet => {
        try {
            return sheet.href && (sheet.href.includes('/css/styles.css') || sheet.href.includes('/styles.css'));
        } catch (e) {
            // Em alguns navegadores, acessar .href de folhas de estilo de origens diferentes pode lançar erro
            return false;
        }
    });
    
    console.log(`- CSS styles.css: ${stylesCSS ? 'CARREGADO ✅' : 'NÃO ENCONTRADO ❌'}`);
    return stylesCSS;
}

// Verificar elementos importantes da UI
function verificarElementosUI() {
    console.log("Verificando elementos principais da UI...");
    
    const elementos = [
        { id: 'apiKey', descricao: 'Campo de chave API' },
        { id: 'saveApiKey', descricao: 'Botão de salvar chave API' },
        { id: 'startRecording', descricao: 'Botão de iniciar gravação' },
        { id: 'stopRecording', descricao: 'Botão de parar gravação' },
        { id: 'transcription', descricao: 'Área de transcrição' },
        { id: 'processText', descricao: 'Botão de processar texto' },
        { id: 'processedOutput', descricao: 'Área de saída processada' },
        { id: 'saveTranscriptionBtn', descricao: 'Botão de salvar transcrição' },
        { id: 'login-button', descricao: 'Botão de login (página de login)' }
    ];
    
    let todosElementosPresentes = true;
    
    elementos.forEach(elemento => {
        const elementoPresente = document.getElementById(elemento.id) !== null;
        if (elementoPresente) {
            console.log(`- ${elemento.descricao}: ENCONTRADO ✅`);
        } else {
            // Alguns elementos podem não estar presentes na página atual, então não marcamos automaticamente como erro
            console.log(`- ${elemento.descricao}: NÃO ENCONTRADO (pode não estar nesta página)`);
            
            // Se for um elemento essencial para a página atual, marcamos como erro
            if ((window.location.pathname.includes('index.html') && ['apiKey', 'startRecording'].includes(elemento.id)) ||
                (window.location.pathname.includes('login.html') && ['login-button'].includes(elemento.id))) {
                console.log(`  ❌ ERRO: Este elemento deveria estar presente nesta página!`);
                todosElementosPresentes = false;
            }
        }
    });
    
    return todosElementosPresentes;
}

// Verificar estado de autenticação
function verificarAutenticacao() {
    console.log("Verificando estado de autenticação...");
    
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const usuarioAtual = firebase.auth().currentUser;
        console.log(`- Usuário autenticado: ${usuarioAtual ? 'SIM ✅' : 'NÃO ❌'}`);
        if (usuarioAtual) {
            console.log(`  Email: ${usuarioAtual.email}`);
        } else {
            if (!window.location.pathname.includes('login.html')) {
                console.log(`  ❌ AVISO: Não há usuário autenticado fora da página de login!`);
                console.log(`  Página atual: ${window.location.pathname}`);
            }
        }
    } else {
        console.log("- Firebase Auth não está disponível ❌");
    }
}

// Função principal de verificação
function verificarEstrutura() {
    console.log("Iniciando verificação da estrutura do projeto...");
    console.log(`Página atual: ${window.location.href}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    const modulosOk = verificarModulos();
    const cssOk = verificarCSS();
    const elementosOk = verificarElementosUI();
    verificarAutenticacao();
    
    console.log("\nResumo da verificação:");
    console.log(`- Módulos globais: ${modulosOk ? 'OK ✅' : 'PROBLEMAS ENCONTRADOS ❌'}`);
    console.log(`- Arquivos CSS: ${cssOk ? 'OK ✅' : 'PROBLEMAS ENCONTRADOS ❌'}`);
    console.log(`- Elementos UI: ${elementosOk ? 'OK ✅' : 'PROBLEMAS ENCONTRADOS ❌'}`);
    
    console.log("\nRecomendações:");
    if (!modulosOk) {
        console.log("- Verifique a ordem de carregamento dos arquivos JavaScript");
        console.log("- Garanta que todos os módulos estão sendo exportados corretamente");
    }
    if (!cssOk) {
        console.log("- Verifique se o arquivo styles.css está na pasta correta (css/)");
        console.log("- Verifique se a referência ao arquivo CSS no HTML está correta");
    }
    if (!elementosOk) {
        console.log("- Verifique se os IDs no HTML correspondem aos que são referenciados no JavaScript");
    }
    
    console.log("===== VERIFICAÇÃO CONCLUÍDA =====");
}

// Executar verificação após o carregamento completo da página
window.addEventListener('load', verificarEstrutura);

// Fornecer acesso global para permitir verificação manual
window.verificadorEstrutura = {
    verificarModulos,
    verificarCSS,
    verificarElementosUI,
    verificarAutenticacao,
    verificarEstrutura
};

console.log("Verificador de estrutura carregado. Execute window.verificadorEstrutura.verificarEstrutura() para verificar a estrutura do projeto a qualquer momento.");
