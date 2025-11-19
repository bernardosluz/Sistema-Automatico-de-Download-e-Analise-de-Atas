/**
 * ============================================================================
 * PONTO DE ENTRADA (MAESTRO)
 * ============================================================================
 * * Este é o script principal do processo de "Renderer" (Frontend).
 * * Sua função é ORQUESTRAR e INICIALIZAR a aplicação:
 * 1. Importa todos os módulos principais (dom, bridge, filtros, busca, etc.).
 * 2. Adiciona os 'event listeners' (como cliques) aos botões.
 * 3. Chama a função 'registrarListenersIPC' do 'bridge.js' para 
 * começar a "ouvir" mensagens do Backend (main.js).
 * 4. Inicializa outros módulos (como os filtros).
 * 5. Expõe funções globais (se necessário) para o HTML.
 */

import { elementos } from './modules/dom.js';
import { registrarListenersIPC } from './modules/bridge.js';
import { 
  inicializarFiltros, 
  inicializarFiltroStatus 
} from './modules/filtros.js';
import { 
  buscar, 
  finalizarBusca, 
  limpar 
} from './modules/busca.js';
import { 
  receberAtasProgressivas,
  finalizarBuscaComSucesso,
  mostrarErro,
  paginaAnterior,
  proximaPagina,
  alterarItensPorPagina
} from './modules/resultados.js';
import * as downloads from './modules/download.js';

/**
 * Inicialização da aplicação
 */
function iniciar() {
  console.log('[App] Inicializando...');
  
  // Configura eventos dos botões
  elementos.botaoBuscar.addEventListener('click', buscar);
  elementos.botaoLimpar.addEventListener('click', limpar);
  elementos.botaoFinalizar.addEventListener('click', finalizarBusca);
  
  elementos.campoBusca.addEventListener('input', () => {
    elementos.botaoLimpar.classList.toggle('show', elementos.campoBusca.value.trim().length > 0);
  });
  
  elementos.campoBusca.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      buscar();
    }
  });
  
  // Inicializa sistemas
  inicializarFiltros();
  inicializarFiltroStatus();
  
  // Registra listeners IPC
  registrarListenersIPC({
    receberAtasProgressivas,
    finalizarBuscaComSucesso,
    mostrarErro,
    atualizarProgresso: (evento, dados) => {
      const elem = document.querySelector('#loading p');
      if (elem) {
        elem.textContent = `Buscando... Página ${dados.paginaAtual} | ${dados.totalAcumulado} ata(s)`;
      }
    },
    atualizarDownloadAta: downloads.atualizarDownloadAta,
    finalizarDownloadLote: downloads.finalizarDownloadLote
  });
  
  console.log('[App] Iniciado com sucesso!');
}

// Exporta módulos globalmente para onclick do HTML
window.appModules = {
  resultados: { paginaAnterior, proximaPagina, alterarItensPorPagina },
  downloads
};

// Inicia aplicação
iniciar();