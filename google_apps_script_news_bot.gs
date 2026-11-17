/**
 * בוט חדשות אוטומטי בחינם לערוץ "המקום" (Google Apps Script)
 * מושך חדשות מ-RSS נקיים (JDN, המחדש, ערוץ 7, סרוגים, בחדרי חרדים, ערוץ 14),
 * מסנן לפי כללי נטפרי ומפרסם ישירות לטבלת posts בסופאבייס בלי כפילויות.
 *
 * הוראות הפעלה (חד-פעמי):
 * 1. היכנס ל- https://script.google.com/ עם חשבון Google שלך וצור פרויקט חדש (או קובץ חדש באותו פרויקט).
 * 2. הדבק את הקוד הזה והחלף למטה את SUPABASE_SECRET_KEY במפתח Secret/Service Role מ-Supabase.
 * 3. הרץ ידנית פעם אחת את הפונקציה fetchAndPublishNews() ואשר הרשאות גישה חיצונית.
 * 4. בתפריט Triggers (שעון מעורר משמאל) הוסף טריגר:
 *    - Function: fetchAndPublishNews
 *    - Event source: Time-driven
 *    - Type: Minutes timer -> Every 5 minutes
 */

const NEWS_SUPABASE_URL = 'https://sqqghfcdgswvwvbiulwk.supabase.co';
const NEWS_SUPABASE_SECRET_KEY = 'PASTE_YOUR_SUPABASE_SECRET_OR_SERVICE_ROLE_KEY_HERE';
const NEWS_CATEGORY = 'חדשות';
const NEWS_MAX_AGE_HOURS = 12;
const NEWS_MAX_POSTS_PER_RUN = 10;
const NEWS_INCLUDE_SOURCE_LINK = false;

const NEWS_RSS_SOURCES = [
  { id: 'jdn', name: 'JDN', url: 'https://www.jdn.co.il/feed/' },
  { id: 'hm-news', name: 'המחדש', url: 'https://hm-news.co.il/feed/' },
  { id: 'inn', name: 'ערוץ 7', url: 'https://www.inn.co.il/Rss.aspx?Category=1' },
  { id: 'srugim', name: 'סרוגים', url: 'https://www.srugim.co.il/feed' },
  { id: 'bhol', name: 'בחדרי חרדים', url: 'https://www.bhol.co.il/rss.xml' },
  { id: 'now14', name: 'ערוץ 14', url: 'https://www.now14.co.il/feed/' }
];

const NEWS_BLOCK_KEYWORDS = [
  'אונס', 'נאנסה', 'פדופיל', 'פדופיליה', 'תקיפה מינית', 'הטרדה מינית',
  'מעשה מגונה', 'מעשים מגונים', 'גילוי עריות', 'סקס', 'יחסי אישות', 'פורנו',
  'יחסי מין', 'פורנוגרפיה',
  'פרסומת', 'ממומן', 'פוסט ממומן', 'תוכן שיווקי', 'דיל היום', 'קופון חלומי', 'קנו עכשיו'
];

const NEWS_CENSOR_WORDS = [
  'חראות', 'חרא', 'זבלים', 'זבל', 'נבלות', 'נבלה', 'מחורבנת', 'מחורבן', 'חולירע', 'לעזאזל',
  'בן זונה', 'זונות', 'זונה', 'שרמוטה', 'מניאקים', 'מניאק', 'שרצים', 'שיט'
];

const NEWS_STOP_PHRASES = [
  'להמשך קריאה', 'להצטרפות', 'לכל העדכונים', 'כנסו', 'לפרטים נוספים',
  't.me', 'chat.whatsapp.com', 'לקבוצת הוואטסאפ', 'לערוץ הטלגרם',
  'The post ', 'appeared first on', 'הפוסט '
];

