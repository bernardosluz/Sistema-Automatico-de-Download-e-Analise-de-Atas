const { analisarIdAta, construirUrlArquivo, construirUrlPublica } = require('./parser.service');
const downloadService = require('./download.service');
const progressService = require('./progress.service');
const logService = require('./log.service');           
const configService = require('./config.service');  

/**
 * Serviço para baixar atas do PNCP
 * Baixa TODOS os arquivos de uma ata até encontrar 404
 */
class DownloadAtaService {

  constructor() {
    this.deveCancelarLote = false; // ✅ Flag para cancelamento seguro
  }

  /**
   * ✅ NOVO: Cancela o download em lote de forma segura
   */
  cancelarDownloadLote() {
    this.deveCancelarLote = true;
  }

  /**
   * ✅ NOVO: Reseta a flag de cancelamento
   */
  resetarCancelamento() {
    this.deveCancelarLote = false;
  }

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
  
        // Reinicializa os dados em progresso
        await progressService.reinicializar(config.diretorioDownload);

        // Inicializa logService
        await logService.inicializar(config.diretorioDownload);
        
        return true;
      } catch (erro) {
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

      const jaFoiProcessada = progressService.jaProcessada(idAtaPNCP);

      if (jaFoiProcessada) {

        // Obter os dados da ata já baixada
        const dadosAta = progressService.obterAta(idAtaPNCP);

        logService.registrarAta({
        idAtaPNCP: idAtaPNCP,
        numeroAta: numeroAta,
        link: dadosAta.link,
        pasta: dadosAta.pasta,
        arquivos: dadosAta.arquivos,
        sucesso: true,
      });

        // Retorna o objeto já baixado
        return {
          sucesso: true,
          jaBaixada: true,
          idAtaPNCP: idAtaPNCP,
          numeroAta: numeroAta,
          mensagem: 'Ata já baixada',
          caminhos: dadosAta.pasta,
          arquivos: dadosAta.arquivos,
          timestamp: dadosAta.timestamp
        };
      }

      // Parseia o ID
      const parts = analisarIdAta(idAtaPNCP);

      // Obtém caminhos de download baseado nas configurações
      const caminhos = await downloadService.obterCaminhosDownload(idAtaPNCP);

      // Array para armazenar arquivos baixados
      const arquivosBaixados = [];
      let numeroArquivo = 1;
      let tentativasFalhas = 0;
      const maxTentativasFalhas = 3; // Para no terceiro 404 consecutivo

      // Loop para baixar todos os arquivos
      while (tentativasFalhas < maxTentativasFalhas) {
        try {
          // Constrói URL do arquivo
          const url = construirUrlArquivo(parts, numeroArquivo);

          // Baixa para os destinos configurados (direto, organizado ou ambos)
          const resultados = await downloadService.downloadArquivo(url, caminhos, numeroArquivo);

          // Se chegou aqui, download foi bem-sucedido
          arquivosBaixados.push({
            numero: numeroArquivo,
            nome: resultados[0].nome, // Pega nome do primeiro resultado
            tamanho: resultados[0].tamanho,
            destinos: resultados.map(r => r.tipo) // ['direto'] ou ['organizado'] ou ['direto', 'organizado']
          });

          // Reseta contador de falhas
          tentativasFalhas = 0;
          numeroArquivo++;

        } catch (erro) {
          // Se for 404, provavelmente não há mais arquivos
          if (erro.message === "404") {
            tentativasFalhas++;
          }
          // Se arquivo já existe, conta como sucesso e pula
          else if (erro.message === "FILE_EXISTS") {
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
            // Tenta próximo arquivo
            tentativasFalhas++;
            numeroArquivo++;
          }
        }
      }

      // Resultado final
      const totalArquivos = arquivosBaixados.length;
      
      if (totalArquivos === 0) {

        progressService.adicionarAta({
          idAtaPNCP: idAtaPNCP,
          numeroAta: numeroAta,
          link: construirUrlPublica(parts),
          pasta: caminhos.organizado || caminhos.direto,
          arquivos: [],
          sucesso: false,
          mensagemErro: 'Nenhum arquivo encontrado para esta ata'
        });

        await progressService.save();
        
        // Registra no log
        logService.registrarAta({
          idAtaPNCP: idAtaPNCP,
          numeroAta: numeroAta,
          link: construirUrlPublica(parts),
          pasta: caminhos.organizado || caminhos.direto,
          arquivos: [],
          sucesso: false,
          mensagemErro: 'Nenhum arquivo encontrado para esta ata'
        });

        return {
          sucesso: false,
          jaBaixada: false,
          idAtaPNCP: idAtaPNCP,
          numeroAta: numeroAta,
          mensagem: 'Nenhum arquivo encontrado para esta ata',
          arquivos: []
        };
      }

      // Download da Ata bem sucedida
      // Salvando Progresso e Retornando a Ata
      progressService.adicionarAta({
        idAtaPNCP: idAtaPNCP,
        numeroAta: numeroAta,
        link: construirUrlPublica(parts),
        pasta: caminhos.organizado || caminhos.direto,
        arquivos: arquivosBaixados,
        sucesso: true,
      });

      await progressService.save();

      logService.registrarAta({
        idAtaPNCP: idAtaPNCP,
        numeroAta: numeroAta,
        link: construirUrlPublica(parts),
        pasta: caminhos.organizado || caminhos.direto,
        arquivos: arquivosBaixados,
        sucesso: true
      });

      return {
        sucesso: true,
        jaBaixada: false,
        idAtaPNCP: idAtaPNCP,
        numeroAta: numeroAta,
        mensagem: `${totalArquivos} arquivo(s) baixado(s)`,
        caminhos: caminhos, // Retorna onde foi salvo
        arquivos: arquivosBaixados
      };

    } catch (erro) {
    
      // Tentar gerar o link com segurança
      let linkPublico = null;
      try {
        const parts = analisarIdAta(idAtaPNCP);
        linkPublico = construirUrlPublica(parts);
      } catch {
        linkPublico = null; // Se falhar, deixa null
      }
      
      // Salvar no progressService
      progressService.adicionarAta({
          idAtaPNCP: idAtaPNCP,
          numeroAta: numeroAta,
          link: linkPublico,
          pasta: null,
          arquivos: [],
          sucesso: false,
          mensagemErro: `Erro: ${erro.message}`
        });

      await progressService.save();

      logService.registrarAta({
        idAtaPNCP: idAtaPNCP,
        numeroAta: numeroAta,
        link: linkPublico,
        pasta: null,
        arquivos: [],
        sucesso: false,
        mensagemErro: `Erro: ${erro.message}`
      });

      // Retorna erro
      return {
        sucesso: false,
        jaBaixada: false,
        idAtaPNCP: idAtaPNCP,
        numeroAta: numeroAta,
        mensagem: `Erro: ${erro.message}`,
        arquivos: []
      };
    }
  }

  /**
 * Baixa múltiplas atas com suporte a cancelamento seguro
 * @param {Array} atas - Array de atas a baixar [{idAtaPNCP, numeroAta}, ...]
 * @param {Function} progressCallback - Callback de progresso
 * @returns {Promise<Object>} Resultado do download
 */
async baixarAtas(atas, progressCallback) {

  // ✅ Reseta flag de cancelamento no início
  this.resetarCancelamento();

  const resultados = {
    total: atas.length,
    sucesso: 0,
    erros: 0,
    jaBaixadas: 0,
    cancelado: false, // ✅ NOVO: Flag para indicar se foi cancelado
    detalhes: []
  };

  for (let i = 0; i < atas.length; i++) {
    
    // ✅ NOVO: Verifica se deve cancelar ANTES de baixar a próxima ata
    if (this.deveCancelarLote) {
      resultados.cancelado = true;
      break; // Sai do loop de forma segura
    }

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

      // Contabiliza o resultado
      if (resultado.sucesso) {
        if (resultado.jaBaixada) {
          resultados.jaBaixadas++;
        } else {
          resultados.sucesso++;
        }
        
        if (progressCallback) {
          progressCallback({
            idAtaPNCP: ata.idAtaPNCP,
            numeroAta: ata.numeroAta,
            status: resultado.jaBaixada ? 'ja-baixada' : 'sucesso',
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
  
  return resultados;
}

}

module.exports = new DownloadAtaService();