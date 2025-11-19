const puppeteer = require('puppeteer');
// IMPORT LOCAIS
const { construirUrl } = require('./parser.service');
const { aguardar } = require('../utils/util');

// =============================================================================
// VARIÁVEIS GLOBAIS
// =============================================================================

let deveFinalizar = false;
let navegador = null;
const TAM_PAGINA = 333;

// =============================================================================
// FUNÇÕES DE INICIALIZAÇÃO E LIMPEZA
// =============================================================================

/**
 * Inicia o navegador Puppeteer
 * @returns {Promise<Browser>} Instância do navegador
 */
async function iniciarNavegador() {
  console.log('[Navegador] Iniciando...');
  
  navegador = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  console.log('[Navegador] Iniciado com sucesso');
  return navegador;
}

/**
 * Finaliza a busca e fecha o navegador
 */
async function finalizarBusca() {
  deveFinalizar = true;
  
  if (navegador) {
    await navegador.close();
    navegador = null;
    console.log('[Navegador] Fechado');
  }
}

/**
 * Limpa recursos do navegador
 */
async function limpar() {
  if (navegador) {
    await navegador.close().catch(() => {});
    navegador = null;
  }
}

// =============================================================================
// FUNÇÕES DE EXTRAÇÃO DE DADOS
// =============================================================================

/**
 * Extrai IDs E DETALHES das atas da página de busca
 * @param {Page} paginaWeb - Página do Puppeteer
 * @returns {Promise<Object[]>} Array com atas completas (id, numero, orgao, objeto)
 */
async function extrairDadosDeBusca(paginaWeb) {
  
  const atas = await paginaWeb.evaluate(() => {
    // Busca todos os elementos <strong> que contêm "Ata nº"
    const strongsAta = Array.from(document.querySelectorAll('strong'))
      .filter(el => el.textContent.includes('Ata nº'));
    
    return strongsAta.map(strongAta => {
      // Encontra o container pai que contém todas as informações
      let container = strongAta.parentElement;
      while (container && !container.textContent.includes('Id ata PNCP:')) {
        container = container.parentElement;
        if (container === document.body) {
          container = null;
          break;
        }
      }
      
      if (!container) return null;
      
      // Função auxiliar para extrair valor de um span com strong
      const buscarValor = (textoLabel) => {
        const spans = Array.from(container.querySelectorAll('span'));
        const span = spans.find(el => {
          const strong = el.querySelector('strong');
          return strong && strong.textContent.trim() === textoLabel;
        });
        
        if (span) {
          const textoCompleto = span.textContent.trim();
          return textoCompleto.replace(textoLabel, '').trim() || null;
        }
        return null;
      };
      
      // Extrai os 4 campos
      const idAtaPNCP = buscarValor('Id ata PNCP:');
      const numeroAta = strongAta.textContent.replace('Ata nº', '').trim();
      const orgao = buscarValor('Órgão:');
      const objeto = buscarValor('Objeto:');
      
      return {
        idAtaPNCP: idAtaPNCP,
        numeroAta: numeroAta,
        orgao: orgao || 'Não informado',
        objeto: objeto || 'Não informado'
      };
    }).filter(ata => ata && ata.idAtaPNCP); // Remove nulos e sem ID
  });
  
  return atas;
}

/**
 * Busca uma única página de atas
 * @param {string} termo - Termo de busca
 * @param {number} numeroPagina - Número da página a buscar
 * @param {string[]} esferas - Esferas para filtrar
 * @param {string} status - Status das atas
 * @param {string[]} UFs - UFs para filtrar
 * @param {string[]} orgaos - Órgãos para filtrar
 * @returns {Promise<Object>} { atas: Array, temMaisPaginas: boolean }
 */
async function buscarPaginaAtas(termo, numeroPagina, esferas = [], status = 'vigente', UFs = [], orgaos = []) {
  let paginaWeb = null;
  
  try {
    // Construir URL de busca para esta página
    const url = construirUrl({
      termoBusca: termo,
      esferas: esferas,
      status: status,
      UFs: UFs,
      orgaos: orgaos,
      pagina: numeroPagina,
      tamanhoPagina: TAM_PAGINA
    });

    // Abrir página para busca
    paginaWeb = await navegador.newPage();
    
    // Configurar user agent
    await paginaWeb.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    
    // Navegar para URL de busca
    await paginaWeb.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Aguardar elementos específicos aparecerem
    try {
      await paginaWeb.waitForSelector('strong', { timeout: 10000 });
      } catch (erro) {
        console.log(`[Buscar] AVISO: Elementos não encontrados (timeout) na página ${numeroPagina}`);
        // Retorna 'true' para o loop principal (buscarAtas) tentar a próxima página
        return { atas: [], temMaisPaginas: true }; // ✅ Correto
    }

    // Aguardar carregamento adicional
    await aguardar(1500);
    
    // Extrai atas COM TODOS OS DETALHES
    const atas = await extrairDadosDeBusca(paginaWeb);
    
    // Verifica se há mais páginas (se trouxe menos que o esperado, provavelmente acabou)
    let temMaisPaginas;
    if(atas.length < TAM_PAGINA) {
      console.log(`atas.length= ${atas.length}\npagina= ${numeroPagina}`)
      temMaisPaginas = false;
    } else {
      temMaisPaginas = true;
    }
    
    return { atas, temMaisPaginas };
    
  } catch (erro) {
    console.error(`[Buscar] Erro na página ${numeroPagina}:`, erro.message);
    return { atas: [], temMaisPaginas: false };
    
  } finally {
    if (paginaWeb) {
      await paginaWeb.close().catch(() => {});
    }
  }
}

