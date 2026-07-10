const crypto = require('crypto');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

// Meta exige só dígitos, com DDI. Números BR sem DDI têm 10 (fixo) ou
// 11 dígitos (celular com o 9); com DDI (55) têm 12 ou 13 — só
// prefixa quando o tamanho bate com "sem DDI" (checar por tamanho, e
// não por já começar com "55", evita prefixar errado um número cujo
// DDD real é 55, ex: região de Santa Maria/RS).
function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

// user_data do Meta CAPI exige PII em SHA-256 (lowercase/trim pro
// e-mail, só dígitos com DDI pro telefone) antes de sair do servidor.
function hashEmail(email) {
  if (!email) return undefined;
  return sha256(normalizeEmail(email));
}

function hashPhone(phone) {
  if (!phone) return undefined;
  return sha256(normalizePhone(phone));
}

function hashExternalId(id) {
  if (!id) return undefined;
  return sha256(String(id).trim().toLowerCase());
}

module.exports = { sha256, hashEmail, hashPhone, hashExternalId };
