import crypto from 'node:crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://sqqghfcdgswvwvbiulwk.supabase.co').replace(/\/+$/, '');
const SUPABASE_SECRET_KEY = (process.env.SUPABASE_SECRET_KEY || '').trim();
const NEWS_SERVER_URL = (process.env.NEWS_SERVER_URL || '').trim().replace(/\/+$/, '');

const CATEGORY = process.env.NEWS_CATEGORY || 'חדשות';
const MAX_AGE_HOURS = Number(process.env.NEWS_MAX_AGE_HOURS || 12);
const MAX_POSTS_PER_RUN = Number(process.env.NEWS_MAX_POSTS_PER_RUN || 10);
const INCLUDE_SOURCE_LINK = String(process.env.NEWS_INCLUDE_LINK || 'false').toLowerCase() === 'true';
const DRY_RUN = String(process.env.DRY_RUN || '0') === '1';

// מקורות RSS נקיים מהתוסף הקיים — ניתן להוסיף או להסיר לפי הצורך
const RSS_SOURCES = [
  { id: 'jdn', name: 'JDN', url: 'https://www.jdn.co.il/feed/' },
  { id: 'hm-news', name: 'המחדש', url: 'https://hm-news.co.il/feed/' },
  { id: 'inn', name: 'ערוץ 7', url: 'https://www.inn.co.il/Rss.aspx?Category=1' },
  { id: 'srugim', name: 'סרוגים', url: 'https://www.srugim.co.il/feed' },
  { id: 'bhol', name: 'בחדרי חרדים', url: 'https://www.bhol.co.il/rss.xml' },
  { id: 'now14', name: 'ערוץ 14', url: 'https://www.now14.co.il/feed/' }
];

// מילות חסימה לסינון תכנים לא מתאימים / פרסומות (תואם נטפרי)
const BLOCK_KEYWORDS = [
  'אונס', 'נאנסה', 'פדופיל', 'פדופיליה', 'תקיפה מינית', 'הטרדה מינית',
  'מעשה מגונה', 'מעשים מגונים', 'גילוי עריות', 'סקס', 'יחסי אישות', 'פורנו',
  'יחסי מין', 'פורנוגרפיה',
  'פרסומת', 'ממומן', 'פוסט ממומן', 'תוכן שיווקי', 'דיל היום', 'קופון חלומי', 'קנו עכשיו'
];

const CENSOR_WORDS = [
  'חראות', 'חרא', 'זבלים', 'זבל', 'נבלות', 'נבלה', 'מחורבנת', 'מחורבן', 'חולירע', 'לעזאזל',
  'בן זונה', 'זונות', 'זונה', 'שרמוטה', 'מניאקים', 'מניאק', 'שרצים', 'שיט'
];

const STOP_PHRASES = [
  'להמשך קריאה', 'להצטרפות', 'לכל העדכונים', 'כנסו', 'לפרטים נוספים',
  't.me', 'chat.whatsapp.com', 'לקבוצת הוואטסאפ', 'לערוץ הטלגרם',
  'The post ', 'appeared first on', 'הפוסט '
];

function decodeEntities(str) {
  if (!str) return '';
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    ndash: '–',
    mdash: '—',
    hellip: '...',
    laquo: '«',
    raquo: '»'
  };
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&([a-z]+);/gi, (full, name) => named[name.toLowerCase()] ?? full);
}

function stripHtmlAndBoilerplate(raw) {
  if (!raw) return '';
  let text = decodeEntities(raw)
    .replace(/<(br|\/p|\/div|\/li)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '');

  const lines = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/[ \t]+/g, ' ').trim();
    if (!line) continue;
    if (STOP_PHRASES.some((phrase) => line.includes(phrase))) break;
    lines.push(line);
  }
  return lines.join('\n').trim();
}

function shouldBlockMessage(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BLOCK_KEYWORDS.some((word) => lower.includes(word));
}

function censorText(text) {
  if (!text) return '';
  let out = text;
  for (const word of CENSOR_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escaped, 'gi'), '***');
  }
  return out;
}

