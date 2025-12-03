/**
 * Serviço de geração de logs detalhados para downloads de atas PNCP
 */
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

class LogService {
    constructor() {
        this.logFile = null;
        this.buffer = [];
        this.diretorioDownload = null;
    }

    /**
     * Inicializa o serviço de log
     * @param {string} diretorioDownload - Diretório onde salvar o log
     */
    async inicializar(diretorioDownload) {
        if (!diretorioDownload) {
            throw new Error('Diretório de download não configurado');
        }

        this.diretorioDownload = diretorioDownload;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path.join(diretorioDownload, `log-download-${timestamp}.txt`);
        
        // Inicializa arquivo com cabeçalho
        await this._inicializarArquivo();
        
        console.log('[Log] Inicializado:', this.logFile);
    }

    /**
     * Inicializa o arquivo de log com cabeçalho
     */
    async _inicializarArquivo() {
        const cabecalho = [
            '═══════════════════════════════════════════════════════════════',
            '  LOG DE DOWNLOAD - ATAS PNCP',
            '═══════════════════════════════════════════════════════════════',
            `  Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
            `  Diretório: ${this.diretorioDownload}`,
            '═══════════════════════════════════════════════════════════════',
            '',
            ''
        ].join('\n');

        await fsPromises.writeFile(this.logFile, cabecalho, 'utf8');
    }

    /**
     * Formata tamanho de arquivo
     * @param {number} bytes - Tamanho em bytes
     * @returns {string} Tamanho formatado
     */
    _formatarTamanho(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';

        const k = 1024;
        const tamanhos = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + tamanhos[i];
    }

    /**
     * Registra o download de uma ata no log
     * @param {Object} dadosAta - Dados da ata processada
     */
    registrarAta(dadosAta) {
        const linhas = [];

        // Separador visual
        linhas.push('───────────────────────────────────────────────────────────────');
        
        if(dadosAta.idAtaPNCP) {
            linhas.push(`Ata Processada: ${dadosAta.idAtaPNCP}`);
        }

        // Se tem pasta, mostra
        if (dadosAta.pasta) {
            linhas.push(`Pasta: ${dadosAta.pasta}`);
        }
        
        // Link da ata
        linhas.push(`   Link: ${dadosAta.link}`);
        
        // Informações adicionais
        if (dadosAta.numeroAta) {
            linhas.push(`   Ata nº: ${dadosAta.numeroAta}`);
        }
        
        // Lista de arquivos
        if (dadosAta.arquivos && dadosAta.arquivos.length > 0) {
            dadosAta.arquivos.forEach((arquivo, index) => {
                const numero = `[${index + 1}]`.padEnd(5);
                const tamanho = this._formatarTamanho(arquivo.tamanho);
                let linha = `  ${numero}${arquivo.nome}`;
                if (arquivo.tamanho) {
                    linha += ` (${tamanho})`;
                }
                if (arquivo.jaExistia) {
                    linha += ' [já existia]';
                }
                
                linhas.push(linha);
            });
            
            // Indicador de fim
            const proximoNumero = `[${dadosAta.arquivos.length + 1}]`.padEnd(5);
            // Resumo Final
            const totalArquivos = dadosAta.arquivos.length;
            const tamanhoTotal = dadosAta.arquivos.reduce((soma, arq) => soma + (arq.tamanho || 0), 0);
            linhas.push(`    Resumo: ${totalArquivos} arquivo(s), ${this._formatarTamanho(tamanhoTotal)}`);

        } else if (dadosAta.sucesso === false) {
            // Erro
            linhas.push(`  [!] ERRO: ${dadosAta.mensagemErro || 'Falha no processamento'}`);
        } else {
            // Nenhum arquivo encontrado
            linhas.push(`  [1] Sem Arquivos para essa ata`);
        }
        
        linhas.push(''); // Linha em branco
        
        // Adiciona ao buffer
        this.buffer.push(...linhas);
        
        // Grava periodicamente
        if (this.buffer.length >= 50) {
            this.flush();
        }
    }

    /**
     * Registra uma mensagem genérica
     * @param {string} mensagem - Mensagem a registrar
     * @param {string} tipo - Tipo: 'info', 'warning', 'error', 'success'
     */
    registrarMensagem(mensagem, tipo = 'info') {
        const prefixos = {
            info: '→',
            warning: '⚠',
            error: '✗',
            success: '✓'
        };

        const prefixo = prefixos[tipo] || '→';
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        
        this.buffer.push(`[${timestamp}] ${prefixo} ${mensagem}`);
        
        // Mensagens importantes gravam imediatamente
        if (tipo === 'error' || tipo === 'warning') {
            this.flush();
        }
    }

    /**
     * Registra estatísticas finais
     * @param {Object} estatisticas - Estatísticas da execução
     */
    registrarEstatisticas(estatisticas) {
        const linhas = [
            '',
            '═══════════════════════════════════════════════════════════════',
            '  ESTATÍSTICAS FINAIS',
            '═══════════════════════════════════════════════════════════════',
            `  Total de atas processadas: ${estatisticas.totalAtas || 0}`,
            `  Atas com sucesso: ${estatisticas.atasSucesso || 0}`,
            `  Atas com erro: ${estatisticas.atasErro || 0}`,
            `  Total de arquivos baixados: ${estatisticas.totalArquivos || 0}`,
            `  Término: ${new Date().toLocaleString('pt-BR')}`,
            '═══════════════════════════════════════════════════════════════',
            ''
        ];

        this.buffer.push(...linhas);
        this.flush();
    }

    /**
     * Grava buffer no disco
     */
    flush() {
        if (this.buffer.length > 0 && this.logFile) {
            try {
                fs.appendFileSync(this.logFile, this.buffer.join('\n') + '\n', 'utf8');
                this.buffer = [];
            } catch (erro) {
                console.error('[Log] Erro ao gravar:', erro.message);
            }
        }
    }

    /**
     * Finaliza o log
     * @returns {string} Caminho do arquivo de log
     */
    finalizar() {
        this.flush();
        console.log('[Log] Finalizado:', this.logFile);
        return this.logFile;
    }

    /**
     * Obtém o caminho do arquivo de log
     * @returns {string} Caminho do arquivo
     */
    getCaminho() {
        return this.logFile;
    }
}

// Exporta instância única (singleton)
module.exports = new LogService();
