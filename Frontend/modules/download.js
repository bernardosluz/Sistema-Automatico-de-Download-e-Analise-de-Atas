/**
 * ============================================================================
 * SISTEMA DE DOWNLOADS
 * ============================================================================
 */

import { estado } from './dom.js';
import { ipcRenderer } from './bridge.js';
import { mostrarToast } from './toasts.js';

// Flag para controlar se baixar todas está ativo
let downloadLoteAtivo = false;

export function baixarAta(idAtaPNCP, numeroAta) {  
  const divStatus = document.getElementById(`status-${idAtaPNCP}`);
  if (divStatus) {
    divStatus.innerHTML = '<span class="download-status downloading">⏳ Baixando...</span>';
  }
  
  ipcRenderer.send('download-ata', { idAtaPNCP, numeroAta });
}

export function baixarTodasAtas() {
  if (!estado.todasAsAtasEncontradas || estado.todasAsAtasEncontradas.length === 0) {
    mostrarToast('error', 'Erro', 'Nenhuma ata para baixar', 3000);
    return;
  }
  
  // Ativa flag de download em lote
  downloadLoteAtivo = true;
  
  window.downloadEmProgresso = {
    total: estado.todasAsAtasEncontradas.length,
    concluidos: 0,
    sucesso: 0,
    erros: 0
  };
  
  const botao = document.querySelector('.download-all-btn');
  if (botao) {
    botao.disabled = true;
    botao.style.opacity = '0.7';
    
    const divProgresso = document.createElement('div');
    divProgresso.className = 'download-progress';
    divProgresso.id = 'download-progress';
    divProgresso.innerHTML = `<span>⏳</span><span>0/${window.downloadEmProgresso.total}</span>`;
    botao.parentElement.appendChild(divProgresso);
  }
  
  // Adiciona botão de cancelar
  const botaoCancelar = document.createElement('button');
  botaoCancelar.className = 'cancel-download-btn';
  botaoCancelar.id = 'cancel-download-btn';
  botaoCancelar.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    <span>Cancelar Download</span>
  `;
  botaoCancelar.onclick = cancelarDownloadLote;
  
  if (botao && botao.parentElement) {
    botao.parentElement.appendChild(botaoCancelar);
  }

  ipcRenderer.send('download-todas-atas', { atas: estado.todasAsAtasEncontradas });
}


// Função para cancelar download em lote
export function cancelarDownloadLote() {
  if (!downloadLoteAtivo) {
    return;
  }

  const botaoCancelar = document.getElementById('cancel-download-btn');
  if (botaoCancelar) {
    botaoCancelar.disabled = true;
    botaoCancelar.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>Cancelando...</span>
    `;
  }

  // Envia comando de cancelamento
  ipcRenderer.send('cancelar-download-lote');
  
  mostrarToast('info', 'Cancelando', 'Aguardando finalização segura...', 3000);
}


export function atualizarDownloadAta(evento, dados) {
  const { idAtaPNCP, status, mensagem } = dados;
  const divStatus = document.getElementById(`status-${idAtaPNCP}`);
  
  if (divStatus) {
    if (status === 'sucesso') {
      divStatus.innerHTML = `<span class="download-status success">✅ ${mensagem}</span>`;
    } else if (status === 'erro') {
      divStatus.innerHTML = `<span class="download-status error">❌ ${mensagem}</span>`;
    } else {
      divStatus.innerHTML = `<span class="download-status downloading">⏳ ${mensagem}</span>`;
    }
  }
  
  if (!window.downloadEmProgresso) {
    if (status === 'sucesso') {
      mostrarToast('success', 'Download', mensagem, 5000);
    } else if (status === 'erro') {
      mostrarToast('error', 'Erro', mensagem, 7000);
    }
  } else {
    if (status === 'sucesso' || status === 'erro') {
      window.downloadEmProgresso.concluidos++;
      if (status === 'sucesso') window.downloadEmProgresso.sucesso++;
      else window.downloadEmProgresso.erros++;
      
      atualizarProgressoDownload();
    }
  }
}

export function finalizarDownloadLote(evento, dados) {
  const { total, sucesso, erros } = dados;
  
  // Desativa flag de download em lote
  downloadLoteAtivo = false;

  if (window.downloadEmProgresso) {
    window.downloadEmProgresso.concluidos = total;
    window.downloadEmProgresso.sucesso = sucesso;
    window.downloadEmProgresso.erros = erros;
    atualizarProgressoDownload();
  }

   // Mensagem específica se foi cancelado
  if (cancelado) {
    mostrarToast('warning', 'Download Cancelado', 
      `Download interrompido. ${sucesso} ata(s) baixada(s) com sucesso.`, 7000);
  } else {
    if (sucesso === total) {
      mostrarToast('success', 'Completo!', `${total} atas baixadas`, 7000);
    } else if (sucesso > 0) {
      mostrarToast('info', 'Finalizado', `${sucesso}/${total} atas. ${erros} erro(s)`, 7000);
    } else {
      mostrarToast('error', 'Erro', `${erros} erro(s)`, 7000);
    }
  }

  // Remove botão de cancelar
  const botaoCancelar = document.getElementById('cancel-download-btn');
  if (botaoCancelar) {
    botaoCancelar.remove();
  }
}

function atualizarProgressoDownload() {
  const divProgresso = document.getElementById('download-progress');
  if (!divProgresso || !window.downloadEmProgresso) return;
  
  const { total, concluidos, sucesso } = window.downloadEmProgresso;
  
  if (concluidos >= total) {
    divProgresso.className = 'download-progress completed';
    divProgresso.innerHTML = `<span>✅</span><span>Concluído! ${sucesso}/${total}</span>`;
    
    setTimeout(() => {
      const botao = document.querySelector('.download-all-btn');
      if (botao) {
        botao.disabled = false;
        botao.style.opacity = '1';
      }
      setTimeout(() => {
        divProgresso.remove();
        delete window.downloadEmProgresso;
      }, 5000);
    }, 3000);
  } else {
    divProgresso.innerHTML = `<span>⏳</span><span>${concluidos}/${total}</span>`;
  }
}