function truncateText(text, maxLen = 420) {
  if (!text || text.length <= maxLen) return text;
  const sliced = text.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 120 ? sliced.slice(0, lastSpace) : sliced).trim()}...`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function extractTag(block, tagNames) {
  for (const tag of tagNames) {
    const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = block.match(re);
    if (match && match[1]) return match[1].trim();
  }
  return '';
}

function extractAtomLink(block) {
  const hrefMatch = block.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    || block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  if (hrefMatch?.[1]) return hrefMatch[1].trim();
  return stripHtmlAndBoilerplate(extractTag(block, ['link']));
}

function parseRssOrAtom(xml, source) {
  const itemBlocks = [];
  const rssMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const atomMatches = rssMatches.length ? [] : (xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []);
  for (const block of [...rssMatches, ...atomMatches]) {
    const rawTitle = extractTag(block, ['title']);
    const rawBody = extractTag(block, ['description', 'content:encoded', 'summary', 'content']);
    const rawDate = extractTag(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const rawGuid = extractTag(block, ['guid', 'id']);
    const link = extractAtomLink(block);

    const title = stripHtmlAndBoilerplate(rawTitle);
    const body = stripHtmlAndBoilerplate(rawBody);
    const uidBase = stripHtmlAndBoilerplate(rawGuid) || link || title;
    if (!title && !body) continue;

    const parsedTime = rawDate ? new Date(decodeEntities(rawDate)).getTime() : Date.now();
    const publishedAt = Number.isFinite(parsedTime) ? Math.min(parsedTime, Date.now()) : Date.now();

    itemBlocks.push({
      sourceId: source.id,
      sourceName: source.name,
      uid: uidBase,
      title,
      body,
      link,
      publishedAt
    });
  }
  return itemBlocks;
}

async function fetchRssSource(source) {
  const res = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; HamakomNewsBot/1.0)',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseRssOrAtom(xml, source);
}

async function fetchOptionalNewsServer() {
  if (!NEWS_SERVER_URL) return [];
  const candidates = [`${NEWS_SERVER_URL}/news`, NEWS_SERVER_URL];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HamakomNewsBot/1.0)' },
        signal: AbortSignal.timeout(12000)
      });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.news) ? data.news : []);
      if (!arr.length) continue;

      return arr.map((item) => {
        const parsedTime = item.time ? new Date(item.time).getTime() : Date.now();
        return {
          sourceId: 'server',
          sourceName: String(item.source || 'עדכון חדשות').trim(),
          uid: String(item.hash || item.link || item.title || item.content || '').trim(),
          title: stripHtmlAndBoilerplate(item.title || ''),
          body: stripHtmlAndBoilerplate(item.content || ''),
          link: String(item.link || '').trim(),
          publishedAt: Number.isFinite(parsedTime) ? Math.min(parsedTime, Date.now()) : Date.now()
        };
      });
    } catch {
      // Fallback to next URL or RSS feeds
    }
  }
  return [];
}

function buildPostRecord(item) {
  const cleanTitle = censorText(item.title);
  let cleanBody = censorText(item.body);

  if (!cleanTitle && !cleanBody) return null;
  if (shouldBlockMessage(`${cleanTitle}\n${cleanBody}`)) return null;

  // מניעת כפילות אם התקציר זהה לכותרת
  if (cleanTitle && cleanBody && (cleanBody === cleanTitle || cleanBody.startsWith(cleanTitle))) {
    cleanBody = cleanBody.slice(cleanTitle.length).replace(/^[\s\-:|–]+/, '').trim();
  }
  cleanBody = truncateText(cleanBody, 420);

  const hash = crypto
    .createHash('sha256')
    .update(`${item.sourceId}|${item.uid || cleanTitle}`)
    .digest('hex')
    .slice(0, 28);

  const headerLine = cleanTitle
    ? `<b>📰 ${escapeHtml(item.sourceName)} | ${escapeHtml(cleanTitle)}</b>`
    : `<b>📰 ${escapeHtml(item.sourceName)}</b>`;

  const parts = [headerLine];
  if (cleanBody) {
    parts.push(escapeHtml(cleanBody).replace(/\n+/g, '<br>'));
  }
  if (INCLUDE_SOURCE_LINK && /^https?:\/\//i.test(item.link || '')) {
    parts.push(`<a href="${escapeAttr(item.link)}">לכתבה המלאה</a>`);
  }

  return {
    external_id: `news:${item.sourceId}:${hash}`,
    content: parts.join('<br>'),
    media_type: 'none',
    media_url: '',
    media_name: '',
    category: CATEGORY,
    is_pinned: false,
    created_at: new Date(item.publishedAt).toISOString()
  };
}

async function fetchExistingExternalIds() {
  const url = `${SUPABASE_URL}/rest/v1/posts?select=external_id&external_id=not.is.null&order=id.desc&limit=300`;
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
  if (!DRY_RUN && !SUPABASE_SECRET_KEY) {
    throw new Error('Missing SUPABASE_SECRET_KEY environment variable.');
  }

  const cutoffMs = Date.now() - MAX_AGE_HOURS * 3600 * 1000;
  const collected = [];

  const rssResults = await Promise.allSettled(RSS_SOURCES.map((src) => fetchRssSource(src)));
  rssResults.forEach((result, idx) => {
    const source = RSS_SOURCES[idx];
    if (result.status === 'fulfilled') {
      console.log(`[RSS] ${source.name}: fetched ${result.value.length} items`);
      collected.push(...result.value);
    } else {
      console.warn(`[RSS] ${source.name}: skipped (${result.reason?.message || result.reason})`);
    }
  });

  if (NEWS_SERVER_URL) {
    const serverItems = await fetchOptionalNewsServer();
    console.log(`[Server] fetched ${serverItems.length} items`);
    collected.push(...serverItems);
  }

  const recentItems = collected
    .filter((item) => item.publishedAt >= cutoffMs)
    .sort((a, b) => a.publishedAt - b.publishedAt);

  const candidates = [];
  const seenLocal = new Set();
  for (const item of recentItems) {
    const record = buildPostRecord(item);
    if (!record || seenLocal.has(record.external_id)) continue;
    seenLocal.add(record.external_id);
    candidates.push(record);
  }

  console.log(`Candidates after filtering (last ${MAX_AGE_HOURS}h): ${candidates.length}`);

  if (DRY_RUN) {
    const preview = candidates.slice(-Math.min(5, candidates.length));
    console.log('--- DRY RUN PREVIEW (latest up to 5) ---');
    for (const p of preview) {
      console.log(`[${p.created_at}] ${p.external_id}\n${p.content}\n`);
    }
    return;
  }

  const existingIds = await fetchExistingExternalIds();
  const toInsert = candidates
    .filter((record) => !existingIds.has(record.external_id))
    .slice(-MAX_POSTS_PER_RUN);

  if (!toInsert.length) {
    console.log('No new news items to publish.');
    return;
  }

  const inserted = await insertPosts(toInsert);
  console.log(`Published ${inserted.length} new news post(s) to category "${CATEGORY}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
