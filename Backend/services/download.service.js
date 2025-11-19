/**
 * Serviço de download de arquivos via HTTPS.
 * Implementa download com retry automático e validação de resposta HTTP.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { carregarConfiguracoes, obterProximoNumero } = require('./config.service');
const { sanatizarNomeArquivo } = require('../utils/arq');
const { normalizarIdAta } = require('../utils/formatar');

/**
 * Determina os caminhos de download baseado nas configurações
 * @param {string} idAtaPNCP - ID da ata
 * @returns {Promise<Object>} Caminhos de download
 */
async function obterCaminhosDownload(idAtaPNCP) {
    const config = await carregarConfiguracoes();
    
    if (!config.diretorioDownload) {
        throw new Error('Diretório de download não configurado. Acesse as Configurações.');
    }

    const idNormalizado = normalizarIdAta(idAtaPNCP);
    const numero = await obterProximoNumero();
    const nomePasta = `${numero}-${idNormalizado}`;

    const caminhos = {
        direto: null,
        organizado: null
    };

    // Define caminhos baseado no modo
    if (config.modoOrganizacao === 'direto' || config.modoOrganizacao === 'ambos') {
        caminhos.direto = config.diretorioDownload;
    }

    if (config.modoOrganizacao === 'organizado' || config.modoOrganizacao === 'ambos') {
        caminhos.organizado = path.join(config.diretorioDownload, nomePasta);
        // Cria a pasta se não existir
        if (!fs.existsSync(caminhos.organizado)) {
            fs.mkdirSync(caminhos.organizado, { recursive: true });
        }
    }

    return caminhos;
}

class DownloadService {
    /**
     * Baixa um arquivo para os destinos configurados (direto, organizado ou ambos)
     * @param {string} url - URL do arquivo a baixar
     * @param {Object} caminhos - Caminhos de destino {direto, organizado}
     * @param {number} index - Índice do arquivo
     * @param {number} [maxRetries=3] - Número máximo de tentativas
     * @returns {Promise<Object>} Informações do arquivo baixado
     */
    async downloadArquivo(url, caminhos, index, maxRetries = 3) {
        const resultados = [];

        // Baixa para pasta direta se configurado
        if (caminhos.direto) {
            try {
                const resultado = await this.downloadFile(url, caminhos.direto, index, maxRetries);
                resultados.push({ tipo: 'direto', ...resultado });
            } catch (erro) {
                // Se o erro for FILE_EXISTS, não é um problema real
                if (erro.message !== 'FILE_EXISTS') {
                    throw erro;
                }
                resultados.push({ tipo: 'direto', jaExistia: true });
            }
        }

        // Baixa para pasta organizada se configurado
        if (caminhos.organizado) {
            try {
                const resultado = await this.downloadFile(url, caminhos.organizado, index, maxRetries);
                resultados.push({ tipo: 'organizado', ...resultado });
            } catch (erro) {
                // Se o erro for FILE_EXISTS, não é um problema real
                if (erro.message !== 'FILE_EXISTS') {
                    throw erro;
                }
                resultados.push({ tipo: 'organizado', jaExistia: true });
            }
        }

        return resultados;
    }

