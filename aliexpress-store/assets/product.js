// דפי מוצר וקטגוריה סטטיים: שיתוף, מדידת קליקים וסימון sub-id לקישור השותפים.
(function () {
  'use strict';

  var CFG = window.SHOP_CONFIG || {};

  function track(kind, id, title) {
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return;
    var numericId = Number(id);
    var payload = {
      product_id: Number.isFinite(numericId) ? numericId : null,
      product_title: String(title || '').slice(0, 200),
      kind: kind,
      source: String(location.pathname).slice(0, 120)
    };
    try {
      fetch(CFG.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/shop_clicks', {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: CFG.SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload)
      }).catch(function () {});
    } catch (e) {}
  }

  function pageUrl() {
    var canonical = document.querySelector('link[rel="canonical"]');
    return canonical && canonical.href ? canonical.href : location.href;
  }

  function message(button, text) {
    if (!button) return;
    if (!button.dataset.original) button.dataset.original = button.textContent;
    button.textContent = text;
    setTimeout(function () { button.textContent = button.dataset.original; }, 2200);
  }

  async function share(button) {
    var url = pageUrl();
    var title = button.getAttribute('data-title') || document.title;
    if (navigator.share) {
      try {
        await navigator.share({ title: title, text: title, url: url });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      message(button, 'הקישור הועתק');
    } catch (e) {
      message(button, 'העתיקו מהשורת כתובת');
    }
  }

  var buyButtons = document.querySelectorAll('[data-buy]');
  buyButtons.forEach(function (link) {
    link.addEventListener('click', function () {
      track('buy', link.getAttribute('data-id'), document.querySelector('h1') ? document.querySelector('h1').textContent : document.title);
    });
  });

  document.querySelectorAll('[data-share]').forEach(function (button) {
    button.addEventListener('click', function () { share(button); });
  });

  var pageProductId = document.body.getAttribute('data-product-id');
  if (pageProductId) {
    track('page', pageProductId, document.querySelector('h1') ? document.querySelector('h1').textContent : document.title);
  }
})();
