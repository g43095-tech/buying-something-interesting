import crypto from 'node:crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://sqqghfcdgswvwvbiulwk.supabase.co').replace(/\/+$/, '');
const SUPABASE_SECRET_KEY = (process.env.SUPABASE_SECRET_KEY || '').trim();

const ALIEXPRESS_APP_KEY = (process.env.ALIEXPRESS_APP_KEY || '').trim();
const ALIEXPRESS_APP_SECRET = (process.env.ALIEXPRESS_APP_SECRET || '').trim();
const ALIEXPRESS_TRACKING_ID = (process.env.ALIEXPRESS_TRACKING_ID || 'levtov').trim();

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-flash-latest'];

const CATEGORY = process.env.ALIEXPRESS_CATEGORY || 'דילים';
const POSTS_PER_RUN = Number(process.env.ALIEXPRESS_POSTS_PER_RUN || 2);
const MIN_SALES = Number(process.env.ALIEXPRESS_MIN_SALES || 50);
const MIN_RATING_PCT = Number(process.env.ALIEXPRESS_MIN_RATING_PCT || 90);
const MIN_COMMISSION_PCT = Number(process.env.ALIEXPRESS_MIN_COMMISSION_PCT || 5);
const MIN_PRICE_ILS = Number(process.env.ALIEXPRESS_MIN_PRICE_ILS || 15);
const MAX_PRICE_ILS = Number(process.env.ALIEXPRESS_MAX_PRICE_ILS || 450);
const DRY_RUN = String(process.env.DRY_RUN || '0') === '1';

// שאילתות חיפוש ממוקדות בגאדג'טים ומוצרים מעניינים לבית
const SEARCH_QUERIES = [
  'cool smart home gadget',
  'unique kitchen gadget',
  'creative desk gadget',
  'magnetic home organizer',
  'mini portable gadget',
  'smart led sensor light',
  'useful home improvement tool',
  'creative coffee gadget',
  'smart storage organizer',
  'portable mini vacuum cleaner',
  'digital kitchen scale timer',
  'usb rechargeable gadget'
];

