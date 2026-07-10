/**
 * Meta Pixel — Teacher Adilson landing page
 * Centralizes every fbq() call for the funnel below so events stay
 * consistent across pages and dedup correctly against the backend's
 * server-side Meta Conversion API (Módulo 4).
 *
 * Funnel:
 *   PageView -> ViewContent/ViewPricing (#planos in view)
 *   -> SelectPlan (clique no plano) -> InitiateCheckout (submit do form)
 *   -> Mercado Pago checkout -> obrigado.html -> Purchase
 *
 * Purchase safety: trackPurchase() exige um objeto de confirmação com
 * status === 'approved' E um eventId explícito — o mesmo fbEventId
 * que o backend devolve em GET /payment/:ref, o mesmo que o webhook já
 * usou pra mandar esse Purchase pro Meta CAPI server-side. Nunca lemos
 * o status de query param do Mercado Pago (?collection_status=) —
 * isso pode ser forjado só editando a URL. obrigado.html consulta o
 * backend antes de chamar isto.
 *
 * Lead NUNCA é disparado pelo browser — só o servidor manda Lead pro
 * Meta CAPI (Módulo 3/4). Não existe trackLead() aqui de propósito.
 *
 * Debug: append ?pixel_debug=1 to any URL to log every event to the
 * console (persists across pages via localStorage). Use ?pixel_debug=0
 * to turn it back off. Pair with the Meta Pixel Helper browser
 * extension and the Test Events tab in Meta Events Manager.
 */
