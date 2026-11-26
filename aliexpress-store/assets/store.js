(function () {
  'use strict';

  var CFG = window.SHOP_CONFIG || {};
  var HAS_SUPABASE = Boolean(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  var sb = HAS_SUPABASE ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

  var FAV_KEY = 'shelf_favorites_v1';
  var PREF_KEY = 'shelf_preferences_v1';
  var NEWSLETTER_KEY = 'shelf_newsletter_v1';
  var PAGE_SIZE = 18;
  var CATEGORIES = ['בית ומטבח', 'גאדג׳טים', 'ארגון ואחסון', 'רכב', 'טיפוח ופנאי', 'כלי עבודה'];
  var CATEGORY_SLUGS = {
    'בית ומטבח': 'home-kitchen',
    'גאדג׳טים': 'gadgets',
    'ארגון ואחסון': 'storage',
    'רכב': 'car',
    'טיפוח ופנאי': 'care',
    'כלי עבודה': 'tools'
  };
  var DEFAULT_PREFS = { category: 'הכל', sort: 'newest', max_price: 0 };
  var PRICE_STEPS = [0, 50, 100, 200];

  // מילים נרדפות בסיסיות: לקוחות מחפשים בעברית, הקטלוג לרוב באנגלית
  var SYNONYMS = {
    'מטען': ['charger', 'charging', 'כבל'],
    'מטענים': ['charger', 'כבל'],
    'כבל': ['cable', 'cord'],
    'כבלים': ['cable', 'cord'],
    'מגבת': ['towel'],
    'מגבות': ['towel'],
    'מנורה': ['lamp', 'light'],
    'מנורות': ['lamp', 'light'],
    'תאורה': ['light', 'lamp'],
    'מטבח': ['kitchen'],
    'ארגון': ['organizer', 'storage'],
    'מארגן': ['organizer'],
    'אחסון': ['storage'],
    'אוזניות': ['headphone', 'earbuds'],
    'רמקול': ['speaker'],
    'שעון': ['watch'],
    'מברשת': ['brush'],
    'מברשות': ['brush'],
    'בקבוק': ['bottle'],
    'טלפון': ['phone'],
    'רכב': ['car'],
    'מחזיק': ['holder'],
    'סוללה': ['battery'],
    'נטען': ['usb', 'rechargeable'],
    'נטענת': ['usb', 'rechargeable'],
    'עבודה': ['work', 'desk'],
    'שולחן': ['desk', 'table'],
    'מסז׳ר': ['massager'],
    'מסאז׳': ['massager'],
    'כלי': ['tool'],
    'ערכה': ['set', 'kit'],
    'סט': ['set', 'kit'],
    'ניקוי': ['cleaning', 'clean'],
    'טיפוח': ['care'],
    'פנאי': ['leisure'],
    'גאדג׳ט': ['gadget'],
    'מאוורר': ['fan'],
    'בלנדר': ['blender'],
    'קומקום': ['kettle'],
    'סכין': ['knife'],
    'מגירה': ['drawer'],
    'מגירות': ['drawer']
  };

  var state = {
    products: [],
    favorites: new Set(),
    user: null,
    isAdmin: false,
    demo: !HAS_SUPABASE,
    query: '',
    category: 'הכל',
    view: 'all',
    sort: 'newest',
    maxPrice: 0,
    shown: PAGE_SIZE,
    seeded: false
  };

  var loggedSearches = {};
  var searchLogTimer = null;
  var lastFocused = null;

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function money(value) {
    var n = Number(value) || 0;
    return '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: n % 1 ? 2 : 0 });
  }

  function compactCount(value) {
    var n = Number(value) || 0;
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'K';
    return String(n);
  }

  function safeUrl(value) {
    var url = String(value || '').trim();
    if (/^https?:\/\//i.test(url)) return url;
    if (url.indexOf('//') === 0) return 'https:' + url;
    return '';
  }

  function discountOf(product) {
    var discount = Number(product.discount_percent) || 0;
    var original = Number(product.original_price) || 0;
    var price = Number(product.price) || 0;
    if (!discount && original > price && original > 0) {
      discount = Math.round((1 - price / original) * 100);
    }
    return discount;
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('timeout')); }, ms);
      })
    ]);
  }

  function toast(message) {
    var host = $('toastHost');
    if (!host) return;
    var node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    host.appendChild(node);
    setTimeout(function () { node.remove(); }, 2600);
  }

  /* ---------- חיפוש עברי ---------- */

  var NIQQUD = /[\u0591-\u05C7]/g;
  var FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  var HEB_PREFIXES = 'בהלומשכ';

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .replace(NIQQUD, '')
      .replace(/[ךםןףץ]/g, function (ch) { return FINALS[ch]; })
      .replace(/["'.,:;!?()[\]{}<>/\\|_+=*&^%$#@~`׳״]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenList(value) {
    return normalizeText(value).split(' ').filter(function (token) { return token.length > 0; });
  }

  // גזירה בסיסית בעברית: מנורה/מנורת → מנור, מברשות/מברשת → מברש
  function stem(token) {
    if (token.length < 4) return token;
    if (token.length >= 5 && /(יות|ות|ים)$/.test(token)) return token.replace(/(יות|ות|ים)$/, '');
    if (/(ה|ת)$/.test(token)) return token.slice(0, -1);
    return token;
  }

  // צורות חיפוש של מילה; בטקסט של המוצר מוסיפים גם גזירה של תחיליות (ו, ה, ב, ל, מ, ש, כ)
  function variantForms(token, includePrefixes) {
    var forms = [token, stem(token)];
    if (!includePrefixes) return forms;
    var current = token;
    var guard = 0;
    while (current.length > 3 && HEB_PREFIXES.indexOf(current.charAt(0)) !== -1 && guard < 3) {
      current = current.slice(1);
      forms.push(current, stem(current));
      guard += 1;
    }
    return forms;
  }

  function formSet(tokens, includePrefixes) {
    var set = {};
    tokens.forEach(function (token) {
      variantForms(token, includePrefixes).forEach(function (form) {
        if (form.length >= 2) set[form] = true;
      });
    });
    return set;
  }

  function hasForm(set, form) {
    if (set[form]) return true;
    if (form.length < 3) return false;
    var keys = Object.keys(set);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (key.length >= 3 && (key.indexOf(form) === 0 || form.indexOf(key) === 0)) return true;
    }
    return false;
  }

  var SYNONYM_INDEX = {};
  Object.keys(SYNONYMS).forEach(function (key) {
    var forms = variantForms(normalizeText(key), false);
    forms.forEach(function (form) {
      if (!form) return;
      SYNONYM_INDEX[form] = (SYNONYM_INDEX[form] || []).concat(SYNONYMS[key]);
    });
  });

  function searchScore(product, queryTokens) {
    var hay = formSet(tokenList([product.title, product.description, product.why, product.category].join(' ')), true);
    var title = formSet(tokenList(product.title), true);
    var score = 0;

    for (var i = 0; i < queryTokens.length; i += 1) {
      var token = queryTokens[i];
      var forms = variantForms(token, false);
      var synonyms = (SYNONYM_INDEX[token] || []).concat(SYNONYM_INDEX[stem(token)] || []);
      synonyms.forEach(function (word) {
        forms = forms.concat(variantForms(normalizeText(word), false));
      });

      var hit = false;
      for (var f = 0; f < forms.length && !hit; f += 1) {
        if (hasForm(title, forms[f])) { score += 3; hit = true; }
        else if (hasForm(hay, forms[f])) { score += 1; hit = true; }
      }
      if (!hit) return 0;
    }
    return score;
  }

  /* ---------- קישורים ותמונות ---------- */

  function categorySlug(name) {
    var key = String(name || '').trim();
    if (CATEGORY_SLUGS[key]) return CATEGORY_SLUGS[key];
    var hash = 0;
    for (var i = 0; i < key.length; i += 1) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
    return 'cat-' + Math.abs(hash).toString(36).slice(0, 8);
  }

  function categoryPath(name) {
    return name === 'הכל' ? 'index.html' : 'c/' + categorySlug(name) + '/';
  }

  function productPath(product) {
    return 'p/' + encodeURIComponent(String(product.id)) + '/';
  }

  function productPageUrl(product) {
    try { return new URL(productPath(product), location.href).href; } catch (e) { return location.href; }
  }

  function affiliateLink(product) {
    var url = safeUrl(product.affiliate_url);
    if (!url) return '';
    try {
      var parsed = new URL(url);
      if (!parsed.searchParams.get('sub_id')) parsed.searchParams.set('sub_id', String(product.sub_id || product.id));
      return parsed.toString();
    } catch (e) {
      return url;
    }
  }

  // באליאקספרס סיומת שינוי הגודל נדבקת אחרי שם הקובץ: name.jpg_640x640.jpg
  function originalImageUrl(raw) {
    return safeUrl(raw)
      .replace(/_\.webp$/i, '')
      .replace(/_(\d+)x(\d+)(q\d+)?\.(jpe?g|png|webp)$/i, '.$4');
  }

  function imageVariants(raw) {
    var src = originalImageUrl(raw);
    if (!src) return { src: '', srcset: '' };
    var match = /^(https?:\/\/[^/]+\/.+)(\.(?:jpe?g|png|webp))$/i.exec(src);
    if (!match || !/(alicdn\.com|aliexpress-media\.com)/i.test(match[1])) return { src: src, srcset: '' };
    var ext = match[2];
    return {
      src: src + '_640x640' + ext,
      srcset: src + '_300x300' + ext + ' 300w, ' + src + '_640x640' + ext + ' 640w'
    };
  }

  function imageTag(product, sizes, loading) {
    var raw = approvedImages(product)[0] || '';
    var image = imageVariants(raw);
    if (!image.src) return '<div class="img-missing">אין תמונה</div>';
    var fallback = originalImageUrl(raw);
    return '<img src="' + esc(image.src) + '"' +
      (image.srcset ? ' srcset="' + esc(image.srcset) + '" sizes="' + esc(sizes) + '"' : '') +
      ' alt="' + esc(product.title) + '" width="300" height="300" loading="' + (loading || 'lazy') + '" decoding="async" referrerpolicy="no-referrer"' +
      ' onerror="if(this.dataset.fb){this.parentElement.classList.add(\'no-img\');this.remove();}else{this.dataset.fb=\'1\';this.removeAttribute(\'srcset\');this.src=\'' + esc(fallback) + '\';}" />';
  }

  // הדירוג מגיע מאליאקספרס כאחוז דירוגים חיוביים (97.5), לא ככוכבים
  function ratingPercentValue(product) {
    var n = Number(product.rating) || 0;
    if (!n) return 0;
    return n <= 5 ? n * 20 : n;
  }

  function ratingLabel(product) {
    var n = ratingPercentValue(product);
    if (!n) return '';
    return n.toFixed(1).replace(/\.0$/, '') + '% חיוביים';
  }

  function shippingLabel(product) {
    var n = Number(product.shipping_days) || 0;
    return n ? 'משלוח ' + n + '–' + (n + 6) + ' ימים' : 'זמן משלוח לא צוין — לפי דף אליאקספרס';
  }

  // רק תמונות שאושרו בממשק הניהול מוצגות בציבור
  function approvedImages(product) {
    var list = Array.isArray(product.images) ? product.images : [];
    var urls = [];
    list.forEach(function (img) {
      var url = safeUrl(img && img.url);
      if (img && img.approved && url && urls.indexOf(url) === -1) urls.push(url);
    });
    var main = safeUrl(product.image_url);
    if (!urls.length && !list.length && main) urls.push(main);
    return urls;
  }

  /* ---------- מדידת קליקים ---------- */

  function trackClick(product, kind) {
    if (!sb || !product) return;
    try {
      sb.from('shop_clicks').insert({
        product_id: Number(product.id) || null,
        product_title: String(product.title || '').slice(0, 200),
        kind: kind,
        source: String((state.category || '') + '|' + (state.query || '')).slice(0, 120)
      }).then(function () {}, function () {});
    } catch (e) {}
  }

  function logEmptySearch(query) {
    if (!sb) return;
    var key = normalizeText(query);
    if (key.length < 2 || loggedSearches[key]) return;
    clearTimeout(searchLogTimer);
    searchLogTimer = setTimeout(function () {
      loggedSearches[key] = true;
      try {
        sb.from('shop_searches').insert({ query: String(query).slice(0, 80), results_count: 0 })
          .then(function () {}, function () {});
      } catch (e) {}
    }, 1200);
  }

  /* ---------- מודלים ---------- */

  function focusable(overlay) {
    return Array.prototype.slice
      .call(overlay.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function openModal(id) {
    var el = $(id);
    if (!el) return;
    if (el.classList.contains('hidden')) lastFocused = document.activeElement;
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    var first = el.querySelector('[data-close]') || focusable(el)[0];
    if (first) setTimeout(function () { first.focus(); }, 20);
  }

  function closeModal(id) {
    var el = $(id);
    if (!el) return;
    el.classList.add('hidden');
    if (!document.querySelector('.overlay:not(.hidden)')) {
      document.body.style.overflow = '';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }
  }

  function trapTab(event) {
    var overlays = document.querySelectorAll('.overlay:not(.hidden)');
    var overlay = overlays[overlays.length - 1];
    if (!overlay) return;
    var items = focusable(overlay);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ---------- מועדפים והעדפות ---------- */

  function readGuestFavorites() {
    try {
      var raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(String) : [];
    } catch (e) { return []; }
  }

  function writeGuestFavorites() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(state.favorites))); } catch (e) {}
  }

  function readGuestPrefs() {
    try {
      var raw = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
      return raw && typeof raw === 'object' ? raw : null;
    } catch (e) { return null; }
  }

  function allCategories() {
    var found = new Set(CATEGORIES);
    state.products.forEach(function (p) { if (p.category) found.add(p.category); });
    return Array.from(found);
  }

  function approvedProducts() {
    return state.products.filter(function (p) { return (p.status || 'approved') === 'approved'; });
  }

  function visibleProducts() {
    var list = approvedProducts();
    if (state.view === 'favorites') {
      list = list.filter(function (p) { return state.favorites.has(String(p.id)); });
    }
    if (state.category && state.category !== 'הכל') {
      list = list.filter(function (p) { return p.category === state.category; });
    }
    if (state.maxPrice > 0) {
      list = list.filter(function (p) { return Number(p.price) <= state.maxPrice; });
    }

    var queryTokens = state.query ? tokenList(state.query) : [];
    if (queryTokens.length) {
      list = list
        .map(function (product) { return { product: product, score: searchScore(product, queryTokens) }; })
        .filter(function (entry) { return entry.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .map(function (entry) { return entry.product; });
    }

    var sorted = list.slice();
    if (queryTokens.length) return sorted;
    if (state.sort === 'price_asc') sorted.sort(function (a, b) { return Number(a.price) - Number(b.price); });
    else if (state.sort === 'price_desc') sorted.sort(function (a, b) { return Number(b.price) - Number(a.price); });
    else if (state.sort === 'popular') sorted.sort(function (a, b) { return (Number(b.orders) || 0) - (Number(a.orders) || 0); });
    else sorted.sort(function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
    return sorted;
  }

  function renderCategories() {
    var host = $('categoryList');
    var approved = approvedProducts();
    var counts = {};
    approved.forEach(function (p) {
      var name = p.category || 'כללי';
      counts[name] = (counts[name] || 0) + 1;
    });

    var items = ['הכל'].concat(Object.keys(counts).sort(function (a, b) { return a.localeCompare(b, 'he'); }));
    host.innerHTML = items.map(function (name) {
      var count = name === 'הכל' ? approved.length : counts[name];
      return '<a class="cat-item' + (state.category === name ? ' active' : '') + '" href="' + esc(categoryPath(name)) + '" data-category="' + esc(name) + '">' +
        '<span>' + esc(name) + '</span><em>' + count + '</em></a>';
    }).join('');
  }

  function renderPriceChips() {
    var host = $('priceChips');
    if (!host) return;

    if (!host.children.length) {
      host.innerHTML = PRICE_STEPS.map(function (step) {
        var label = step === 0 ? 'כל המחירים' : 'עד ' + money(step);
        return '<button type="button" class="price-chip" data-price="' + step + '">' + label + '</button>';
      }).join('');
    }

    Array.prototype.forEach.call(host.querySelectorAll('[data-price]'), function (chip) {
      chip.setAttribute('aria-pressed', String(Number(chip.getAttribute('data-price')) === state.maxPrice));
    });
  }

  function cardHtml(p) {
    var id = String(p.id);
    var saved = state.favorites.has(id);
    var original = Number(p.original_price) || 0;
    var discount = discountOf(p);

    return '<article class="card">' +
      '<a class="card-link" href="' + esc(productPath(p)) + '" data-open="' + esc(id) + '">' +
        '<div class="card-media">' +
          imageTag(p, '(max-width: 560px) 45vw, 220px') +
          (discount >= 5 ? '<span class="badge">−' + discount + '%</span>' : '') +
        '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-title">' + esc(p.title) + '</h3>' +
          '<div class="price-line"><span class="price">' + money(p.price) + '</span>' +
            (original > Number(p.price) ? '<span class="old-price">' + money(original) + '</span>' : '') +
          '</div>' +
          '<div class="card-meta">' +
            (ratingPercentValue(p) ? '<span class="star">' + esc(ratingLabel(p)) + '</span>' : '') +
            (Number(p.orders) ? '<span>' + compactCount(p.orders) + ' הזמנות</span>' : '') +
          '</div>' +
        '</div>' +
      '</a>' +
      '<button type="button" class="fav" data-fav="' + esc(id) + '" aria-pressed="' + saved + '" aria-label="' + (saved ? 'הסרה מהשמורים' : 'שמירה') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9Z"/></svg>' +
      '</button>' +
    '</article>';
  }

  function renderGrid() {
    var grid = $('grid');
    var empty = $('empty');
    var list = visibleProducts();

    $('pageTitle').textContent = state.view === 'favorites' ? 'השמורים שלי' : (state.category === 'הכל' ? 'כל המוצרים' : state.category);

    var bits = [list.length + (list.length === 1 ? ' מוצר' : ' מוצרים')];
    if (state.maxPrice > 0) bits.push('עד ' + money(state.maxPrice));
    if (state.query) bits.push('עבור „' + state.query + '”');
    $('resultMeta').textContent = bits.join(' · ');

    $('favCount').textContent = String(state.favorites.size);

    if (!list.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      empty.textContent = state.view === 'favorites'
        ? 'עוד לא שמרת מוצרים. לחיצה על הלב שומרת אותם כאן.'
        : state.query
          ? 'לא נמצאו מוצרים לחיפוש הזה. נסו מילה אחרת או קטגוריה.'
          : 'לא נמצאו מוצרים שמתאימים לסינון.';
      if (state.query) logEmptySearch(state.query);
    } else {
      empty.classList.add('hidden');
      grid.innerHTML = list.slice(0, state.shown).map(cardHtml).join('');
    }

    updateLoadMore(list.length);

    document.querySelectorAll('.nav-item[data-view]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === state.view);
    });
    renderCategories();
    renderPriceChips();
  }

  // מציגים קודם רק את הראשונים, ואת השאר טוענים בגלילה או בלחיצה
  function updateLoadMore(total) {
    var btn = $('loadMore');
    if (!btn) return;
    var left = total - state.shown;
    if (left <= 0) {
      btn.classList.add('hidden');
      btn.textContent = 'עוד מוצרים';
      return;
    }
    btn.classList.remove('hidden');
    btn.textContent = 'עוד ' + left + ' מוצרים';
  }

  function showMore() {
    var list = visibleProducts();
    if (state.shown >= list.length) return;
    var next = list.slice(state.shown, state.shown + PAGE_SIZE);
    state.shown += next.length;
    $('grid').insertAdjacentHTML('beforeend', next.map(cardHtml).join(''));
    updateLoadMore(list.length);
  }

  function resetPaging() {
    state.shown = PAGE_SIZE;
    renderGrid();
  }

  function renderDemoNote() {
    var note = $('demoNote');
    if (!state.demo) { note.classList.add('hidden'); return; }
    note.classList.remove('hidden');
    note.textContent = HAS_SUPABASE
      ? 'מצב הדגמה: לא הצלחנו לקרוא מוצרים מהמסד. אם הטבלאות טרם נוצרו — הריצו את aliexpress_shop_schema.sql ב-Supabase.'
      : 'מצב הדגמה מקומי. חברו את Supabase בקובץ config.js כדי להציג מוצרים אמיתיים.';
  }

  function updateAccountUI() {
    var label = $('accountLabel');
    var avatar = $('accountAvatar');
    var adminLink = $('adminLink');
    if (state.user) {
      var email = state.user.email || '';
      label.textContent = email.split('@')[0];
      avatar.textContent = (email.charAt(0) || 'א').toUpperCase();
    } else {
      label.textContent = 'כניסה';
      avatar.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 19c.6-3.2 3.3-5 6.5-5s5.9 1.8 6.5 5"/></svg>';
    }
    adminLink.classList.toggle('hidden', !state.isAdmin);
  }

  function applyPreferences(prefs) {
    var saved = prefs || {};
    state.category = saved.category || DEFAULT_PREFS.category;
    state.sort = ['popular', 'price_asc', 'price_desc'].indexOf(saved.sort) === -1 ? DEFAULT_PREFS.sort : saved.sort;
    state.maxPrice = Math.max(0, Number(saved.max_price) || 0);
    $('sortSelect').value = state.sort;
    state.shown = PAGE_SIZE;
    renderGrid();
  }

  async function loadDemoProducts() {
    try {
      var res = await fetch('assets/demo-products.json', { cache: 'no-store' });
      if (!res.ok) return [];
      var rows = await res.json();
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      return [];
    }
  }

  // קובץ הזנקה שנבנה מראש: המוצרים הראשונים מוצגים מיד, בלי להמתין לשאילתת Supabase
  async function loadSeed() {
    if (state.products.length) return false;
    try {
      var res = await fetch('assets/latest-products.json', { cache: 'no-cache' });
      if (!res.ok) return false;
      var rows = await res.json();
      if (!Array.isArray(rows) || !rows.length) return false;
      state.products = rows;
      state.seeded = true;
      state.shown = PAGE_SIZE;
      renderGrid();
      return true;
    } catch (e) {
      return false;
    }
  }

  async function loadProducts() {
    if (!sb) {
      state.products = await loadDemoProducts();
      state.demo = true;
      renderDemoNote();
      return;
    }
    try {
      var res = await withTimeout(
        sb.from('shop_products')
          .select('id,title,description,why,image_url,images,category,price,original_price,discount_percent,rating,orders,shipping_days,affiliate_url,price_updated_at,created_at,status')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(300),
        10000
      );

      if (res.error) {
        // אם כבר הצגנו את קובץ ההזנקה — נשארים איתו ולא נופלים למצב הדגמה
        if (!state.seeded) {
          state.products = await loadDemoProducts();
          state.demo = true;
        }
        console.warn('[shop] products error:', res.error.message);
      } else {
        state.products = res.data || [];
        state.demo = false;
        state.shown = PAGE_SIZE;
      }
    } catch (err) {
      if (!state.seeded) {
        state.products = await loadDemoProducts();
        state.demo = true;
      }
    }
    renderDemoNote();
  }

  async function loadFavorites() {
    if (sb && state.user) {
      try {
        var res = await sb.from('shop_favorites').select('product_id');
        if (!res.error) {
          state.favorites = new Set((res.data || []).map(function (row) { return String(row.product_id); }));
          return;
        }
      } catch (e) {}
    }
    state.favorites = new Set(readGuestFavorites());
  }

  /* ---------- ניוזלטר ---------- */

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
  }

  function readNewsletterLocal() {
    try {
      var raw = JSON.parse(localStorage.getItem(NEWSLETTER_KEY) || 'null');
      return raw && raw.email ? raw : null;
    } catch (e) { return null; }
  }

  function saveNewsletterLocal(email) {
    try { localStorage.setItem(NEWSLETTER_KEY, JSON.stringify({ email: email, at: new Date().toISOString() })); } catch (e) {}
  }

  // רישום לדיוור. אימייל שכבר רשום נחשב להצלחה מבחינת הגולש.
  async function subscribeNewsletter(email, source) {
    var clean = String(email || '').trim().toLowerCase();
    if (!validEmail(clean)) return { ok: false, message: 'כתובת האימייל אינה תקינה.' };
    if (!sb) { saveNewsletterLocal(clean); return { ok: true }; }
    try {
      var row = { email: clean, consent: true, source: source || 'site' };
      if (state.user && state.user.id) row.user_id = state.user.id;
      var res = await sb.from('shop_newsletter').insert(row);
      if (res.error && String(res.error.code) !== '23505') throw res.error;
      saveNewsletterLocal(clean);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: 'לא הצלחנו לרשום אותך כרגע. נסו שוב בעוד רגע.' };
    }
  }

  async function newsletterConsentFor(email) {
    if (!sb || !state.user || !email) return null;
    try {
      var res = await sb.from('shop_newsletter').select('email,consent').ilike('email', email).maybeSingle();
      if (res.error || !res.data) return null;
      return Boolean(res.data.consent);
    } catch (e) { return null; }
  }

  async function setNewsletterConsent(email, consent) {
    if (!sb || !state.user) return { ok: true };
    try {
      var res = await sb.from('shop_newsletter').update({ consent: consent, updated_at: new Date().toISOString() }).ilike('email', email);
      if (res.error) throw res.error;
      if (!consent) { try { localStorage.removeItem(NEWSLETTER_KEY); } catch (e) {} }
      return { ok: true };
    } catch (e) {
      return { ok: false };
    }
  }

  function setNewsletterMessage(text, isError) {
    var msg = $('newsletterMsg');
    if (!msg) return;
    msg.textContent = text || '';
    msg.className = 'form-msg' + (text ? (isError ? ' error' : ' ok') : '');
  }

  function markNewsletterSubscribed() {
    var form = $('newsletterForm');
    if (form) form.classList.add('hidden');
    var saved = $('newsletterSaved');
    if (saved) saved.classList.remove('hidden');
  }

  async function submitNewsletterForm(event) {
    event.preventDefault();
    var input = $('newsletterEmail');
    if (!input) return;
    var btn = $('newsletterForm').querySelector('button');
    setNewsletterMessage('');
    if (btn) { btn.disabled = true; btn.textContent = 'רושם…'; }
    var result = await subscribeNewsletter(input.value, 'site');
    if (btn) { btn.disabled = false; btn.textContent = 'הרשמה'; }
    if (!result.ok) { setNewsletterMessage(result.message, true); return; }
    setNewsletterMessage('נרשמת! נעדכן אותך במוצרים החדשים.', false);
    markNewsletterSubscribed();
    toast('נרשמת לדיוור');
  }

  /* ---------- בקשת חיפוש מוצר אישית ---------- */

  function setRequestMessage(text, isError) {
    var msg = $('requestMsg');
    if (!msg) return;
    msg.textContent = text || '';
    msg.className = 'form-msg' + (text ? (isError ? ' error' : ' ok') : '');
  }

  function openRequestModal() {
    setRequestMessage('');
    var email = $('requestEmail');
    if (email && !email.value && state.user && state.user.email) email.value = state.user.email;
    openModal('requestModal');
  }

  async function submitProductRequest(event) {
    event.preventDefault();
    var query = $('requestQuery').value.trim();
    var email = $('requestEmail').value.trim().toLowerCase();
    var budget = Number($('requestBudget').value) || 0;
    var note = $('requestNote').value.trim();
    var btn = $('requestSubmit');

    if (query.length < 3) { setRequestMessage('כתבו מה אתם מחפשים (לפחות 3 תווים).', true); return; }
    if (email && !validEmail(email)) { setRequestMessage('כתובת האימייל אינה תקינה.', true); return; }

    setRequestMessage('');
    btn.disabled = true;
    btn.textContent = 'שולח…';

    var ok = true;
    if (sb) {
      try {
        var res = await sb.from('shop_requests').insert({
          email: email,
          product_query: query.slice(0, 300),
          budget: budget > 0 ? budget : 0,
          note: note.slice(0, 600)
        });
        if (res.error) throw res.error;
      } catch (err) {
        ok = false;
      }
    }

    btn.disabled = false;
    btn.textContent = 'שליחת הבקשה';

    if (!ok) { setRequestMessage('השליחה נכשלה. נסו שוב בעוד רגע.', true); return; }

    $('requestForm').reset();
    setRequestMessage('קיבלנו! נחפש עבורכם ונחזור' + (email ? ' למייל ' + email : ' עם קישור למוצר') + '.', false);
    toast('הבקשה נשלחה');
  }

  async function mergeGuestFavorites() {
    if (!sb || !state.user) return;
    var local = readGuestFavorites();
    if (!local.length) return;
    var rows = local
      .map(function (id) { return Number(id); })
      .filter(function (id) { return Number.isFinite(id); })
      .map(function (id) { return { user_id: state.user.id, product_id: id }; });
    try {
      if (rows.length) {
        await sb.from('shop_favorites').upsert(rows, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
      }
      localStorage.removeItem(FAV_KEY);
    } catch (e) {}
  }

  async function loadPreferences() {
    if (!sb || !state.user) return readGuestPrefs();
    try {
      var res = await sb.from('shop_preferences').select('category,sort,max_price').eq('user_id', state.user.id).maybeSingle();
      return res.error ? null : res.data;
    } catch (e) { return null; }
  }

  async function isAdmin() {
    if (!sb || !state.user) return false;
    try {
      var res = await sb.from('admins').select('email').eq('email', state.user.email).maybeSingle();
      return Boolean(res.data);
    } catch (e) { return false; }
  }

  async function toggleFavorite(id) {
    var key = String(id);
    var saved = state.favorites.has(key);

    if (saved) state.favorites.delete(key);
    else state.favorites.add(key);

    if (sb && state.user) {
      try {
        var res = saved
          ? await sb.from('shop_favorites').delete().eq('user_id', state.user.id).eq('product_id', Number(id))
          : await sb.from('shop_favorites').insert({ user_id: state.user.id, product_id: Number(id) });
        if (res.error) throw res.error;
      } catch (err) {
        if (saved) state.favorites.add(key);
        else state.favorites.delete(key);
        toast('לא הצלחנו לשמור. נסו שוב.');
        return;
      }
    } else {
      writeGuestFavorites();
    }

    renderGrid();
    if (!$('productModal').classList.contains('hidden')) updateProductFavorite(key);
  }

  function updateProductFavorite(key) {
    var btn = document.querySelector('[data-pv-fav]');
    if (!btn) return;
    var saved = state.favorites.has(key);
    btn.setAttribute('aria-pressed', String(saved));
    btn.textContent = saved ? 'שמור אצלי' : 'שמירה';
  }

  function findProduct(id) {
    return state.products.filter(function (p) { return String(p.id) === String(id); })[0];
  }

  function shareProduct(product) {
    var url = productPageUrl(product);
    if (navigator.share) {
      navigator.share({ title: product.title, text: product.title, url: url }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        copyLink(url);
      });
      return;
    }
    copyLink(url);
  }

  function copyLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        toast('הקישור הועתק');
      }, function () {
        toast('העתיקו את הקישור מהשורה למעלה');
      });
    } else {
      toast(url);
    }
  }

  function relatedHtml(product) {
    var related = approvedProducts()
      .filter(function (p) { return String(p.id) !== String(product.id) && p.category === product.category; })
      .slice(0, 4);
    if (!related.length) return '';
    return '<div class="pv-why" style="background:transparent;border:0;padding:0">' +
      '<h3>עוד ב' + esc(product.category || 'קטלוג') + '</h3>' +
      '<div class="pv-related">' + related.map(function (p) {
        var thumb = imageVariants(approvedImages(p)[0] || '');
        return '<button type="button" data-open="' + esc(p.id) + '">' +
          (thumb.src ? '<img src="' + esc(thumb.src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" />' : '') +
          '<span>' + esc(p.title) + '</span></button>';
      }).join('') + '</div></div>';
  }

  var pvGallery = [];
  var pvIndex = 0;
  var pvTitle = '';
  var zoomScale = 1;

  function pvMainImageHtml(url, title) {
    var image = imageVariants(url);
    if (!image.src) return '<div class="img-missing">אין תמונה</div>';
    return '<img id="pvMainImg" src="' + esc(image.src) + '"' +
      (image.srcset ? ' srcset="' + esc(image.srcset) + '" sizes="(max-width: 960px) 92vw, 420px"' : '') +
      ' alt="' + esc(title) + '" width="640" height="640" decoding="async" referrerpolicy="no-referrer" />';
  }

  function pvThumbsHtml(gallery, title) {
    if (gallery.length < 2) return '';
    return '<div class="pv-thumbs">' + gallery.map(function (url, index) {
      var image = imageVariants(url);
      return '<button type="button" class="pv-thumb' + (index === 0 ? ' active' : '') + '" data-thumb="' + esc(url) + '" aria-label="תמונה ' + (index + 1) + ' של ' + esc(title) + '">' +
        '<img src="' + esc(image.src || url) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></button>';
    }).join('') + '</div>';
  }

  function openProduct(id) {
    var product = findProduct(id);
    if (!product) return;

    var saved = state.favorites.has(String(product.id));
    var original = Number(product.original_price) || 0;
    var discount = discountOf(product);
    var link = affiliateLink(product);
    var updated = product.price_updated_at || product.updated_at;
    var gallery = approvedImages(product);
    pvGallery = gallery;
    pvIndex = 0;
    pvTitle = product.title;

    $('productBody').innerHTML =
      '<div class="modal-head">' +
        '<span class="pill">' + esc(product.category || 'מוצר') + '</span>' +
        '<button type="button" class="modal-close" data-close="productModal" aria-label="סגירה">×</button>' +
      '</div>' +
      '<div class="product-view">' +
        '<div class="pv-media">' +
          (gallery.length
            ? '<button type="button" class="pv-zoom" data-img-open aria-label="תצוגה מוגדלת של התמונה">' + pvMainImageHtml(gallery[0], product.title) + '</button>' + pvThumbsHtml(gallery, product.title)
            : '<div class="img-missing">אין תמונה</div>') +
        '</div>' +
        '<div class="pv-info">' +
          '<span class="pv-cat">' + esc(product.category || '') + '</span>' +
          '<h2 id="pvTitle">' + esc(product.title) + '</h2>' +
          (product.description ? '<p class="pv-desc">' + esc(product.description) + '</p>' : '') +
          '<div class="pv-price"><span class="price">' + money(product.price) + '</span>' +
            (original > Number(product.price) ? '<span class="old-price">' + money(original) + '</span>' : '') +
            (discount >= 5 ? '<span class="pill">−' + discount + '%</span>' : '') +
          '</div>' +
          '<div class="pv-meta">' +
            (ratingPercentValue(product) ? '<span>' + esc(ratingLabel(product)) + '</span>' : '') +
            (Number(product.orders) ? '<span>' + compactCount(product.orders) + ' הזמנות</span>' : '') +
            '<span>' + esc(shippingLabel(product)) + '</span>' +
          '</div>' +
          '<div class="pv-extra">' +
            (product.why ? '<div class="pv-why"><h3>למה בחרנו בזה</h3><p>' + esc(product.why) + '</p></div>' : '') +
            (updated ? '<p class="pv-share-note">המחיר עודכן: ' + esc(new Date(updated).toLocaleDateString('he-IL')) + '</p>' : '') +
            relatedHtml(product) +
          '</div>' +
          '<div class="pv-actions">' +
            (link ? '<a class="btn btn-primary" href="' + esc(link) + '" target="_blank" rel="nofollow sponsored noopener" data-buy="' + esc(product.id) + '">לצפייה באליאקספרס</a>' : '') +
            '<button type="button" class="btn" data-pv-fav="' + esc(product.id) + '" aria-pressed="' + saved + '">' + (saved ? 'שמור אצלי' : 'שמירה') + '</button>' +
            '<button type="button" class="btn" data-share-pv="' + esc(product.id) + '">שיתוף</button>' +
            '<a class="pv-open-link" href="' + esc(productPath(product)) + '">פתיחת הדף</a>' +
          '</div>' +
          '<p class="pv-share-note">קישור שותפים: ייתכן שנקבל עמלה, ללא תוספת מחיר.</p>' +
        '</div>' +
      '</div>';

    openModal('productModal');
  }

  /* ---------- תצוגת תמונה מוגדלת ---------- */

  function setZoom(scale) {
    zoomScale = Math.min(4, Math.max(1, scale));
    var img = $('imageViewerImg');
    if (img) {
      img.style.width = Math.round(zoomScale * 100) + '%';
      img.style.maxWidth = 'none';
    }
    var label = $('zoomLevel');
    if (label) label.textContent = Math.round(zoomScale * 100) + '%';
  }

  function openImageViewer(url, title) {
    var src = safeUrl(url);
    var img = $('imageViewerImg');
    if (!src || !img) return;
    img.src = src;
    img.alt = title || 'תמונת המוצר';
    setZoom(1);
    var stage = $('imgStage');
    if (stage) { stage.scrollTop = 0; stage.scrollLeft = 0; }
    openModal('imageModal');
  }

  function categoryOptionsHtml(selected) {
    return ['הכל'].concat(allCategories()).map(function (name) {
      return '<option value="' + esc(name) + '"' + (name === selected ? ' selected' : '') + '>' + esc(name) + '</option>';
    }).join('');
  }

  function renderGuestAccount() {
    $('accountBody').innerHTML =
      '<div class="auth-tabs" role="tablist">' +
        '<button type="button" class="auth-tab active" data-auth-tab="signin">התחברות</button>' +
        '<button type="button" class="auth-tab" data-auth-tab="signup">הרשמה</button>' +
      '</div>' +
      '<form id="authForm">' +
        '<div class="field"><label for="authEmail">אימייל</label>' +
          '<input type="email" id="authEmail" autocomplete="email" required /></div>' +
        '<div class="field"><label for="authPassword">סיסמה</label>' +
          '<input type="password" id="authPassword" minlength="6" autocomplete="current-password" required />' +
        '</div>' +
        '<label class="check-field hidden" id="newsletterOptIn">' +
          '<input type="checkbox" id="authNewsletter" />' +
          '<span>אני מאשר/ת לקבל מייל עם מוצרים חדשים והטבות מהמדף. אפשר להסיר בכל רגע.</span>' +
        '</label>' +
        '<button type="submit" class="btn btn-primary btn-full" id="authSubmit">התחברות</button>' +
        '<p class="form-note" style="margin-top:12px">המועדפים וההעדפות נשמרים בחשבון. בלי חשבון הם נשמרים במכשיר הזה.</p>' +
        '<p class="form-msg" id="authMsg"></p>' +
      '</form>';

    $('authForm').addEventListener('submit', submitAuth);
    document.querySelectorAll('[data-auth-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var mode = tab.getAttribute('data-auth-tab');
        document.querySelectorAll('[data-auth-tab]').forEach(function (t) { t.classList.toggle('active', t === tab); });
        $('authSubmit').textContent = mode === 'signup' ? 'יצירת חשבון' : 'התחברות';
        $('authPassword').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
        $('authForm').dataset.mode = mode;
        var optIn = $('newsletterOptIn');
        if (optIn) optIn.classList.toggle('hidden', mode !== 'signup');
        setAuthMessage('');
      });
    });
    $('authForm').dataset.mode = 'signin';
  }

  function setAuthMessage(text, isError) {
    var msg = $('authMsg');
    if (!msg) return;
    msg.textContent = text || '';
    msg.className = 'form-msg' + (text ? (isError ? ' error' : ' ok') : '');
  }

  function mapAuthError(message) {
    var m = String(message || '');
    if (/invalid login credentials/i.test(m)) return 'האימייל או הסיסמה שגויים.';
    if (/email not confirmed/i.test(m)) return 'צריך לאשר את החשבון במייל לפני הכניסה.';
    if (/already registered/i.test(m)) return 'המשתמש כבר רשום. נסו להתחבר.';
    if (/password should be at least/i.test(m)) return 'הסיסמה קצרה מדי (6 תווים לפחות).';
    if (/unable to validate email/i.test(m)) return 'כתובת האימייל אינה תקינה.';
    if (/failed to fetch|network/i.test(m)) return 'אין חיבור לשרת. בדקו את החיבור ונסו שוב.';
    return 'משהו לא עבד. נסו שוב בעוד רגע.';
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (!sb) { setAuthMessage('מצב הדגמה: אין חיבור ל-Supabase.', true); return; }

    var mode = $('authForm').dataset.mode || 'signin';
    var email = $('authEmail').value.trim();
    var password = $('authPassword').value;
    var btn = $('authSubmit');

    btn.disabled = true;
    btn.textContent = mode === 'signup' ? 'יוצר חשבון…' : 'מתחבר…';
    setAuthMessage('');

    try {
      if (mode === 'signup') {
        var wantsNewsletter = Boolean($('authNewsletter') && $('authNewsletter').checked);
        var signUp = await sb.auth.signUp({ email: email, password: password });
        if (signUp.error) {
          setAuthMessage(mapAuthError(signUp.error.message), true);
        } else {
          if (wantsNewsletter) await subscribeNewsletter(email, 'signup');
          if (signUp.data.session) {
            await applySession(signUp.data.session);
            closeModal('accountModal');
            toast(wantsNewsletter ? 'החשבון נוצר ונרשמת לדיוור' : 'החשבון נוצר');
          } else {
            setAuthMessage('נשלח אליך מייל לאישור החשבון. אחרי האישור אפשר להתחבר.' +
              (wantsNewsletter ? ' המייל שלך נרשם גם לדיוור המוצרים.' : ''), false);
          }
        }
      } else {
        var signIn = await sb.auth.signInWithPassword({ email: email, password: password });
        if (signIn.error) {
          setAuthMessage(mapAuthError(signIn.error.message), true);
        } else {
          await applySession(signIn.data.session);
          closeModal('accountModal');
          toast('התחברת בהצלחה');
        }
      }
    } catch (err) {
      setAuthMessage(mapAuthError(err && err.message), true);
    }

    btn.disabled = false;
    btn.textContent = mode === 'signup' ? 'יצירת חשבון' : 'התחברות';
  }

  function renderUserAccount() {
    var email = state.user.email || '';
    $('accountBody').innerHTML =
      '<div class="account-id">' +
        '<div class="avatar">' + esc((email.charAt(0) || 'א').toUpperCase()) + '</div>' +
        '<div><div class="email">' + esc(email) + '</div>' +
          '<div class="role">' + (state.isAdmin ? 'מנהל החנות' : 'לקוח') + '</div></div>' +
      '</div>' +
      '<p class="prefs-title">ההעדפות שלי</p>' +
      '<p class="prefs-sub">נשמרות בחשבון וקובעות מה יוצג בכניסה הבאה.</p>' +
      '<form id="prefsForm">' +
        '<div class="field"><label for="prefCategory">קטגוריה</label>' +
          '<select id="prefCategory">' + categoryOptionsHtml(state.category) + '</select></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="prefSort">מיון</label>' +
            '<select id="prefSort">' +
              '<option value="newest"' + (state.sort === 'newest' ? ' selected' : '') + '>החדשים ביותר</option>' +
              '<option value="popular"' + (state.sort === 'popular' ? ' selected' : '') + '>הנמכרים</option>' +
              '<option value="price_asc"' + (state.sort === 'price_asc' ? ' selected' : '') + '>מחיר: מהנמוך</option>' +
              '<option value="price_desc"' + (state.sort === 'price_desc' ? ' selected' : '') + '>מחיר: מהגבוה</option>' +
            '</select></div>' +
          '<div class="field"><label for="prefMaxPrice">מחיר מקסימלי (₪)</label>' +
            '<input type="number" id="prefMaxPrice" min="0" step="1" value="' + (state.maxPrice || '') + '" /></div>' +
        '</div>' +
        '<button type="submit" class="btn btn-primary btn-full">שמירת העדפות</button>' +
      '</form>' +
      '<div class="newsletter-box">' +
        '<p class="prefs-title">דיוור במייל</p>' +
        '<label class="check-field">' +
          '<input type="checkbox" id="accountNewsletter" />' +
          '<span>לקבל מייל על מוצרים חדשים והטבות</span>' +
        '</label>' +
        '<p class="form-note" id="accountNewsletterNote">אפשר להסיר בכל רגע, בלי לשאול שאלות.</p>' +
      '</div>' +
      (state.isAdmin ? '<a class="btn btn-full" style="margin-top:10px" href="admin.html">ניהול החנות</a>' : '') +
      '<div class="account-actions"><button type="button" class="btn" id="logoutBtn">התנתקות</button></div>';

    $('prefsForm').addEventListener('submit', savePreferences);
    $('logoutBtn').addEventListener('click', logout);
    initAccountNewsletter();
  }

  async function initAccountNewsletter() {
    var toggle = $('accountNewsletter');
    var note = $('accountNewsletterNote');
    if (!toggle || !state.user) return;
    var email = state.user.email || '';

    var consent = await newsletterConsentFor(email);
    if (consent === null) {
      var local = readNewsletterLocal();
      consent = Boolean(local && local.email && local.email === email.toLowerCase());
    }
    toggle.checked = consent;
    if (note) note.textContent = consent ? 'רשום/ה לדיוור. אפשר להסיר בכל רגע.' : 'לא רשום/ה לדיוור כרגע.';

    toggle.addEventListener('change', async function () {
      toggle.disabled = true;
      if (toggle.checked) {
        var result = await subscribeNewsletter(email, 'account');
        toggle.checked = result.ok;
        if (note) note.textContent = result.ok ? 'נרשמת לדיוור.' : (result.message || 'לא הצלחנו לעדכן.');
        if (result.ok) toast('נרשמת לדיוור');
      } else {
        var off = await setNewsletterConsent(email, false);
        if (!off.ok) {
          toggle.checked = true;
          if (note) note.textContent = 'לא הצלחנו להסיר כרגע. נסו שוב.';
        } else {
          if (note) note.textContent = 'הוסרת מהדיוור.';
          toast('הוסרת מהדיוור');
        }
      }
      toggle.disabled = false;
    });
  }

  async function savePreferences(event) {
    event.preventDefault();
    var prefs = {
      category: $('prefCategory').value,
      sort: $('prefSort').value,
      max_price: Number($('prefMaxPrice').value) || 0
    };
    applyPreferences(prefs);

    if (sb && state.user) {
      try {
        var res = await sb.from('shop_preferences').upsert({
          user_id: state.user.id,
          category: prefs.category,
          sort: prefs.sort,
          max_price: prefs.max_price,
          updated_at: new Date().toISOString()
        });
        if (res.error) throw res.error;
      } catch (err) {
        toast('שמירת ההעדפות נכשלה');
        return;
      }
    } else {
      try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {}
    }

    closeModal('accountModal');
    toast('ההעדפות נשמרו');
  }

  async function logout() {
    if (sb) { try { await sb.auth.signOut(); } catch (e) {} }
    state.view = 'all';
    await applySession(null);
    closeModal('accountModal');
    toast('התנתקת');
  }

  async function applySession(session) {
    state.user = session && session.user ? session.user : null;
    state.isAdmin = false;

    if (state.user) {
      await mergeGuestFavorites();
      await loadFavorites();
      readGuestFavorites().forEach(function (id) { state.favorites.add(id); });
      state.isAdmin = await isAdmin();
      applyPreferences(await loadPreferences());
    } else {
      await loadFavorites();
      applyPreferences(readGuestPrefs());
    }

    updateAccountUI();
  }

  function openAccount() {
    if (state.user) renderUserAccount();
    else renderGuestAccount();
    openModal('accountModal');
  }

  function bindEvents() {
    $('menuBtn').addEventListener('click', function () { document.body.classList.toggle('sidebar-open'); });
    $('scrim').addEventListener('click', function () { document.body.classList.remove('sidebar-open'); });

    $('searchInput').addEventListener('input', function (event) {
      state.query = event.target.value.trim();
      resetPaging();
    });

    $('sortSelect').addEventListener('change', function (event) {
      state.sort = event.target.value;
      resetPaging();
    });

    $('priceChips').addEventListener('click', function (event) {
      var chip = event.target.closest('[data-price]');
      if (!chip) return;
      state.maxPrice = Number(chip.getAttribute('data-price')) || 0;
      resetPaging();
    });

    $('favBtn').addEventListener('click', function () {
      state.view = 'favorites';
      state.category = 'הכל';
      resetPaging();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    $('accountBtn').addEventListener('click', openAccount);

    document.querySelectorAll('.nav-item[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.view = btn.getAttribute('data-view');
        document.body.classList.remove('sidebar-open');
        resetPaging();
      });
    });

    $('categoryList').addEventListener('click', function (event) {
      var link = event.target.closest('[data-category]');
      if (!link) return;
      event.preventDefault();
      state.category = link.getAttribute('data-category');
      state.view = 'all';
      document.body.classList.remove('sidebar-open');
      resetPaging();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // טעינת עוד מוצרים בגלילה (עם כפתור כגיבוי)
    var loadMore = $('loadMore');
    if (loadMore) {
      loadMore.addEventListener('click', showMore);
      if ('IntersectionObserver' in window) {
        var moreObserver = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) showMore();
        }, { rootMargin: '500px 0px' });
        moreObserver.observe(loadMore);
      }
    }

    // בקשות חיפוש אישיות ודיוור
    document.querySelectorAll('[data-open-request]').forEach(function (button) {
      button.addEventListener('click', openRequestModal);
    });
    if ($('requestForm')) $('requestForm').addEventListener('submit', submitProductRequest);
    if ($('newsletterForm')) $('newsletterForm').addEventListener('submit', submitNewsletterForm);

    $('grid').addEventListener('click', function (event) {
      var fav = event.target.closest('[data-fav]');
      if (fav) {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(fav.getAttribute('data-fav'));
        return;
      }

      var link = event.target.closest('.card-link');
      if (!link) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      var product = findProduct(link.getAttribute('data-open'));
      if (!product) return;
      trackClick(product, 'card');
      openProduct(product.id);
    });

    $('productBody').addEventListener('click', function (event) {
      var favorite = event.target.closest('[data-pv-fav]');
      if (favorite) {
        toggleFavorite(favorite.getAttribute('data-pv-fav'));
        return;
      }
      var share = event.target.closest('[data-share-pv]');
      if (share) {
        var sharedProduct = findProduct(share.getAttribute('data-share-pv'));
        if (sharedProduct) shareProduct(sharedProduct);
        return;
      }
      var buy = event.target.closest('[data-buy]');
      if (buy) {
        var boughtProduct = findProduct(buy.getAttribute('data-buy'));
        if (boughtProduct) trackClick(boughtProduct, 'buy');
        return;
      }
      var thumb = event.target.closest('[data-thumb]');
      if (thumb) {
        var thumbUrl = thumb.getAttribute('data-thumb');
        var thumbIndex = pvGallery.indexOf(thumbUrl);
        if (thumbIndex !== -1) pvIndex = thumbIndex;
        var mainImage = $('pvMainImg');
        var thumbImage = imageVariants(thumbUrl);
        if (mainImage && thumbImage.src) {
          mainImage.src = thumbImage.src;
          if (thumbImage.srcset) mainImage.setAttribute('srcset', thumbImage.srcset);
          else mainImage.removeAttribute('srcset');
        }
        document.querySelectorAll('.pv-thumb').forEach(function (btn) {
          btn.classList.toggle('active', btn === thumb);
        });
        return;
      }
      var imageButton = event.target.closest('[data-img-open]');
      if (imageButton) {
        openImageViewer(pvGallery[pvIndex], pvTitle);
        return;
      }
      var related = event.target.closest('[data-open]');
      if (related) {
        openProduct(related.getAttribute('data-open'));
        return;
      }
    });

    $('imageModal').addEventListener('click', function (event) {
      var zoom = event.target.closest('[data-zoom]');
      if (!zoom) return;
      var action = zoom.getAttribute('data-zoom');
      if (action === 'in') setZoom(zoomScale + 0.5);
      else if (action === 'out') setZoom(zoomScale - 0.5);
      else setZoom(1);
    });

    // כפתורי הסגירה (X) של כל החלונות, כולל חלון החשבון
    document.addEventListener('click', function (event) {
      var closer = event.target.closest('[data-close]');
      if (closer) closeModal(closer.getAttribute('data-close'));
    });

    document.querySelectorAll('.overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeModal(overlay.id);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        var openOverlays = document.querySelectorAll('.overlay:not(.hidden)');
        if (openOverlays.length) closeModal(openOverlays[openOverlays.length - 1].id);
        document.body.classList.remove('sidebar-open');
      }
      if (event.key === 'Tab') trapTab(event);
    });
  }

  async function init() {
    bindEvents();
    $('resultMeta').setAttribute('aria-live', 'polite');
    if (readNewsletterLocal()) markNewsletterSubscribed();

    // קודם מציגים מיד את המוצרים הראשונים מהקובץ הבנוי, ואז טוענים את כל הקטלוג
    await loadSeed();
    await loadProducts();
    state.shown = PAGE_SIZE;
    renderGrid();

    await loadFavorites();
    renderGrid();

    if (sb) {
      try {
        var sessionRes = await withTimeout(Promise.resolve(sb.auth.getSession()), 10000);
        await applySession(sessionRes && sessionRes.data ? sessionRes.data.session : null);
      } catch (e) {
        applyPreferences(readGuestPrefs());
        updateAccountUI();
      }

      sb.auth.onAuthStateChange(function (event, session) {
        if (event === 'SIGNED_OUT') {
          applySession(null);
        } else if (event === 'SIGNED_IN' && session && session.user && (!state.user || state.user.id !== session.user.id)) {
          applySession(session);
        }
      });
    } else {
      applyPreferences(readGuestPrefs());
      updateAccountUI();
    }
  }

  init();
})();
