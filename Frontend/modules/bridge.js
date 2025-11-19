/**
 * ============================================================================
 * CAMADA DE COMUNICAÇÃO (IPC)
 * ============================================================================
 * * Este arquivo gerencia a "ponte" (Bridge) de comunicação entre o 
 * Frontend (Renderer) e o Backend (Main).
 * * O Frontend e o Backend são processos separados e não podem se falar 
 * diretamente. Eles usam o IPC (Inter-Process Communication).
 * * Funções deste arquivo:
 * 1. Importar o 'ipcRenderer' do Electron.
 * 2. Centralizar todos os "ouvintes" (listeners) de IPC 
 * (ex: ipcRenderer.on('atas-encontradas', ...)).
 * 3. (Se aplicável) Centralizar todos os "emissores" de IPC
 * (ex: ipcRenderer.send('buscar', ...)).
 * * Ele atua como um "tradutor" ou "sistema de rádio" dedicado.
 */

let ipcRenderer;

// Inicializa bridge
if (window.iframeBridge) {
  console.log('[Bridge] Usando mock do ipcRenderer (modo iframe)');
  ipcRenderer = window.iframeBridge.criarMockIpcRenderer();
} else {
  console.log('[Bridge] Usando ipcRenderer real (modo standalone)');
  const { ipcRenderer: realIpc } = require('electron');
  ipcRenderer = realIpc;
}

// Exporta ipcRenderer
export { ipcRenderer };

/**
 * Registra todos os listeners de IPC
 */
export function registrarListenersIPC(callbacks) {
  console.log('[Bridge] Registrando listeners...'); 
  
  ipcRenderer.on('atas-encontradas', (evento, dados) => {
    console.log('[Bridge] >>> Evento atas-encontradas capturado!'); 
    console.log('[Bridge] >>> Dados:', dados); 
    callbacks.receberAtasProgressivas(evento, dados);
  });
  
  ipcRenderer.on('busca-finalizada', callbacks.finalizarBuscaComSucesso);
  ipcRenderer.on('erro-busca', callbacks.mostrarErro);
  ipcRenderer.on('busca-progresso', callbacks.atualizarProgresso);
  ipcRenderer.on('download-ata-progresso', callbacks.atualizarDownloadAta);
  ipcRenderer.on('download-todas-finalizado', callbacks.finalizarDownloadLote);
  
  console.log('[Bridge] Listeners IPC registrados'); 
}