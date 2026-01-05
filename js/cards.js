// Configuração do repositório GitHub
const GITHUB_OWNER = 'Ewerton-Jose';
const GITHUB_REPO = 'RPGs-PT-BR';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;
const MAIN_FOLDER = 'livros e fichas pdf';

// Processa os dados para criar um dicionário de PDFs por sistema
let pdfData = {};
let systemNames = {};

// Função para formatar nomes de pastas (remover - e _)
function formatFolderName(name) {
    return name
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Função para buscar conteúdo de uma pasta do GitHub
async function fetchGitHubFolder(path = '') {
    try {
        const url = path ? `${GITHUB_API_BASE}/${encodeURIComponent(path)}` : GITHUB_API_BASE;
        const response = await fetch(url);
        
        // Verificar se é erro de rate limit (403)
        if (response.status === 403) {
            const rateLimitReset = response.headers.get('X-RateLimit-Reset');
            let mensagem = '⚠️ O servidor está com problemas devido ao limite de requisições da API do GitHub.';
            
            if (rateLimitReset) {
                const resetTime = new Date(rateLimitReset * 1000);
                const now = new Date();
                const minutosRestantes = Math.ceil((resetTime - now) / 60000);
                
                if (minutosRestantes > 0) {
                    mensagem += `\n\n⏰ Tente novamente em aproximadamente ${minutosRestantes} minuto${minutosRestantes > 1 ? 's' : ''}.`;
                } else {
                    mensagem += '\n\n⏰ Tente novamente em alguns instantes.';
                }
            } else {
                mensagem += '\n\n⏰ Tente novamente em aproximadamente 60 minutos.';
            }
            
            throw new Error('RATE_LIMIT:' + mensagem);
        }
        
        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar pasta do GitHub:', error);
        throw error;
    }
}

// Função para buscar todos os sistemas de RPG e seus arquivos
async function loadAllSystems() {
    try {
        // Buscar todas as pastas dentro de "livros e fichas pdf"
        const folders = await fetchGitHubFolder(MAIN_FOLDER);
        
        // Processar cada pasta (sistema de RPG)
        for (const folder of folders) {
            if (folder.type === 'dir') {
                const files = [];
                const folderContents = await fetchGitHubFolder(folder.path);
                
                // Coletar todos os arquivos PDF
                for (const item of folderContents) {
                    if (item.type === 'file') {
                        const extension = item.name.split('.').pop().toLowerCase();
                        if (extension === 'pdf') {
                            files.push({
                                name: item.name,
                                path: item.path
                            });
                        }
                    }
                }
                
                // Adicionar ao dicionário de dados
                pdfData[folder.name] = files;
                systemNames[folder.name] = formatFolderName(folder.name);
            }
        }
        
        return Object.keys(pdfData);
    } catch (error) {
        console.error('Erro ao carregar sistemas:', error);
        return [];
    }
}

// Função para criar os cards dinamicamente
async function createCards() {
    const grid = document.querySelector('.grid');
    
    // Mostrar mensagem de carregamento
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #fff; font-size: 1.2em;">⏳ Carregando sistemas de RPG...</div>';
    
    try {
        // Carregar todos os sistemas
        const systems = await loadAllSystems();
        
        // Limpar o grid
        grid.innerHTML = '';
        
        // Verificar se há sistemas
        if (systems.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #fff; font-size: 1.2em;">Nenhum sistema de RPG encontrado.</div>';
            return;
        }
        
        // Criar um card para cada sistema
        systems.forEach((systemKey, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.onclick = () => showPDFs(systemKey);
            
            const title = document.createElement('h2');
            // Usar o nome formatado
            title.textContent = systemNames[systemKey];
            
            card.appendChild(title);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Erro ao criar cards:', error);
        
        // Verificar se é erro de rate limit
        if (error.message && error.message.startsWith('RATE_LIMIT:')) {
            const mensagem = error.message.replace('RATE_LIMIT:', '');
            alert(mensagem);
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #f39c12; font-size: 1.2em;"><strong>⚠️ Limite de requisições excedido</strong><br><br>Por favor, aguarde alguns minutos e recarregue a página.</div>';
        } else {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #e74c3c; font-size: 1.2em;">❌ Erro ao carregar sistemas. Tente recarregar a página.</div>';
        }
    }
}

function showPDFs(system) {
    const modal = document.getElementById('pdfModal');
    const modalTitle = document.getElementById('modalTitle');
    const pdfList = document.getElementById('pdfList');
    
    modalTitle.textContent = systemNames[system];
    pdfList.innerHTML = '';
    
    const files = pdfData[system];
    
    if (files && files.length > 0) {
        files.forEach(file => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            // Use GitHub blob raw endpoint to correctly serve LFS files
            const blobBase = 'https://github.com/Ewerton-Jose/RPGs-PT-BR/blob/main/';
            const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
            a.href = blobBase + encodedPath + '?raw=1';
            a.textContent = file.name;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            // Hint browser to download rather than preview when possible
            a.setAttribute('download', file.name);
            // Show alert when download starts
            a.addEventListener('click', function() {
                alert('📥 Iniciando download de: ' + file.name);
            });
            li.appendChild(a);
            pdfList.appendChild(li);
        });
    } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'Nenhum PDF disponível para este sistema ainda.';
        pdfList.appendChild(emptyMsg);
    }
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('pdfModal').style.display = 'none';
}

// Fechar modal ao clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('pdfModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Fechar modal com a tecla ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', createCards);
