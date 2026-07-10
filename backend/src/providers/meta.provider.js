const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

// v18/v19 já expiraram (jan/mai 2026) — Meta exige v22.0 ou superior.
const GRAPH_API_VERSION = 'v22.0';

const client = axios.create({
  baseURL: `https://graph.facebook.com/${GRAPH_API_VERSION}`,
  timeout: 8000,
});

class MetaProviderError extends Error {
  constructor(message, { statusCode = 502, cause } = {}) {
    super(message);
    this.name = 'MetaProviderError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.cause = cause;
  }
}

// Único ponto que fala com a Graph API. `events` é sempre um array
// (o formato da API), mesmo pra 1 evento só.
async function sendEvents(events) {
  const body = {
    data: events,
    ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}),
  };

  try {
    const { data } = await client.post(`/${env.META_PIXEL_ID}/events`, body, {
      params: { access_token: env.META_ACCESS_TOKEN },
    });
    return data;
  } catch (err) {
    // NUNCA logar o erro do axios inteiro — err.config/err.request
    // carregam a URL completa da chamada, e o access_token vai nela
    // como query param. Só os campos já parseados/seguros.
    const status = err.response ? err.response.status : undefined;
    const metaError = err.response && err.response.data ? err.response.data.error : undefined;
    const isNetworkError = !err.response;

    logger.error(
      { status, metaError, isNetworkError, code: err.code },
      'Falha ao enviar evento para o Meta Conversion API'
    );

    if (status >= 400 && status < 500) {
      throw new MetaProviderError('Falha ao enviar evento para a Meta (requisição rejeitada).', {
        statusCode: 422,
        cause: metaError,
      });
    }

    throw new MetaProviderError('Meta Conversion API indisponível no momento.', {
      statusCode: 502,
      cause: metaError,
    });
  }
}

module.exports = { sendEvents, MetaProviderError };
