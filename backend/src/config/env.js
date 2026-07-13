require('dotenv').config();

// Vars que precisam existir pra o processo subir. Validadas uma única
// vez, no boot — se faltar algo, o servidor nem tenta escutar a porta.
const REQUIRED_VARS = [
  'DATABASE_URL',
  'FRONTEND_URL',
  'BACKEND_URL',
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_WEBHOOK_SECRET',
  'META_PIXEL_ID',
  'META_ACCESS_TOKEN',
];

// URLs sem protocolo já causaram 3 bugs de produção diferentes nesta
// aplicação (metaPixel.js, CORS, notification_url do Mercado Pago) —
// todos silenciosos, só descobertos tentando reproduzir o problema na
// prática. Falhar aqui, alto e claro, no boot, é mais barato que isso.
const URL_VARS = ['FRONTEND_URL', 'BACKEND_URL'];

function validate() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}. Confira o .env contra o .env.example.`
    );
  }

  const malformed = URL_VARS.filter((key) => !/^https?:\/\//.test(process.env[key]));
  if (malformed.length > 0) {
    throw new Error(
      `Variáveis de ambiente com URL inválida (falta http:// ou https://): ${malformed.join(', ')}. ` +
        `Valor atual: ${malformed.map((key) => `${key}=${process.env[key]}`).join(', ')}`
    );
  }
}

validate();

// Barra final removida — evita URL duplamente barrada ao concatenar
// (ex: `${FRONTEND_URL}/obrigado.html`). Importa especialmente pra
// GitHub Pages project sites, onde FRONTEND_URL já vem com path
// (https://usuario.github.io/repo), não só um domínio raiz.
function stripTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  FRONTEND_URL: stripTrailingSlash(process.env.FRONTEND_URL),
  // URL pública deste backend — usada como notification_url nas
  // Preferences do Mercado Pago (Módulo 3 escuta em BACKEND_URL/webhook/mercadopago).
  BACKEND_URL: process.env.BACKEND_URL,

  DATABASE_URL: process.env.DATABASE_URL,

  MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
  MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,

  META_PIXEL_ID: process.env.META_PIXEL_ID,
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
  META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE || undefined,

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  isProduction: process.env.NODE_ENV === 'production',
};

module.exports = env;
