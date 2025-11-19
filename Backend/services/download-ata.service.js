const { analisarIdAta, construirUrlArquivo } = require('./parser.service');
const downloadService = require('./download.service');
const progressService = require('./progress.service');
const logService = require('./log.service');           
const configService = require('./config.service');  

/**
 * Serviço para baixar atas do PNCP
 * Baixa TODOS os arquivos de uma ata até encontrar 404
 */
class DownloadAtaService {

  /**
     * Inicializa os serviços de progresso e log
     * DEVE SER CHAMADO ANTES DE COMEÇAR OS DOWNLOADS
     */
    async inicializarServicos() {
      try {
        // Carrega configurações
        const config = await configService.carregarConfiguracoes();
        
        if (!config.diretorioDownload) {
          throw new Error('Diretório de download não configurado. Acesse as Configurações.');
        }
  
        // Inicializa ProgressService
        progressService.inicializar(config.diretorioDownload);
        await progressService.load();
  
        // Inicializa LogService
        await logService.inicializar(config.diretorioDownload);
        
        console.log('[Download Ata] ✓ Serviços inicializados');
        
        return true;
      } catch (erro) {
        console.error('[Download Ata] Erro ao inicializar serviços:', erro.message);
        throw erro;
      }
    }
    
  
  /**
   * Baixa TODOS os arquivos de uma única ata
   * @param {string} idAtaPNCP - ID da ata no formato PNCP
   * @param {string} numeroAta - Número da ata (para exibição)
   * @returns {Promise<Object>} Resultado do download
   */
  async baixarAta(idAtaPNCP, numeroAta) {
    try {
      console.log(`[Download Ata] Iniciando download da ata: ${idAtaPNCP}`);

      // Parseia o ID
      const parts = analisarIdAta(idAtaPNCP);

      // Obtém caminhos de download baseado nas configurações
      const caminhos = await downloadService.obterCaminhosDownload(idAtaPNCP);
      
      console.log(`[Download Ata] Caminhos configurados:`, caminhos);

      // Array para armazenar arquivos baixados
      const arquivosBaixados = [];
      let numeroArquivo = 1;
      let tentativasFalhas = 0;
      const maxTentativasFalhas = 3; // Para no terceiro 404 consecutivo

      // Loop para baixar todos os arquivos
      while (tentativasFalhas < maxTentativasFalhas) {
        try {
          console.log(`[Download Ata] Tentando baixar arquivo ${numeroArquivo}...`);

          // Constrói URL do arquivo
          const url = construirUrlArquivo(parts, numeroArquivo);
          console.log(`[Download Ata] URL: ${url}`);

          // Baixa para os destinos configurados (direto, organizado ou ambos)
          const resultados = await downloadService.downloadArquivo(url, caminhos, numeroArquivo);

          // Se chegou aqui, download foi bem-sucedido
          arquivosBaixados.push({
            numero: numeroArquivo,
            nome: resultados[0].nome, // Pega nome do primeiro resultado
            tamanho: resultados[0].tamanho,
            destinos: resultados.map(r => r.tipo) // ['direto'] ou ['organizado'] ou ['direto', 'organizado']
          });

          console.log(`[Download Ata] ✅ Arquivo ${numeroArquivo} baixado:`, resultados);

          // Reseta contador de falhas
          tentativasFalhas = 0;
          numeroArquivo++;

        } catch (erro) {
          // Se for 404, provavelmente não há mais arquivos
          if (erro.message === "404") {
            console.log(`[Download Ata] Arquivo ${numeroArquivo} não encontrado (404)`);
            tentativasFalhas++;
          }
          // Se arquivo já existe, conta como sucesso e pula
          else if (erro.message === "FILE_EXISTS") {
            console.log(`[Download Ata] Arquivo ${numeroArquivo} já existe, pulando...`);
            arquivosBaixados.push({
              numero: numeroArquivo,
              nome: `arquivo_${numeroArquivo}.pdf`,
              tamanho: 0,
              jaExistia: true
            });
            tentativasFalhas = 0;
            numeroArquivo++;
          }
          // Outros erros (rede, timeout, etc)
          else {
            console.error(`[Download Ata] Erro ao baixar arquivo ${numeroArquivo}:`, erro.message);
            // Tenta próximo arquivo
            tentativasFalhas++;
            numeroArquivo++;
          }
        }
      }

      // Resultado final
      const totalArquivos = arquivosBaixados.length;
      
      if (totalArquivos === 0) {
        return {
          sucesso: false,
          idAtaPNCP: idAtaPNCP,
          numeroAta: numeroAta,
          mensagem: 'Nenhum arquivo encontrado para esta ata',
          arquivos: []
        };
      }

      console.log(`[Download Ata] ✅ Download completo: ${totalArquivos} arquivo(s)`);

      return {
        sucesso: true,
        idAtaPNCP: idAtaPNCP,
        numeroAta: numeroAta,
        mensagem: `${totalArquivos} arquivo(s) baixado(s)`,
        caminhos: caminhos, // Retorna onde foi salvo
        arquivos: arquivosBaixados
      };

    } catch (erro) {
      console.error(`[Download Ata] Erro geral ao baixar ata ${idAtaPNCP}:`, erro.message);
      
      return {
        sucesso: false,
        idAtaPNCP: idAtaPNCP,
        numeroAta: numeroAta,
        mensagem: `Erro: ${erro.message}`,
        arquivos: []
      };
    }
  }

