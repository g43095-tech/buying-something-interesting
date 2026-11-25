// אוטומציה לחנות השותפים: שולפת מוצרים מאליאקספרס, מסננת,
// כותבת כותרת ותיאור בעברית עם Gemini, ומכניסה אותם לממשק הניהול בסטטוס "ממתין".
// שום מוצר לא מתפרסם באתר לפני שמנהל מאשר אותו.

import crypto from 'node:crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://louxyixmnftfqcfjkxsz.supabase.co').replace(/\/+$/, '');
const SUPABASE_SECRET_KEY = (process.env.SUPABASE_SECRET_KEY || '').trim();

const ALIEXPRESS_APP_KEY = (process.env.ALIEXPRESS_APP_KEY || '').trim();
const ALIEXPRESS_APP_SECRET = (process.env.ALIEXPRESS_APP_SECRET || '').trim();
const ALIEXPRESS_TRACKING_ID = (process.env.ALIEXPRESS_TRACKING_ID || 'levtov').trim();

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];

const ITEMS_PER_RUN = Number(process.env.SHOP_ITEMS_PER_RUN || 8);
const PENDING_LIMIT = Number(process.env.SHOP_PENDING_LIMIT || 40);
const MIN_SALES = Number(process.env.SHOP_MIN_SALES || 100);
const MIN_RATING_PCT = Number(process.env.SHOP_MIN_RATING_PCT || 92);
const MIN_COMMISSION_PCT = Number(process.env.SHOP_MIN_COMMISSION_PCT || 4);
const MIN_PRICE = Number(process.env.SHOP_MIN_PRICE || 15);
const MAX_PRICE = Number(process.env.SHOP_MAX_PRICE || 400);
const DRY_RUN = String(process.env.DRY_RUN || '0') === '1';

const SEARCH_QUERIES = [
  'smart home gadget',
  'kitchen organizer',
  'desk cable organizer',
  'led sensor night light',
  'portable blender usb',
  'home storage box',
  'car phone holder magnetic',
  'reusable cleaning tool',
  'kitchen measuring gadget',
  'travel organizer bag',
  'mini humidifier desk',
  'tool set household'
];

const CATEGORIES = ['בית ומטבח', 'גאדג׳טים', 'ארגון ואחסון', 'רכב', 'טיפוח ופנאי', 'כלי עבודה'];

// מילים שאינן מתאימות לחנות נקייה
const BLOCK_WORDS = [
  'sexy', 'lingerie', 'bikini', 'bras', 'underwear', 'swimsuit', 'erotic', 'adult toy',
  'vape', 'cigarette', 'tobacco', 'knife', 'weapon', 'gun', 'tattoo', 'wine', 'alcohol',
  'hair extension', 'sex', 'porn'
];

const BLOCK_PATTERNS = BLOCK_WORDS.map(
  (word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
);

function normalizeUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value.startsWith('//') ? `https:${value}` : value;
}

function pickRandomQueries(count = 4) {
  const copy = [...SEARCH_QUERIES];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function signParams(params) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join('');
  return crypto.createHmac('sha256', ALIEXPRESS_APP_SECRET).update(sorted, 'utf8').digest('hex').toUpperCase();
}

