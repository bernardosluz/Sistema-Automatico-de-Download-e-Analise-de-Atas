const fs = require('fs').promises;
const path = require('path');

// Caminho do arquivo de configurações
const CAMINHO_CONFIG = path.join(__dirname, '..', 'config.json');

// Configurações padrão
const CONFIG_PADRAO = {
  diretorioDownload: null, // null = usuário precisa escolher
  modoOrganizacao: 'organizado', // 'direto' | 'organizado' | 'ambos'
  contadorAtas: 0 // Para numeração das pastas
};

/**
 * Carrega as configurações do arquivo
 * @returns {Promise<Object>} Configurações
 */
async function carregarConfiguracoes() {
  try {
    const dados = await fs.readFile(CAMINHO_CONFIG, 'utf-8');
    return JSON.parse(dados);
  } catch (erro) {
    console.log('[Config] Arquivo não encontrado, usando padrão');
    return { ...CONFIG_PADRAO };
  }
}

/**
 * Salva as configurações no arquivo
 * @param {Object} config - Configurações para salvar
 */
async function salvarConfiguracoes(config) {
  try {
    await fs.writeFile(CAMINHO_CONFIG, JSON.stringify(config, null, 2));
  } catch (erro) {
    throw erro;
  }
}

/**
 * Atualiza apenas alguns campos da configuração
 * @param {Object} camposParaAtualizar - Campos a atualizar
 */
async function atualizarConfiguracoes(camposParaAtualizar) {
  const configAtual = await carregarConfiguracoes();
  const novaConfig = { ...configAtual, ...camposParaAtualizar };
  await salvarConfiguracoes(novaConfig);
  return novaConfig;
}

/**
 * Incrementa o contador de atas e retorna o número formatado
 * @returns {Promise<string>} Número formatado (ex: "0001")
 */
async function obterProximoNumero() {
  const config = await carregarConfiguracoes();
  const numeroAtual = (config.contadorAtas || 0) + 1;
  
  // Atualiza o contador
  await atualizarConfiguracoes({ contadorAtas: numeroAtual });
  
  // Formata com 4 dígitos
  return numeroAtual.toString().padStart(4, '0');
}

/**
 * Reseta o contador de atas
 */
async function resetarContador() {
  await atualizarConfiguracoes({ contadorAtas: 0 });
  console.log('[Config] Contador resetado');
}

module.exports = {
  carregarConfiguracoes,
  salvarConfiguracoes,
  atualizarConfiguracoes,
  obterProximoNumero,
  resetarContador
};