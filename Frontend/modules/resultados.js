/**
 * ============================================================================
 * EXIBIÇÃO DE RESULTADOS E PAGINAÇÃO
 * ============================================================================
 */

import { elementos, estado } from './dom.js';
import { mostrarToast } from './toasts.js';

/**
 * Recebe atas progressivamente
 */
export function receberAtasProgressivas(evento, dados) {
  const { atas, totalAcumulado, paginaAtual } = dados;
  
  const primeiraLeva = estado.todasAsAtasEncontradas.length === 0;
  estado.todasAsAtasEncontradas.push(...atas);
  
  if (primeiraLeva) {
    esconderCarregando();
    estado.paginaExibicaoAtual = 1;
    atualizarExibicaoAtas();
    mostrarToast('success', 'Resultados', 
      `${atas.length} atas encontradas. Busca continua...`, 4000);
  } else {
    atualizarContadorResultados();
    if (estado.paginaExibicaoAtual === 1) {
      atualizarExibicaoAtas();
    } else {
      atualizarControlesPaginacao();
    }
  }
}

/**
 * Finaliza busca com sucesso
 */
export function finalizarBuscaComSucesso(evento, dados) {
  const { totalFinal, paginasConsultadas } = dados;
  
  console.log('[Busca] Finalizada:', totalFinal, 'atas');
  
  estado.buscando = false;
  elementos.botaoBuscar.disabled = false;
  elementos.botaoFinalizar.classList.remove('show');
  esconderCarregando();
  
  atualizarContadorResultados(false);

  // ATUALIZA A PAGINAÇÃO NUMÉRICA QUANDO A BUSCA TERMINA
  atualizarControlesPaginacao();
  
  mostrarToast('success', 'Concluído', 
    `${totalFinal} ata(s) em ${paginasConsultadas} página(s)`, 5000);
}

/**
 * Atualiza contador
 */
export function atualizarContadorResultados(buscando = true) {
  const infoPaginacao = document.getElementById('pagination-info');
  if (!infoPaginacao) return;
  
  const inicio = (estado.paginaExibicaoAtual - 1) * estado.itensPorPagina + 1;
  const fim = Math.min(estado.paginaExibicaoAtual * estado.itensPorPagina, estado.todasAsAtasEncontradas.length);
  
  const sufixo = buscando ? ' (buscando...)' : '';
  infoPaginacao.textContent = `Exibindo ${inicio}-${fim} de ${estado.todasAsAtasEncontradas.length}${sufixo}`;
  
  const botaoBaixarTodas = document.querySelector('.download-all-btn span:last-child');
  if (botaoBaixarTodas) {
    botaoBaixarTodas.textContent = `Baixar Todas (${estado.todasAsAtasEncontradas.length})`;
  }
}

/**
 * Renderiza atas
 */
function renderizarAtas(atasParaExibir) {
  const inicio = (estado.paginaExibicaoAtual - 1) * estado.itensPorPagina + 1;
  const fim = Math.min(estado.paginaExibicaoAtual * estado.itensPorPagina, estado.todasAsAtasEncontradas.length);
  
  const html = `
    <div class="result-header">
      <div class="result-title">Resultados Encontrados</div>
      <div class="result-actions">
        <div class="result-count">
          <span id="pagination-info">Exibindo ${inicio}-${fim} de ${estado.todasAsAtasEncontradas.length}</span>
        </div>
        <button class="download-all-btn" onclick="window.appModules.downloads.baixarTodasAtas()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Baixar Todas (${estado.todasAsAtasEncontradas.length})</span>
        </button>
      </div>
    </div>
    <div class="atas-list">
      ${atasParaExibir.map(ata => `
        <div class="ata-item" data-id="${ata.idAtaPNCP}">
          <div class="ata-header">
            <div class="ata-number">Ata Nº ${ata.numeroAta}</div>
            <button 
              class="download-btn" 
              onclick="window.appModules.downloads.baixarAta('${ata.idAtaPNCP}', '${ata.numeroAta}')"
              title="Baixar esta ata"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
          <div class="ata-info">
            <strong>Órgão:</strong> ${ata.orgao}<br>
            <strong>Id ata PNCP:</strong> ${ata.idAtaPNCP}<br>
            <strong>Objeto:</strong> ${ata.objeto}
          </div>
          <div class="ata-download-status" id="status-${ata.idAtaPNCP}"></div>
        </div>
      `).join('')}
    </div>
    <div class="pagination-controls">

      <div class="pagination-numeric-container" id="pagination-numeric-container">
      </div>  
      <div class="pagination-footer-controls">

      <button id="prev-page-btn" class="pagination-btn" onclick="window.appModules.resultados.paginaAnterior()">
        ← Anterior
      </button>
      <div class="pagination-size">
        <label>Itens por página:</label>
        <select id="page-size-select" onchange="window.appModules.resultados.alterarItensPorPagina(parseInt(this.value))">
          <option value="10" ${estado.itensPorPagina === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${estado.itensPorPagina === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${estado.itensPorPagina === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${estado.itensPorPagina === 100 ? 'selected' : ''}>100</option>
        </select>
      </div>
      <button id="next-page-btn" class="pagination-btn" onclick="window.appModules.resultados.proximaPagina()">
        Próximo →
      </button>
    </div>
  `;
  
  elementos.resultado.innerHTML = html;
  elementos.resultado.className = 'result show success';
}

