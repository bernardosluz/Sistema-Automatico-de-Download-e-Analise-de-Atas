/**
 * Analisa um ID de ata no formato PNCP
 * @param {string} idAta - ID no formato: CNPJ-MODALIDADE-NUMERO/ANO-SEQUENCIAL
 * @returns {Object} Partes do ID parseadas
 */
function analisarIdAta(idAta) {
    const padraoRegex = /^(\d+)-(\d+)-(\d+)\/(\d+)-(\d+)$/;
    const correspondencia = idAta.trim().match(padraoRegex);
    
    if (!correspondencia) {
        throw new Error(`Formato de ID inválido: ${idAta}`);
    }

    return {
        cnpj: correspondencia[1],
        modalidade: correspondencia[2],
        numeroCompra: String(parseInt(correspondencia[3], 10)),
        ano: correspondencia[4],
        sequencial: String(parseInt(correspondencia[5], 10))
    };
}

/**
 * Normaliza um ID de ata para formato canônico
 * @param {string} idAta - ID da ata para normalizar
 * @returns {string} ID normalizado
 */
function normalizarIdAta(idAta) {
    try {
        const partes = analisarIdAta(idAta);
        return `${partes.cnpj}-${partes.modalidade}-${partes.numeroCompra}/${partes.ano}-${partes.sequencial}`;
    } catch (erro) {
        return idAta;
    }
}

/**
 * Constrói a URL pública da página da ata no PNCP
 * @param {Object} partes - Partes do ID da ata
 * @returns {string} URL pública completa
 */
function construirUrlPublica(partes) {
    return `https://pncp.gov.br/app/atas/${partes.cnpj}/${partes.ano}/${partes.numeroCompra}/${partes.sequencial}`;
}

/**
 * Constrói URL de busca no PNCP com filtros
 * @param {Object} opcoes - Opções de busca
 * @returns {string} URL completa de busca
 */
function construirUrl(opcoes) {
    const {
        termoBusca = '',
        pagina = 1,
        tamanhoPagina = 10,
        status = 'vigente',
        UFs = [],
        esferas = [],
        orgaos = []
    } = opcoes;
    
    if (!termoBusca.trim()) {
        throw new Error('Termo de busca é obrigatório');
    }
    
    // Mapeamentos de valores para códigos da API
    const ESFERAS_CODIGOS = {
        'estadual': 'E',
        'municipal': 'M', 
        'distrital': 'D',
        'federal': 'F'
    };
    
    const STATUS_CODIGOS = {
        'vigente': 'vigente',
        'não vigente': 'nao_vigente',
        'nao vigente': 'nao_vigente'
    };

    const ORGAOS_CODIGOS = {
        'ministerio da justica e seguranca publica': '45877'
    };
    
    // Construir parâmetros da URL
    const parametros = [];
    
    // Parâmetros obrigatórios
    parametros.push(`q=${termoBusca}`);
    parametros.push(`pagina=${pagina}`);
    parametros.push(`tam_pagina=${tamanhoPagina}`);
    
    // Esferas (opcional)
    if (esferas.length > 0) {
        const codigosEsferas = esferas
            .map(esfera => ESFERAS_CODIGOS[esfera.toLowerCase()] || esfera)
            .join('|');
        parametros.push(`esferas=${encodeURIComponent(codigosEsferas)}`);
    }
    
    // UFs (opcional)
    if (UFs.length > 0) {
        const ufsUnidas = UFs.join('|');
        parametros.push(`ufs=${encodeURIComponent(ufsUnidas)}`);
    }

    // Status (opcional)
    if (status) {
        const codigoStatus = STATUS_CODIGOS[status.toLowerCase()] || status.toLowerCase();
        parametros.push(`status=${codigoStatus}`);
    }
    
    // Órgãos (opcional)
    if (orgaos.length > 0) {
        const codigosOrgaos = orgaos
            .map(orgao => ORGAOS_CODIGOS[orgao.toLowerCase()] || orgao)
            .join('|');
        parametros.push(`orgaos=${encodeURIComponent(codigosOrgaos)}`);
    }
    
    // Monta URL final
    return `https://pncp.gov.br/app/atas?${parametros.join('&')}`;
}

/**
 * Constrói a URL da API para baixar um arquivo específico da ata
 * Esta é a URL direta que retorna o arquivo PDF
 * 
 * Estrutura da API:
 * /orgaos/{CNPJ}/compras/{ANO}/{NUM_COMPRA}/atas/{SEQUENCIAL}/arquivos/{NUM_ARQUIVO}
 * 
 * @param {Object} partes - Componentes do ID parseado
 * @param {number} numeroArquivo - Número sequencial do arquivo (1, 2, 3...)
 * @returns {string} URL completa da API para download
 */
function construirUrlArquivo(partes, numeroArquivo) {
    return `https://pncp.gov.br/pncp-api/v1/orgaos/${partes.cnpj}/compras/${partes.ano}/${partes.numeroCompra}/atas/${partes.sequencial}/arquivos/${numeroArquivo}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    analisarIdAta,
    normalizarIdAta,
    construirUrlPublica,
    construirUrl,
    construirUrlArquivo
};