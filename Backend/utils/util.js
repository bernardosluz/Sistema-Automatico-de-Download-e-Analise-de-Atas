function limparTermoBusca(termo) {
  return termo.trim().replace(/[^a-zA-Z0-9\s-]/g, '');
}

function aguardar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  limparTermoBusca,
  aguardar
};