  /**
   * Baixa múltiplas atas
   * @param {Array} atas - Array de atas a baixar [{idAtaPNCP, numeroAta}, ...]
   * @param {Function} progressCallback - Callback de progresso
   * @returns {Promise<Object>} Resultado do download
   */
  async baixarAtas(atas, progressCallback) {
    console.log(`[Download Ata] Iniciando download de ${atas.length} atas`);

    const resultados = {
      total: atas.length,
      sucesso: 0,
      erros: 0,
      detalhes: []
    };

    for (let i = 0; i < atas.length; i++) {
      const ata = atas[i];

      try {
        // Callback de progresso
        if (progressCallback) {
          progressCallback({
            idAtaPNCP: ata.idAtaPNCP,
            numeroAta: ata.numeroAta,
            status: 'baixando',
            mensagem: `Baixando ${i + 1}/${atas.length}...`,
            progresso: {
              atual: i + 1,
              total: atas.length
            }
          });
        }

        // Baixa a ata (todos os arquivos dela)
        const resultado = await this.baixarAta(
          ata.idAtaPNCP, 
          ata.numeroAta
        );

        if (resultado.sucesso) {
          resultados.sucesso++;
          
          if (progressCallback) {
            progressCallback({
              idAtaPNCP: ata.idAtaPNCP,
              numeroAta: ata.numeroAta,
              status: 'sucesso',
              mensagem: resultado.mensagem,
              progresso: {
                atual: i + 1,
                total: atas.length
              }
            });
          }
        } else {
          resultados.erros++;
          
          if (progressCallback) {
            progressCallback({
              idAtaPNCP: ata.idAtaPNCP,
              numeroAta: ata.numeroAta,
              status: 'erro',
              mensagem: resultado.mensagem,
              progresso: {
                atual: i + 1,
                total: atas.length
              }
            });
          }
        }

        resultados.detalhes.push(resultado);

        // Pequeno delay entre atas
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (erro) {
        console.error(`[Download Ata] Erro ao processar ata ${ata.idAtaPNCP}:`, erro);
        resultados.erros++;
        
        if (progressCallback) {
          progressCallback({
            idAtaPNCP: ata.idAtaPNCP,
            numeroAta: ata.numeroAta,
            status: 'erro',
            mensagem: erro.message,
            progresso: {
              atual: i + 1,
              total: atas.length
            }
          });
        }
      }
    }

    console.log(`[Download Ata] Finalizado: ${resultados.sucesso} sucesso, ${resultados.erros} erros`);

    return resultados;
  }

}

module.exports = new DownloadAtaService();