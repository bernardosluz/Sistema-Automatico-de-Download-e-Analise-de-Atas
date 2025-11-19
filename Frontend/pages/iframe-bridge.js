/**
 * ============================================================================
 * IFRAME BRIDGE - Sistema de Comunicação entre Iframe e Janela Principal
 * ============================================================================
 */

console.log('[Bridge] Carregando iframe bridge...');

/**
 * Envia mensagem para janela principal e aguarda resposta
 */
function enviarMensagem(tipo, dados = null) {
  return new Promise((resolve, reject) => {
    console.log('[Bridge] Enviando mensagem:', tipo, dados);
    
    window.parent.postMessage({
      tipo: tipo,
      dados: dados
    }, '*');

    const tipoResposta = `resposta-${tipo}`;
    
    function aguardarResposta(evento) {
      if (evento.data && evento.data.tipo === tipoResposta) {
        console.log('[Bridge] Resposta recebida:', evento.data);
        window.removeEventListener('message', aguardarResposta);
        
        if (evento.data.sucesso) {
          resolve(evento.data.dados);
        } else {
          reject(new Error(evento.data.erro));
        }
      }
    }

    window.addEventListener('message', aguardarResposta);

    setTimeout(() => {
      window.removeEventListener('message', aguardarResposta);
      reject(new Error('Timeout: sem resposta da janela principal'));
    }, 30000);
  });
}

/**
 * Envia mensagem SEM aguardar resposta (fire and forget)
 */
function enviarMensagemSimples(tipo, dados = null) {
  console.log('[Bridge] Enviando mensagem simples:', tipo, dados);
  window.parent.postMessage({
    tipo: tipo,
    dados: dados
  }, '*');
}

/**
 * Registra listener para um tipo específico de mensagem
 */
function escutarMensagem(tipo, callback) {
  console.log('[Bridge] Registrando listener para:', tipo);
  
  function listener(evento) {
    if (evento.data && evento.data.tipo === tipo) {
      console.log('[Bridge] Mensagem capturada:', tipo, evento.data);
      callback(evento.data.dados);
    }
  }
  
  window.addEventListener('message', listener);
  
  // Retorna função para remover listener se necessário
  return () => window.removeEventListener('message', listener);
}

/**
 * Aplica tema recebido da janela principal
 */
function inicializarTema() {
  console.log('[Bridge] Inicializando sistema de tema...');
  
  window.addEventListener('message', (evento) => {
    if (evento.data && evento.data.tipo === 'mudar-tema') {
      const tema = evento.data.tema;
      document.body.setAttribute('data-theme', tema);
      console.log('[Bridge] Tema aplicado:', tema);
    }
  });

  // Solicita tema atual ao carregar
  setTimeout(() => {
    console.log('[Bridge] Solicitando tema atual...');
    window.parent.postMessage({ tipo: 'obter-tema' }, '*');
  }, 100);
}

/**
 * Cria um mock do ipcRenderer que funciona via bridge
 */
function criarMockIpcRenderer() {
  console.log('[Bridge] Criando mock do ipcRenderer...');
  
  return {
    /**
     * Envia comando para o main process via janela principal
     */
    send: (canal, dados) => {
      console.log('[Mock IPC] send chamado:', canal, dados);
      
      // ✅ REMOVIDO O MAPEAMENTO - usa canal direto
      enviarMensagemSimples(canal, dados);
    },

    /**
     * Escuta respostas do main process via janela principal
     */
    on: (canal, callback) => {
      console.log('[Mock IPC] on registrado para canal:', canal);
      
      const remover = escutarMensagem(canal, (dados) => {
        console.log('[Mock IPC] Callback executado para:', canal, dados);
        // ipcRenderer.on passa (evento, dados), então simulamos isso
        callback(null, dados);
      });
      
      return remover;
    },

    /**
     * Invoke (para chamadas que esperam resposta)
     */
    invoke: async (canal, dados) => {
      console.log('[Mock IPC] invoke chamado:', canal, dados);
      return await enviarMensagem(canal, dados);
    }
  };
}

// Exporta funções
window.iframeBridge = {
  enviarMensagem,
  enviarMensagemSimples,
  escutarMensagem,
  inicializarTema,
  criarMockIpcRenderer
};

console.log('[Bridge] Iframe bridge carregado com sucesso!');