/**
 * ============================================================================
 * SISTEMA UNIVERSAL DE FILTROS
 * ============================================================================
 */

import { elementos } from './dom.js';

const CONFIGURACAO_FILTROS = {
  esfera: {
    botaoId: 'esfera-filter-btn',
    dropdownId: 'esfera-dropdown',
    checkboxClasse: 'esfera-checkbox',
    tipo: 'esfera'
  },
  uf: {
    botaoId: 'uf-filter-btn',
    dropdownId: 'uf-dropdown',
    checkboxClasse: 'uf-checkbox',
    tipo: 'uf'
  },
  orgao: {
    botaoId: 'orgao-filter-btn',
    dropdownId: 'orgao-dropdown',
    checkboxClasse: 'orgao-checkbox',
    tipo: 'orgao'
  }
};

/**
 * Inicializa sistema de filtros
 */
export function inicializarFiltros() {
  Object.entries(CONFIGURACAO_FILTROS).forEach(([nomeFiltro, config]) => {
    const botao = document.getElementById(config.botaoId);
    const dropdown = document.getElementById(config.dropdownId);
    const checkboxes = document.querySelectorAll(`.${config.checkboxClasse}`);
    
    if (!botao || !dropdown) {
      console.warn(`[Filtros] Elementos não encontrados: ${nomeFiltro}`);
      return;
    }
    
    botao.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
      botao.classList.toggle('active');
    });
    
    dropdown.addEventListener('click', (e) => e.stopPropagation());
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          criarBadge(config.tipo, this.value, this.nextElementSibling.textContent);
        } else {
          removerBadge(config.tipo, this.value);
        }
        atualizarContainerFiltros();
      });
    });
  });
  
  // Fecha dropdowns ao clicar fora
  document.addEventListener('click', () => {
    Object.values(CONFIGURACAO_FILTROS).forEach(config => {
      const botao = document.getElementById(config.botaoId);
      const dropdown = document.getElementById(config.dropdownId);
      
      if (botao && dropdown) {
        dropdown.classList.remove('show');
        botao.classList.remove('active');
      }
    });
  });
  
  console.log('[Filtros] Sistema inicializado');
}

/**
 * Cria badge de filtro
 */
function criarBadge(tipo, valor, texto) {
  const badge = document.createElement('div');
  badge.className = 'filter-badge';
  badge.setAttribute('data-type', tipo);
  badge.setAttribute('data-value', valor);
  
  const textoBadge = document.createElement('span');
  textoBadge.textContent = texto;
  
  const botaoRemover = document.createElement('button');
  botaoRemover.className = 'filter-badge-remove';
  botaoRemover.textContent = '×';
  botaoRemover.title = 'Remover filtro';
  botaoRemover.addEventListener('click', () => removerFiltro(tipo, valor));
  
  badge.appendChild(textoBadge);
  badge.appendChild(botaoRemover);
  elementos.containerFiltrosAtivos.appendChild(badge);
}

/**
 * Remove badge
 */
function removerBadge(tipo, valor) {
  const badge = elementos.containerFiltrosAtivos.querySelector(
    `[data-type="${tipo}"][data-value="${valor}"]`
  );
  if (badge) badge.remove();
}

/**
 * Remove filtro completo
 */
function removerFiltro(tipo, valor) {
  removerBadge(tipo, valor);
  
  const config = Object.values(CONFIGURACAO_FILTROS).find(c => c.tipo === tipo);
  if (!config) return;
  
  const checkbox = document.querySelector(`.${config.checkboxClasse}[value="${valor}"]`);
  if (checkbox) checkbox.checked = false;
  
  atualizarContainerFiltros();
}

/**
 * Atualiza container de filtros
 */
function atualizarContainerFiltros() {
  const totalBadges = elementos.containerFiltrosAtivos.querySelectorAll('.filter-badge').length;
  elementos.containerFiltrosAtivos.classList.toggle('show', totalBadges > 0);
}

/**
 * Obtém filtros selecionados por tipo
 */
function obterFiltrosSelecionados(tipo) {
  const config = Object.values(CONFIGURACAO_FILTROS).find(c => c.tipo === tipo);
  if (!config) return [];
  
  const checkboxes = document.querySelectorAll(`.${config.checkboxClasse}:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

// Exporta funções públicas
export function obterEsferasSelecionadas() {
  return obterFiltrosSelecionados('esfera');
}

export function obterUFsSelecionadas() {
  return obterFiltrosSelecionados('uf');
}

export function obterOrgaosSelecionados() {
  return obterFiltrosSelecionados('orgao');
}

/**
 * Inicializa filtro de status
 */
export function inicializarFiltroStatus() {
  elementos.botoesStatus.forEach(botao => {
    botao.addEventListener('click', function() {
      elementos.botoesStatus.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      console.log('[Status] Selecionado:', this.dataset.status);
    });
  });
}

/**
 * Obtém status selecionado
 */
export function obterStatusSelecionado() {
  const botaoAtivo = document.querySelector('.status-btn.active');
  return botaoAtivo ? botaoAtivo.dataset.status : 'vigente';
}