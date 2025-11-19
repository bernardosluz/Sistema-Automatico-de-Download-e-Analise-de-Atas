const fs = require('fs').promises;
const configService = require('../services/config.service');

/**
 * Classe centralizada de validações
 * Contém todas as validações do sistema em um só lugar
 */
class Validacao {
  
  // ==========================================================================
  // VALIDAÇÕES DE BUSCA
  // ==========================================================================

  /**
   * Valida termo de busca
   * @param {string} termo - Termo a validar
   * @returns {Object} {valido: boolean, erro?: string, termo?: string}
   */
  validarTermo(termo) {
    if (typeof termo !== 'string') {
      return {
        valido: false,
        erro: 'Termo inválido'
      };
    }
    
    const termoLimpo = termo.trim();
    
    if (termoLimpo.length === 0) {
      return {
        valido: false,
        erro: 'Digite um termo de busca'
      };
    }
    
    if (termoLimpo.length < 3) {
      return {
        valido: false,
        erro: 'Termo muito curto (mínimo 3 caracteres)'
      };
    }
    
    if (termoLimpo.length > 100) {
      return {
        valido: false,
        erro: 'Termo muito longo (máximo 100 caracteres)'
      };
    }
    
    return {
      valido: true,
      termo: termoLimpo
    };
  }

  /**
   * Valida filtros de busca
   * @param {Array} esferas - Array de esferas
   * @param {string} status - Status da ata
   * @param {Array} UFs - Array de UFs
   * @param {Array} orgaos - Array de órgãos
   * @returns {Object} {valido: boolean, erro?: string}
   */
  validarFiltrosBusca(esferas, status, UFs, orgaos) {
    // Valida esferas
    if (esferas !== undefined && esferas !== null) {
      if (!Array.isArray(esferas)) {
        return { valido: false, erro: 'Filtro de esferas inválido' };
      }
      
      const esferasValidas = ['distrital', 'federal', 'estadual', 'municipal'];
      for (const esfera of esferas) {
        if (!esferasValidas.includes(esfera)) {
          return { valido: false, erro: `Esfera inválida: ${esfera}` };
        }
      }
    }

    // Valida status
    if (status !== undefined && status !== null) {
      const statusValidos = ['vigente', 'nao_vigente', 'todos'];
      if (!statusValidos.includes(status)) {
        return { valido: false, erro: 'Status inválido' };
      }
    }

    // Valida UFs
    if (UFs !== undefined && UFs !== null) {
      if (!Array.isArray(UFs)) {
        return { valido: false, erro: 'Filtro de UFs inválido' };
      }
      
      const ufsValidas = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
      ];
      
      for (const uf of UFs) {
        if (!ufsValidas.includes(uf)) {
          return { valido: false, erro: `UF inválida: ${uf}` };
        }
      }
    }

    // Valida órgãos
    if (orgaos !== undefined && orgaos !== null) {
      if (!Array.isArray(orgaos)) {
        return { valido: false, erro: 'Filtro de órgãos inválido' };
      }
    }

