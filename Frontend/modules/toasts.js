/**
 * ============================================================================
 * SISTEMA DE NOTIFICAÇÕES TOAST
 * ============================================================================
 */

import { elementos } from './dom.js';

export function mostrarToast(tipo, titulo, mensagem, duracao = 5000) {
  const icones = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <div class="toast-icon">${icones[tipo] || 'ℹ️'}</div>
    <div class="toast-content">
      <div class="toast-title">${titulo}</div>
      <div class="toast-message">${mensagem}</div>
    </div>
    <button class="toast-close">×</button>
  `;
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    removerToast(toast);
  });
  
  elementos.toastContainer.appendChild(toast);
  
  if (duracao > 0) {
    setTimeout(() => removerToast(toast), duracao);
  }
  
  return toast;
}

function removerToast(toast) {
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 300);
}