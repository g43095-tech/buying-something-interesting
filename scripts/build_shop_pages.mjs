// בניית דפי המוצר והקטגוריה הסטטיים + sitemap.xml + robots.txt.
// הרצה: node scripts/build_shop_pages.mjs            (קורא מוצרים מאושרים מ-Supabase)
//        node scripts/build_shop_pages.mjs --demo     (מוצרי הדגמה מקומיים)
// משתני סביבה: SUPABASE_URL, SUPABASE_SECRET_KEY, SHOP_SITE_URL (למשל https://shop.example.com)
// כל דף נוצר כ-index.html בתיקייה משלו, כדי שהכתובת תהיה נקייה: /p/<id>/ ו-/c/<slug>/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');

const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const DEMO = args.includes('--demo');
const OUT_DIR = path.resolve(PROJECT_ROOT, valueOf('--out', 'aliexpress-store'));
const SITE_URL = String(valueOf('--site-url', process.env.SHOP_SITE_URL || '')).replace(/\/+$/, '');
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://louxyixmnftfqcfjkxsz.supabase.co').replace(/\/+$/, '');
const SUPABASE_SECRET_KEY = (process.env.SUPABASE_SECRET_KEY || '').trim();
const SITE_NAME = 'המדף';
const ASSET_VERSION = '20261125a';

const CATEGORY_SLUGS = {
  'בית ומטבח': 'home-kitchen',
  'גאדג׳טים': 'gadgets',
  'ארגון ואחסון': 'storage',
  'רכב': 'car',
  'טיפוח ופנאי': 'care',
  'כלי עבודה': 'tools'
};

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value) {
  const n = Number(value) || 0;
  return '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: n % 1 ? 2 : 0 });
}

function normalizeUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('//') ? `https:${value}` : '';
}

function withSubId(raw, id) {
  const url = normalizeUrl(raw);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.get('sub_id')) parsed.searchParams.set('sub_id', String(id));
    return parsed.toString();
  } catch {
    return url;
  }
}

function hashCode(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36).slice(0, 8);
}

function categorySlug(name) {
  const clean = String(name || 'כללי').trim() || 'כללי';
  return CATEGORY_SLUGS[clean] || `cat-${hashCode(clean)}`;
}

function safeId(value) {
  const clean = String(value == null ? '' : value).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  return clean || hashCode(String(value));
}

function productPath(product) {
  return `p/${safeId(product.id)}/`;
}

function categoryPath(name) {
  return `c/${categorySlug(name)}/`;
}

function imageVariants(raw) {
  const src = normalizeUrl(raw);
  if (!src) return { src: '', srcset: '' };
  // באליאקספרס סיומת שינוי הגודל נדבקת אחרי שם הקובץ: name.jpg_640x640.jpg
  const original = src
    .replace(/_\.webp$/i, '')
    .replace(/_(\d+)x(\d+)(q\d+)?\.(jpe?g|png|webp)$/i, '.$4');
  const match = /^(https?:\/\/[^/]+\/.+)(\.(?:jpe?g|png|webp))$/i.exec(original);
  if (!match || !/(alicdn\.com|aliexpress-media\.com)/i.test(match[1])) {
    return { src: original, srcset: '' };
  }
  const ext = match[2];
  const small = `${original}_300x300${ext}`;
  const large = `${original}_640x640${ext}`;
  return { src: large, srcset: `${small} 300w, ${large} 640w` };
}

// התמונה הראשית: הראשונה שסומנה כמאושרת, ואם אין גלריה — image_url
function primaryImage(product) {
  const list = Array.isArray(product.images) ? product.images : [];
  const approved = list.filter((img) => img && img.approved && normalizeUrl(img.url));
  if (approved.length) return normalizeUrl(approved[0].url);
  return normalizeUrl(product.image_url);
}

// הדירוג מגיע מאליאקספרס כאחוז דירוגים חיוביים (97.5), לא ככוכבים
function ratingPercentValue(product) {
  const n = Number(product.rating) || 0;
  if (!n) return 0;
  return n <= 5 ? n * 20 : n;
}