// מילות חסימה לסינון מוצרים לא מתאימים (תואם נטפרי)
const BLOCK_PRODUCT_WORDS = [
  'sexy', 'lingerie', 'bikini', 'bra', 'underwear', 'swimsuit', 'dress',
  'women fashion', 'woman', 'girl', 'adult', 'erotic', 'vape', 'cigarette',
  'knife', 'weapon', 'gun', 'tattoo', 'wine', 'alcohol', 'beer'
];

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function pickRandomQueries(count = 3) {
  const copy = [...SEARCH_QUERIES];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function signAliExpressParams(params) {
  const sortedStr = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join('');
  return crypto
    .createHmac('sha256', ALIEXPRESS_APP_SECRET)
    .update(sortedStr, 'utf8')
    .digest('hex')
    .toUpperCase();
}

async function queryAliExpressProducts(keywords, pageNo = 1) {
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
  params.sign = signAliExpressParams(params);

  const body = new URLSearchParams(params);
  const res = await fetch('https://api-sg.aliexpress.com/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    throw new Error(`AliExpress API HTTP ${res.status}`);
  }

  const data = await res.json();
  const result = data?.aliexpress_affiliate_product_query_response?.resp_result?.result;
  const products = result?.products?.product;
  return Array.isArray(products) ? products : [];
}

function parseRatingPercent(raw) {
  if (!raw) return 0;
  const num = Number.parseFloat(String(raw).replace('%', '').trim());
  if (!Number.isFinite(num)) return 0;
  return num <= 5 ? num * 20 : num;
}

function parsePrice(raw) {
  const num = Number.parseFloat(String(raw || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function parseDiscount(raw) {
  const num = Number.parseInt(String(raw || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(num) ? num : 0;
}

function parseCommissionPercent(p) {
  const base = Number.parseFloat(String(p?.commission_rate || '0').replace('%', '').trim()) || 0;
  const hot = Number.parseFloat(String(p?.hot_product_commission_rate || '0').replace('%', '').trim()) || 0;
  return Math.max(base, hot);
}

function isGoodProduct(p) {
  if (!p?.product_id || !p?.product_title || !p?.promotion_link || !p?.product_main_image_url) {
    return false;
  }

  const titleLower = `${p.product_title} ${p.first_level_category_name || ''} ${p.second_level_category_name || ''}`.toLowerCase();
  if (BLOCK_PRODUCT_WORDS.some((w) => titleLower.includes(w))) {
    return false;
  }

  const price = parsePrice(p.target_sale_price);
  if (price < MIN_PRICE_ILS || price > MAX_PRICE_ILS) {
    return false;
  }

  const sales = Number(p.lastest_volume || 0);
  if (sales < MIN_SALES) {
    return false;
  }

  const ratingPct = parseRatingPercent(p.evaluate_rate);
  if (ratingPct > 0 && ratingPct < MIN_RATING_PCT) {
    return false;
  }

  const commissionPct = parseCommissionPercent(p);
  if (commissionPct < MIN_COMMISSION_PCT) {
    return false;
  }

  return true;
}

function scoreProduct(p) {
  const sales = Number(p.lastest_volume || 0);
  const ratingPct = parseRatingPercent(p.evaluate_rate) || 92;
  const discount = parseDiscount(p.discount);
  const commissionPct = parseCommissionPercent(p);
  return Math.log10(Math.max(10, sales)) * 30 + (ratingPct - 85) * 3 + discount * 0.5 + commissionPct * 8;
}

async function generateHebrewCopyWithGemini(product) {
  if (!GEMINI_API_KEY) return null;

  const prompt = `אתה קופירייטר ישראלי שכותב פוסטים קצרים ומושכים לערוץ דילים נקי (מותאם לציבור דתי/חרדי, ללא שפה בוטה).
כתוב פוסט קצר בעברית עבור המוצר הבא מאליאקספרס:
- שם מוצר באנגלית: ${product.product_title}
- קטגוריה: ${product.second_level_category_name || product.first_level_category_name || 'גאדג׳טים ובית'}
- מחיר: ₪${product.target_sale_price} (הנחה: ${product.discount || 'מבצע'})
- דירוג: ${product.evaluate_rate || 'גבוה'} | מכירות אחרונות: ${product.lastest_volume || 0}

החזר JSON בלבד בפורמט הזה (בלי טקסט נוסף ובלי markdown):
{"title": "כותרת קצרה ומושכת בעברית עם אימוג'י אחד בהתחלה (עד 8 מילים)", "description": "2-3 משפטים קצרים בעברית שמסבירים מה המוצר עושה ולמה הוא שימושי ומגניב לבית"}`;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(20000)
        });

        if (res.status === 503 || res.status === 429) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        if (!res.ok) break;

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed?.title && parsed?.description) {
          return {
            title: String(parsed.title).trim(),
            description: String(parsed.description).trim()
          };
        }
      } catch {
        // try next attempt / model
      }
    }
  }
  return null;
}

async function buildPostRecord(product) {
  const aiCopy = await generateHebrewCopyWithGemini(product);
  const title = aiCopy?.title || `🔥 ${product.product_title.slice(0, 75)}`;
  const description = aiCopy?.description || 'מוצר מומלץ ומבוקש במיוחד מאליאקספרס עם ביקורות מצוינות!';

  const salePrice = parsePrice(product.target_sale_price).toFixed(0);
  const origPrice = parsePrice(product.target_original_price).toFixed(0);
  const discount = parseDiscount(product.discount);
  const rating = product.evaluate_rate || '95%+';
  const sales = Number(product.lastest_volume || 0);

  const priceLine =
    Number(origPrice) > Number(salePrice) && discount > 0
      ? `💰 <b>מחיר: ₪${salePrice}</b> (במקום ₪${origPrice} • ${discount}% הנחה)`
      : `💰 <b>מחיר: ₪${salePrice}</b>`;

  const statsLine = `⭐ דירוג: ${escapeHtml(rating)} | 🛒 ${sales}+ הזמנות`;
  const linkLine = `<a href="${escapeAttr(product.promotion_link)}">👉 לרכישה באליאקספרס</a>`;

  const content = [
    `<b>${escapeHtml(title)}</b>`,
    escapeHtml(description),
    '',
    priceLine,
    statsLine,
    linkLine
  ].join('<br>');

  return {
    external_id: `aliexpress:${product.product_id}`,
    content,
    media_type: 'image',
    media_url: product.product_main_image_url,
    media_name: `${product.product_id}.jpg`,
    category: CATEGORY,
    is_pinned: false,
    created_at: new Date().toISOString()
  };
}

