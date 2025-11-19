/**
 * ============================================================================
 * REFERÊNCIAS E ESTADO
 * ============================================================================
 * * Este arquivo NÃO executa nenhuma lógica.
 * * 1. REFERÊNCIAS: Ele busca os elementos do HTML (ex: getElementById) 
 * e os armazena na constante 'elementos'.
 * 2. ESTADO: Ele armazena o estado global da aplicação 
 * (ex: 'buscando', 'itensPorPagina').
 * * O objetivo é centralizar essas referências para que outros módulos 
 * (como renderer.js, resultados.js) possam importá-las e usá-las 
 * facilmente, sem precisar buscar no DOM repetidamente.
 */

// Exporta todos os elementos usados na aplicação
export const elementos = {
  // Campos e botões principais
  campoBusca: document.getElementById('search-input'),
  botaoBuscar: document.getElementById('search-btn'),
  botaoLimpar: document.getElementById('clear-btn'),
  botaoFinalizar: document.getElementById('stop-btn'),
  
  // Áreas de exibição
  carregando: document.getElementById('loading'),
  resultado: document.getElementById('result'),
  
  // Filtros
  botoesStatus: document.querySelectorAll('.status-btn'),
  containerFiltrosAtivos: document.getElementById('active-filters'),
  
  // Containers de notificação
  toastContainer: document.getElementById('toast-container')
};

// Estado da aplicação (centralizado)
export const estado = {
  buscando: false,
  todasAsAtasEncontradas: [],
  itensPorPagina: 10,
  paginaExibicaoAtual: 1
};