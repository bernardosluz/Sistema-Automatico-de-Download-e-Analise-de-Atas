const fs = require('fs');
const path = require('path');

// =============================================================================
// UTILITÁRIOS DE ARQUIVOS E PASTAS
// =============================================================================

/**
 * Sanitiza nome de arquivo removendo caracteres inválidos
 */
function sanatizarNomeArquivo(filename) {
    return filename
        .replace(/[<>:"/\\|?*]/g, '_') // Remove caracteres inválidos
        .replace(/\s+/g, '_')            // Substitui espaços por underscore
        .replace(/_{2,}/g, '_')          // Remove underscores duplicados
        .substring(0, 200);              // Limita tamanho
}

function garantirDir(pastaDir) {
  if (!pastaDir) return;
  
  if (!fs.existsSync(pastaDir)) {
    fs.mkdirSync(pastaDir, { recursive: true });
  }
}

function formatoTamanhoArquivo(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function arquivoExiste(caminho) {
  if (!caminho) return false;
  
  try {
    return fs.existsSync(caminho);
  } catch (erro) {
    return false;
  }
}

function lerArquivo(caminho) {
  if (!caminho) return null;
  
  try {
    return fs.readFileSync(caminho, 'utf8');
  } catch (erro) {
    console.error('[Arquivo] Erro ao ler:', erro.message);
    return null;
  }
}

function escreverArquivo(caminho, conteudo) {
  if (!caminho) return false;
  
  try {
    fs.writeFileSync(caminho, conteudo, 'utf8');
    return true;
  } catch (erro) {
    console.error('[Arquivo] Erro ao escrever:', erro.message);
    return false;
  }
}

function deletarArquivo(caminho) {
  if (!caminho) return false;
  
  try {
    if (fs.existsSync(caminho)) {
      fs.unlinkSync(caminho);
      return true;
    }
    return false;
  } catch (erro) {
    console.error('[Arquivo] Erro ao deletar:', erro.message);
    return false;
  }
}

function listarArquivos(pastaDir) {
  if (!pastaDir) return [];
  
  try {
    if (!fs.existsSync(pastaDir)) {
      return [];
    }
    
    return fs.readdirSync(pastaDir);
  } catch (erro) {
    console.error('[Arquivo] Erro ao listar:', erro.message);
    return [];
  }
}

function sanatizarNomePasta(nome) {
  return nome
    .replace(/[<>:"/\\|?*]/g, '_') // Remove caracteres inválidos
    .replace(/\s+/g, '_')            // Substitui espaços por underscore
    .substring(0, 100);              // Limita tamanho
}

module.exports = {
  sanatizarNomeArquivo,
  garantirDir,
  formatoTamanhoArquivo,
  arquivoExiste,
  lerArquivo,
  escreverArquivo,
  deletarArquivo,
  listarArquivos,
  sanatizarNomePasta
};