(function (window) {
  'use strict';

  var PIXEL_ID = '871942722527879';

  // ALTERAR AQUI ANTES DO DEPLOY — URL pública do backend.
  var API_BASE_URL = 'https://professor-adilson-pre-os-production.up.railway.app';
  if (!/^https?:\/\//.test(API_BASE_URL)) {
    console.error('[Meta Pixel] API_BASE_URL sem protocolo (http/https) — todo fetch vai resolver como URL relativa e falhar: "' + API_BASE_URL + '"');
  }

  // Populado via GET /plans (config/plans.js é a fonte única de
  // verdade — nada aqui hardcoda preço). PLANS fica vazio até a
  // promise `plansLoaded` resolver; código que precisa dos planos
  // deve aguardá-la.
  var PLANS = {};
  var plansLoaded = fetch(API_BASE_URL + '/plans')
    .then(function (res) { return res.json(); })
    .then(function (plans) {
      plans.forEach(function (plan) {
        PLANS[plan.id] = { name: plan.name, value: plan.price, contentId: plan.id };
      });
    })
    .catch(function (err) {
      console.warn('[Meta Pixel] Falha ao carregar /plans — preços indisponíveis.', err);
    });

  var DEBUG = (function () {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('pixel_debug') === '1') localStorage.setItem('pixel_debug', '1');
      if (params.get('pixel_debug') === '0') localStorage.removeItem('pixel_debug');
      return localStorage.getItem('pixel_debug') === '1';
    } catch (e) {
      return false;
    }
  })();

  function log(eventName, payload, eventId) {
    if (!DEBUG) return;
    console.log('%c[Meta Pixel] ' + eventName, 'color:#1877F2;font-weight:bold;', {
      payload: payload,
      eventID: eventId
    });
  }

  // Unique per-event ID. Para PageView/ViewContent/ViewPricing/
  // SelectPlan/InitiateCheckout não existe contraparte server-side
  // pra dedupar (só existem no browser), então um ID aleatório é
  // suficiente. Purchase é diferente — usa o fbEventId vindo do
  // backend, nunca este gerador (ver trackPurchase).
  function generateEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
  }

  // ---------------- UTM / cookies / funil próprio ----------------

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  // Único lugar que lê UTMs da URL e cookies _fbp/_fbc — reusado
  // tanto pro beacon de /analytics quanto pelo checkout (index.html)
  // ao montar o payload de POST /checkout.
  function getTrackingParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      utmTerm: params.get('utm_term') || undefined,
      utmContent: params.get('utm_content') || undefined,
      fbclid: params.get('fbclid') || undefined,
      gclid: params.get('gclid') || undefined,
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc')
    };
  }

  // Eventos de topo de funil que só existem no browser — os únicos
  // que POST /analytics aceita (o backend rejeita qualquer outro,
  // de propósito). InitiateCheckout/Purchase/Lead são gravados pelo
  // servidor (checkout.service.js / webhook.service.js).
  var ANALYTICS_EVENTS = ['PageView', 'ViewContent', 'ViewPricing', 'SelectPlan'];

  function sendAnalyticsBeacon(eventName, eventId, planKey) {
    if (ANALYTICS_EVENTS.indexOf(eventName) === -1) return;
    var tracking = getTrackingParams();
    fetch(API_BASE_URL + '/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventName: eventName,
        eventId: eventId,
        planId: planKey || undefined,
        utmSource: tracking.utmSource,
        utmMedium: tracking.utmMedium,
        utmCampaign: tracking.utmCampaign,
        fbclid: tracking.fbclid,
        fbp: tracking.fbp,
        fbc: tracking.fbc
      })
    }).catch(function () {
      // Falha silenciosa — perde só uma linha no funil próprio; o
      // Pixel de verdade (fbq) já disparou independente disso.
    });
  }

  function fire(method, eventName, payload, explicitEventId, planKey) {
    var eventId = explicitEventId || generateEventId();
    if (typeof window.fbq !== 'function') {
      console.warn('[Meta Pixel] fbq não carregado — evento "' + eventName + '" não foi enviado ao Pixel (mas o funil próprio ainda registra).');
    } else {
      window.fbq(method, eventName, payload || {}, { eventID: eventId });
    }
    log(eventName, payload, eventId);
    sendAnalyticsBeacon(eventName, eventId, planKey);
    return eventId;
  }

  var CONTENT_CATEGORY = 'English Course';

  function getPlan(planKey) {
    var plan = PLANS[planKey];
    if (!plan) {
      console.warn('[Meta Pixel] Plano desconhecido ou ainda não carregado: "' + planKey + '". Evento não enviado.');
      return null;
    }
    return plan;
  }

  // ---------------- Standard Meta events ----------------

  function trackPageView() {
    return fire('track', 'PageView', {});
  }

  function trackViewContent() {
    return fire('track', 'ViewContent', {
      content_name: 'Planos de Inglês',
      content_category: CONTENT_CATEGORY
    });
  }

  function trackInitiateCheckout(planKey) {
    var plan = getPlan(planKey);
    if (!plan) return null;
    return fire('track', 'InitiateCheckout', {
      content_name: 'Plano ' + plan.name,
      content_category: CONTENT_CATEGORY,
      content_ids: [plan.contentId],
      content_type: 'product',
      value: plan.value,
      currency: 'BRL'
    });
  }

  // eventId é OBRIGATÓRIO e precisa ser o Payment.fbEventId devolvido
  // por GET /payment/:ref — nunca um UUID gerado aqui. É essa
  // igualdade que faz a Meta deduplicar contra o Purchase que o
  // webhook já mandou via CAPI (Módulo 4). confirmation.status
  // precisa ser exatamente 'approved', vindo da resposta do backend
  // — nunca de query param do Mercado Pago.
  function trackPurchase(planKey, confirmation, eventId) {
    confirmation = confirmation || {};
    if (typeof confirmation.status !== 'string' || confirmation.status.trim().toLowerCase() !== 'approved') {
      console.warn('[Meta Pixel] Purchase bloqueado — status recebido: "' + (confirmation.status || 'ausente') + '". Só dispara com status "approved" confirmado pelo backend.');
      return null;
    }
    if (!eventId) {
      console.warn('[Meta Pixel] Purchase bloqueado — eventId ausente. Precisa ser o fbEventId devolvido por GET /payment/:ref.');
      return null;
    }
    var plan = getPlan(planKey);
    if (!plan) return null;
    return fire('track', 'Purchase', {
      content_name: 'Plano ' + plan.name,
      content_category: CONTENT_CATEGORY,
      content_ids: [plan.contentId],
      content_type: 'product',
      value: plan.value,
      currency: 'BRL'
    }, eventId);
  }

  // ---------------- Custom events ----------------

  function trackViewPricing() {
    return fire('trackCustom', 'ViewPricing', {});
  }

  function trackSelectPlan(planKey) {
    var plan = getPlan(planKey);
    if (!plan) return null;
    return fire('trackCustom', 'SelectPlan', {
      content_name: 'Plano ' + plan.name,
      content_category: CONTENT_CATEGORY,
      content_ids: [plan.contentId],
      content_type: 'product',
      value: plan.value,
      currency: 'BRL'
    }, null, planKey);
  }

  // ---------------- Auto-binding genérico (independe de página) ----------------

  // Fires ViewContent + ViewPricing once, the first time #planos
  // scrolls into view (not on page load — the user needs to actually
  // see the pricing section). Só roda se a seção existir na página.
  function bindPricingSectionObserver() {
    var section = document.getElementById('planos');
    if (!section || !('IntersectionObserver' in window)) return;

    var fired = false;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !fired) {
          fired = true;
          trackViewContent();
          trackViewPricing();
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });

    observer.observe(section);
  }

  function init() {
    // O fbq('track','PageView') real já disparou no snippet inline do
    // <head> (padrão do Meta Pixel) — aqui só registramos a mesma
    // visita no funil próprio, sem duplicar o evento pro Meta.
    sendAnalyticsBeacon('PageView', generateEventId());

    bindPricingSectionObserver();

    if (DEBUG) {
      console.log('%c[Meta Pixel] Debug mode ON — eventos serão logados no console.', 'color:#1877F2;font-weight:bold;');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposto pra outras páginas (index.html monta o modal de checkout,
  // obrigado.html consulta GET /payment/:ref antes de chamar
  // trackPurchase).
  window.MetaPixelEvents = {
    PIXEL_ID: PIXEL_ID,
    API_BASE_URL: API_BASE_URL,
    PLANS: PLANS,
    plansLoaded: plansLoaded,
    generateEventId: generateEventId,
    getTrackingParams: getTrackingParams,
    trackPageView: trackPageView,
    trackViewContent: trackViewContent,
    trackViewPricing: trackViewPricing,
    trackSelectPlan: trackSelectPlan,
    trackInitiateCheckout: trackInitiateCheckout,
    trackPurchase: trackPurchase
  };
})(window);
