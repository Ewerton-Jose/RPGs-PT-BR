// Configuração do repositório GitHub
const GITHUB_OWNER = 'Ewerton-Jose';
const GITHUB_REPO = 'RPGs-PT-BR';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;
const MAIN_FOLDER = 'livros e fichas pdf';

let pdfCount = 0;
let txtCount = 0;
let treeData = null;

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
        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar pasta do GitHub:', error);
        return [];
    }
}

// Função para construir a estrutura de árvore recursivamente
async function buildTreeStructure(folderPath = '', folderName = 'RPGs-PT-BR') {
    const contents = await fetchGitHubFolder(folderPath);
    const node = {
        name: folderName === 'RPGs-PT-BR' ? folderName : formatFolderName(folderName),
        type: 'folder',
        children: []
    };

    // Processar cada item na pasta
    for (const item of contents) {
        if (item.type === 'dir') {
            // É uma pasta - buscar recursivamente
            const childNode = await buildTreeStructure(item.path, item.name);
            node.children.push(childNode);
        } else if (item.type === 'file') {
            // É um arquivo - adicionar à lista
            const extension = item.name.split('.').pop().toLowerCase();
            if (extension === 'pdf') {
                node.children.push({
                    name: item.name,
                    type: 'file',
                    extension: extension,
                    path: item.path
                });
            }
        }
    }

    return node;
}

function renderTree(node, container, isRoot = false) {
    const item = document.createElement('div');
    item.className = 'tree-item';
    
    if (node.type === 'folder' && node.children.length > 0) {
        const toggle = document.createElement('div');
        toggle.className = 'tree-toggle';
        toggle.textContent = '▼';
        toggle.style.cursor = 'pointer';
        
        const content = document.createElement('div');
        content.className = 'tree-content';
        
        const icon = document.createElement('span');
        icon.className = 'folder-icon';
        icon.textContent = '📁';
        
        const name = document.createElement('span');
        name.className = 'folder-name';
        name.textContent = node.name;
        
        content.appendChild(icon);
        content.appendChild(name);
        
        item.appendChild(toggle);
        item.appendChild(content);
        
        const folder = document.createElement('div');
        folder.className = 'folder';
        
        let collapsed = !isRoot;
        
        const toggleFolder = () => {
            collapsed = !collapsed;
            folder.classList.toggle('collapsed');
            toggle.textContent = collapsed ? '▶' : '▼';
        };
        
        toggle.addEventListener('click', toggleFolder);
        content.addEventListener('click', toggleFolder);
        content.style.cursor = 'pointer';
        
        if (collapsed && !isRoot) {
            folder.classList.add('collapsed');
            toggle.textContent = '▶';
        }
        
        node.children.forEach(child => {
            renderTree(child, folder);
        });
        
        container.appendChild(item);
        container.appendChild(folder);
    } else if (node.type === 'file') {
        const toggle = document.createElement('div');
        toggle.className = 'tree-toggle';
        toggle.textContent = '';
        toggle.style.cursor = 'default';
        
        const content = document.createElement('div');
        content.className = 'tree-content';
        
        const icon = document.createElement('span');
        icon.className = 'file-icon';
        icon.textContent = '📄';
        
        const link = document.createElement('a');
        link.className = 'file-link';
        // Use GitHub blob raw endpoint to correctly serve LFS files (works better on mobile)
        const blobBase = 'https://github.com/Ewerton-Jose/RPGs-PT-BR/blob/main/';
        const encodedPath = node.path.split('/').map(encodeURIComponent).join('/');
        link.href = blobBase + encodedPath + '?raw=1';
        link.textContent = node.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        // Hint browser to download rather than preview when possible
        link.setAttribute('download', node.name);
        // Show alert when download starts
        link.addEventListener('click', function() {
            alert('📥 Iniciando download de: ' + node.name);
        });
        
        const badge = document.createElement('span');
        badge.className = 'pdf-badge';
        badge.textContent = node.extension.toUpperCase();
        
        pdfCount++;
        
        content.appendChild(icon);
        content.appendChild(link);
        content.appendChild(badge);
        
        item.appendChild(toggle);
        item.appendChild(content);
        
        container.appendChild(item);
    } else if (node.type === 'folder' && node.children.length === 0) {
        // Pasta vazia, não renderizar
        return;
    }
}

// Função para inicializar e carregar os dados
async function initializeTree() {
    const root = document.getElementById('tree-root');
    
    // Mostrar mensagem de carregamento
    root.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">⏳ Carregando arquivos do repositório...</div>';
    
    try {
        // Buscar a estrutura completa do repositório
        treeData = await buildTreeStructure(MAIN_FOLDER, 'RPGs-PT-BR');
        
        // Limpar mensagem de carregamento
        root.innerHTML = '';
        
        // Renderizar a árvore
        renderTree(treeData, root, true);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        root.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">❌ Erro ao carregar arquivos. Tente recarregar a página.</div>';
    }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeTree);