    /**
     * Baixa um arquivo com retry automático em caso de falha.
     * Implementa backoff exponencial entre tentativas.
     * 
     * @param {string} url - URL do arquivo a baixar
     * @param {string} pasta - Caminho da pasta de destino
     * @param {number} index - Índice do arquivo (usado como fallback para nome)
     * @param {number} [maxRetries=3] - Número máximo de tentativas
     * @returns {Promise<Object>} Informações do arquivo baixado
     * @returns {string} return.nome - Nome do arquivo salvo
     * @returns {number} return.tamanho - Tamanho em bytes
     * @throws {Error} Se todas as tentativas falharem
     */
    async downloadFile(url, pasta, index, maxRetries = 3) {
        // Loop de tentativas
        for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
            try {
                // Tenta fazer o download
                return await this._download(url, pasta, index);
                
            } catch (err) {
                // Erros que NÃO devem ser retentados:
                // - 404: Arquivo não existe
                // - FILE_EXISTS: Arquivo já baixado anteriormente
                if (err.message === "404" || err.message === "FILE_EXISTS") {
                    throw err;
                }

                // Se é a última tentativa, propaga o erro
                if (tentativa === maxRetries) {
                    throw err;
                }

                // Backoff exponencial: 2s, 4s, 8s
                // Aumenta o tempo de espera a cada tentativa
                const delayMs = Math.pow(2, tentativa) * 1000;
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    /**
     * Implementação interna do download de arquivo.
     * Gerencia o stream HTTPS e salva o arquivo no disco.
     * 
     * @private
     * @param {string} url - URL do arquivo
     * @param {string} pasta - Pasta de destino
     * @param {number} index - Índice do arquivo
     * @returns {Promise<Object>} Informações do arquivo
     */
    _download(url, pasta, index) {
        return new Promise((resolve, reject) => {
            // Faz requisição HTTPS GET
            https.get(url, (response) => {
                
                // === VALIDAÇÃO DE STATUS HTTP ===
                
                // 404: Arquivo não encontrado (fim dos arquivos da ata)
                if (response.statusCode === 404) {
                    reject(new Error("404"));
                    return;
                }

                // 429: Too Many Requests (excedeu rate limit)
                if (response.statusCode === 429) {
                    reject(new Error("RATE_LIMIT"));
                    return;
                }

                // Outros códigos que não sejam 200 (OK)
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP_${response.statusCode}`));
                    return;
                }

                // === EXTRAÇÃO DO NOME DO ARQUIVO ===
                
                // Nome padrão se não encontrar no header
                let nomeArquivo = `arquivo_${index}.pdf`;
                
                // Tenta extrair nome real do header Content-Disposition
                // Exemplo: Content-Disposition: attachment; filename="ata_123.pdf"
                const contentDisposition = response.headers["content-disposition"];

                if (contentDisposition && contentDisposition.includes("filename=")) {
                    // Regex para capturar nome com ou sem aspas
                    const match = contentDisposition.match(/filename="?([^";\n]+)"?/i);
                    if (match && match[1]) {
                        // Sanitiza o nome removendo caracteres inválidos
                        nomeArquivo = sanatizarNomeArquivo(match[1]);
                    }
                }

                // Captura tamanho do arquivo do header (se disponível)
                const fileSize = parseInt(response.headers["content-length"] || "0");
                const destino = path.join(pasta, nomeArquivo);

                // === VERIFICAÇÃO DE DUPLICATA ===
                
                // Se arquivo já existe, não baixa novamente
                if (fs.existsSync(destino)) {
                    reject(new Error("FILE_EXISTS"));
                    return;
                }

                // === SALVAMENTO DO ARQUIVO ===
                
                // Cria stream de escrita para o arquivo
                const file = fs.createWriteStream(destino);

                // Conecta stream de resposta HTTP ao stream de arquivo
                // Os dados chegam em chunks e são escritos incrementalmente
                response.pipe(file);

                // Evento disparado quando download completa
                file.on("finish", () => {
                    file.close(() => {
                        // Resolve a promise com informações do arquivo
                        resolve({
                            nome: nomeArquivo,
                            tamanho: fileSize
                        });
                    });
                });

                // Evento disparado em caso de erro na escrita
                file.on("error", (err) => {
                    // Remove arquivo parcial/corrompido
                    fs.unlink(destino, () => {});
                    reject(err);
                });
                
            // Evento disparado em caso de erro na requisição HTTP
            }).on("error", (err) => {
                reject(err);
            });
        });
    }
}

// Exporta instância única e função auxiliar
module.exports = new DownloadService();
module.exports.obterCaminhosDownload = obterCaminhosDownload;