function ratingLabel(product) {
  const n = ratingPercentValue(product);
  if (!n) return '';
  return `${n.toFixed(1).replace(/\.0$/, '')}% חיוביים`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fallbackWhy(product) {
  const parts = [];
  if (ratingPercentValue(product) >= 92) parts.push(`דירוג ${ratingLabel(product)}`);
  if (Number(product.orders) >= 1000) parts.push(`${Math.round(Number(product.orders) / 100) / 10}K הזמנות`);
  if (Number(product.discount_percent) >= 20) parts.push(`${Math.round(Number(product.discount_percent))}% הנחה`);
  return parts.length ? `נבחר בגלל ${parts.join(', ')}.` : 'מוצר שנבחר בקפידה מתוך הקטלוג של אליאקספרס.';
}

function shippingText(days) {
  const n = Number(days) || 0;
  if (!n) return 'לא צוין — לפי דף המוצר באליאקספרס';
  return `${n}–${n + 6} ימים`;
}

async function loadProducts() {
  if (DEMO) {
    const file = path.join(OUT_DIR, 'assets', 'demo-products.json');
    const rows = JSON.parse(await fs.readFile(file, 'utf8'));
    return rows.filter((row) => (row.status || 'approved') === 'approved');
  }

  if (!SUPABASE_SECRET_KEY) {
    throw new Error('Missing SUPABASE_SECRET_KEY. Use --demo for a local build.');
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/shop_products?select=*&status=eq.approved&order=created_at.desc&limit=2000`,
    {
      headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` },
      signal: AbortSignal.timeout(20000)
    }
  );
  if (!res.ok) throw new Error(`Failed loading products (${res.status}): ${await res.text()}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

function head({ title, description, canonical, ogImage, jsonLd, ogType = 'product' }) {
  const canonicalTag = canonical ? `  <link rel="canonical" href="${esc(canonical)}" />\n` : '';
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index,follow" />
  <meta name="theme-color" content="#fffdf8" />
${canonicalTag}  <meta property="og:type" content="${esc(ogType)}" />
  <meta property="og:site_name" content="${esc(SITE_NAME)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
${canonical ? `  <meta property="og:url" content="${esc(canonical)}" />\n` : ''}${ogImage ? `  <meta property="og:image" content="${esc(ogImage)}" />\n  <meta name="twitter:card" content="summary_large_image" />\n` : ''}  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231d1b15'/><path d='M9 20h14M9 15h14' stroke='%23f6f4ef' stroke-width='2.4' stroke-linecap='round'/></svg>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://ae01.alicdn.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../assets/store.css?v=${ASSET_VERSION}" />
${jsonLd ? `  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n` : ''}</head>`;
}

function topbar() {
  return `  <header class="topbar">
    <a class="brand brand-inline" href="../../index.html"><span class="mark" aria-hidden="true"></span>${esc(SITE_NAME)}</a>
    <nav class="top-nav" aria-label="ניווט">
      <a href="../../index.html">כל המוצרים</a>
    </nav>
    <a class="btn btn-sm top-home" href="../../index.html">לחנות</a>
  </header>`;
}

function footer() {
  return `  <footer class="site-foot">
    <span>${esc(SITE_NAME)} — מוצרים נבחרים מאליאקספרס</span>
    <a href="../../accessibility.html">הצהרת נגישות</a>
    <a href="../../privacy.html">פרטיות</a>
    <a href="../../index.html">חזרה לחנות</a>
  </footer>`;
}

function productJsonLd(product, canonical) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || product.title,
    sku: String(product.external_id || product.id),
    category: product.category || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ILS',
      price: Number(product.price) || 0,
      availability: 'https://schema.org/InStock',
      url: withSubId(product.affiliate_url, product.sub_id || product.id) || canonical || undefined
    }
  };
  const image = normalizeUrl(primaryImage(product));
  if (image) data.image = [image];
  if (ratingPercentValue(product) > 0 && Number(product.orders) > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number((ratingPercentValue(product) / 20).toFixed(1)),
      reviewCount: Number(product.orders),
      bestRating: 5
    };
  }
  return data;
}

function crumbs(category) {
  return `    <nav class="crumbs" aria-label="נתיב ניווט">
      <a href="../../index.html">${esc(SITE_NAME)}</a>
      <span aria-hidden="true">/</span>
      <a href="../../${categoryPath(category)}">${esc(category || 'כללי')}</a>
    </nav>`;
}

