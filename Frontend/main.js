const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { buscarAtas, finalizarBusca } = require('../Backend/services/buscar');
const servicoDownloadAta = require('../Backend/services/download-ata.service');
const configService = require('../Backend/services/config.service');
const validar = require('../Backend/utils/validar');

// =============================================================================
// VARIÁVEIS GLOBAIS
// =============================================================================

let janelaPrincipal = null;
let janelaConfiguracoes = null;

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Envia erro para o frontend de forma padronizada
 */
function enviarErro(evento, canal, mensagem, tipo = 'erro') {
  console.error(`[Main] Erro: ${mensagem}`);
  evento.reply(canal, { 
    mensagem, 
    tipo,
    erro: true 
  });
}

// =============================================================================
// CRIAR JANELA
// =============================================================================

function criarJanela() {
  janelaPrincipal = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      devTools: true  // Garante que DevTools está habilitado
    },
    title: 'SADA-ATA',
    backgroundColor: '#ffffff',
    show: false
  });

  janelaPrincipal.loadFile(path.join(__dirname, 'index.html'));

  janelaPrincipal.once('ready-to-show', () => {
    janelaPrincipal.show();
    
    // Abre DevTools após janela estar visível
    janelaPrincipal.webContents.openDevTools({ mode: 'detach' });
  });

  janelaPrincipal.on('closed', () => {
    janelaPrincipal = null;
  });
  
  // ✅ Atalho F12 para abrir DevTools manualmente
  janelaPrincipal.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      janelaPrincipal.webContents.toggleDevTools();
    }
  });
}

// =============================================================================
// HANDLERS DE CONFIGURAÇÕES
// =============================================================================

/**
 * Abre janela de configurações
 */
ipcMain.on('abrir-configuracoes', () => {
  console.log('[Main] Abrindo configurações...');
  
  // Se já existe, apenas foca
  if (janelaConfiguracoes) {
    janelaConfiguracoes.focus();
    return;
  }

  janelaConfiguracoes = new BrowserWindow({
    width: 750,
    height: 650,
    parent: janelaPrincipal,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Configurações',
    backgroundColor: '#f5f5f5',
    show: false,
    resizable: false
  });

  janelaConfiguracoes.loadFile(path.join(__dirname, 'configuracoes.html'));

  janelaConfiguracoes.once('ready-to-show', () => {
    janelaConfiguracoes.show();
    console.log('[Main] Janela de configurações aberta');
  });

  janelaConfiguracoes.on('closed', () => {
    janelaConfiguracoes = null;
    console.log('[Main] Janela de configurações fechada');
  });
});

/**
 * Handler: Carregar configurações
 */
ipcMain.handle('carregar-configuracoes', async () => {
  console.log('[Main] Carregando configurações...');
  return await configService.carregarConfiguracoes();
});

/**
 * Handler: Salvar configurações
 */
ipcMain.handle('salvar-configuracoes', async (event, config) => {

  // VALIDAÇÃO: Valida objeto de configuração
  const validacaoConfig = validar.validarConfiguracao(config);
  if (!validacaoConfig.valido) {
    console.error('[Main] Configuração inválida:', validacaoConfig.erros);
    throw new Error(validacaoConfig.erros.join(', '));
  }

  // VALIDAÇÃO: Valida diretório se fornecido
  if (config.diretorioDownload) {
    const validacaoDir = await validar.validarDiretorio(config.diretorioDownload);
    if (!validacaoDir.valido) {
      console.error('[Main] Diretório inválido:', validacaoDir.erro);
      throw new Error(validacaoDir.erro);
    }
  }

  // Armazenar os dados antigos antes de salvar
  const configAntiga = await configService.carregarConfiguracoes();

  // Salva as novas configurações
  const resultado = await configService.atualizarConfiguracoes(config);

  // Verifica se o diretório mudou
  const dirMudou = configAntiga.diretorioDownload  !== resultado.diretorioDownload;

  if(dirMudou) {
    try{
      await servicoDownloadAta.inicializarServicos();
    } catch (erro) {
      console.error('[Main] Erro ao re-inicializar: ', erro.message);
    }
  }
  return resultado;
});

