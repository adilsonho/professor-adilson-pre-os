// Remove caracteres de controle (inclusive null bytes) de texto livre
// vindo do cliente. De propósito NÃO escapamos HTML aqui — o dado é
// guardado como texto puro e hoje não existe nenhuma tela que
// renderize isso como HTML; escapar na entrada só corromperia nomes
// legítimos (ex: "O'Brien" virando "O&#x27;Brien" no Mercado Pago).
// Sanitização de saída é responsabilidade de quem um dia renderizar
// isso como HTML — não deste ponto de entrada.
function stripControlChars(value) {
  if (typeof value !== 'string') return value;
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

module.exports = { stripControlChars };
