// =============================================================================
// UTILITÁRIOS DE FORMATAÇÃO
// =============================================================================

/**
 * Normaliza ID da ata para comparação
 * Remove espaços, converte para lowercase
 * @param {string} idAta - ID da ata
 * @returns {string} ID normalizado
 */
function normalizarIdAta(idAta) {
  if (!idAta) return '';
  return idAta.trim().toLowerCase().replace(/\s+/g, '');
}

function formatarData(data) {
  if (!data || data === 'N/A') return 'N/A';
  
  try {
    return new Date(data).toLocaleDateString('pt-BR');
  } catch (erro) {
    return data;
  }
}

function formatarValor(valor) {
  if (!valor || valor === 0) return '0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}

function formatarCnpj(cnpj) {
  if (!cnpj) return 'N/A';
  
  // Remove caracteres não numéricos
  const numeros = cnpj.replace(/\D/g, '');
  
  // Formata: 00.000.000/0000-00
  if (numeros.length === 14) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    );
  }
  
  return cnpj;
}

function formatarCpf(cpf) {
  if (!cpf) return 'N/A';
  
  // Remove caracteres não numéricos
  const numeros = cpf.replace(/\D/g, '');
  
  // Formata: 000.000.000-00
  if (numeros.length === 11) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    );
  }
  
  return cpf;
}

function formatarTelefone(telefone) {
  if (!telefone) return 'N/A';
  
  // Remove caracteres não numéricos
  const numeros = telefone.replace(/\D/g, '');
  
  // Formata: (00) 0000-0000 ou (00) 00000-0000
  if (numeros.length === 10) {
    return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (numeros.length === 11) {
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return telefone;
}

module.exports = {
  normalizarIdAta,
  formatarData,
  formatarValor,
  formatarCnpj,
  formatarCpf,
  formatarTelefone
};