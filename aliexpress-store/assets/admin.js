(function () {
  'use strict';

  var CFG = window.SHOP_CONFIG || {};
  var HAS_SUPABASE = Boolean(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  var sb = HAS_SUPABASE ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
  var LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var DEMO = LOCAL_HOST && (!HAS_SUPABASE || new URLSearchParams(location.search).has('demo'));

  var CATEGORIES = ['בית ומטבח', 'גאדג׳טים', 'ארגון ואחסון', 'רכב', 'טיפוח ופנאי', 'כלי עבודה'];

  var DEMO_PRODUCTS = [
    {
      id: 1, status: 'pending', category: 'בית ומטבח', score: 78,
      title: 'מארגן מגירות למטבח', external_id: 'demo:1',
      description: 'מחלק את המגירה לתאים בגודל משתנה ומחזיק סכום וכלים במקום מסודר. פלסטיק עמיד וקל לניקוי.',
      why: 'נמכר היטב ודירוג גבוה, עם התאמה כמעט לכל מטבח.',
      image_url: 'https://picsum.photos/seed/shop-drawer/640/640',
      price: 45, original_price: 79, discount_percent: 43, rating: 4.7, orders: 3800, shipping_days: 9,
      affiliate_url: 'https://s.click.aliexpress.com/e/_demo', created_at: '2026-11-24T07:00:00Z', ai_written: true
    },
    {
      id: 2, status: 'pending', category: 'גאדג׳טים', score: 74,
      title: 'מנורת שולחן נטענת עם שלוש עוצמות', external_id: 'demo:2',
      description: 'אור לבן חם לשולחן עבודה או ליד המיטה, עם סוללה לכל הלילה. נטענת ב-USB-C ולא תופסת מקום.',
      why: 'קלה להפעלה, נטענת ולא תופסת שקע.',
      image_url: 'https://picsum.photos/seed/shop-lamp/640/640',
      price: 59, original_price: 89, discount_percent: 34, rating: 4.6, orders: 2100, shipping_days: 8,
      affiliate_url: 'https://s.click.aliexpress.com/e/_demo', created_at: '2026-11-24T06:00:00Z', ai_written: true
    },
    {
      id: 3, status: 'pending', category: 'ארגון ואחסון', score: 61,
      title: 'נרתיק ארגון לכבלים ולמטענים', external_id: 'demo:3',
      description: 'כיסים נפרדים לכל מטען וכבל, עם גומיות לאבטחה ורוכסן אחד. נכנס לתיק העבודה בלי לתפוס נפח.',
      why: 'פותר בלגן קבוע בתיק, במחיר נמוך.',
      image_url: 'https://picsum.photos/seed/shop-pouch/640/640',
      price: 34, original_price: 55, discount_percent: 38, rating: 4.5, orders: 1700, shipping_days: 9,
      affiliate_url: 'https://s.click.aliexpress.com/e/_demo', created_at: '2026-11-23T19:00:00Z', ai_written: true
    },
    {
      id: 4, status: 'approved', category: 'בית ומטבח', score: 82,
      title: 'קומקום חשמלי קטן עם בקרת טמפרטורה', external_id: 'demo:4',
      description: 'קומקום קומפקטי לשולחן או למטבח קטן, עם שלוש דרגות חום וכיבוי אוטומטי.',
      why: 'דירוג גבוה, נפח הזמנות גדול ומחיר נוח ביחס לקטגוריה.',
      image_url: 'https://picsum.photos/seed/shelf-kettle/640/640',
      price: 89, original_price: 149, discount_percent: 40, rating: 4.8, orders: 2400, shipping_days: 9,
      affiliate_url: 'https://s.click.aliexpress.com/e/_demo', created_at: '2026-11-22T09:00:00Z', ai_written: true
    },
    {
      id: 5, status: 'approved', category: 'רכב', score: 76,
      title: 'מחזיק טלפון מגנטי לרכב', external_id: 'demo:5',
      description: 'מתחבר לפתח המיזוג ומחזיק את הטלפון יציב בלי לחסום את המסך.',
      why: 'מחיר נמוך, התקנה בלי כלים ומספר הזמנות גדול.',
      image_url: 'https://picsum.photos/seed/shelf-car/640/640',
      price: 35, original_price: 59, discount_percent: 40, rating: 4.7, orders: 6700, shipping_days: 8,
      affiliate_url: 'https://s.click.aliexpress.com/e/_demo', created_at: '2026-11-21T09:00:00Z', ai_written: true
    },
    {
      id: 6, status: 'rejected', category: 'בית ומטבח', score: 44,
      title: 'מברשת ניקוי חשמלית לריצוף', external_id: 'demo:6',
      description: 'מברשת מסתובבת לניקוי חיבורים ופינות. דורשת מטען ייעודי.',
      why: '',
      image_url: 'https://picsum.photos/seed/shop-brush/640/640',
      price: 120, original_price: 180, discount_percent: 33, rating: 4.2, orders: 600, shipping_days: 10,
      affiliate_url: 'https://s.click.aliexpress.com/e/_demo', created_at: '2026-11-20T09:00:00Z', ai_written: false
    },
    {
      id: 7, status: 'removed', category: 'גאדג׳טים', score: 52,
      title: 'מאוורר כיס נטען', external_id: 'demo:7',
      description: 'מאוורר קטן שנגמר מהמלאי אצל הספק.',
      why: '',
      image_url: 'https://picsum.photos/seed/shop-fan/640/640',
      price: 39, original_price: 69, discount_percent: 43, rating: 4.4, orders: 2200, shipping_days: 8,
      affiliate_url: 'https://s.click.aliexpress.com/e/_demo', created_at: '2026-11-19T09:00:00Z', ai_written: true
    }
  ];

  var DEMO_CLICKS = [
    { product_title: 'קומקום חשמלי קטן עם בקרת טמפרטורה', kind: 'buy' },
    { product_title: 'קומקום חשמלי קטן עם בקרת טמפרטורה', kind: 'card' },
    { product_title: 'מחזיק טלפון מגנטי לרכב', kind: 'card' },
    { product_title: 'מחזיק טלפון מגנטי לרכב', kind: 'buy' },
    { product_title: 'נרתיק ארגון לכבלים ולמטענים', kind: 'card' }
  ];

  var DEMO_SEARCHES = [
    { query: 'מגבות מטבח', results_count: 0 },
    { query: 'מגבות מטבח', results_count: 0 },
    { query: 'צידנית', results_count: 0 }
  ];

  var DEMO_APPROVALS = [
    { actor_email: 'demo@local', product_title: 'קומקום חשמלי קטן עם בקרת טמפרטורה', action: 'approve', created_at: '2026-11-24T08:10:00Z' },
    { actor_email: 'demo@local', product_title: 'מברשת ניקוי חשמלית לריצוף', action: 'reject', created_at: '2026-11-23T18:40:00Z' }
  ];

  var DEMO_REQUESTS = [
    { id: 1, email: 'demo@local', product_query: 'מארגן מגירות למטבח עם תאים', budget: 60, note: 'מחפשת משהו שלא מתפרק', status: 'new', created_at: '2026-11-25T10:20:00Z' },
    { id: 2, email: '', product_query: 'מחזיק טלפון לאופניים', budget: 0, note: '', status: 'done', created_at: '2026-11-24T18:05:00Z' }
  ];

  var DEMO_NEWSLETTER = [
    { email: 'demo@local', consent: true, source: 'signup', created_at: '2026-11-25T09:00:00Z' },
    { email: 'someone@example.com', consent: true, source: 'site', created_at: '2026-11-24T08:30:00Z' }
  ];

  var state = {
    products: [],
    tab: 'pending',
    query: '',
    demo: DEMO,
    userEmail: '',
    clicks: [],
    searches: [],
    approvals: [],
    requests: [],
    newsletter: [],
    insightsLoaded: false,
    communityLoaded: false
  };

  var TAB_LABELS = {
    pending: { title: 'ממתינים לאישור', sub: 'מוצרים שהגיעו מהאוטומציה ומחכים להחלטה שלך. מסודרים לפי ציון.' },
    approved: { title: 'מאושרים באתר', sub: 'מוצרים אלה מוצגים כרגע ללקוחות.' },
    removed: { title: 'הוסרו אוטומטית', sub: 'מוצרים שהקישור או המלאי שלהם נגמרו. אפשר להחזיר אותם לבדיקה.' },
    rejected: { title: 'נדחו', sub: 'מוצרים שלא אישרת. אפשר להחזיר אותם לבדיקה בכל רגע.' },
    requests: { title: 'בקשות חיפוש', sub: 'מה הגולשים מבקשים שנמצא עבורם באליאקספרס.' },
    newsletter: { title: 'מנויי דיוור', sub: 'כל מי שאישר קבלת מייל. אפשר להעתיק את הרשימה לדיוור.' },
    insights: { title: 'נתונים ולוג', sub: 'קליקים, חיפושים ללא תוצאה ולוג אישורים.' }
  };

  var REQUEST_STATUS = { new: 'חדש', searching: 'בחיפוש', done: 'טופל', archived: 'ארכיון' };

  var ACTION_LABELS = {
    approve: 'אישר',
    reject: 'דחה',
    delete: 'מחק',
    edit: 'ערך',
    approve_all: 'אישר הכל'
  };

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

  // הדירוג מאליאקספרס הוא אחוז דירוגים חיוביים (97.5), לא כוכבים
  function ratingLabel(product) {
    var n = Number(product.rating) || 0;
    if (!n) return '';
    if (n <= 5) n *= 20;
    return n.toFixed(1).replace(/\.0$/, '') + '% חיוביים';
  }

  function toast(message) {
    var host = $('toastHost');
    if (!host) return;
    var node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    host.appendChild(node);
    setTimeout(function () { node.remove(); }, 3000);
  }

  function formatDate(value) {
    var date = new Date(value);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function safeUrl(value) {
    var url = String(value || '').trim();
    if (/^https?:\/\//i.test(url)) return url;
    if (url.indexOf('//') === 0) return 'https:' + url;
    return '';
  }

  function sameId(a, b) { return String(a) === String(b); }

  function findProduct(id) {
    return state.products.filter(function (p) { return sameId(p.id, id); })[0];
  }

  function dropProduct(id) {
    state.products = state.products.filter(function (p) { return !sameId(p.id, id); });
  }

  function assertUpdated(res) {
    if (res.error) throw res.error;
    if (!res.data || !res.data.length) throw new Error('forbidden');
  }

  function showDemoNote(text) {
    var note = $('demoNote');
    note.classList.remove('hidden');
    note.textContent = text;
  }

  function setMessage(text, isError) {
    var el = $('loginMsg');
    el.textContent = text || '';
    el.className = 'form-msg' + (text ? (isError ? ' error' : ' ok') : '');
  }

  function mapAuthError(message) {
    var m = String(message || '');
    if (/invalid login credentials/i.test(m)) return 'האימייל או הסיסמה שגויים.';
    if (/email not confirmed/i.test(m)) return 'צריך לאשר את החשבון במייל לפני הכניסה.';
    if (/failed to fetch|network/i.test(m)) return 'אין חיבור לשרת. בדקו את החיבור ונסו שוב.';
    return 'הכניסה נכשלה. נסו שוב.';
  }

  function showApp() {
    $('authGate').classList.add('hidden');
    $('adminApp').classList.remove('hidden');
  }

  function showGate() {
    $('adminApp').classList.add('hidden');
    $('authGate').classList.remove('hidden');
  }

  /* ---------- ציון, כפילויות והיגיון תור ---------- */

  function scoreOf(product) {
    var stored = Number(product.score);
    if (stored) return Math.round(stored);
    var orders = Number(product.orders) || 10;
    var rating = Number(product.rating) || 4;
    var discount = Number(product.discount_percent) || 0;
    return Math.round(Math.log10(Math.max(10, orders)) * 20 + rating * 5 + discount * 0.3);
  }

  function normalizeTitle(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[ךםןףץ]/g, function (ch) { return ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' })[ch]; })
      .replace(/["'.,:;!?()[\]{}<>/\\|_+=*&^%$#@~`-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var titleTokenCache = new Map();

  function titleTokens(value) {
    var key = String(value || '');
    if (!titleTokenCache.has(key)) titleTokenCache.set(key, normalizeTitle(key).split(' ').filter(Boolean));
    return titleTokenCache.get(key);
  }

  function similarity(a, b) {
    var first = new Set(titleTokens(a));
    var second = new Set(titleTokens(b));
    if (!first.size || !second.size) return 0;
    var shared = 0;
    first.forEach(function (token) { if (second.has(token)) shared += 1; });
    return shared / (first.size + second.size - shared);
  }

  function duplicateOf(product) {
    var best = null;
    state.products.forEach(function (other) {
      if (sameId(other.id, product.id)) return;
      var sameImage = Boolean(other.image_url && product.image_url && other.image_url === product.image_url);
      var sim = similarity(product.title, other.title);
      if (!sameImage && sim < 0.6) return;
      if (!best || sim + (sameImage ? 0.3 : 0) > best.weight) {
        best = { product: other, weight: sim + (sameImage ? 0.3 : 0) };
      }
    });
    return best;
  }

  /* ---------- לוג אישורים ---------- */

  function logApproval(product, action) {
    if (!sb || state.demo) return;
    try {
      sb.from('shop_approvals').insert({
        actor_email: state.userEmail || 'unknown',
        product_id: Number(product.id) || null,
        product_title: String(product.title || '').slice(0, 200),
        action: action
      }).then(function () {}, function () {});
    } catch (e) {}
  }

  /* ---------- טעינה ---------- */

  async function loadProducts() {
    if (state.demo) {
      state.products = DEMO_PRODUCTS.map(function (p) { return Object.assign({}, p); });
      showDemoNote('מצב הדגמה: האישורים כאן לא נשמרים. חברו Supabase כדי לעבוד עם הנתונים האמיתיים.');
      render();
      return;
    }

    try {
      var res = await sb.from('shop_products').select('*').order('created_at', { ascending: false }).limit(500);
      if (res.error) throw res.error;
      state.products = res.data || [];
      $('demoNote').classList.add('hidden');
    } catch (err) {
      console.warn('[admin] products error:', err && err.message);
      state.demo = true;
      state.products = DEMO_PRODUCTS.map(function (p) { return Object.assign({}, p); });
      showDemoNote('לא ניתן לקרוא את טבלת המוצרים. הריצו את aliexpress_shop_schema.sql — בינתיים מוצגים נתוני דוגמה.');
    }
    render();
  }

  function filteredProducts() {
    var list = state.products.filter(function (p) { return p.status === state.tab; });
    if (state.query) {
      var q = normalizeTitle(state.query);
      list = list.filter(function (p) {
        return normalizeTitle(p.title + ' ' + (p.description || '') + ' ' + (p.category || '')).indexOf(q) !== -1;
      });
    }
    if (state.tab === 'pending') {
      list.sort(function (a, b) { return scoreOf(b) - scoreOf(a); });
    } else {
      list.sort(function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
    }
    return list;
  }

  function renderStats() {
    var counts = { pending: 0, approved: 0, rejected: 0, removed: 0 };
    state.products.forEach(function (p) { if (counts[p.status] != null) counts[p.status] += 1; });

    var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var recentClicks = state.clicks.filter(function (click) {
      var time = new Date(click.created_at || 0).getTime();
      return !click.created_at || time >= weekAgo;
    }).length;

    $('stats').innerHTML =
      '<div class="stat"><div class="n">' + counts.pending + '</div><div class="l">ממתינים</div></div>' +
      '<div class="stat"><div class="n">' + counts.approved + '</div><div class="l">מאושרים</div></div>' +
      '<div class="stat"><div class="n">' + recentClicks + '</div><div class="l">קליקים (7 ימים)</div></div>';
  }

  function actionsHtml(p) {
    var actions = [];
    var link = safeUrl(p.affiliate_url);
    if (link) {
      actions.push('<a class="btn btn-sm btn-ghost" href="' + esc(link) + '" target="_blank" rel="nofollow sponsored noopener">קישור</a>');
    }
    if (p.status === 'approved') {
      actions.push('<a class="btn btn-sm btn-ghost" href="p/' + encodeURIComponent(String(p.id)) + '/" target="_blank" rel="noopener">דף</a>');
    }
    actions.push('<button type="button" class="btn btn-sm" data-action="edit" data-id="' + esc(p.id) + '">עריכה</button>');

    if (p.status === 'pending') {
      actions.push('<button type="button" class="btn btn-sm btn-danger" data-action="reject" data-id="' + esc(p.id) + '">דחייה</button>');
      actions.push('<button type="button" class="btn btn-sm btn-primary" data-action="approve" data-id="' + esc(p.id) + '">אישור</button>');
    } else if (p.status === 'approved') {
      actions.push('<button type="button" class="btn btn-sm btn-danger" data-action="reject" data-id="' + esc(p.id) + '">הסרה מהאתר</button>');
    } else {
      actions.push('<button type="button" class="btn btn-sm" data-action="delete" data-id="' + esc(p.id) + '">מחיקה</button>');
      actions.push('<button type="button" class="btn btn-sm btn-primary" data-action="approve" data-id="' + esc(p.id) + '">אישור</button>');
    }
    return actions.join('');
  }

  function rowHtml(p, duplicate) {
    var statusLabel = p.status === 'pending' ? 'ממתין' : p.status === 'approved' ? 'מאושר' : p.status === 'removed' ? 'הוסר' : 'נדחה';
    return '<div class="review-row" data-id="' + esc(p.id) + '">' +
      '<img class="review-thumb" src="' + esc(safeUrl(p.image_url)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'" />' +
      '<div class="review-main">' +
        '<h3>' + esc(p.title) + '</h3>' +
        (p.description ? '<p class="review-desc">' + esc(p.description) + '</p>' : '') +
        '<div class="review-meta">' +
          '<span class="score">ציון ' + scoreOf(p) + '</span>' +
          '<span><b>' + money(p.price) + '</b></span>' +
          (Number(p.original_price) > Number(p.price) ? '<span>במקום ' + money(p.original_price) + '</span>' : '') +
          '<span>' + esc(p.category || '') + '</span>' +
          (ratingLabel(p) ? '<span>' + esc(ratingLabel(p)) + '</span>' : '') +
          (Number(p.orders) ? '<span>' + compactCount(p.orders) + ' הזמנות</span>' : '') +
          '<span>' + formatDate(p.created_at) + '</span>' +
          '<span class="pill ' + esc(p.status) + '">' + statusLabel + '</span>' +
          (duplicate ? '<span class="dup" title="' + esc(duplicate.product.title) + '">כפול? ' + esc(duplicate.product.title.slice(0, 28)) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="review-actions">' + actionsHtml(p) + '</div>' +
    '</div>';
  }

  function renderInsights() {
    var panel = $('insightsPanel');
    if (!panel) return;

    var clicksByTitle = {};
    state.clicks.forEach(function (click) {
      var key = click.product_title || 'ללא שם';
      clicksByTitle[key] = clicksByTitle[key] || { total: 0, buys: 0 };
      clicksByTitle[key].total += 1;
      if (click.kind === 'buy') clicksByTitle[key].buys += 1;
    });
    var topClicks = Object.keys(clicksByTitle)
      .map(function (title) { return { title: title, total: clicksByTitle[title].total, buys: clicksByTitle[title].buys }; })
      .sort(function (a, b) { return b.total - a.total; })
      .slice(0, 6);

    var searchesByQuery = {};
    state.searches.forEach(function (row) {
      if (Number(row.results_count) !== 0) return;
      var key = String(row.query || '').trim();
      if (!key) return;
      searchesByQuery[key] = (searchesByQuery[key] || 0) + 1;
    });
    var topSearches = Object.keys(searchesByQuery)
      .map(function (query) { return { query: query, count: searchesByQuery[query] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 8);

    function list(items, emptyText) {
      if (!items.length) return '<p class="mini-empty">' + emptyText + '</p>';
      return '<ul class="mini-list">' + items.map(function (item) {
        return '<li><span class="mini-main">' + item.label + '</span><span class="n">' + item.value + '</span></li>';
      }).join('') + '</ul>';
    }

    panel.innerHTML =
      '<div class="insight-card">' +
        '<h2>המוצרים שנלחצים הכי הרבה</h2>' +
        '<p class="insight-sub">לחיצות על כרטיס ועל כפתור הרכישה, 500 האחרונות</p>' +
        list(topClicks.map(function (item) {
          return { label: esc(item.title), value: item.total + ' · ' + item.buys + (item.buys === 1 ? ' רכישה' : ' רכישות') };
        }), 'עוד אין קליקים. הם יופיעו אחרי שיהיה קהל באתר.') +
      '</div>' +
      '<div class="insight-card">' +
        '<h2>חיפושים ללא תוצאה</h2>' +
        '<p class="insight-sub">מה מבקשים ואין — בסיס לרעיונות למוצרים הבאים</p>' +
        list(topSearches.map(function (item) {
          return { label: esc(item.query), value: item.count + (item.count === 1 ? ' פעם' : ' פעמים') };
        }), 'לא נרשמו חיפושים ללא תוצאה.') +
      '</div>' +
      '<div class="insight-card">' +
        '<h2>לוג אישורים</h2>' +
        '<p class="insight-sub">מי עשה מה ומתי</p>' +
        list(state.approvals.map(function (row) {
          var actor = String(row.actor_email || '').split('@')[0] || '—';
          var title = String(row.product_title || '').slice(0, 40);
          return {
            label: esc(actor + ' ' + (ACTION_LABELS[row.action] || row.action) + ' · ' + title),
            value: formatDate(row.created_at)
          };
        }), 'אין רשומות לוג עדיין.') +
      '</div>';
  }

  async function loadInsights() {
    if (state.demo) {
      state.clicks = DEMO_CLICKS.slice();
      state.searches = DEMO_SEARCHES.slice();
      state.approvals = DEMO_APPROVALS.slice();
      state.insightsLoaded = true;
      renderInsights();
      renderStats();
      return;
    }
    if (!sb) return;

    try {
      var results = await Promise.all([
        sb.from('shop_clicks').select('product_title,kind,created_at').order('created_at', { ascending: false }).limit(500),
        sb.from('shop_searches').select('query,results_count').order('created_at', { ascending: false }).limit(200),
        sb.from('shop_approvals').select('actor_email,product_title,action,created_at').order('created_at', { ascending: false }).limit(40)
      ]);
      state.clicks = results[0].error ? [] : results[0].data || [];
      state.searches = results[1].error ? [] : results[1].data || [];
      state.approvals = results[2].error ? [] : results[2].data || [];
      state.insightsLoaded = true;
    } catch (err) {
      state.insightsLoaded = true;
    }

    renderInsights();
    renderStats();
  }

  /* ---------- בקשות חיפוש ומנויי דיוור ---------- */

  async function loadCommunity() {
    if (state.communityLoaded) return;
    if (state.demo) {
      state.requests = DEMO_REQUESTS.map(function (row) { return Object.assign({}, row); });
      state.newsletter = DEMO_NEWSLETTER.slice();
      state.communityLoaded = true;
      renderCommunity();
      return;
    }
    if (!sb) return;

    try {
      var results = await Promise.all([
        sb.from('shop_requests').select('*').order('created_at', { ascending: false }).limit(300),
        sb.from('shop_newsletter').select('email,consent,source,created_at').order('created_at', { ascending: false }).limit(1000)
      ]);
      state.requests = results[0].error ? [] : results[0].data || [];
      state.newsletter = results[1].error ? [] : results[1].data || [];
      if (results[0].error || results[1].error) {
        showDemoNote('לא הצלחנו לקרוא את טבלאות הדיוור והבקשות. הריצו שוב את aliexpress_shop_schema.sql.');
      }
    } catch (err) {
      state.requests = [];
      state.newsletter = [];
    }
    state.communityLoaded = true;
    renderCommunity();
  }

  function requestRow(request) {
    var status = request.status || 'new';
    return '<div class="community-row">' +
      '<div class="community-main">' +
        '<h3>' + esc(request.product_query) + '</h3>' +
        (request.note ? '<p>' + esc(request.note) + '</p>' : '') +
        '<div class="community-meta">' +
          (Number(request.budget) ? '<span>תקציב ' + money(request.budget) + '</span>' : '') +
          (request.email ? '<span>' + esc(request.email) + '</span>' : '<span>בלי אימייל</span>') +
          '<span>' + formatDate(request.created_at) + '</span>' +
          '<span class="pill ' + esc(status) + '">' + esc(REQUEST_STATUS[status] || status) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="community-actions">' +
        (status !== 'done' ? '<button type="button" class="btn btn-sm btn-primary" data-request-action="done" data-id="' + esc(request.id) + '">סימון כטופל</button>' : '') +
        '<button type="button" class="btn btn-sm btn-danger" data-request-action="delete" data-id="' + esc(request.id) + '">מחיקה</button>' +
      '</div>' +
    '</div>';
  }

  function newsletterRow(row) {
    return '<div class="community-row">' +
      '<div class="community-main">' +
        '<h3>' + esc(row.email) + '</h3>' +
        '<div class="community-meta">' +
          '<span>' + (row.consent ? 'מאושר לדיוור' : 'הוסר מהדיוור') + '</span>' +
          '<span>' + esc(row.source || 'site') + '</span>' +
          '<span>' + formatDate(row.created_at) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="community-actions">' +
        '<button type="button" class="btn btn-sm btn-danger" data-subscriber-delete="' + esc(row.email) + '">הסרה</button>' +
      '</div>' +
    '</div>';
  }

  function renderCommunity() {
    var panel = $('communityPanel');
    if (!panel) return;

    if (state.tab === 'requests') {
      var open = state.requests.filter(function (row) { return row.status === 'new' || row.status === 'searching'; }).length;
      panel.innerHTML =
        '<div class="community-tools"><span class="form-note">' + state.requests.length + ' בקשות · ' + open + ' פתוחות</span></div>' +
        (state.requests.length
          ? '<div class="community-list">' + state.requests.map(requestRow).join('') + '</div>'
          : '<p class="mini-empty">אין בקשות עדיין. בקשות מהאתר יופיעו כאן.</p>');
      return;
    }

    var subscribed = state.newsletter.filter(function (row) { return row.consent; });
    panel.innerHTML =
      '<div class="community-tools"><span class="form-note">' + subscribed.length + ' רשומים לדיוור' +
        (state.newsletter.length > subscribed.length ? ' · ' + (state.newsletter.length - subscribed.length) + ' הוסרו' : '') + '</span>' +
        (subscribed.length ? '<button type="button" class="btn btn-sm" id="copyEmailsBtn">העתקת כל המיילים</button>' : '') + '</div>' +
      (state.newsletter.length
        ? '<div class="community-list">' + state.newsletter.map(newsletterRow).join('') + '</div>'
        : '<p class="mini-empty">אין נרשמים עדיין.</p>');
  }

  function findRequest(id) {
    return state.requests.filter(function (row) { return String(row.id) === String(id); })[0];
  }

  async function setRequestDone(id) {
    var row = findRequest(id);
    if (!row) return;
    if (!state.demo) {
      try {
        var res = await sb.from('shop_requests').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', Number(id));
        if (res.error) throw res.error;
      } catch (err) {
        toast('העדכון נכשל. נסו שוב.');
        return;
      }
    }
    row.status = 'done';
    renderCommunity();
    toast('הבקשה סומנה כטופלה');
  }

  async function deleteRequest(id) {
    if (!window.confirm('למחוק את הבקשה?')) return;
    if (!state.demo) {
      try {
        var res = await sb.from('shop_requests').delete().eq('id', Number(id));
        if (res.error) throw res.error;
      } catch (err) {
        toast('המחיקה נכשלה. נסו שוב.');
        return;
      }
    }
    state.requests = state.requests.filter(function (row) { return String(row.id) !== String(id); });
    renderCommunity();
    toast('הבקשה נמחקה');
  }

  async function deleteSubscriber(email) {
    if (!window.confirm('להסיר את ' + email + ' מהדיוור?')) return;
    if (!state.demo) {
      try {
        var res = await sb.from('shop_newsletter').delete().eq('email', email);
        if (res.error) throw res.error;
      } catch (err) {
        toast('ההסרה נכשלה. נסו שוב.');
        return;
      }
    }
    state.newsletter = state.newsletter.filter(function (row) { return row.email !== email; });
    renderCommunity();
    toast('הוסר מהדיוור');
  }

  function copySubscriberEmails() {
    var emails = state.newsletter
      .filter(function (row) { return row.consent; })
      .map(function (row) { return row.email; })
      .join(', ');
    if (!emails) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emails).then(function () { toast('המיילים הועתקו'); }, function () { toast(emails); });
    } else {
      toast(emails);
    }
  }

  function render() {
    var labels = TAB_LABELS[state.tab];
    $('tabTitle').textContent = labels.title;
    $('tabSub').textContent = labels.sub;

    document.querySelectorAll('.nav-item[data-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === state.tab);
    });

    var list = filteredProducts();
    var isInsights = state.tab === 'insights';
    var isCommunity = state.tab === 'requests' || state.tab === 'newsletter';
    $('reviewList').classList.toggle('hidden', isInsights || isCommunity);
    $('empty').classList.toggle('hidden', isInsights || isCommunity || list.length > 0);
    $('insightsPanel').classList.toggle('hidden', !isInsights);
    $('communityPanel').classList.toggle('hidden', !isCommunity);
    renderStats();

    if (isInsights) {
      $('approveAllBtn').classList.add('hidden');
      $('addProductBtn').classList.add('hidden');
      if (!state.insightsLoaded) loadInsights();
      else renderInsights();
      return;
    }

    if (isCommunity) {
      $('approveAllBtn').classList.add('hidden');
      $('addProductBtn').classList.add('hidden');
      if (!state.communityLoaded) loadCommunity();
      else renderCommunity();
      return;
    }

    $('addProductBtn').classList.remove('hidden');

    var listHost = $('reviewList');
    var empty = $('empty');
    var pendingCount = state.products.filter(function (p) { return p.status === 'pending'; }).length;

    if (!list.length) {
      listHost.innerHTML = '';
      empty.classList.remove('hidden');
      empty.textContent = state.query
        ? 'אין תוצאות לחיפוש הזה.'
        : state.tab === 'pending'
          ? 'אין מוצרים שממתינים. האוטומציה תוסיף חדשים לכאן.'
          : 'אין מוצרים במסך הזה.';
    } else {
      empty.classList.add('hidden');
      var duplicates = new Map();
      if (state.tab === 'pending') {
        list.forEach(function (product) { duplicates.set(String(product.id), duplicateOf(product)); });
      }
      listHost.innerHTML = list.map(function (product) {
        return rowHtml(product, duplicates.get(String(product.id)));
      }).join('');
    }

    var approveAll = $('approveAllBtn');
    approveAll.classList.toggle('hidden', state.tab !== 'pending' || !pendingCount);
    approveAll.disabled = !pendingCount;
  }

  async function setStatus(id, status) {
    var product = findProduct(id);
    if (!product) return;

    if (!state.demo) {
      try {
        assertUpdated(
          await sb.from('shop_products')
            .update({ status: status, reviewed_at: new Date().toISOString() })
            .eq('id', Number(id))
            .select('id')
        );
      } catch (err) {
        toast('העדכון נכשל. נסו שוב.');
        return;
      }
    }

    logApproval(product, status === 'approved' ? 'approve' : 'reject');
    product.status = status;
    product.reviewed_at = new Date().toISOString();
    render();
    toast(status === 'approved'
      ? 'המוצר אושר. דף המוצר ייווצר בריצת הבנייה הבאה.'
      : 'המוצר הוסר מהאתר');
  }

  async function approveAllPending() {
    var pending = state.products.filter(function (p) { return p.status === 'pending'; });
    if (!pending.length) return;

    if (!state.demo) {
      try {
        assertUpdated(
          await sb.from('shop_products')
            .update({ status: 'approved', reviewed_at: new Date().toISOString() })
            .in('id', pending.map(function (p) { return Number(p.id); }))
            .select('id')
        );
      } catch (err) {
        toast('האישור נכשל. נסו שוב.');
        return;
      }
    }

    var now = new Date().toISOString();
    pending.forEach(function (p) {
      logApproval(p, 'approve_all');
      p.status = 'approved';
      p.reviewed_at = now;
    });
    render();
    toast('כל הממתינים אושרו');
  }

  async function removeProduct(id) {
    var product = findProduct(id);
    if (!product) return;
    if (!window.confirm('למחוק את המוצר לצמיתות?')) return;

    if (!state.demo) {
      try {
        assertUpdated(
          await sb.from('shop_products').delete().eq('id', Number(id)).select('id')
        );
      } catch (err) {
        toast('המחיקה נכשלה. נסו שוב.');
        return;
      }
    }

    logApproval(product, 'delete');
    dropProduct(id);
    render();
    toast('המוצר נמחק');
  }

  var editGalleryItems = [];

  function galleryOf(product) {
    var list = Array.isArray(product.images) ? product.images : [];
    var items = list
      .filter(function (img) { return img && safeUrl(img.url); })
      .map(function (img) { return { url: safeUrl(img.url), approved: Boolean(img.approved) }; });
    if (!items.length && safeUrl(product.image_url)) items.push({ url: safeUrl(product.image_url), approved: true });
    return items;
  }

  function renderEditGallery(product) {
    editGalleryItems = galleryOf(product);
    var host = $('editGallery');
    if (!host) return;
    if (!editGalleryItems.length) {
      host.innerHTML = '<p class="form-note">אין תמונות למוצר הזה. אפשר להוסיף כתובת תמונה בשדה שלמעלה.</p>';
      return;
    }
    host.innerHTML = editGalleryItems.map(function (item, index) {
      return '<label class="gallery-item">' +
        '<img src="' + esc(item.url) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility=\'hidden\'" />' +
        '<span><input type="checkbox" data-gallery-index="' + index + '"' + (item.approved ? ' checked' : '') + ' /> הצגה באתר</span>' +
        '</label>';
    }).join('');
  }

  function openEdit(id) {
    var p = findProduct(id);
    if (!p) return;

    $('editId').value = String(p.id);
    $('editName').value = p.title || '';
    $('editDesc').value = p.description || '';
    $('editWhy').value = p.why || '';
    $('editPrice').value = p.price != null ? p.price : '';
    $('editOriginal').value = p.original_price != null ? p.original_price : '';
    $('editImage').value = p.image_url || '';
    $('editLink').value = p.affiliate_url || '';
    $('editMsg').textContent = '';
    $('aiMsg').textContent = '';
    renderEditGallery(p);

    var category = p.category || CATEGORIES[0];
    var known = CATEGORIES.indexOf(category) === -1 ? CATEGORIES.concat([category]) : CATEGORIES;
    $('editCategory').innerHTML = known.map(function (name) {
      return '<option value="' + esc(name) + '"' + (name === category ? ' selected' : '') + '>' + esc(name) + '</option>';
    }).join('');

    $('editModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('editName').focus(); }, 20);
  }

  function closeEdit() {
    $('editModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function saveEdit(event) {
    event.preventDefault();
    var id = $('editId').value;
    var product = findProduct(id);
    if (!product) return;

    var price = Number($('editPrice').value) || 0;
    var original = Number($('editOriginal').value) || 0;
    var values = {
      title: $('editName').value.trim(),
      description: $('editDesc').value.trim(),
      why: $('editWhy').value.trim(),
      category: $('editCategory').value,
      price: price,
      original_price: original,
      discount_percent: original > price && original > 0 ? Math.round((1 - price / original) * 100) : 0,
      image_url: $('editImage').value.trim(),
      affiliate_url: $('editLink').value.trim()
    };

    // אישור לכל תמונה בנפרד: מה שסומן נשמר בגלריה ורק הוא מוצג באתר
    var gallery = editGalleryItems.map(function (item, index) {
      var box = document.querySelector('[data-gallery-index="' + index + '"]');
      return { url: item.url, approved: box ? box.checked : item.approved };
    });
    if (values.image_url && (!gallery.length || gallery[0].url !== values.image_url)) {
      gallery.unshift({ url: values.image_url, approved: true });
    }
    if (!values.image_url && gallery.length) values.image_url = gallery[0].url;
    values.images = gallery;

    if (!values.title || !values.affiliate_url) {
      $('editMsg').textContent = 'כותרת וקישור שותפים הם שדות חובה.';
      $('editMsg').className = 'form-msg error';
      return;
    }

    if (!state.demo) {
      try {
        assertUpdated(
          await sb.from('shop_products').update(values).eq('id', Number(id)).select('id')
        );
      } catch (err) {
        $('editMsg').textContent = 'שמירה נכשלה. נסו שוב.';
        $('editMsg').className = 'form-msg error';
        return;
      }
    }

    logApproval(product, 'edit');
    Object.assign(product, values);
    closeEdit();
    render();
    toast('השינויים נשמרו');
  }

  /* ---------- הוספת מוצר ידנית ---------- */

  function openAdd() {
    $('addName').value = '';
    $('addDesc').value = '';
    $('addPrice').value = '';
    $('addImage').value = '';
    $('addLink').value = '';
    $('addMsg').textContent = '';
    $('addMsg').className = 'form-msg';
    $('addCategory').innerHTML = CATEGORIES.map(function (name) {
      return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
    }).join('');

    $('addModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('addName').focus(); }, 20);
  }

  function closeAdd() {
    $('addModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function manualExternalId() {
    if (window.crypto && window.crypto.randomUUID) return 'manual:' + window.crypto.randomUUID();
    return 'manual:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  async function submitAdd(event) {
    event.preventDefault();
    var msg = $('addMsg');
    var title = $('addName').value.trim();
    var link = safeUrl($('addLink').value);
    var image = safeUrl($('addImage').value);
    var price = Number($('addPrice').value) || 0;

    if (!title || !link) {
      msg.textContent = 'כותרת וקישור שותפים (https://) הם שדות חובה.';
      msg.className = 'form-msg error';
      return;
    }

    var values = {
      external_id: manualExternalId(),
      title: title,
      description: $('addDesc').value.trim(),
      image_url: image,
      category: $('addCategory').value || CATEGORIES[0],
      price: price,
      original_price: price,
      discount_percent: 0,
      affiliate_url: link,
      status: 'pending',
      ai_written: false
    };

    var btn = $('addSaveBtn');
    btn.disabled = true;
    msg.className = 'form-msg';
    msg.textContent = 'שומר…';

    try {
      if (state.demo) {
        Object.assign(values, { id: 'demo-manual-' + Date.now(), created_at: new Date().toISOString() });
        state.products.unshift(values);
      } else {
        var res = await sb.from('shop_products').insert(values).select('*').single();
        if (res.error) throw res.error;
        if (!res.data) throw new Error('forbidden');
        state.products.unshift(res.data);
      }
    } catch (err) {
      msg.className = 'form-msg error';
      msg.textContent = /row-level security|permission|forbidden|403/i.test(String(err && err.message))
        ? 'השרת דחה את ההוספה. צריך להריץ שוב את aliexpress_shop_schema.sql כדי לעדכן הרשאות.'
        : 'ההוספה נכשלה. נסו שוב.';
      return;
    } finally {
      btn.disabled = false;
    }

    closeAdd();
    state.tab = 'pending';
    state.query = '';
    $('adminSearch').value = '';
    render();
    toast('המוצר נוסף לממתינים. אשרו אותו כדי שיופיע באתר.');
  }

  async function rewriteWithAi() {
    var product = findProduct($('editId').value);
    var msg = $('aiMsg');
    var btn = $('aiRewriteBtn');
    if (!product) return;

    if (!sb) {
      msg.textContent = 'שכתוב AI דורש חיבור ל-Supabase.';
      msg.className = 'form-msg error';
      return;
    }

    btn.disabled = true;
    msg.className = 'form-msg';
    msg.textContent = 'כותב…';

    try {
      var sessionRes = await sb.auth.getSession();
      var token = sessionRes && sessionRes.data && sessionRes.data.session ? sessionRes.data.session.access_token : '';
      if (!token) throw new Error('no session');

      var res = await fetch(CFG.SUPABASE_URL.replace(/\/+$/, '') + '/functions/v1/ai-rewrite', {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
          apikey: CFG.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          title: $('editName').value.trim(),
          description: $('editDesc').value.trim(),
          category: $('editCategory').value
        })
      });
      if (!res.ok) throw new Error('http ' + res.status);

      var data = await res.json();
      if (data.title) $('editName').value = String(data.title).slice(0, 120);
      if (data.description) $('editDesc').value = String(data.description).slice(0, 600);
      if (data.why) $('editWhy').value = String(data.why).slice(0, 300);
      if (data.category) {
        var select = $('editCategory');
        var exists = Array.prototype.some.call(select.options, function (option) { return option.value === data.category; });
        if (exists) select.value = data.category;
      }
      msg.className = 'form-msg ok';
      msg.textContent = 'הנוסח שוכתב. בדקו ואז שמרו.';
    } catch (err) {
      msg.className = 'form-msg error';
      msg.textContent = 'שכתוב ה-AI לא זמין כרגע. הפונקציה ai-rewrite צריכה להיות מופעלת ב-Supabase.';
    } finally {
      btn.disabled = false;
    }
  }

  function bindEvents() {
    $('menuBtn').addEventListener('click', function () { document.body.classList.toggle('sidebar-open'); });
    $('scrim').addEventListener('click', function () { document.body.classList.remove('sidebar-open'); });

    document.querySelectorAll('.nav-item[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.tab = btn.getAttribute('data-tab');
        document.body.classList.remove('sidebar-open');
        render();
      });
    });

    $('reviewList').addEventListener('click', function (event) {
      var btn = event.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id');
      if (action === 'approve') setStatus(id, 'approved');
      else if (action === 'reject') setStatus(id, 'rejected');
      else if (action === 'edit') openEdit(id);
      else if (action === 'delete') removeProduct(id);
    });

    $('communityPanel').addEventListener('click', function (event) {
      var requestAction = event.target.closest('[data-request-action]');
      if (requestAction) {
        var id = requestAction.getAttribute('data-id');
        if (requestAction.getAttribute('data-request-action') === 'done') setRequestDone(id);
        else deleteRequest(id);
        return;
      }
      var subscriber = event.target.closest('[data-subscriber-delete]');
      if (subscriber) {
        deleteSubscriber(subscriber.getAttribute('data-subscriber-delete'));
        return;
      }
      if (event.target.closest('#copyEmailsBtn')) copySubscriberEmails();
    });

    $('approveAllBtn').addEventListener('click', approveAllPending);
    $('adminSearch').addEventListener('input', function (event) {
      state.query = event.target.value.trim();
      render();
    });

    $('editForm').addEventListener('submit', saveEdit);
    $('aiRewriteBtn').addEventListener('click', rewriteWithAi);
    $('addProductBtn').addEventListener('click', openAdd);
    $('addForm').addEventListener('submit', submitAdd);

    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var overlay = btn.closest('.overlay');
        if (overlay && overlay.id === 'addModal') closeAdd();
        else closeEdit();
      });
    });

    $('editModal').addEventListener('click', function (event) {
      if (event.target === $('editModal')) closeEdit();
    });

    $('addModal').addEventListener('click', function (event) {
      if (event.target === $('addModal')) closeAdd();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeEdit();
        closeAdd();
        document.body.classList.remove('sidebar-open');
      }
    });

    $('logoutBtn').addEventListener('click', logout);
    $('loginForm').addEventListener('submit', submitLogin);
  }

  async function isAdminEmail(email) {
    var res = await sb.from('admins').select('email').eq('email', email).maybeSingle();
    return Boolean(res.data);
  }

  async function submitLogin(event) {
    event.preventDefault();
    if (!sb) {
      setMessage('אין חיבור ל-Supabase. בדקו את config.js ואת החיבור לרשת.', true);
      return;
    }
    var email = $('loginEmail').value.trim();
    var password = $('loginPassword').value;
    var btn = $('loginBtn');

    btn.disabled = true;
    setMessage('בודק הרשאות…');

    try {
      var res = await sb.auth.signInWithPassword({ email: email, password: password });
      if (res.error) {
        setMessage(mapAuthError(res.error.message), true);
        return;
      }

      if (!(await isAdminEmail(email))) {
        await sb.auth.signOut();
        setMessage('לחשבון הזה אין הרשאת ניהול.', true);
        return;
      }

      state.userEmail = email;
      $('adminEmail').textContent = email.split('@')[0];
      showApp();
      await loadProducts();
    } catch (err) {
      setMessage(mapAuthError(err && err.message), true);
    } finally {
      btn.disabled = false;
    }
  }

  async function logout() {
    if (state.demo) { location.href = 'index.html'; return; }
    if (sb) { try { await sb.auth.signOut(); } catch (e) {} }
    state.products = [];
    state.insightsLoaded = false;
    state.communityLoaded = false;
    state.requests = [];
    state.newsletter = [];
    showGate();
    $('loginEmail').value = '';
    $('loginPassword').value = '';
    setMessage('');
  }

  async function init() {
    bindEvents();

    if (DEMO) {
      state.userEmail = 'demo@local';
      $('adminEmail').textContent = 'מצב הדגמה';
      showApp();
      await loadProducts();
      return;
    }

    if (!sb) {
      showGate();
      setMessage('אין חיבור ל-Supabase. בדקו את config.js ואת החיבור לרשת.', true);
      return;
    }

    try {
      var sessionRes = await sb.auth.getSession();
      var session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
      if (!session) { showGate(); return; }

      if (!(await isAdminEmail(session.user.email))) { showGate(); return; }

      state.userEmail = session.user.email;
      $('adminEmail').textContent = (session.user.email || '').split('@')[0];
      showApp();
      await loadProducts();
    } catch (err) {
      showGate();
    }
  }

  init();
})();
