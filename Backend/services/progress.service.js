/**
 * Serviço de persistência de progresso para downloads de atas PNCP.
 * Integrado com config.service para manter compatibilidade.
 */
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class ProgressService {
    constructor() {
        this.progressFile = null;
        this.dados = {
            atasProcessadas: [],
            ultimaAtualizacao: null
        };
    }

    /**
     * Inicializa o serviço com o diretório de download
     * @param {string} diretorioDownload - Diretório raiz dos downloads
     */
    inicializar(diretorioDownload) {
        if (!diretorioDownload) {
            throw new Error('Diretório de download não configurado');
        }
        
        this.progressFile = path.join(diretorioDownload, '.progress.json');
    }

    /**
     * Re-inicializa o serviço (limpa dados antigos e carrega novos)
     * @param {string} diretorioDownload - Novo diretório
     */
    async reinicializar(diretorioDownload) {
        console.log('[Progress] Re-inicializando com novo diretório...');
        
        // Limpar dados antigos
        this.dados = {
            atasProcessadas: [],
            ultimaAtualizacao: null
        };
        
        // Inicializa com novo caminho
        this.inicializar(diretorioDownload);
        
        // Carrega (ou cria novo) JSON
        await this.load();
    }

    /**
     * Carrega dados de progresso do arquivo
     * @returns {Promise<Object>} Dados carregados
     */
    async load() {
        if (!this.progressFile) {
            throw new Error('ProgressService não inicializado. Chame inicializar() primeiro.');
        }

        // Progresso salvo
        try {
            if (fsSync.existsSync(this.progressFile)) {
                const conteudo = await fs.readFile(this.progressFile, 'utf8');
                this.dados = JSON.parse(conteudo);
                return this.dados;
            }
        } catch (erro) {
            console.error('[Progress] ⚠ Erro ao carregar, iniciando do zero:', erro.message);
        }
        // Sem nenhum progresso
        this.dados = {
            atasProcessadas: [],
            ultimaAtualizacao: null
        };
        return this.dados;
    }

    /**
     * Verifica se uma ata já foi processada com sucesso
     * @param {string} idAtaPNCP - ID da ata
     * @returns {boolean} True se já foi processada
     */
    jaProcessada(idAtaPNCP) {
        return this.dados.atasProcessadas.some(
            ata => ata.idAtaPNCP === idAtaPNCP && ata.sucesso === true
        );
    }

    /**
     * Obtém dados de uma ata processada
     * @param {string} idAtaPNCP - ID da ata
     * @returns {Object|null} Dados da ata ou null
     */
    obterAta(idAtaPNCP) {
        return this.dados.atasProcessadas.find(ata => ata.idAtaPNCP === idAtaPNCP) || null;
    }

    /**
     * Adiciona uma ata processada ao registro
     * @param {Object} dadosAta - Dados da ata processada
     */
    adicionarAta(dadosAta) {
        // Remove entrada anterior se existir (atualização)
        this.dados.atasProcessadas = this.dados.atasProcessadas.filter(
            ata => ata.idAtaPNCP !== dadosAta.idAtaPNCP
        );

        // Adiciona nova entrada
        this.dados.atasProcessadas.push({
            idAtaPNCP: dadosAta.idAtaPNCP,
            numeroAta: dadosAta.numeroAta || null,
            link: dadosAta.link || null,
            pasta: dadosAta.pasta || null,
            arquivos: dadosAta.arquivos || [],
            sucesso: dadosAta.sucesso !== false,
            mensagemErro: dadosAta.mensagemErro || null,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Salva progresso no disco
     */
    async save() {
        if (!this.progressFile) {
            throw new Error('ProgressService não inicializado');
        }

        this.dados.ultimaAtualizacao = new Date().toISOString();
        
        try {
            await fs.writeFile(
                this.progressFile, 
                JSON.stringify(this.dados, null, 2),
                'utf8'
            );
        } catch (erro) {
            console.error('[Progress] Erro ao salvar:', erro.message);
            throw erro;
        }
    }

    /**
     * Obtém estatísticas do progresso
     * @returns {Object} Estatísticas
     */
    getEstatisticas() {
        const atasSucesso = this.dados.atasProcessadas.filter(a => a.sucesso).length;
        const atasErro = this.dados.atasProcessadas.filter(a => !a.sucesso).length;
        const totalArquivos = this.dados.atasProcessadas.reduce(
            (total, ata) => total + (ata.arquivos?.length || 0), 
            0
        );

        return {
            totalAtas: this.dados.atasProcessadas.length,
            atasSucesso,
            atasErro,
            totalArquivos,
            ultimaAtualizacao: this.dados.ultimaAtualizacao
        };
    }

    /**
     * Limpa o arquivo de progresso
     */
    async limpar() {
        if (!this.progressFile) return;

        try {
            if (fsSync.existsSync(this.progressFile)) {
                await fs.unlink(this.progressFile);
                console.log('[Progress] ✓ Progresso limpo');
            }
        } catch (erro) {
            console.error('[Progress] Erro ao limpar:', erro.message);
        }

        this.dados = {
            atasProcessadas: [],
            ultimaAtualizacao: null
        };
    }

    /**
     * Obtém lista de IDs já processados (para verificação rápida)
     * @returns {Set<string>} Set de IDs
     */
    getIdsProcessados() {
        return new Set(
            this.dados.atasProcessadas
                .filter(ata => ata.sucesso)
                .map(ata => ata.idAtaPNCP)
        );
    }
}

// Exporta instância única (singleton)
module.exports = new ProgressService();
