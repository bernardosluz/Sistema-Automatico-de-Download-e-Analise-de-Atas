/**
 * ============================================================================
 * SISTEMA DE DOWNLOADS
 * ============================================================================
 */

import { estado } from './dom.js';
import { ipcRenderer } from './bridge.js';
import { mostrarToast } from './toasts.js';

export function baixarAta(idAtaPNCP, numeroAta) {
  console.log('[Download] Ata:', idAtaPNCP);
  
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
  
  console.log('[Download] Todas:', estado.todasAsAtasEncontradas.length);
  
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
  
  ipcRenderer.send('download-todas-atas', { atas: estado.todasAsAtasEncontradas });
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
  
  if (window.downloadEmProgresso) {
    window.downloadEmProgresso.concluidos = total;
    window.downloadEmProgresso.sucesso = sucesso;
    window.downloadEmProgresso.erros = erros;
    atualizarProgressoDownload();
  }
  
  if (sucesso === total) {
    mostrarToast('success', 'Completo!', `${total} atas baixadas`, 7000);
  } else if (sucesso > 0) {
    mostrarToast('info', 'Finalizado', `${sucesso}/${total} atas. ${erros} erro(s)`, 7000);
  } else {
    mostrarToast('error', 'Erro', `${erros} erro(s)`, 7000);
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