function productPage(product, related) {
  const image = imageVariants(primaryImage(product));
  const discount = Number(product.discount_percent) || 0;
  const original = Number(product.original_price) || 0;
  const price = Number(product.price) || 0;
  const buy = withSubId(product.affiliate_url, product.sub_id || product.id);
  const canonical = SITE_URL ? `${SITE_URL}/${productPath(product)}` : '';
  const description = (product.description || product.title).slice(0, 158);
  const why = (product.why || '').trim() || fallbackWhy(product);
  const updated = formatDate(product.price_updated_at || product.updated_at || product.created_at);
  const category = product.category || 'כללי';

  const facts = [];
  if (ratingPercentValue(product)) facts.push(`<li><span class="fact-k">דירוג</span> ${esc(ratingLabel(product))}</li>`);
  if (Number(product.orders)) facts.push(`<li><span class="fact-k">הזמנות</span> ${Number(product.orders).toLocaleString('he-IL')}</li>`);
  facts.push(`<li><span class="fact-k">משלוח</span> ${esc(shippingText(product.shipping_days))}</li>`);
  if (updated) facts.push(`<li><span class="fact-k">מחיר עודכן</span> ${esc(updated)}</li>`);

  const relatedHtml = related.length
    ? `    <section class="related" aria-labelledby="relatedTitle">
      <h2 id="relatedTitle">עוד ב${esc(category)}</h2>
      <div class="grid">
${related.map((item) => card(item, '../../')).join('\n')}
      </div>
    </section>`
    : '';

  return `${head({
    title: `${product.title} — ${SITE_NAME}`,
    description,
    canonical,
    ogImage: normalizeUrl(primaryImage(product)),
    jsonLd: productJsonLd(product, canonical)
  })}
<body class="product-page" data-product-id="${esc(product.id)}">
  <a class="skip-link" href="#main">דילוג לתוכן</a>
${topbar()}

  <main class="product-wrap" id="main">
${crumbs(category)}
    <article class="product-detail">
      <div class="pd-media">
${image.src
    ? `        <img src="${esc(image.src)}"${image.srcset ? ` srcset="${esc(image.srcset)}" sizes="(max-width: 760px) 92vw, 440px"` : ''} alt="${esc(product.title)}" width="640" height="640" fetchpriority="high" decoding="async" />`
    : `        <div class="img-missing">אין תמונה</div>`}
      </div>
      <div class="pd-info">
        <p class="pv-cat">${esc(category)}</p>
        <h1>${esc(product.title)}</h1>
        ${product.description ? `<p class="pd-desc">${esc(product.description)}</p>` : ''}
        <div class="pv-price">
          <span class="price">${money(price)}</span>
          ${original > price ? `<span class="old-price">${money(original)}</span>` : ''}
          ${discount >= 5 ? `<span class="pill">−${discount}%</span>` : ''}
        </div>
        <ul class="pd-facts">${facts.join('')}</ul>
        <div class="pd-why">
          <h2>למה בחרנו בזה</h2>
          <p>${esc(why)}</p>
        </div>
        <div class="pd-actions">
${buy
    ? `          <a class="btn btn-primary" href="${esc(buy)}" target="_blank" rel="nofollow sponsored noopener" data-buy data-id="${esc(product.id)}">לצפייה באליאקספרס</a>`
    : '          <span class="btn" aria-disabled="true">הקישור אינו זמין כרגע</span>'}
          <button class="btn" type="button" data-share data-title="${esc(product.title)}">שיתוף</button>
        </div>
        <p class="pd-note">קישור שותפים: ייתכן שנקבל עמלה על רכישה, בלי תוספת מחיר. המחיר והזמינות לפי אתר אליאקספרס.</p>
      </div>
    </article>
${relatedHtml}
  </main>

  <div class="buy-bar">
    <span class="buy-bar-price">${money(price)}</span>
${buy ? `    <a class="btn btn-primary" href="${esc(buy)}" target="_blank" rel="nofollow sponsored noopener" data-buy data-id="${esc(product.id)}">לצפייה באליאקספרס</a>` : '    <span class="btn" aria-disabled="true">לא זמין</span>'}
  </div>

${footer()}

  <script src="../../config.js?v=${ASSET_VERSION}" defer></script>
  <script src="../../assets/product.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>
`;
}

function card(product, prefix = '') {
  const image = imageVariants(primaryImage(product));
  const original = Number(product.original_price) || 0;
  const price = Number(product.price) || 0;
  const discount = Number(product.discount_percent) || 0;
  const href = `${prefix}${productPath(product)}`;
  return `        <a class="card" href="${esc(href)}">
          <div class="card-media">
${image.src
    ? `            <img src="${esc(image.src)}"${image.srcset ? ` srcset="${esc(image.srcset)}" sizes="(max-width: 560px) 45vw, 220px"` : ''} alt="${esc(product.title)}" width="300" height="300" loading="lazy" decoding="async" />`
    : '            <div class="img-missing">אין תמונה</div>'}
${discount >= 5 ? `            <span class="badge">−${discount}%</span>` : ''}
          </div>
          <div class="card-body">
            <h3 class="card-title">${esc(product.title)}</h3>
            <div class="price-line"><span class="price">${money(price)}</span>${original > price ? `<span class="old-price">${money(original)}</span>` : ''}</div>
            <div class="card-meta">${ratingLabel(product) ? `<span class="star">${esc(ratingLabel(product))}</span>` : ''}${Number(product.orders) ? `<span>${Number(product.orders).toLocaleString('he-IL')} הזמנות</span>` : ''}</div>
          </div>
        </a>`;
}