function fetchAndPublishNews() {
  if (!NEWS_SUPABASE_SECRET_KEY || NEWS_SUPABASE_SECRET_KEY.indexOf('PASTE_') === 0) {
    throw new Error('יש להדביק תחילה את NEWS_SUPABASE_SECRET_KEY בקוד.');
  }

  const cutoffMs = Date.now() - NEWS_MAX_AGE_HOURS * 3600 * 1000;
  const collected = [];

  NEWS_RSS_SOURCES.forEach(function (source) {
    try {
      const items = fetchRssSourceGas_(source);
      Array.prototype.push.apply(collected, items);
    } catch (err) {
      Logger.log('[RSS] ' + source.name + ' skipped: ' + err.message);
    }
  });

  const recent = collected
    .filter(function (item) { return item.publishedAt >= cutoffMs; })
    .sort(function (a, b) { return a.publishedAt - b.publishedAt; });

  const candidates = [];
  const seenLocal = {};
  recent.forEach(function (item) {
    const rec = buildNewsPostRecordGas_(item);
    if (!rec || seenLocal[rec.external_id]) return;
    seenLocal[rec.external_id] = true;
    candidates.push(rec);
  });

  const existingMap = fetchExistingNewsIdsGas_();
  const toInsert = candidates.filter(function (rec) {
    return !existingMap[rec.external_id];
  }).slice(-NEWS_MAX_POSTS_PER_RUN);

  if (!toInsert.length) {
    Logger.log('אין חדשות חדשות לפרסום כרגע.');
    return;
  }

  const res = UrlFetchApp.fetch(NEWS_SUPABASE_URL + '/rest/v1/posts?on_conflict=external_id', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: NEWS_SUPABASE_SECRET_KEY,
      Authorization: 'Bearer ' + NEWS_SUPABASE_SECRET_KEY,
      Prefer: 'resolution=ignore-duplicates,return=representation'
    },
    payload: JSON.stringify(toInsert),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Supabase insert error (' + code + '): ' + res.getContentText());
  }
  Logger.log('פורסמו בהצלחה ' + toInsert.length + ' עדכוני חדשות.');
}

function fetchRssSourceGas_(source) {
  const res = UrlFetchApp.fetch(source.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HamakomNewsBot/1.0)' },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) {
    throw new Error('HTTP ' + res.getResponseCode());
  }

  const doc = XmlService.parse(res.getContentText('UTF-8'));
  const root = doc.getRootElement();
  const channel = root.getChild('channel');
  const items = channel ? channel.getChildren('item') : root.getChildren('entry', root.getNamespace());
  const parsed = [];

  items.forEach(function (el) {
    const ns = el.getNamespace();
    const title = cleanNewsTextGas_(getChildTextGas_(el, 'title', ns));
    const desc = cleanNewsTextGas_(
      getChildTextGas_(el, 'description', ns)
      || getChildTextGas_(el, 'summary', ns)
      || getChildTextGas_(el, 'content', ns)
    );
    const guid = cleanNewsTextGas_(getChildTextGas_(el, 'guid', ns) || getChildTextGas_(el, 'id', ns));
    const link = extractLinkGas_(el, ns);
    const pubStr = getChildTextGas_(el, 'pubDate', ns)
      || getChildTextGas_(el, 'published', ns)
      || getChildTextGas_(el, 'updated', ns);

    const parsedTime = pubStr ? new Date(pubStr).getTime() : Date.now();
    const publishedAt = isFinite(parsedTime) ? Math.min(parsedTime, Date.now()) : Date.now();

    if (!title && !desc) return;
    parsed.push({
      sourceId: source.id,
      sourceName: source.name,
      uid: guid || link || title,
      title: title,
      body: desc,
      link: link,
      publishedAt: publishedAt
    });
  });

  return parsed;
}

function getChildTextGas_(el, name, ns) {
  const child = ns ? (el.getChild(name, ns) || el.getChild(name)) : el.getChild(name);
  return child ? child.getText() : '';
}

function extractLinkGas_(el, ns) {
  const linkEl = ns ? (el.getChild('link', ns) || el.getChild('link')) : el.getChild('link');
  if (!linkEl) return '';
  const href = linkEl.getAttribute('href');
  return (href ? href.getValue() : linkEl.getText() || '').trim();
}