async function queryProducts(keywords, pageNo) {
  const params = {
    app_key: ALIEXPRESS_APP_KEY,
    method: 'aliexpress.affiliate.product.query',
    sign_method: 'sha256',
    timestamp: String(Date.now()),
    tracking_id: ALIEXPRESS_TRACKING_ID,
    keywords,
    page_no: String(pageNo),
    page_size: '20',
    sort: 'LAST_VOLUME_DESC',
    ship_to_country: 'IL',
    target_currency: 'ILS',
    target_language: 'EN'
  };
  params.sign = signParams(params);

  const res = await fetch('https://api-sg.aliexpress.com/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`AliExpress API HTTP ${res.status}`);

  const data = await res.json();
  const products = data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product;
  return Array.isArray(products) ? products : [];
}

const toNumber = (raw) => {
  const n = Number.parseFloat(String(raw || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const ratingPercent = (raw) => {
  const n = toNumber(raw);
  if (!n) return 0;
  return n <= 5 ? n * 20 : n;
};

const commissionPercent = (p) =>
  Math.max(toNumber(p?.commission_rate), toNumber(p?.hot_product_commission_rate));

function isGoodProduct(p) {
  if (!p?.product_id || !p?.product_title || !p?.promotion_link || !p?.product_main_image_url) return false;
  if (!/^https?:\/\//i.test(normalizeUrl(p.promotion_link))) return false;

  const haystack = `${p.product_title} ${p.first_level_category_name || ''} ${p.second_level_category_name || ''}`;
  if (BLOCK_PATTERNS.some((re) => re.test(haystack))) return false;

  const price = toNumber(p.target_sale_price);
  if (price < MIN_PRICE || price > MAX_PRICE) return false;

  if (Number(p.lastest_volume || 0) < MIN_SALES) return false;
  if (ratingPercent(p.evaluate_rate) < MIN_RATING_PCT) return false;
  if (commissionPercent(p) < MIN_COMMISSION_PCT) return false;

  return true;
}

function scoreProduct(p) {
  const sales = Number(p.lastest_volume || 0);
  const rating = ratingPercent(p.evaluate_rate) || 92;
  return Math.log10(Math.max(10, sales)) * 30 + (rating - 85) * 3 + toNumber(p.discount) * 0.5 + commissionPercent(p) * 6;
}

async function writeHebrewCopy(product) {
  if (!GEMINI_API_KEY) return null;

  const prompt = `אתה עורך תוכן של חנות מוצרים קטנה ובעברית. כתוב טקסט קצר, ענייני ואנושי, בלי סופרלטיבים מוגזמים ובלי אימוג'ים.
מוצר: ${product.product_title}
קטגוריה באנגלית: ${product.second_level_category_name || product.first_level_category_name || 'home'}
מחיר: ${toNumber(product.target_sale_price)} ש"ח.

החזר JSON בלבד, בלי markdown:
{"title":"כותרת בעברית עד 6 מילים, תיאורית ולא שיווקית","description":"שני משפטים קצרים בעברית: מה המוצר עושה ולמי הוא מתאים","why":"משפט קצר שמסביר למה בחרנו דווקא במוצר הזה, בלי להמציא נתונים","category":"אחת מהקטגוריות: ${CATEGORIES.join(' | ')}"}`;

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6, responseMimeType: 'application/json' }
          }),
          signal: AbortSignal.timeout(20000)
        }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
      if (!parsed?.title || !parsed?.description) continue;

      return {
        title: String(parsed.title).trim().slice(0, 120),
        description: String(parsed.description).trim().slice(0, 600),
        why: String(parsed.why || '').trim().slice(0, 300),
        category: CATEGORIES.includes(parsed.category) ? parsed.category : CATEGORIES[0]
      };
    } catch {
      // מנסה את המודל הבא
    }
  }
  return null;
}

async function countPending() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shop_products?select=id&status=eq.pending`, {
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      Prefer: 'count=exact',
      Range: '0-0'
    },
    signal: AbortSignal.timeout(12000)
  });
  if (res.status === 404) {
    throw new Error('Table shop_products not found. Run aliexpress_shop_schema.sql in Supabase first.');
  }
  if (!res.ok) throw new Error(`Failed counting pending products (${res.status})`);
  const range = res.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

async function existingIds() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shop_products?select=external_id&limit=1000`, {
    headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error(`Failed reading existing products (${res.status})`);
  const rows = await res.json();
  return new Set(rows.map((r) => r.external_id));
}

async function insertProducts(records) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shop_products?on_conflict=external_id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal'
    },
    body: JSON.stringify(records),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`Failed inserting products (${res.status}): ${await res.text()}`);
}