/**
 * Handler: Selecionar diretório
 */
ipcMain.handle('selecionar-diretorio', async () => {
  console.log('[Main] Abrindo seletor de diretório...');
  
  const resultado = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Selecione o diretório para downloads'
  });
  
  if (resultado.canceled) {
    return null;
  }

  const diretorioSelecionado = resultado.filePaths[0];
  console.log('[Main] Diretório selecionado:', diretorioSelecionado);

  // VALIDAÇÃO: Valida diretório selecionado
  const validacaoDir = await validar.validarDiretorio(diretorioSelecionado);
  if (!validacaoDir.valido) {
    console.error('[Main] Diretório inválido:', validacaoDir.erro);
    throw new Error(validacaoDir.erro);
  }

  return diretorioSelecionado;
});

/**
 * Handler: Resetar contador
 */
ipcMain.handle('resetar-contador', async () => {
  console.log('[Main] Resetando contador...');
  return await configService.resetarContador();
});

// =============================================================================
// HANDLERS DE BUSCA
// =============================================================================

/**
 * Handler: Buscar atas com validações completas e entrega progressiva
 */
ipcMain.on('buscar', async (evento, dados) => {
  console.log('[Main] Requisição de busca recebida');

  try {
    // VALIDAÇÃO: Valida dados completos de busca
    const validacaoDados = validar.validarDadosBusca(dados);
    if (!validacaoDados.valido) {
      enviarErro(evento, 'erro-busca', validacaoDados.erro);
      return;
    }

    const { termo, esferas, status, UFs, orgaos } = dados;

    // Callback de progresso distingue tipos
    const callbackProgresso = (dados) => {
            
      // Se é resultado parcial, envia para canal específico
      if (dados.tipo === 'resultado-parcial') {
        evento.reply('atas-encontradas', {
          atas: dados.atasNovas,
          totalAcumulado: dados.totalAcumulado,
          paginaAtual: dados.paginaAtual
        });
      }
      
      // Se é progresso normal, envia para canal de progresso
      if (dados.tipo === 'progresso') {
        evento.reply('busca-progresso', {
          paginaAtual: dados.paginaAtual,
          totalAcumulado: dados.totalAcumulado
        });
      }
    };

    // Executa busca (dados já validados)
    const resultado = await buscarAtas(
      termo,
      esferas || [],
      status || 'vigente',
      UFs || [],
      orgaos || [],
      callbackProgresso
    );

    // Envia finalização (não envia atas de novo, já foram enviadas)
    evento.reply('busca-finalizada', {
      sucesso: true,
      totalFinal: resultado.atas?.length || 0,
      paginasConsultadas: resultado.paginasConsultadas
    });
    
    console.log('[Main] Busca concluída:', resultado.atas?.length || 0, 'atas');

  } catch (erro) {
    console.error('[Main] Erro na busca:', erro);
    enviarErro(evento, 'erro-busca', 'Erro ao processar busca: ' + erro.message);
  }
});

/**
 * Handler: Finalizar busca
 */
ipcMain.on('finalizar-busca', async (evento) => {
  console.log('[Main] Finalizando busca...');
  
  try {
    await finalizarBusca();
    evento.reply('busca-finalizada', { sucesso: true });
    console.log('[Main] Busca finalizada com sucesso');
  } catch (erro) {
    console.error('[Main] Erro ao finalizar:', erro);
    enviarErro(evento, 'erro-busca', 'Erro ao finalizar busca: ' + erro.message);
  }
});

// =============================================================================
// HANDLERS DE DOWNLOAD
// =============================================================================

/**
 * Handler: Download de uma única ata
 */