function decodeHtmlEntitiesGas_(str) {
  if (!str) return '';
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, function (_, hex) {
      const code = parseInt(hex, 16);
      return isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, function (_, dec) {
      const code = parseInt(dec, 10);
      return isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#039;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '...');
}

function cleanNewsTextGas_(raw) {
  if (!raw) return '';
  const text = decodeHtmlEntitiesGas_(raw)
    .replace(/<(br|\/p|\/div|\/li)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '');

  const lines = [];
  const rawLines = text.split('\n');
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].replace(/[ \t]+/g, ' ').trim();
    if (!line) continue;
    if (NEWS_STOP_PHRASES.some(function (p) { return line.indexOf(p) !== -1; })) break;
    lines.push(line);
  }
  return lines.join('\n').trim();
}

function shouldBlockNewsGas_(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return NEWS_BLOCK_KEYWORDS.some(function (w) { return lower.indexOf(w) !== -1; });
}

function censorNewsGas_(text) {
  if (!text) return '';
  let out = text;
  NEWS_CENSOR_WORDS.forEach(function (w) {
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(esc, 'gi'), '***');
  });
  return out;
}

function truncateNewsGas_(text, maxLen) {
  if (!text || text.length <= maxLen) return text;
  const sliced = text.slice(0, maxLen);
  const idx = sliced.lastIndexOf(' ');
  return (idx > 120 ? sliced.slice(0, idx) : sliced).trim() + '...';
}

function escapeHtmlGas_(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttrGas_(str) {
  return escapeHtmlGas_(str).replace(/"/g, '&quot;');
}

function sha256ShortGas_(input) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('').slice(0, 28);
}

function buildNewsPostRecordGas_(item) {
  const cleanTitle = censorNewsGas_(item.title);
  let cleanBody = censorNewsGas_(item.body);
  if (!cleanTitle && !cleanBody) return null;
  if (shouldBlockNewsGas_(cleanTitle + '\n' + cleanBody)) return null;

  if (cleanTitle && cleanBody && (cleanBody === cleanTitle || cleanBody.indexOf(cleanTitle) === 0)) {
    cleanBody = cleanBody.slice(cleanTitle.length).replace(/^[\s\-:|–]+/, '').trim();
  }
  cleanBody = truncateNewsGas_(cleanBody, 420);

  const hash = sha256ShortGas_(item.sourceId + '|' + (item.uid || cleanTitle));
  const headerLine = cleanTitle
    ? '<b>📰 ' + escapeHtmlGas_(item.sourceName) + ' | ' + escapeHtmlGas_(cleanTitle) + '</b>'
    : '<b>📰 ' + escapeHtmlGas_(item.sourceName) + '</b>';

  const parts = [headerLine];
  if (cleanBody) {
    parts.push(escapeHtmlGas_(cleanBody).replace(/\n+/g, '<br>'));
  }
  if (NEWS_INCLUDE_SOURCE_LINK && /^https?:\/\//i.test(item.link || '')) {
    parts.push('<a href="' + escapeAttrGas_(item.link) + '">לכתבה המלאה</a>');
  }

  return {
    external_id: 'news:' + item.sourceId + ':' + hash,
    content: parts.join('<br>'),
    media_type: 'none',
    media_url: '',
    media_name: '',
    category: NEWS_CATEGORY,
    is_pinned: false,
    created_at: new Date(item.publishedAt).toISOString()
  };
}

function fetchExistingNewsIdsGas_() {
  const url = NEWS_SUPABASE_URL + '/rest/v1/posts?select=external_id&external_id=not.is.null&order=id.desc&limit=300';
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      apikey: NEWS_SUPABASE_SECRET_KEY,
      Authorization: 'Bearer ' + NEWS_SUPABASE_SECRET_KEY
    },
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Failed reading existing posts (' + code + '): ' + res.getContentText());
  }
  const map = {};
  JSON.parse(res.getContentText()).forEach(function (row) {
    if (row.external_id) map[row.external_id] = true;
  });
  return map;
}