function withSubId(rawUrl, subId) {
  const url = normalizeUrl(rawUrl);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.get('sub_id')) parsed.searchParams.set('sub_id', subId);
    return parsed.toString();
  } catch {
    return url;
  }
}

function shippingDays(product) {
  const raw = product.ship_to_days ?? product.delivery_days ?? 0;
  const days = Number.parseInt(String(raw), 10);
  return Number.isFinite(days) && days > 0 && days < 60 ? days : 0;
}

function buildRecord(product, copy, query) {
  const price = toNumber(product.target_sale_price);
  const original = toNumber(product.target_original_price);
  const image = normalizeUrl(product.product_main_image_url);
  const subId = String(product.product_id);

  return {
    external_id: `aliexpress:${product.product_id}`,
    title: copy?.title || product.product_title.slice(0, 110),
    description: copy?.description || '',
    why: copy?.why || '',
    image_url: image,
    category: copy?.category || CATEGORIES[0],
    price,
    original_price: original > price ? original : 0,
    discount_percent: Math.round(toNumber(product.discount)),
    rating: Math.round(ratingPercent(product.evaluate_rate) * 10) / 10,
    orders: Number(product.lastest_volume || 0),
    commission_rate: commissionPercent(product),
    shipping_days: shippingDays(product),
    sub_id: subId,
    affiliate_url: withSubId(product.promotion_link, subId),
    source_query: query,
    score: Math.round(scoreProduct(product) * 10) / 10,
    ai_written: Boolean(copy),
    status: 'pending'
  };
}

async function main() {
  if (!ALIEXPRESS_APP_KEY || !ALIEXPRESS_APP_SECRET || !ALIEXPRESS_TRACKING_ID) {
    throw new Error('Missing ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET / ALIEXPRESS_TRACKING_ID.');
  }
  if (!DRY_RUN && !SUPABASE_URL) throw new Error('Missing SUPABASE_URL.');

  let pending = 0;
  if (!DRY_RUN) {
    if (!SUPABASE_SECRET_KEY) throw new Error('Missing SUPABASE_SECRET_KEY.');
    pending = await countPending();
    if (pending >= PENDING_LIMIT) {
      console.log(`Pending queue is full (${pending}/${PENDING_LIMIT}). Waiting for admin review.`);
      return;
    }
  }

  const wanted = Math.min(ITEMS_PER_RUN, DRY_RUN ? ITEMS_PER_RUN : PENDING_LIMIT - pending);
  const seen = new Map();

  for (const query of pickRandomQueries(4)) {
    try {
      const items = await queryProducts(query, Math.floor(Math.random() * 3) + 1);
      console.log(`[AliExpress] "${query}": ${items.length} items`);
      for (const p of items) {
        if (isGoodProduct(p) && !seen.has(String(p.product_id))) {
          seen.set(String(p.product_id), { ...p, _query: query });
        }
      }
    } catch (err) {
      console.warn(`[AliExpress] "${query}" failed: ${err.message}`);
    }
  }

  const ids = DRY_RUN ? new Set() : await existingIds();
  const candidates = [...seen.values()]
    .filter((p) => !ids.has(`aliexpress:${p.product_id}`))
    .sort((a, b) => scoreProduct(b) - scoreProduct(a));

  const selected = [];
  const usedQueries = new Set();
  for (const p of candidates) {
    if (selected.length >= wanted) break;
    if (usedQueries.has(p._query)) continue;
    usedQueries.add(p._query);
    selected.push(p);
  }
  for (const p of candidates) {
    if (selected.length >= wanted) break;
    if (!selected.includes(p)) selected.push(p);
  }

  console.log(`Selected ${selected.length} new product(s) for review.`);
  if (!selected.length) return;

  const records = [];
  for (const product of selected) {
    records.push(buildRecord(product, await writeHebrewCopy(product), product._query));
  }

  if (DRY_RUN) {
    console.log(JSON.stringify(records, null, 2));
    return;
  }

  await insertProducts(records);
  console.log(`Added ${records.length} product(s) to the admin review queue.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
