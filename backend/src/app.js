const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const pinoHttp = require('pino-http');

const env = require('./config/env');
const logger = require('./utils/logger');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimiters');

const app = express();

// Railway (e qualquer host atrás de proxy/load balancer) entrega a
// requisição já repassada — sem isso, req.ip é sempre o IP interno
// do proxy, não o do comprador. Isso importa desde já: o Payment
// guarda `ip` pra reaproveitar no client_ip_address do Meta CAPI
// (Módulo 4) e os rate limiters abaixo dependem de req.ip real.
app.set('trust proxy', 1);

// O header Origin que o navegador manda é sempre só scheme+host+port
// — nunca inclui path. FRONTEND_URL pode ter path (GitHub Pages
// project site: https://usuario.github.io/repo) porque também é
// usado pra montar os back_urls do Mercado Pago — então derivamos só
// o origin daqui pra CORS, em vez de comparar a URL inteira (isso
// bloquearia 100% das requisições reais quando FRONTEND_URL tem path).
const frontendOrigin = new URL(env.FRONTEND_URL).origin;

app.use(helmet());
app.use(cors({ origin: frontendOrigin }));
app.use(compression());
// Nenhum payload legítimo (checkout, analytics, webhook do Mercado
// Pago) chega perto disso — limite explícito em vez do default.
app.use(express.json({ limit: '20kb' }));

// Access log — usa o mesmo logger estruturado do resto da aplicação
// (em vez de Morgan + pipe, como no rascunho inicial). Cada linha já
// sai com um request-id próprio (req.id), o que permite correlacionar
// múltiplas requisições no mesmo log em produção.
app.use(pinoHttp({ logger }));

app.use(generalLimiter);

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
