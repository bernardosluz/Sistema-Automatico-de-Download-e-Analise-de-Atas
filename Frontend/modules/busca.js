/**
 * ============================================================================
 * FUNÇÕES DE BUSCA
 * ============================================================================
 */

import { elementos, estado } from './dom.js';
import { ipcRenderer } from './bridge.js';
import { 
  obterEsferasSelecionadas, 
  obterStatusSelecionado, 
  obterUFsSelecionadas, 
  obterOrgaosSelecionados 
} from './filtros.js';
import { mostrarToast } from './toasts.js';
import { esconderResultado, mostrarCarregando, esconderCarregando } from './resultados.js';

/**
 * Executa busca
 */
export function buscar() {
  if (estado.buscando) return;
  
  const termo = elementos.campoBusca.value.trim();
  
  const filtrosEsferas = obterEsferasSelecionadas();
  const filtroStatus = obterStatusSelecionado();
  const filtrosUFs = obterUFsSelecionadas();
  const filtrosOrgaos = obterOrgaosSelecionados();

  console.log('[Busca] Iniciando:', termo);
  console.log('[Busca] Filtros:', { filtrosEsferas, filtroStatus, filtrosUFs, filtrosOrgaos });

  // Limpa resultados anteriores
  estado.todasAsAtasEncontradas = [];
  estado.paginaExibicaoAtual = 1;

  // Atualiza interface
  estado.buscando = true;
  elementos.botaoBuscar.disabled = true;
  elementos.botaoFinalizar.classList.add('show');
  esconderResultado();
  mostrarCarregando();
  
  // Envia para backend
  ipcRenderer.send('buscar', {
    termo,
    esferas: filtrosEsferas,
    status: filtroStatus,
    UFs: filtrosUFs,
    orgaos: filtrosOrgaos
  });
}

/**
 * Finaliza busca
 */
export function finalizarBusca() {
  console.log('[Busca] Finalizando...');
  
  estado.buscando = false;
  elementos.botaoBuscar.disabled = false;
  elementos.botaoFinalizar.classList.remove('show');
  esconderCarregando();
  
  ipcRenderer.send('finalizar-busca');
  mostrarToast('info', 'Busca', 'Finalizando busca...', 3000);
}

/**
 * Limpa busca
 */
export function limpar() {
  elementos.campoBusca.value = '';
  elementos.botaoLimpar.classList.remove('show');
  esconderResultado();
  estado.todasAsAtasEncontradas = [];
  elementos.campoBusca.focus();
}