/**
 * Atualiza exibição
 */
export function atualizarExibicaoAtas() {
  const inicio = (estado.paginaExibicaoAtual - 1) * estado.itensPorPagina;
  const fim = inicio + estado.itensPorPagina;
  const atasParaExibir = estado.todasAsAtasEncontradas.slice(inicio, fim);
  
  renderizarAtas(atasParaExibir);
  atualizarControlesPaginacao();
}

/**
 * Controles de paginação
 */
function atualizarControlesPaginacao() {
  const totalPaginas = Math.ceil(estado.todasAsAtasEncontradas.length / estado.itensPorPagina);
  
  const botaoAnterior = document.getElementById('prev-page-btn');
  const botaoProximo = document.getElementById('next-page-btn');
  
  if (botaoAnterior) botaoAnterior.disabled = estado.paginaExibicaoAtual === 1;
  if (botaoProximo) botaoProximo.disabled = estado.paginaExibicaoAtual >= totalPaginas;
  // Atualiza links de paginação numérica
  const containerNumerico = document.getElementById('pagination-numeric-container');
  if (containerNumerico) {
    containerNumerico.innerHTML = criarLinksPaginacao(estado.paginaExibicaoAtual, totalPaginas);
  }
}

export function paginaAnterior() {
  if (estado.paginaExibicaoAtual > 1) {
    estado.paginaExibicaoAtual--;
    atualizarExibicaoAtas();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function proximaPagina() {
  const totalPaginas = Math.ceil(estado.todasAsAtasEncontradas.length / estado.itensPorPagina);
  if (estado.paginaExibicaoAtual < totalPaginas) {
    estado.paginaExibicaoAtual++;
    atualizarExibicaoAtas();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function alterarItensPorPagina(novoTamanho) {
  estado.itensPorPagina = novoTamanho;
  estado.paginaExibicaoAtual = 1;
  atualizarExibicaoAtas();
}

/**
 * [NOVO] Gera o HTML para os links de paginação numérica
 * @param {number} paginaAtual 
 * @param {number} totalPaginas 
 * @returns {string} HTML dos links
 */
function criarLinksPaginacao(paginaAtual, totalPaginas) {
  if (totalPaginas <= 1) return ''; // Não mostra nada se tem 1 página ou menos

  let paginas = [];
  const range = 2; // Quantos botões de cada lado da página atual

  // Lógica de "..." e páginas intermediárias
  let inicio = Math.max(1, paginaAtual - range);
  let fim = Math.min(totalPaginas, paginaAtual + range);

  // Ajusta range se estiver perto dos limites
  if (paginaAtual - range <= 1) {
    fim = Math.min(totalPaginas, 1 + (range * 2));
  }
  if (paginaAtual + range >= totalPaginas) {
    inicio = Math.max(1, totalPaginas - (range * 2));
  }

  // Botão "Primeira" (se necessário)
  if (inicio > 1) {
    paginas.push(
      `<button 
        class="pagination-link" 
        onclick="window.appModules.resultados.irParaPagina(1)">
        1
      </button>`
    );
    if (inicio > 2) {
      paginas.push(`<span class="pagination-ellipsis">...</span>`);
    }
  }

  // Páginas do meio
  for (let i = inicio; i <= fim; i++) {
    paginas.push(
      `<button 
        class="pagination-link ${paginaAtual === i ? 'active' : ''}" 
        onclick="window.appModules.resultados.irParaPagina(${i})"
        ${paginaAtual === i ? 'disabled' : ''}>
        ${i}
      </button>`
    );
  }

  // Botão "Última" (se necessário)
  if (fim < totalPaginas) {
    if (fim < totalPaginas - 1) {
      paginas.push(`<span class="pagination-ellipsis">...</span>`);
    }
    paginas.push(
      `<button 
        class="pagination-link" 
        onclick="window.appModules.resultados.irParaPagina(${totalPaginas})">
        ${totalPaginas}
      </button>`
    );
  }

  return paginas.join('');
}

/**
 * [NOVO] Vai para uma página específica
 * @param {number} numeroPagina 
 */
export function irParaPagina(numeroPagina) {
  const totalPaginas = Math.ceil(estado.todasAsAtasEncontradas.length / estado.itensPorPagina);
  
  // Validação
  if (numeroPagina < 1 || numeroPagina > totalPaginas || numeroPagina === estado.paginaExibicaoAtual) {
    return;
  }

  estado.paginaExibicaoAtual = numeroPagina;
  atualizarExibicaoAtas();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Funções auxiliares
export function mostrarCarregando() {
  elementos.carregando.classList.add('show');
}

export function esconderCarregando() {
  elementos.carregando.classList.remove('show');
}

export function esconderResultado() {
  elementos.resultado.classList.remove('show');
}

export function mostrarErro(evento, erro) {
  console.error('[Erro]', erro);
  esconderCarregando();
  estado.buscando = false;
  elementos.botaoBuscar.disabled = false;
  elementos.botaoFinalizar.classList.remove('show');
  mostrarToast('error', 'Erro', erro.mensagem || 'Erro na busca', 5000);
}