async function fetchExistingAliExpressIds() {
  const url = `${SUPABASE_URL}/rest/v1/posts?select=external_id&external_id=like.aliexpress:*&order=id.desc&limit=500`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed reading existing posts (${res.status}): ${errText}`);
  }
  const rows = await res.json();
  return new Set(rows.map((r) => r.external_id).filter(Boolean));
}

async function insertPosts(records) {
  if (!records.length) return [];
  const url = `${SUPABASE_URL}/rest/v1/posts?on_conflict=external_id`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation'
    },
    body: JSON.stringify(records),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed inserting posts (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function main() {
  if (!ALIEXPRESS_APP_KEY || !ALIEXPRESS_APP_SECRET) {
    throw new Error('Missing ALIEXPRESS_APP_KEY or ALIEXPRESS_APP_SECRET environment variable.');
  }
  if (!DRY_RUN && !SUPABASE_SECRET_KEY) {
    throw new Error('Missing SUPABASE_SECRET_KEY environment variable.');
  }

  const queries = pickRandomQueries(3);
  const byId = new Map();

  for (const q of queries) {
    try {
      const pageNo = Math.floor(Math.random() * 3) + 1;
      const items = await queryAliExpressProducts(q, pageNo);
      console.log(`[AliExpress] "${q}" (page ${pageNo}): fetched ${items.length} items`);
      for (const p of items) {
        if (isGoodProduct(p) && !byId.has(String(p.product_id))) {
          byId.set(String(p.product_id), { ...p, _query: q });
        }
      }
    } catch (err) {
      console.warn(`[AliExpress] "${q}" failed: ${err.message}`);
    }
  }

  const existingIds = DRY_RUN ? new Set() : await fetchExistingAliExpressIds();
  const candidates = Array.from(byId.values())
    .filter((p) => !existingIds.has(`aliexpress:${p.product_id}`))
    .sort((a, b) => scoreProduct(b) - scoreProduct(a));

  console.log(`Filtered quality candidates: ${candidates.length}`);

  // בחירת מוצר אחד מקסימום מכל שאילתת חיפוש כדי לשמור על גיוון ולא להעלות שני מוצרים דומים
  const selected = [];
  const usedQueries = new Set();
  for (const p of candidates) {
    if (selected.length >= POSTS_PER_RUN) break;
    if (usedQueries.has(p._query)) continue;
    usedQueries.add(p._query);
    selected.push(p);
  }
  // אם חסרים מוצרים בגלל גיוון, משלימים מהמועמדים הנותרים
  if (selected.length < POSTS_PER_RUN) {
    for (const p of candidates) {
      if (selected.length >= POSTS_PER_RUN) break;
      if (!selected.includes(p)) selected.push(p);
    }
  }
  if (!selected.length) {
    console.log('No new qualifying AliExpress products found.');
    return;
  }

  const records = [];
  for (const product of selected) {
    records.push(await buildPostRecord(product));
  }

  if (DRY_RUN) {
    console.log('--- DRY RUN PREVIEW ---');
    for (const r of records) {
      console.log(`[${r.external_id}] image: ${r.media_url}\n${r.content}\n`);
    }
    return;
  }

  const inserted = await insertPosts(records);
  console.log(`Published ${inserted.length} AliExpress deal(s) to category "${CATEGORY}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