ipcMain.on('download-ata', async (evento, dados) => {
  console.log('[Main] Download de ata solicitado');

  try {
    // VALIDAÇÃO: Valida dados de download
    const validacaoDados = validar.validarDadosDownload(dados);
    if (!validacaoDados.valido) {
      enviarErro(evento, 'download-ata-progresso', validacaoDados.erro);
      return;
    }

    const { idAtaPNCP, numeroAta } = dados;

    // VALIDAÇÃO: Valida sistema para download
    const validacaoSistema = await validar.validarSistemaParaDownload();
    if (!validacaoSistema.valido) {
      evento.reply('download-ata-progresso', {
        idAtaPNCP,
        status: 'erro',
        mensagem: validacaoSistema.erro,
        acao: validacaoSistema.acao
      });
      return;
    }

    // Envia status inicial
    evento.reply('download-ata-progresso', {
      idAtaPNCP,
      status: 'baixando',
      mensagem: 'Iniciando download...'
    });

    // Carrega dados para verificar se já foi baixado
    await servicoDownloadAta.inicializarServicos();

    // Executa download (dados já validados)
    const resultado = await servicoDownloadAta.baixarAta(idAtaPNCP, numeroAta);

    // Envia resultado
    evento.reply('download-ata-progresso', {
      idAtaPNCP,
      status: resultado.sucesso ? 'sucesso' : 'erro',
      mensagem: resultado.mensagem
    });

    console.log('[Main] Download concluído:', resultado.sucesso ? 'sucesso' : 'erro');

  } catch (erro) {
    console.error('[Main] Erro no download:', erro);
    evento.reply('download-ata-progresso', {
      idAtaPNCP: dados?.idAtaPNCP,
      status: 'erro',
      mensagem: erro.message
    });
  }
});

/**
 * Handler: Download de todas as atas em lote
 */
ipcMain.on('download-todas-atas', async (evento, dados) => {

  const { atas } = dados;

  try {
    // VALIDAÇÃO: Valida dados de download em lote
    const validacaoDados = validar.validarDadosDownloadLote(dados);
    if (!validacaoDados.valido) {
      enviarErro(evento, 'download-todas-finalizado', validacaoDados.erro);
      return;
    }

    // VALIDAÇÃO: Valida sistema para download
    const validacaoSistema = await validar.validarSistemaParaDownload();
    if (!validacaoSistema.valido) {
      evento.reply('download-todas-finalizado', {
        total: atas.length,
        sucesso: 0,
        erros: atas.length,
        mensagem: validacaoSistema.erro,
        acao: validacaoSistema.acao
      });
      return;
    }

    // VALIDAÇÃO: Valida quantidade de downloads
    const validacaoQtd = validar.validarQuantidadeDownloads(atas.length);
    if (!validacaoQtd.valido && validacaoQtd.tipo === 'confirmacao') {
      // AImplementar um dialog de confirmação se eu achar necessário
    }

    // Callback de progresso
    const callbackProgresso = (progresso) => {
      evento.reply('download-ata-progresso', progresso);
    };

    // Carrega dados para verificar se já foi baixado
    await servicoDownloadAta.inicializarServicos();

    // Executa download em lote (dados já validados)
    const resultados = await servicoDownloadAta.baixarAtas(atas, callbackProgresso);

    // Envia resultado final
    evento.reply('download-todas-finalizado', resultados);

  } catch (erro) {
    evento.reply('download-todas-finalizado', {
      total: atas?.length || 0,
      sucesso: 0,
      erros: atas?.length || 0,
      mensagem: erro.message
    });
  }
});

/**
 * Handler: Cancelar download de forma segura
 */
ipcMain.on('cancelar-download-lote', async (evento) => {
  try {
    servicoDownloadAta.cancelarDownloadLote();
    evento.reply('download-lote-cancelado', { 
      sucesso: true,
      mensagem: 'Cancelamento solicitado. Aguarde finalização segura...'
    });
  } catch (erro) {
    evento.reply('download-lote-cancelado', { 
      sucesso: false,
      mensagem: erro.message
    });
  }
});


// =============================================================================
// CICLO DE VIDA DO APP
// =============================================================================

app.whenReady().then(() => {
  criarJanela();
  console.log('[App] Iniciado');
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      criarJanela();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('[App] Encerrando...');
});

// =============================================================================
// TRATAMENTO DE ERROS
// =============================================================================

process.on('uncaughtException', (erro) => {
  console.error('[App] Erro não capturado:', erro);
});

process.on('unhandledRejection', (erro) => {
  console.error('[App] Promise rejeitada:', erro);
});