    return { valido: true };
  }

  /**
   * Valida objeto de dados de busca completo
   * @param {Object} dados - Objeto com dados de busca
   * @returns {Object} {valido: boolean, erro?: string}
   */
  validarDadosBusca(dados) {
    if (!dados || typeof dados !== 'object') {
      return { valido: false, erro: 'Dados de busca inválidos' };
    }

    const { termo, esferas, status, UFs, orgaos } = dados;

    // Valida termo
    const validacaoTermo = this.validarTermo(termo);
    if (!validacaoTermo.valido) {
      return validacaoTermo;
    }

    // Valida filtros
    const validacaoFiltros = this.validarFiltrosBusca(esferas, status, UFs, orgaos);
    if (!validacaoFiltros.valido) {
      return validacaoFiltros;
    }

    return { valido: true };
  }

  // ==========================================================================
  // VALIDAÇÕES DE DOWNLOAD
  // ==========================================================================

  /**
   * Valida ID de ata no formato PNCP
   * @param {string} idAta - ID da ata
   * @returns {boolean}
   */
  validarIdAta(idAta) {
    if (!idAta || typeof idAta !== 'string') return false;
    
    // Formato: CNPJ-sequencial-numero/ano-versao
    // Exemplo: 44573087000161-1-000317/2025-000001
    const regex = /^\d{14}-\d+-\d+\/\d{4}-\d+$/;
    return regex.test(idAta);
  }

  /**
   * Valida dados de uma ata para download
   * @param {string} idAtaPNCP - ID da ata
   * @param {string} numeroAta - Número da ata
   * @returns {Object} {valido: boolean, erro?: string}
   */
  validarDadosAta(idAtaPNCP, numeroAta) {
    if (!idAtaPNCP || typeof idAtaPNCP !== 'string') {
      return { valido: false, erro: 'ID da ata inválido' };
    }

    if (!this.validarIdAta(idAtaPNCP)) {
      return { valido: false, erro: 'Formato do ID da ata inválido' };
    }

    if (!numeroAta || typeof numeroAta !== 'string') {
      return { valido: false, erro: 'Número da ata inválido' };
    }

    if (numeroAta.trim().length === 0) {
      return { valido: false, erro: 'Número da ata vazio' };
    }

    return { valido: true };
  }

  /**
   * Valida array de atas para download em lote
   * @param {Array} atas - Array de atas
   * @returns {Object} {valido: boolean, erro?: string}
   */
  validarArrayAtas(atas) {
    if (!Array.isArray(atas)) {
      return { valido: false, erro: 'Lista de atas inválida' };
    }

    if (atas.length === 0) {
      return { valido: false, erro: 'Nenhuma ata fornecida para download' };
    }

    // Valida cada ata do array
    for (let i = 0; i < atas.length; i++) {
      const ata = atas[i];
      
      if (!ata || typeof ata !== 'object') {
        return { 
          valido: false, 
          erro: `Ata na posição ${i + 1} é inválida` 
        };
      }

      if (!ata.idAtaPNCP || !ata.numeroAta) {
        return { 
          valido: false, 
          erro: `Ata na posição ${i + 1} está incompleta (falta idAtaPNCP ou numeroAta)` 
        };
      }

      const validacaoAta = this.validarDadosAta(ata.idAtaPNCP, ata.numeroAta);
      if (!validacaoAta.valido) {
        return { 
          valido: false, 
          erro: `Ata na posição ${i + 1}: ${validacaoAta.erro}` 
        };
      }
    }

    return { valido: true };
  }

  /**
   * Valida objeto de dados de download
   * @param {Object} dados - Dados de download
   * @returns {Object} {valido: boolean, erro?: string}
   */
  validarDadosDownload(dados) {
    if (!dados || typeof dados !== 'object') {
      return { valido: false, erro: 'Dados de download inválidos' };
    }

    const { idAtaPNCP, numeroAta } = dados;
    return this.validarDadosAta(idAtaPNCP, numeroAta);
  }

  /**
   * Valida objeto de dados de download em lote
   * @param {Object} dados - Dados de download
   * @returns {Object} {valido: boolean, erro?: string}
   */
  validarDadosDownloadLote(dados) {
    if (!dados || typeof dados !== 'object') {
      return { valido: false, erro: 'Dados de download em lote inválidos' };
    }

    if (!dados.atas) {
      return { valido: false, erro: 'Lista de atas não fornecida' };
    }

    return this.validarArrayAtas(dados.atas);
  }

  // ==========================================================================
  // VALIDAÇÕES DE SISTEMA (DOWNLOAD)
  // ==========================================================================

  /**
   * Valida se o sistema está pronto para download
   * Verifica configurações, diretório e espaço em disco
   * @returns {Promise<Object>} {valido: boolean, erro?: string, acao?: string, tipo?: string}
   */
  async validarSistemaParaDownload() {
    try {
      // Verifica configurações
      const config = await configService.carregarConfiguracoes();
      
      if (!config.diretorioDownload) {
        return {
          valido: false,
          erro: 'Configure o diretório de download primeiro',
          acao: 'abrir-configuracoes',
          tipo: 'configuracao'
        };
      }

      // Verifica se diretório existe
      try {
        await fs.access(config.diretorioDownload);
      } catch (erro) {
        return {
          valido: false,
          erro: 'Diretório de download não existe mais. Por favor, reconfigure.',
          acao: 'abrir-configuracoes',
          tipo: 'configuracao'
        };
      }

      // Verifica espaço em disco (alerta se < 1GB)
      const espacoLivre = await this.obterEspacoLivre(config.diretorioDownload);
      
      if (espacoLivre !== null && espacoLivre < 1024 * 1024 * 1024) { // 1GB em bytes
        return {
          valido: false,
          erro: `Espaço em disco baixo: ${this.formatarTamanho(espacoLivre)} disponível`,
          tipo: 'aviso'
        };
      }

      return { valido: true };

    } catch (erro) {
      console.error('[Validação] Erro ao validar sistema:', erro);
      return {
        valido: false,
        erro: 'Erro ao validar sistema: ' + erro.message,
        tipo: 'erro'
      };
    }
  }

  /**
   * Valida quantidade de downloads
   * Retorna confirmação se for muito grande
   * @param {number} quantidade - Quantidade de atas a baixar
   * @returns {Object} {valido: boolean, erro?: string, tipo?: string, mensagem?: string}
   */
  validarQuantidadeDownloads(quantidade) {
    if (typeof quantidade !== 'number' || quantidade < 1) {
      return {
        valido: false,
        erro: 'Quantidade inválida',
        tipo: 'erro'
      };
    }

    // Alerta para grandes quantidades
    if (quantidade > 100) {
      return {
        valido: false,
        erro: `Você está prestes a baixar ${quantidade} atas. Isso pode demorar bastante tempo.`,
        tipo: 'confirmacao',
        mensagem: `Deseja continuar com o download de ${quantidade} atas?`,
        quantidade: quantidade
      };
    }

    // Aviso para quantidades médias
    if (quantidade > 50) {
      return {
        valido: true,
        tipo: 'aviso',
        mensagem: `Será feito o download de ${quantidade} atas. Isso pode levar alguns minutos.`
      };
    }

    return { valido: true };
  }

  // ==========================================================================
  // VALIDAÇÕES DE DOCUMENTOS
  // ==========================================================================

  /**
   * Valida número de ata
   */
  validarNumeroAta(numero) {
    if (!numero) return false;
    return /^\d+$/.test(numero);
  }

  /**
   * Valida CNPJ
   */
  validarCnpj(cnpj) {
    if (!cnpj) return false;
    
    const numeros = cnpj.replace(/\D/g, '');
    
    if (numeros.length !== 14) return false;
    if (/^(\d)\1+$/.test(numeros)) return false;
    
    return true;
  }

  /**
   * Valida CPF
   */
  validarCpf(cpf) {
    if (!cpf) return false;
    
    const numeros = cpf.replace(/\D/g, '');
    
    if (numeros.length !== 11) return false;
    if (/^(\d)\1+$/.test(numeros)) return false;
    
    return true;
  }

  /**
   * Valida e-mail
   */
  validarEmail(email) {
    if (!email) return false;
    
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  // ==========================================================================
  // VALIDAÇÕES DE CONFIGURAÇÃO
  // ==========================================================================

  /**
   * Valida caminho de diretório
   * @param {string} caminho - Caminho do diretório
   * @returns {Promise<Object>} {valido: boolean, erro?: string}
   */
  async validarDiretorio(caminho) {
    if (!caminho || typeof caminho !== 'string') {
      return {
        valido: false,
        erro: 'Caminho inválido'
      };
    }

    try {
      const stats = await fs.stat(caminho);
      
      if (!stats.isDirectory()) {
        return {
          valido: false,
          erro: 'O caminho não é um diretório'
        };
      }

      // Tenta escrever para verificar permissões
      try {
        const testFile = require('path').join(caminho, '.test_write');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
      } catch (erro) {
        return {
          valido: false,
          erro: 'Sem permissão de escrita no diretório'
        };
      }

      return { valido: true };

    } catch (erro) {
      return {
        valido: false,
        erro: 'Diretório não existe ou não pode ser acessado'
      };
    }
  }

  /**
   * Valida modo de organização
   * @param {string} modo - Modo de organização ('direto', 'organizado', 'ambos')
   * @returns {boolean}
   */
  validarModoOrganizacao(modo) {
    const modosValidos = ['direto', 'organizado', 'ambos'];
    return modosValidos.includes(modo);
  }

  /**
   * Valida contador de atas
   * @param {number} contador - Número do contador
   * @returns {boolean}
   */
  validarContador(contador) {
    return Number.isInteger(contador) && contador >= 0 && contador <= 9999;
  }

  /**
   * Valida objeto de configuração completo
   * @param {Object} config - Objeto de configuração
   * @returns {Object} {valido: boolean, erros: string[]}
   */
  validarConfiguracao(config) {
    const erros = [];

    if (!config || typeof config !== 'object') {
      return {
        valido: false,
        erros: ['Configuração inválida']
      };
    }

    // Valida diretório de download
    if (!config.diretorioDownload) {
      erros.push('Diretório de download não configurado');
    }

    // Valida modo de organização
    if (config.modoOrganizacao && !this.validarModoOrganizacao(config.modoOrganizacao)) {
      erros.push('Modo de organização inválido');
    }

    // Valida contador
    if (config.contadorAtas !== undefined && !this.validarContador(config.contadorAtas)) {
      erros.push('Contador de atas inválido');
    }

    return {
      valido: erros.length === 0,
      erros: erros
    };
  }

  // ==========================================================================
  // UTILITÁRIOS
  // ==========================================================================

  /**
   * Obtém espaço livre no disco em bytes
   * @param {string} caminho - Caminho do diretório
   * @returns {Promise<number|null>} Espaço livre em bytes ou null se falhar
   */
  async obterEspacoLivre(caminho) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      if (process.platform === 'win32') {
        const drive = caminho.split(':')[0] + ':';
        const { stdout } = await execAsync(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace`);
        const linhas = stdout.trim().split('\n');
        return parseInt(linhas[1]);
      } else {
        const { stdout } = await execAsync(`df -k "${caminho}" | tail -1 | awk '{print $4}'`);
        return parseInt(stdout) * 1024;
      }
    } catch (erro) {
      console.error('[Validação] Erro ao obter espaço livre:', erro);
      return null;
    }
  }

  /**
   * Formata tamanho de bytes para leitura humana
   * @param {number} bytes - Tamanho em bytes
   * @returns {string} Tamanho formatado (ex: "1.5 GB")
   */
  formatarTamanho(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes === null || bytes === undefined) return 'Desconhecido';

    const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
    let tamanho = bytes;
    let indice = 0;

    while (tamanho >= 1024 && indice < unidades.length - 1) {
      tamanho /= 1024;
      indice++;
    }

    return `${tamanho.toFixed(2)} ${unidades[indice]}`;
  }

  /**
   * Valida URL
   * @param {string} url - URL a validar
   * @returns {boolean}
   */
  validarUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida data no formato DD/MM/YYYY
   * @param {string} data - Data a validar
   * @returns {boolean}
   */
  validarData(data) {
    if (!data || typeof data !== 'string') return false;
    
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(data)) return false;
    
    const [dia, mes, ano] = data.split('/').map(Number);
    
    if (mes < 1 || mes > 12) return false;
    if (dia < 1 || dia > 31) return false;
    if (ano < 1900 || ano > 2100) return false;
    
    const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    if ((ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0) {
      diasPorMes[1] = 29;
    }
    
    return dia <= diasPorMes[mes - 1];
  }
}

// Exporta instância única da classe
module.exports = new Validacao();