// =============================================================================
// FUNÇÃO PRINCIPAL DE BUSCA
// =============================================================================

/**
 * Busca atas no PNCP com entrega progressiva de resultados
 * @param {string} termo - Termo para buscar
 * @param {string[]} esferas - Array de esferas (federal, estadual, municipal)
 * @param {string} status - Status da ata (vigente, nao_vigente, todos)
 * @param {string[]} UFs - Array de UFs para filtrar
 * @param {string[]} orgaos - Array de órgãos para filtrar
 * @param {number} maxPaginas - Máximo de páginas a buscar (default: 100)
 * @param {Function} callbackProgresso - Função chamada a cada página consultada
 * @returns {Promise<Object>} { atas: Array, paginasConsultadas: number }
 */
async function buscarAtas(termo, esferas = [], status = 'vigente', UFs = [], orgaos = [], callbackProgresso) {
  // Inicializa navegador se necessário
  if (!navegador) {
    await iniciarNavegador();
  }
  
  // Reset flag de finalização
  deveFinalizar = false;
  
  let paginaAtual = 1;
  let todasAtas = [];
  let continuarBuscando = true;
  
  // Set para rastrear IDs únicos e detectar duplicatas
  const idsVistos = new Set();
  let paginasSemAtasNovas = 0; // Contador de páginas sem atas novas

  while (continuarBuscando && !deveFinalizar) {
    try {
      const resultadoPagina = await buscarPaginaAtas(
        termo,
        paginaAtual,
        esferas,
        status,
        UFs,
        orgaos
      );

      // Se encontrou atas nesta página
      if (resultadoPagina.atas && resultadoPagina.atas.length > 0) {
        // Filtra apenas atas com IDs únicos (não vistas antes)
        const atasNovas = resultadoPagina.atas.filter(ata => {
          if (idsVistos.has(ata.idAtaPNCP)) {
            return false; // Já vimos esta ata
          }
          idsVistos.add(ata.idAtaPNCP); // Marca como vista
          return true; // Ata nova!
        });

        // Se não há atas novas, incrementa contador
        if (atasNovas.length === 0) {
          paginasSemAtasNovas++;          
          // Para após 2 páginas seguidas sem atas novas
          if (paginasSemAtasNovas >= 2) {
            continuarBuscando = false;
            break;
          }
        } else {
          paginasSemAtasNovas = 0;
          
          // Adiciona apenas atas novas ao total
          todasAtas = [...todasAtas, ...atasNovas];
          
          // Envia resultado parcial (apenas atas novas!)
          if (callbackProgresso) {
            callbackProgresso({
              tipo: 'resultado-parcial',
              atasNovas: atasNovas, // Envia apenas as novas
              totalAcumulado: todasAtas.length,
              paginaAtual: paginaAtual
            });
          }
        }

        // Continua buscando apenas se houve atas novas
        continuarBuscando = resultadoPagina.temMaisPaginas && paginasSemAtasNovas < 2;
      } else {
        // Página vazia = fim da busca
        continuarBuscando = false;
      }

      // Envia progresso normal (para a barra de loading)
      if (callbackProgresso) {
        callbackProgresso({
          tipo: 'progresso',
          paginaAtual: paginaAtual,
          totalAcumulado: todasAtas.length
        });
      }

      paginaAtual++;

      // Delay entre requisições (respeita rate limit)
      await sleep(500);

    } catch (erro) {
      console.error(`[Busca] Erro na página ${paginaAtual}:`, erro.message);

      // Se for erro de rate limit, aguarda mais
      if (erro.message.includes('429')) {
        console.log('[Busca] Rate limit atingido. Aguardando 5 segundos...');
        await sleep(5000);
        continue;
      }

      // Outros erros: para a busca
      continuarBuscando = false;
    }
  }

  // Verifica se foi finalizado manualmente
  if (deveFinalizar) {
    deveFinalizar = false;
  }

  return {
    atas: todasAtas,
    paginasConsultadas: paginaAtual - 1
  };
}

// Função auxiliar de sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  buscarAtas,
  finalizarBusca,
  limpar
};