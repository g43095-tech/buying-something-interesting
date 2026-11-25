// רענון מחירים וזמינות למוצרים מאושרים:
// שולף מחדש את פרטי המוצר מאליאקספרס, מעדכן מחיר/דירוג/הזמנות/תמונה,
// ומוציא מהאתר מוצר שנעלם שלוש פעמים ברצף (קישור מת או מלאי נגמר).
// הרצה ידנית: node scripts/refresh_aliexpress_shop.mjs

import crypto from 'node:crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://louxyixmnftfqcfjkxsz.supabase.co').replace(/\/+$/, '');
const SUPABASE_SECRET_KEY = (process.env.SUPABASE_SECRET_KEY || '').trim();

const ALIEXPRESS_APP_KEY = (process.env.ALIEXPRESS_APP_KEY || '').trim();
const ALIEXPRESS_APP_SECRET = (process.env.ALIEXPRESS_APP_SECRET || '').trim();
const ALIEXPRESS_TRACKING_ID = (process.env.ALIEXPRESS_TRACKING_ID || 'levtov').trim();

const MAX_MISSING = Number(process.env.SHOP_MAX_MISSING || 3);
const BATCH_SIZE = Number(process.env.SHOP_REFRESH_BATCH || 20);
const DRY_RUN = String(process.env.DRY_RUN || '0') === '1';

const toNumber = (raw) => {
  const n = Number.parseFloat(String(raw || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const ratingPercent = (raw) => {
  const n = toNumber(raw);
  if (!n) return 0;
  return n <= 5 ? n * 20 : n;
};

function normalizeUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value.startsWith('//') ? `https:${value}` : value;
}

function withSubId(rawUrl, subId) {
  try {
    const url = new URL(normalizeUrl(rawUrl));
    url.searchParams.set('sub_id', subId);
    return url.toString();
  } catch {
    return '';
  }
}

function signParams(params) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
  return crypto.createHmac('sha256', ALIEXPRESS_APP_SECRET).update(sorted, 'utf8').digest('hex').toUpperCase();
}

async function fetchApproved() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/shop_products?select=id,external_id,price,original_price,discount_percent,rating,orders,affiliate_url,sub_id,missing_count&status=eq.approved&limit=500`,
    {
      headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` },
      signal: AbortSignal.timeout(20000)
    }
  );
  if (res.status === 404) throw new Error('Table shop_products not found. Run aliexpress_shop_schema.sql first.');
  if (!res.ok) throw new Error(`Failed loading approved products (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function queryDetails(productIds) {
  const params = {
    app_key: ALIEXPRESS_APP_KEY,
    method: 'aliexpress.affiliate.productdetail.get',
    sign_method: 'sha256',
    timestamp: String(Date.now()),
    tracking_id: ALIEXPRESS_TRACKING_ID,
    product_ids: productIds.join(','),
    ship_to_country: 'IL',
    target_currency: 'ILS',
    target_language: 'EN',
    fields:
      'product_id,product_title,target_sale_price,target_original_price,discount,evaluate_rate,lastest_volume,product_main_image_url,promotion_link'
  };
  params.sign = signParams(params);

  const res = await fetch('https://api-sg.aliexpress.com/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`AliExpress API HTTP ${res.status}`);

  const data = await res.json();
  const result = data?.aliexpress_affiliate_productdetail_get_response?.resp_result;
  // תשובה בלי resp_result היא כשל API, לא הוכחה שהמוצרים נעלמו
  if (!result) throw new Error('Unexpected AliExpress response');
  const code = Number(result.resp_code);
  if (Number.isFinite(code) && code !== 200) throw new Error(`AliExpress resp_code ${code}`);

  const products = result?.result?.products?.product;
  return Array.isArray(products) ? products : [];
}

async function patchProduct(id, values) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shop_products?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(values),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`Failed updating product ${id} (${res.status}): ${await res.text()}`);
}

function externalProductId(row) {
  return String(row.external_id || '').replace(/^aliexpress:/, '');
}

async function main() {
  if (!SUPABASE_SECRET_KEY) throw new Error('Missing SUPABASE_SECRET_KEY.');
  if (!ALIEXPRESS_APP_KEY || !ALIEXPRESS_APP_SECRET) throw new Error('Missing AliExpress credentials.');

  const approved = await fetchApproved();
  console.log(`[refresh] ${approved.length} approved product(s)`);
  if (!approved.length) return;

  const byExternal = new Map(approved.map((row) => [externalProductId(row), row]));
  const ids = Array.from(byExternal.keys()).filter(Boolean);

  let updated = 0;
  let removed = 0;
  const now = new Date().toISOString();

  for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
    const batch = ids.slice(offset, offset + BATCH_SIZE);
    let details = [];
    try {
      details = await queryDetails(batch);
    } catch (err) {
      console.warn(`[refresh] batch ${offset / BATCH_SIZE + 1} failed: ${err.message}. Skipping.`);
      continue;
    }

    const seen = new Set();
    for (const detail of details) {
      const local = byExternal.get(String(detail.product_id));
      if (!local) continue;
      seen.add(String(detail.product_id));

      const price = toNumber(detail.target_sale_price);
      const original = toNumber(detail.target_original_price);
      const values = {
        price,
        original_price: original > price ? original : 0,
        discount_percent: Math.round(toNumber(detail.discount)),
        rating: Math.round(ratingPercent(detail.evaluate_rate) * 10) / 10,
        orders: Number(detail.lastest_volume || 0),
        price_updated_at: now,
        missing_count: 0
      };
      if (normalizeUrl(detail.product_main_image_url)) values.image_url = normalizeUrl(detail.product_main_image_url);
      const link = withSubId(detail.promotion_link, local.sub_id);
      if (link) values.affiliate_url = link;

      if (DRY_RUN) {
        console.log('[dry-run]', local.id, values);
        updated += 1;
        continue;
      }

      try {
        await patchProduct(local.id, values);
        updated += 1;
      } catch (err) {
        console.warn(`[refresh] ${local.id} update failed: ${err.message}`);
      }
    }

    for (const productId of batch) {
      if (seen.has(productId)) continue;
      const local = byExternal.get(productId);
      if (!local) continue;
      const missing = Number(local.missing_count || 0) + 1;
      const values = { missing_count: missing, price_updated_at: now };
      if (missing >= MAX_MISSING) {
        values.status = 'removed';
        values.reviewed_at = now;
        removed += 1;
        console.log(`[refresh] removing ${local.id}: missing ${missing} times in a row`);
      }
      if (DRY_RUN) {
        console.log('[dry-run]', local.id, values);
        continue;
      }

      try {
        await patchProduct(local.id, values);
      } catch (err) {
        console.warn(`[refresh] ${local.id} update failed: ${err.message}`);
      }
    }
  }

  console.log(`[refresh] updated ${updated} product(s), removed ${removed} dead product(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