function categoryPage(category, products, allCategories) {
  const canonical = SITE_URL ? `${SITE_URL}/${categoryPath(category)}` : '';
  const title = `${category} — מוצרים נבחרים | ${SITE_NAME}`;
  const description = `מוצרים נבחרים בקטגוריית ${category} מתוך אליאקספרס, עם מחיר מעודכן וקישור ישיר לרכישה.`;
  const otherLinks = allCategories
    .filter((name) => name !== category)
    .map((name) => `<a class="chip" href="../../${categoryPath(name)}">${esc(name)}</a>`)
    .join('');

  return `${head({
    title,
    description,
    canonical,
    ogType: 'website',
    ogImage: normalizeUrl(products[0] && primaryImage(products[0])),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: products.slice(0, 30).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: SITE_URL ? `${SITE_URL}/${productPath(product)}` : productPath(product)
        }))
      }
    }
  })}
<body class="product-page">
  <a class="skip-link" href="#main">דילוג לתוכן</a>
${topbar()}

  <main class="product-wrap" id="main">
    <nav class="crumbs" aria-label="נתיב ניווט">
      <a href="../../index.html">${esc(SITE_NAME)}</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">${esc(category)}</span>
    </nav>

    <div class="page-head">
      <div>
        <h1>${esc(category)}</h1>
        <p class="page-sub">${products.length} מוצרים נבחרים</p>
      </div>
    </div>

    <div class="grid">
${products.map((product) => card(product, '../../')).join('\n')}
    </div>

    <div class="chips-row">
      <span class="chips-label">קטגוריות נוספות</span>
      ${otherLinks}
    </div>
  </main>

${footer()}
</body>
</html>
`;
}

function sitemap(products, categories) {
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0' },
    ...categories.map((name) => ({ loc: `${SITE_URL}/${categoryPath(name)}`, priority: '0.7' })),
    ...products.map((product) => ({ loc: `${SITE_URL}/${productPath(product)}`, priority: '0.8' }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `  <url><loc>${esc(entry.loc)}</loc><priority>${entry.priority}</priority></url>`).join('\n')}
</urlset>
`;
}

async function main() {
  const products = (await loadProducts()).filter((product) => product && product.title);
  const byCategory = new Map();
  for (const product of products) {
    const name = product.category || 'כללי';
    if (!byCategory.has(name)) byCategory.set(name, []);
    byCategory.get(name).push(product);
  }
  const categories = Array.from(byCategory.keys()).sort((a, b) => a.localeCompare(b, 'he'));

  await fs.rm(path.join(OUT_DIR, 'p'), { recursive: true, force: true });
  await fs.rm(path.join(OUT_DIR, 'c'), { recursive: true, force: true });

  for (const product of products) {
    const category = product.category || 'כללי';
    const related = byCategory.get(category).filter((item) => item !== product).slice(0, 4);
    if (related.length < 4) {
      for (const item of products) {
        if (related.length >= 4) break;
        if (item === product || related.includes(item)) continue;
        related.push(item);
      }
    }
    const dir = path.join(OUT_DIR, 'p', safeId(product.id));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), productPage(product, related.slice(0, 4)), 'utf8');
  }

  for (const category of categories) {
    const dir = path.join(OUT_DIR, 'c', categorySlug(category));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), categoryPage(category, byCategory.get(category), categories), 'utf8');
  }

  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin.html',
    'Disallow: /admin',
    SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml` : '',
    ''
  ].filter(Boolean).join('\n');
  await fs.writeFile(path.join(OUT_DIR, 'robots.txt'), robots, 'utf8');

  if (SITE_URL) {
    await fs.writeFile(path.join(OUT_DIR, 'sitemap.xml'), sitemap(products, categories), 'utf8');
  } else {
    console.log('[build] SHOP_SITE_URL is not set: sitemap.xml was not written.');
  }

  console.log(`[build] ${products.length} product page(s), ${categories.length} category page(s) → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
