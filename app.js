const CONFIG = window.CHANNEL_CONFIG || {};
const HAS_SUPABASE = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

const state = {
  supabase: null,
  session: null,
  isDemo: !HAS_SUPABASE,
  user: null,
  isAdmin: false,
  posts: [],
  settings: {
    title: CONFIG.DEFAULT_TITLE || 'המקום',
    description: CONFIG.DEFAULT_DESCRIPTION || 'עדכונים, סרטונים ותוכן נקי ומאושר',
    avatar_url: '',
    ad_title: 'מקום פנוי למודעה שלך',
    ad_description: 'אזור פרסום קבוע ובולט לעסקים ומיזמים בערוץ המקום.',
    ad_image_url: '',
    ad_link_url: ''
  },
  activeCategory: 'הכל',
  searchQuery: '',
  gateMode: 'signin',
  signedUrlCache: {},
  reactedMap: {},
  feedbacks: [],
  notificationsEnabled: false,
  activeUploadXhr: null,
  loggedPageView: false,
  seenPostsThisSession: new Set(),
  seenAdThisSession: false,
  analyticsTab: 'posts',
  analyticsEvents: [],
  mailingSubscribers: []
};

const DEMO_STORAGE_KEY = 'private_channel_demo_v1';
const DEMO_FEEDBACK_KEY = 'hamakom_demo_feedback_v1';
const DEMO_ANALYTICS_KEY = 'hamakom_demo_analytics_v1';
const DEMO_MAILING_KEY = 'hamakom_demo_mailing_v1';
const PENDING_MAILING_KEY = 'hamakom_pending_mailing_v1';
const SCROLL_STORAGE_KEY = 'hamakom_scroll_anchor_v2';
const BG_STORAGE_KEY = 'hamakom_bg_choice';
const REACTED_STORAGE_KEY = 'hamakom_reacted_v1';
const NOTIFY_STORAGE_KEY = 'hamakom_browser_notify';
const FEED_CACHE_KEY = 'hamakom_feed_cache_v1';
const PAGE_SIZE = 25;
let hasMoreOlder = false;
let hasRestoredInitialScroll = false;
let viewObserver = null;

// --- DOM Elements ---
const el = {
  bootLoader: document.getElementById('bootLoader'),
  toastContainer: document.getElementById('toastContainer'),
  channelTitle: document.getElementById('channelTitle'),
  channelDescription: document.getElementById('channelDescription'),
  channelAvatar: document.getElementById('channelAvatar'),
  channelStats: document.getElementById('channelStats'),
  notifyToggle: document.getElementById('notifyToggle'),
  themeToggle: document.getElementById('themeToggle'),
  adminSettingsBtn: document.getElementById('adminSettingsBtn'),
  profileEmail: document.getElementById('profileEmail'),
  bgPicker: document.getElementById('bgPicker'),
  sendFeedbackBtn: document.getElementById('sendFeedbackBtn'),
  hoverSearchWrap: document.getElementById('hoverSearchWrap'),
  resetFilterBtn: document.getElementById('resetFilterBtn'),
  authGate: document.getElementById('authGate'),
  gateChannelTitle: document.getElementById('gateChannelTitle'),
  gateDemoNotice: document.getElementById('gateDemoNotice'),
  gateAuthTabs: document.getElementById('gateAuthTabs'),
  gateLoginForm: document.getElementById('gateLoginForm'),
  gateEmail: document.getElementById('gateEmail'),
  gatePassword: document.getElementById('gatePassword'),
  toggleGatePassword: document.getElementById('toggleGatePassword'),
  gateSignupExtras: document.getElementById('gateSignupExtras'),
  agreeTermsCheckbox: document.getElementById('agreeTermsCheckbox'),
  agreeMailingCheckbox: document.getElementById('agreeMailingCheckbox'),
  openPrivacyModalBtn: document.getElementById('openPrivacyModalBtn'),
  gateSubmitBtn: document.getElementById('gateSubmitBtn'),
  gateOrDivider: document.getElementById('gateOrDivider'),
  gateGoogleBtn: document.getElementById('gateGoogleBtn'),
  gateDemoBtn: document.getElementById('gateDemoBtn'),
  gateError: document.getElementById('gateError'),
  gateSuccess: document.getElementById('gateSuccess'),
  channelContent: document.getElementById('channelContent'),
  profileTrigger: document.getElementById('profileTrigger'),
  adminRoleBadge: document.getElementById('adminRoleBadge'),
  adminMenuToggleBtn: document.getElementById('adminMenuToggleBtn'),
  adminMenuUnreadDot: document.getElementById('adminMenuUnreadDot'),
  adminDrawer: document.getElementById('adminDrawer'),
  openAnalyticsBtn: document.getElementById('openAnalyticsBtn'),
  openInboxBtn: document.getElementById('openInboxBtn'),
  inboxUnreadCount: document.getElementById('inboxUnreadCount'),
  newPostBtn: document.getElementById('newPostBtn'),
  uploadStatusWidget: document.getElementById('uploadStatusWidget'),
  uploadFileLabel: document.getElementById('uploadFileLabel'),
  uploadPercentText: document.getElementById('uploadPercentText'),
  cancelUploadBtn: document.getElementById('cancelUploadBtn'),
  uploadProgressFill: document.getElementById('uploadProgressFill'),
  uploadBytesText: document.getElementById('uploadBytesText'),
  uploadTimeText: document.getElementById('uploadTimeText'),
  adSlotCard: document.getElementById('adSlotCard'),
  adSlotContainer: document.getElementById('adSlotContainer'),
  logoutBtn: document.getElementById('logoutBtn'),
  searchInput: document.getElementById('searchInput'),
  categoryChips: document.getElementById('categoryChips'),
  pinnedBanner: document.getElementById('pinnedBanner'),
  pinnedText: document.getElementById('pinnedText'),
  loadOlderWrap: document.getElementById('loadOlderWrap'),
  loadOlderBtn: document.getElementById('loadOlderBtn'),
  feedContainer: document.getElementById('feedContainer'),

  postModal: document.getElementById('postModal'),
  postModalTitle: document.getElementById('postModalTitle'),
  postForm: document.getElementById('postForm'),
  editPostId: document.getElementById('editPostId'),
  postCategory: document.getElementById('postCategory'),
  postPinned: document.getElementById('postPinned'),
  rteToolbar: document.getElementById('rteToolbar'),
  rteFontFamily: document.getElementById('rteFontFamily'),
  rteFontSize: document.getElementById('rteFontSize'),
  rteForeColor: document.getElementById('rteForeColor'),
  rteBackColor: document.getElementById('rteBackColor'),
  postEditor: document.getElementById('postEditor'),
  postMediaType: document.getElementById('postMediaType'),
  mediaDropzone: document.getElementById('mediaDropzone'),
  dropzoneText: document.getElementById('dropzoneText'),
  mediaPreviewBox: document.getElementById('mediaPreviewBox'),
  mediaInputs: document.getElementById('mediaInputs'),
  postMediaFile: document.getElementById('postMediaFile'),
  postMediaUrl: document.getElementById('postMediaUrl'),
  postMediaName: document.getElementById('postMediaName'),
  postFormError: document.getElementById('postFormError'),
  savePostBtn: document.getElementById('savePostBtn'),

  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsTitle: document.getElementById('settingsTitle'),
  settingsDesc: document.getElementById('settingsDesc'),
  settingsAvatar: document.getElementById('settingsAvatar'),
  settingsAdTitle: document.getElementById('settingsAdTitle'),
  settingsAdDesc: document.getElementById('settingsAdDesc'),
  settingsAdImage: document.getElementById('settingsAdImage'),
  settingsAdLink: document.getElementById('settingsAdLink'),

  analyticsModal: document.getElementById('analyticsModal'),
  analyticsRangeSelect: document.getElementById('analyticsRangeSelect'),
  analyticsKpis: document.getElementById('analyticsKpis'),
  analyticsTabs: document.getElementById('analyticsTabs'),
  analyticsTabPosts: document.getElementById('analyticsTabPosts'),
  analyticsTabLinks: document.getElementById('analyticsTabLinks'),
  analyticsTabMailing: document.getElementById('analyticsTabMailing'),

  lightbox: document.getElementById('lightbox'),
  lightboxImg: document.getElementById('lightboxImg'),
  lightboxVideo: document.getElementById('lightboxVideo'),
  lightboxClose: document.getElementById('lightboxClose'),
  feedbackModal: document.getElementById('feedbackModal'),
  feedbackForm: document.getElementById('feedbackForm'),
  feedbackInput: document.getElementById('feedbackInput'),
  feedbackError: document.getElementById('feedbackError'),
  sendFeedbackSubmit: document.getElementById('sendFeedbackSubmit'),
  inboxModal: document.getElementById('inboxModal'),
  inboxList: document.getElementById('inboxList'),
  scrollBottomBtn: document.getElementById('scrollBottomBtn'),
  newMsgDot: document.getElementById('newMsgDot')
};

// --- Helpers ---
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ALLOWED_RICH_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SPAN', 'P', 'DIV', 'BR',
  'UL', 'OL', 'LI', 'FONT', 'A', 'H1', 'H2', 'H3', 'BLOCKQUOTE'
]);

const ALLOWED_FONT_FAMILIES = new Set([
  'Rubik', 'Assistant', 'Heebo', 'Frank Ruhl Libre', 'Courier New'
]);

function stripHtml(text) {
  if (!text) return '';
  if (!/<[a-z][\s\S]*>/i.test(text)) return text;
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function sanitizeRichHtml(rawHtml) {
  const doc = new DOMParser().parseFromString(rawHtml || '', 'text/html');

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const span = document.createElement('span');
      const escaped = escapeHtml(node.textContent || '');
      if (/https?:\/\/[^\s<]+/.test(node.textContent || '')) {
        span.innerHTML = escaped.replace(
          /(https?:\/\/[^\s<]+)/g,
          (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
        );
        return span;
      }
      return document.createTextNode(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createTextNode('');
    }

    const tag = node.tagName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT' || tag === 'SVG') {
      return document.createTextNode('');
    }

    if (!ALLOWED_RICH_TAGS.has(tag)) {
      const frag = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => frag.appendChild(cleanNode(child)));
      return frag;
    }

    const elClean = document.createElement(tag.toLowerCase());

    if (tag === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) {
        elClean.setAttribute('href', href);
        elClean.setAttribute('target', '_blank');
        elClean.setAttribute('rel', 'noopener noreferrer');
      }
    }

    if (tag === 'FONT') {
      const color = node.getAttribute('color');
      const face = node.getAttribute('face');
      const size = node.getAttribute('size');
      if (color && /^#[0-9a-f]{3,8}$|^rgb\(/i.test(color)) elClean.setAttribute('color', color);
      if (face && ALLOWED_FONT_FAMILIES.has(face.replace(/['"]/g, '').trim())) {
        elClean.setAttribute('face', face.replace(/['"]/g, '').trim());
      }
      if (size && /^[1-7]$/.test(size)) elClean.setAttribute('size', size);
    }

    if (node.style) {
      if (node.style.color) elClean.style.color = node.style.color;
      if (node.style.backgroundColor) elClean.style.backgroundColor = node.style.backgroundColor;
      if (node.style.fontFamily) {
        const cleanFont = node.style.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
        if (ALLOWED_FONT_FAMILIES.has(cleanFont)) elClean.style.fontFamily = cleanFont;
      }
      if (node.style.fontSize) elClean.style.fontSize = node.style.fontSize;
      if (['right', 'center', 'left', 'start', 'end'].includes(node.style.textAlign)) {
        elClean.style.textAlign = node.style.textAlign;
      }
    }

    Array.from(node.childNodes).forEach((child) => {
      elClean.appendChild(cleanNode(child));
    });
    return elClean;
  }

  const out = document.createElement('div');
  Array.from(doc.body.childNodes).forEach((child) => out.appendChild(cleanNode(child)));
  return out.innerHTML;
}

function formatContent(text) {
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return sanitizeRichHtml(text);
  }
  const safe = escapeHtml(text);
  return safe.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function getDayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const todayKey = getDayKey(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getDayKey(yesterday.toISOString());
  const key = getDayKey(iso);

  if (key === todayKey) return 'היום';
  if (key === yesterdayKey) return 'אתמול';
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'long' }).format(d);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function translateAuthError(err, mode = 'signin') {
  const raw = String(err?.message || err?.code || '').toLowerCase();

  if (raw.includes('invalid login credentials') || raw.includes('invalid_credentials')) {
    return 'לא נמצא חשבון עם הפרטים האלו, או שהסיסמה שגויה. אם עוד לא נרשמת אף פעם — קודם נרשמים בלשונית "הרשמה חדשה" ורק אחר כך נכנסים.';
  }
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return 'כתובת המייל הזו כבר רשומה בערוץ! עבור ללשונית "התחברות" כדי להיכנס.';
  }
  if (raw.includes('email not confirmed')) {
    return 'כתובת המייל עדיין ממתינה לאישור במערכת. יש לבטל את חובת אימות המייל בהגדרות האבטחה או לאשר את המשתמש.';
  }
  if (raw.includes('password') && (raw.includes('least') || raw.includes('short') || raw.includes('6'))) {
    return 'הסיסמה חייבת להכיל לפחות 6 תווים.';
  }
  if (raw.includes('weak_password')) {
    return 'הסיסמה חלשה מדי. בחר סיסמה חזקה יותר עם לפחות 6 תווים.';
  }
  if (raw.includes('unable to validate email') || raw.includes('invalid email') || raw.includes('email_address_invalid')) {
    return 'כתובת האימייל שהוזנה אינה תקינה. בדוק שאין שגיאת הקלדה.';
  }
  if (raw.includes('rate limit') || raw.includes('too many requests') || raw.includes('429')) {
    return 'בוצעו יותר מדי ניסיונות בדקות האחרונות. אנא המתן רגע ונסה שוב.';
  }
  if (raw.includes('signup is disabled') || raw.includes('signups not allowed')) {
    return 'ההרשמה לחשבון חדש סגורה כרגע במערכת.';
  }
  if (raw.includes('network') || raw.includes('fetch')) {
    return 'אין תקשורת עם השרת כרגע. בדוק את חיבור האינטרנט ונסה שוב.';
  }
  return mode === 'signup'
    ? 'לא הצלחנו להשלים את ההרשמה כרגע. בדוק שכתובת המייל תקינה והסיסמה בת 6 תווים לפחות.'
    : 'לא הצלחנו לחבר אותך כרגע. אם עדיין לא נרשמת, עבור ללשונית "הרשמה חדשה" והירשם תחילה.';
}

function showToast(message, type = 'info') {
  if (!el.toastContainer) return;
  const node = document.createElement('div');
  node.className = `toast toast-${type}`;
  node.textContent = message;
  el.toastContainer.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity 0.2s ease';
    setTimeout(() => node.remove(), 220);
  }, 2600);
}

function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

const ICONS = {
  moon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  sun: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  pin: `<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
  paperclip: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
  link: `<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  check: `<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  edit: `<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
  trash: `<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  maximize: `<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>`,
  bell: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  bellOff: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/></svg>`
};

// --- Theme & Preferences ---
function initTheme() {
  const saved = localStorage.getItem('channel_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  el.themeToggle.innerHTML = saved === 'dark' ? ICONS.sun : ICONS.moon;

  el.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('channel_theme', next);
    el.themeToggle.innerHTML = next === 'dark' ? ICONS.sun : ICONS.moon;
  });
}

function initBgPicker() {
  const savedBg = localStorage.getItem(BG_STORAGE_KEY) || 'dots';
  document.body.setAttribute('data-bg', savedBg);

  if (!el.bgPicker) return;
  el.bgPicker.querySelectorAll('[data-bg-choice]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.bgChoice === savedBg);
  });

  el.bgPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bg-choice]');
    if (!btn) return;
    const choice = btn.dataset.bgChoice;
    document.body.setAttribute('data-bg', choice);
    localStorage.setItem(BG_STORAGE_KEY, choice);
    el.bgPicker.querySelectorAll('[data-bg-choice]').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
  });
}

function loadReactedMap() {
  try {
    state.reactedMap = JSON.parse(localStorage.getItem(REACTED_STORAGE_KEY) || '{}');
  } catch {
    state.reactedMap = {};
  }
}

function saveReactedMap() {
  localStorage.setItem(REACTED_STORAGE_KEY, JSON.stringify(state.reactedMap));
}

function renderNotifyButton() {
  if (!el.notifyToggle) return;
  const isEnabled =
    state.notificationsEnabled &&
    'Notification' in window &&
    Notification.permission === 'granted';
  el.notifyToggle.innerHTML = isEnabled ? ICONS.bell : ICONS.bellOff;
  el.notifyToggle.classList.toggle('is-active', isEnabled);
  el.notifyToggle.title = isEnabled
    ? 'התראות דפדפן פעילות (לחץ לכיבוי)'
    : 'הפעל התראות דפדפן על הודעות חדשות';
}

function initNotifications() {
  state.notificationsEnabled = localStorage.getItem(NOTIFY_STORAGE_KEY) === '1';
  renderNotifyButton();
}

async function toggleBrowserNotifications() {
  if (!('Notification' in window)) {
    showToast('הדפדפן שלך אינו תומך בהתראות שולחן עבודה', 'error');
    return;
  }

  if (Notification.permission === 'denied') {
    showToast('ההתראות חסומות בהגדרות הדפדפן עבור אתר זה', 'error');
    return;
  }

  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      state.notificationsEnabled = false;
      localStorage.setItem(NOTIFY_STORAGE_KEY, '0');
      renderNotifyButton();
      showToast('לא ניתנה הרשאה להתראות דפדפן');
      return;
    }
    state.notificationsEnabled = true;
    localStorage.setItem(NOTIFY_STORAGE_KEY, '1');
    renderNotifyButton();
    showToast('התראות דפדפן הופעלו!', 'success');
    return;
  }

  state.notificationsEnabled = !state.notificationsEnabled;
  localStorage.setItem(NOTIFY_STORAGE_KEY, state.notificationsEnabled ? '1' : '0');
  renderNotifyButton();
  showToast(
    state.notificationsEnabled ? 'התראות דפדפן הופעלו!' : 'התראות דפדפן כובו',
    state.notificationsEnabled ? 'success' : 'info'
  );
}

function sendBrowserNotification(post) {
  if (
    !state.notificationsEnabled ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return;
  }
  const title = `${state.settings.title || 'המקום'} • הודעה חדשה`;
  const body =
    (post?.content || '').trim().slice(0, 140) ||
    (post?.media_name ? `מדיה חדשה: ${post.media_name}` : 'פורסם עדכון חדש בערוץ');

  const n = new Notification(title, {
    body,
    tag: `hamakom-post-${post?.id || Date.now()}`
  });
  n.onclick = () => {
    window.focus();
    scrollToFeedBottom(true);
    n.close();
  };
}

// --- Demo Data ---
function loadDemoData() {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state.posts = (parsed.posts || []).sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      state.settings = parsed.settings || state.settings;
      return;
    } catch {
      // ignore corrupted demo storage
    }
  }

  state.posts = [
    {
      id: 2,
      content: 'אפשר לפרסם כאן הודעות טקסט עם קישורים, תמונות, סרטונים, הקלטות שמע וקבצים להורדה — עם סינון לפי קטגוריות וחיפוש מהיר.',
      media_type: 'none',
      media_url: '',
      media_name: '',
      category: 'כללי',
      is_pinned: false,
      reactions: { '👍': 4, '👏': 3 },
      created_at: new Date(Date.now() - 3600 * 1000).toISOString()
    },
    {
      id: 1,
      content: 'ברוכים הבאים לערוץ המקום!\nהערוץ פועל כרגע במצב הדגמה מקומי. לאחר חיבור קובץ config.js ל-Supabase, כל הפוסטים, התמונות והסרטונים יישמרו בענן ויתעדכנו בזמן אמת.',
      media_type: 'none',
      media_url: '',
      media_name: '',
      category: 'עדכונים',
      is_pinned: true,
      reactions: { '👍': 12, '❤️': 8, '🔥': 5 },
      created_at: new Date().toISOString()
    }
  ];
  saveDemoData();
}

function saveDemoData() {
  localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({ posts: state.posts, settings: state.settings })
  );
}

// --- Instant Cache Hydration (< 50ms first paint for returning users) ---
function getStoredSupabaseSession() {
  try {
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (!key) return null;
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (raw?.user?.email) return raw;
  } catch {
    // ignore
  }
  return null;
}

function saveFeedCache() {
  if (!state.user || state.isDemo) return;
  try {
    localStorage.setItem(
      FEED_CACHE_KEY,
      JSON.stringify({
        userEmail: state.user.email,
        isAdmin: state.isAdmin,
        settings: state.settings,
        posts: state.posts.slice(-PAGE_SIZE),
        hasMoreOlder,
        signedUrlCache: state.signedUrlCache,
        cachedAt: Date.now()
      })
    );
  } catch {
    // ignore storage quota
  }
}

function clearFeedCache() {
  localStorage.removeItem(FEED_CACHE_KEY);
}

function hydrateInstantFromCache() {
  const storedSession = getStoredSupabaseSession();
  if (!storedSession) return false;

  try {
    const raw = JSON.parse(localStorage.getItem(FEED_CACHE_KEY) || 'null');
    if (!raw || raw.userEmail !== storedSession.user.email) return false;

    state.session = storedSession;
    state.user = storedSession.user;
    state.isAdmin = Boolean(raw.isAdmin);
    if (raw.settings) state.settings = raw.settings;
    if (Array.isArray(raw.posts)) state.posts = raw.posts;
    hasMoreOlder = Boolean(raw.hasMoreOlder);

    // Reuse signed URLs only if cached within last 40 minutes
    if (raw.signedUrlCache && Date.now() - (raw.cachedAt || 0) < 40 * 60 * 1000) {
      state.signedUrlCache = raw.signedUrlCache;
    }

    state.posts = attachCachedSignedUrls(state.posts);
    renderHeader();
    renderAuthUI();
    renderCategories();
    el.loadOlderWrap?.classList.toggle('hidden', !hasMoreOlder);
    renderFeed({ restoreScroll: true });
    el.bootLoader.classList.add('hidden');
    return true;
  } catch {
    return false;
  }
}

// --- Supabase Init ---
async function initSupabase() {
  let createClient = window.supabase?.createClient;
  if (!createClient) {
    const mod = await import(
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
    );
    createClient = mod.createClient;
  }
  state.supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  const { data: sessionData } = await state.supabase.auth.getSession();
  await handleAuthChange(sessionData?.session || null);

  state.supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION') return;
    await handleAuthChange(session);
  });

  state.supabase
    .channel('public:posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      async (payload) => {
        const wasNearBottom = isNearFeedBottom();
        await fetchLiveData({ skipInitialRestore: true });
        if (payload.eventType === 'INSERT') {
          sendBrowserNotification(payload.new);
          if (wasNearBottom) {
            scrollToFeedBottom(true);
          } else {
            el.newMsgDot.classList.remove('hidden');
            el.scrollBottomBtn.classList.remove('hidden');
            showToast('הודעה חדשה פורסמה בערוץ');
          }
        }
      }
    )
    .subscribe();

  state.supabase
    .channel('public:feedback_messages')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'feedback_messages' },
      async (payload) => {
        if (!state.isAdmin) return;
        await fetchFeedbacks();
        if (payload.eventType === 'INSERT') {
          showToast('התקבל משוב חדש בתיבת ההודעות');
        }
      }
    )
    .subscribe();
}

async function syncPendingMailingConsent(user) {
  if (!user || !user.email) return;
  const raw = localStorage.getItem(PENDING_MAILING_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.email !== user.email) return;
    await saveMailingRecord(user.email, parsed.acceptedTerms, parsed.acceptedMailing);
    localStorage.removeItem(PENDING_MAILING_KEY);
  } catch {
    localStorage.removeItem(PENDING_MAILING_KEY);
  }
}

async function saveMailingRecord(email, acceptedTerms, acceptedMailing) {
  if (!email) return;
  if (state.isDemo) {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(DEMO_MAILING_KEY) || '[]');
    } catch {
      list = [];
    }
    const existing = list.find((item) => item.email === email);
    if (existing) {
      existing.accepted_terms = acceptedTerms;
      existing.accepted_mailing = acceptedMailing;
    } else {
      list.push({
        id: Date.now(),
        email,
        accepted_terms: acceptedTerms,
        accepted_mailing: acceptedMailing,
        batch_notified: false,
        consented_at: new Date().toISOString()
      });
    }
    localStorage.setItem(DEMO_MAILING_KEY, JSON.stringify(list));
    return;
  }

  if (!state.supabase) return;
  await state.supabase.from('mailing_subscribers').upsert(
    {
      email,
      user_id: state.user?.id || null,
      accepted_terms: acceptedTerms,
      accepted_mailing: acceptedMailing
    },
    { onConflict: 'email' }
  );
}

async function logAnalyticsEvent(eventType, details = {}) {
  if (!state.user) return;
  const row = {
    event_type: eventType,
    post_id: details.post_id ? Number(details.post_id) : null,
    target_url: details.target_url || '',
    target_label: details.target_label || ''
  };

  if (state.isDemo) {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(DEMO_ANALYTICS_KEY) || '[]');
    } catch {
      list = [];
    }
    list.push({
      id: Date.now() + Math.random(),
      ...row,
      user_id: state.user.id || 'demo-user-1',
      user_email: state.user.email || 'demo@admin.local',
      created_at: new Date().toISOString()
    });
    localStorage.setItem(DEMO_ANALYTICS_KEY, JSON.stringify(list.slice(-1000)));
    return;
  }

  if (!state.supabase) return;
  await state.supabase.from('analytics_events').insert(row);
}

function attachCachedSignedUrls(posts) {
  return posts.map((p) => {
    if (p.media_url && p.media_url.startsWith('storage://')) {
      const path = p.media_url.replace('storage://', '');
      return { ...p, resolved_media_url: state.signedUrlCache[path] || '' };
    }
    return { ...p, resolved_media_url: p.media_url };
  });
}

async function resolveMediaUrlsInBackground(posts) {
  if (!state.supabase) return;
  const paths = posts
    .map((p) => p.media_url)
    .filter((u) => u && u.startsWith('storage://'))
    .map((u) => u.replace('storage://', ''))
    .filter((path) => !state.signedUrlCache[path]);

  if (paths.length === 0) return;

  const { data } = await state.supabase.storage
    .from('channel-media')
    .createSignedUrls(paths, 3600);

  if (Array.isArray(data)) {
    let changed = false;
    data.forEach((item) => {
      if (item.path && item.signedUrl) {
        state.signedUrlCache[item.path] = item.signedUrl;
        changed = true;
      }
    });
    if (changed) {
      state.posts = attachCachedSignedUrls(state.posts);
      saveFeedCache();
      renderFeed();
    }
  }
}

async function handleAuthChange(session) {
  state.session = session || null;
  state.user = session?.user || null;

  if (!state.user) {
    state.isAdmin = false;
    state.posts = [];
    state.feedbacks = [];
    state.loggedPageView = false;
    state.seenPostsThisSession.clear();
    state.seenAdThisSession = false;
    hasRestoredInitialScroll = false;
    hasMoreOlder = false;
    clearFeedCache();
    renderAuthUI();
    el.bootLoader.classList.add('hidden');
    await fetchSettingsOnly();
    return;
  }

  // מציגים את הממשק מיד בלי לחסום על בדיקת מנהל/נתונים
  renderAuthUI();
  el.bootLoader.classList.add('hidden');

  if (!state.loggedPageView) {
    state.loggedPageView = true;
    logAnalyticsEvent('page_view', { target_label: 'כניסה לערוץ' });
  }

  // מריצים במקביל את בדיקת ההרשאה, סנכרון דיוור וטעינת הפיד
  const [adminRes] = await Promise.all([
    state.supabase
      .from('admins')
      .select('email')
      .eq('email', state.user.email)
      .maybeSingle(),
    syncPendingMailingConsent(state.user),
    fetchLiveData()
  ]);

  state.isAdmin = Boolean(adminRes?.data);
  renderAuthUI();
  saveFeedCache();
  if (state.isAdmin) fetchFeedbacks();
}

async function fetchSettingsOnly() {
  if (!state.supabase) return;
  const { data } = await state.supabase
    .from('channel_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (data) {
    state.settings = data;
    renderHeader();
  }
}

async function fetchLiveData(opts = {}) {
  if (!state.supabase || !state.user) return;

  const [settingsRes, postsRes] = await Promise.all([
    state.supabase.from('channel_settings').select('*').eq('id', 1).maybeSingle(),
    state.supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
  ]);

  if (settingsRes.data) {
    state.settings = settingsRes.data;
    renderHeader();
  }

  if (postsRes.data) {
    hasMoreOlder = postsRes.data.length === PAGE_SIZE;
    el.loadOlderWrap?.classList.toggle('hidden', !hasMoreOlder);

    const chronological = [...postsRes.data].reverse();
    const nextPosts = attachCachedSignedUrls(chronological);
    const sig = (arr) =>
      JSON.stringify(
        arr.map((p) => [p.id, p.updated_at, p.is_pinned, p.reactions, p.resolved_media_url])
      );
    const changed = sig(state.posts) !== sig(nextPosts);
    state.posts = nextPosts;

    if (changed || !hasRestoredInitialScroll) {
      renderCategories();
      renderStats();
      renderFeed({
        restoreScroll: !opts.skipInitialRestore && !hasRestoredInitialScroll
      });
    }
    saveFeedCache();

    // טעינת כתובות המדיה החתומות מתבצעת ברקע בלי לעכב את הצגת הפיד!
    resolveMediaUrlsInBackground(state.posts);
  }
}

async function loadOlderPosts() {
  if (!state.supabase || !state.user || state.posts.length === 0) return;
  const oldest = state.posts[0];
  if (el.loadOlderBtn) {
    el.loadOlderBtn.disabled = true;
    el.loadOlderBtn.textContent = 'טוען...';
  }

  const prevHeight = document.documentElement.scrollHeight;
  const prevScrollY = window.scrollY;

  const { data } = await state.supabase
    .from('posts')
    .select('*')
    .lt('created_at', oldest.created_at)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (data && data.length > 0) {
    hasMoreOlder = data.length === PAGE_SIZE;
    const olderChrono = attachCachedSignedUrls([...data].reverse());
    state.posts = [...olderChrono, ...state.posts];
    renderCategories();
    renderStats();
    renderFeed();

    const addedHeight = document.documentElement.scrollHeight - prevHeight;
    window.scrollTo({ top: prevScrollY + addedHeight, behavior: 'instant' });
    resolveMediaUrlsInBackground(olderChrono);
  } else {
    hasMoreOlder = false;
  }

  el.loadOlderWrap?.classList.toggle('hidden', !hasMoreOlder);
  if (el.loadOlderBtn) {
    el.loadOlderBtn.disabled = false;
    el.loadOlderBtn.textContent = 'טען הודעות ישנות יותר';
  }
}

// --- Render UI ---
function renderAdSlot() {
  if (!el.adSlotContainer) return;
  const title = state.settings.ad_title || 'מקום פנוי למודעה שלך';
  const desc = state.settings.ad_description || 'אזור פרסום קבוע ובולט לעסקים ומיזמים בערוץ המקום.';
  const imgUrl = (state.settings.ad_image_url || '').trim();
  const linkUrl = (state.settings.ad_link_url || '').trim();

  const innerHtml = `
    ${imgUrl ? `<img class="ad-live-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" loading="lazy" />` : `<svg class="icon-lg ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 15h4"/><path d="M15 15h2"/><path d="M7 11h10"/></svg>`}
    <strong>${escapeHtml(title)}</strong>
    ${desc ? `<p>${escapeHtml(desc)}</p>` : ''}
  `;

  if (linkUrl) {
    el.adSlotContainer.outerHTML = `<a id="adSlotContainer" class="ad-live-card" href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">${innerHtml}</a>`;
  } else {
    el.adSlotContainer.outerHTML = `<div id="adSlotContainer" class="ad-placeholder-box">${innerHtml}</div>`;
  }
  el.adSlotContainer = document.getElementById('adSlotContainer');
}

function renderHeader() {
  document.title = state.settings.title;
  el.channelTitle.textContent = state.settings.title;
  if (el.gateChannelTitle) el.gateChannelTitle.textContent = state.settings.title;
  el.channelDescription.textContent = state.settings.description;

  if (state.settings.avatar_url) {
    el.channelAvatar.innerHTML = `<img src="${escapeHtml(state.settings.avatar_url)}" alt="${escapeHtml(state.settings.title)}" />`;
  } else {
    el.channelAvatar.textContent = (state.settings.title || 'ה').trim().charAt(0);
  }
  renderAdSlot();
}

function renderStats() {
  if (!el.channelStats) return;
  const total = state.posts.length;
  const mediaCount = state.posts.filter((p) => p.media_type && p.media_type !== 'none').length;
  el.channelStats.innerHTML = `
    <span><strong>${total}</strong> הודעות</span>
    <span><strong>${mediaCount}</strong> קבצי מדיה</span>
  `;
}

function renderAuthUI() {
  const isLoggedIn = Boolean(state.user);
  const showGoogle = !state.isDemo && Boolean(CONFIG.ENABLE_GOOGLE_AUTH);

  el.authGate.classList.toggle('hidden', isLoggedIn);
  el.channelContent.classList.toggle('hidden', !isLoggedIn);

  el.gateDemoNotice.classList.toggle('hidden', !state.isDemo);
  el.gateDemoBtn.classList.toggle('hidden', !state.isDemo);
  el.gateAuthTabs.classList.toggle('hidden', state.isDemo);
  el.gateLoginForm.classList.toggle('hidden', state.isDemo);
  el.gateOrDivider.classList.toggle('hidden', !showGoogle);
  el.gateGoogleBtn.classList.toggle('hidden', !showGoogle);

  if (el.profileEmail) {
    el.profileEmail.textContent = state.user?.email || '—';
  }

  el.adminRoleBadge?.classList.toggle('hidden', !state.isAdmin);
  el.adminMenuToggleBtn?.classList.toggle('hidden', !state.isAdmin);
  el.profileTrigger?.classList.toggle('is-clickable', state.isAdmin);

  if (!state.isAdmin) {
    el.adminDrawer?.classList.add('hidden');
  }
}

function renderCategories() {
  const categories = ['הכל', ...(CONFIG.CATEGORIES || ['כללי'])];
  el.categoryChips.innerHTML = '';

  categories.forEach((cat) => {
    const count =
      cat === 'הכל'
        ? state.posts.length
        : state.posts.filter((p) => p.category === cat).length;

    const btn = document.createElement('button');
    btn.className = `chip ${state.activeCategory === cat ? 'active' : ''}`;
    btn.innerHTML = `<span>${escapeHtml(cat)}</span><span class="chip-count">${count}</span>`;
    btn.addEventListener('click', () => {
      state.activeCategory = cat;
      renderCategories();
      renderFeed();
    });
    el.categoryChips.appendChild(btn);
  });

  if (el.resetFilterBtn) {
    const isFiltered = state.activeCategory !== 'הכל' || Boolean(state.searchQuery.trim());
    el.resetFilterBtn.classList.toggle('hidden', !isFiltered);
  }

  el.postCategory.innerHTML = (CONFIG.CATEGORIES || ['כללי'])
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join('');
}

function renderPinnedBanner() {
  const pinned = [...state.posts].reverse().find((p) => p.is_pinned);
  if (!pinned) {
    el.pinnedBanner.classList.add('hidden');
    return;
  }

  el.pinnedBanner.classList.remove('hidden');
  el.pinnedText.textContent = stripHtml(pinned.content) || pinned.media_name || 'הודעה נעוצה';
  const jumpToPinned = () => {
    const card = document.getElementById(`post-${pinned.id}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('highlight');
      setTimeout(() => card.classList.remove('highlight'), 1800);
    }
  };
  el.pinnedBanner.onclick = jumpToPinned;
  el.pinnedBanner.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      jumpToPinned();
    }
  };
}

function renderMedia(post) {
  const rawUrl = post.resolved_media_url ?? post.media_url;
  if (!rawUrl || post.media_type === 'none') return '';
  const url = escapeHtml(rawUrl);
  const name = escapeHtml(post.media_name || 'קובץ מצורף');

  switch (post.media_type) {
    case 'image':
      return `
        <div class="post-media">
          <div class="media-frame">
            <img src="${url}" alt="${name}" loading="lazy" data-fullscreen-type="image" data-fullscreen-src="${url}" />
            <button type="button" class="media-fullscreen-btn" data-fullscreen-type="image" data-fullscreen-src="${url}">
              ${ICONS.maximize}<span>תצוגה מלאה</span>
            </button>
          </div>
        </div>`;
    case 'video':
      return `
        <div class="post-media">
          <div class="media-frame">
            <video src="${url}" controls preload="metadata" playsinline></video>
            <button type="button" class="media-fullscreen-btn" data-fullscreen-type="video" data-fullscreen-src="${url}">
              ${ICONS.maximize}<span>תצוגה מלאה</span>
            </button>
          </div>
        </div>`;
    case 'audio':
      return `<div class="post-media"><audio src="${url}" controls preload="metadata"></audio></div>`;
    case 'file':
      return `<div class="post-media"><a class="file-attachment" href="${url}" target="_blank" rel="noopener noreferrer">${ICONS.paperclip}<span>${name}</span></a></div>`;
    default:
      return '';
  }
}

function isNearFeedBottom() {
  return document.documentElement.scrollHeight - (window.scrollY + window.innerHeight) < 220;
}

function scrollToFeedBottom(smooth = false) {
  el.newMsgDot?.classList.add('hidden');
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: smooth ? 'smooth' : 'instant'
  });
}

function saveScrollAnchor() {
  if (!state.user || !hasRestoredInitialScroll) return;
  const cards = el.feedContainer.querySelectorAll('.post-card');
  let anchorPostId = null;
  let anchorOffset = 0;

  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (rect.bottom > 40) {
      anchorPostId = card.id;
      anchorOffset = Math.round(rect.top);
      break;
    }
  }

  localStorage.setItem(
    SCROLL_STORAGE_KEY,
    JSON.stringify({
      postId: anchorPostId,
      offset: anchorOffset,
      scrollY: Math.round(window.scrollY)
    })
  );
}

function applyInitialScroll() {
  hasRestoredInitialScroll = true;

  if (window.location.hash.startsWith('#post-')) {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'center' });
      target.classList.add('highlight');
      setTimeout(() => target.classList.remove('highlight'), 1800);
      return;
    }
  }

  const raw = localStorage.getItem(SCROLL_STORAGE_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved.postId) {
        const anchorEl = document.getElementById(saved.postId);
        if (anchorEl) {
          const top = anchorEl.getBoundingClientRect().top + window.scrollY - (saved.offset || 0);
          window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
          return;
        }
      }
      if (typeof saved.scrollY === 'number') {
        window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
        return;
      }
    } catch {
      // ignore invalid saved scroll
    }
  }

  scrollToFeedBottom(false);
}

function renderFeed(options = {}) {
  renderPinnedBanner();
  renderStats();

  const shouldRestore = Boolean(options.restoreScroll && !hasRestoredInitialScroll);
  if (shouldRestore) {
    el.feedContainer.style.visibility = 'hidden';
  }

  const q = state.searchQuery.trim().toLowerCase();
  const filtered = state.posts.filter((post) => {
    const matchCat = state.activeCategory === 'הכל' || post.category === state.activeCategory;
    const matchSearch =
      !q ||
      stripHtml(post.content).toLowerCase().includes(q) ||
      (post.media_name || '').toLowerCase().includes(q) ||
      (post.category || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    el.feedContainer.innerHTML = `<div class="empty-state">לא נמצאו הודעות תואמות.</div>`;
    el.feedContainer.style.visibility = 'visible';
    return;
  }

  const allowedReactions = CONFIG.ALLOWED_REACTIONS || ['👍', '❤️', '🔥'];
  let lastDayKey = null;

  el.feedContainer.innerHTML = filtered
    .map((post) => {
      const dayKey = getDayKey(post.created_at);
      let dayDividerHtml = '';
      if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        dayDividerHtml = `<div class="day-divider"><span>${escapeHtml(formatDayLabel(post.created_at))}</span></div>`;
      }

      const reactions = post.reactions || {};
      const userReactedList = state.reactedMap[post.id] || [];
      const reactionsHtml = allowedReactions
        .map((emoji) => {
          const count = reactions[emoji] || 0;
          const activeClass = userReactedList.includes(emoji) ? 'is-reacted' : '';
          return `<button class="reaction-btn ${activeClass}" data-react="${post.id}" data-emoji="${emoji}">${emoji} <span>${count}</span></button>`;
        })
        .join('');

      const adminControls = state.isAdmin
        ? `
          <div class="post-admin-actions">
            <button class="btn-with-icon" data-edit="${post.id}">${ICONS.edit}<span>עריכה</span></button>
            <button class="btn-with-icon delete-btn" data-delete="${post.id}">${ICONS.trash}<span>מחיקה</span></button>
          </div>`
        : '';

      const contentHtml = post.content
        ? `<div class="post-content-wrap" data-content-wrap="${post.id}">
             <div class="post-content">${formatContent(post.content)}</div>
             <button type="button" class="read-more-btn hidden" data-read-more="${post.id}">המשך קריאה</button>
           </div>`
        : '';

      const isEdited =
        post.updated_at &&
        post.created_at &&
        new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 5000;

      return `
        ${dayDividerHtml}
        <article class="post-card" id="post-${post.id}">
          <div class="post-header">
            <div class="post-meta">
              <span class="post-cat">${escapeHtml(post.category || 'כללי')}</span>
              ${post.is_pinned ? `<span class="post-pin-tag">${ICONS.pin}<span>נעוץ</span></span>` : ''}
              <time datetime="${escapeHtml(post.created_at)}">${formatDate(post.created_at)}</time>
              ${isEdited ? '<span class="edited-tag">נערך</span>' : ''}
            </div>
            ${adminControls}
          </div>
          ${contentHtml}
          ${renderMedia(post)}
          <div class="post-footer">
            <div class="reactions-row">${reactionsHtml}</div>
            <button class="share-btn btn-with-icon" data-share="${post.id}">${ICONS.link}<span>העתק קישור</span></button>
          </div>
        </article>
      `;
    })
    .join('');

  el.feedContainer.querySelectorAll('[data-content-wrap]').forEach((wrap) => {
    const contentEl = wrap.querySelector('.post-content');
    const btn = wrap.querySelector('.read-more-btn');
    if (contentEl && btn && contentEl.scrollHeight > 125) {
      wrap.classList.add('is-collapsed');
      btn.classList.remove('hidden');
    }
  });

  if (shouldRestore) {
    applyInitialScroll();
    el.feedContainer.style.visibility = 'visible';
  } else if (options.scrollToBottom && !window.location.hash.startsWith('#post-')) {
    scrollToFeedBottom(true);
  }

  observeVisibleElements();
}

function observeVisibleElements() {
  if (!('IntersectionObserver' in window) || !state.user) return;
  if (viewObserver) viewObserver.disconnect();

  viewObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        if (node.id === 'adSlotCard') {
          if (!state.seenAdThisSession) {
            state.seenAdThisSession = true;
            logAnalyticsEvent('ad_view', {
              target_label: state.settings.ad_title || 'מודעת צד',
              target_url: state.settings.ad_link_url || ''
            });
          }
          return;
        }
        if (node.classList.contains('post-card')) {
          const postId = node.id.replace('post-', '');
          if (postId && !state.seenPostsThisSession.has(postId)) {
            state.seenPostsThisSession.add(postId);
            logAnalyticsEvent('post_view', { post_id: postId });
          }
        }
      });
    },
    { threshold: 0.45 }
  );

  el.feedContainer.querySelectorAll('.post-card').forEach((card) => viewObserver.observe(card));
  if (el.adSlotCard) viewObserver.observe(el.adSlotCard);
}

// --- Actions ---
function updateReactionButtonsInDom(postId, reactions) {
  const card = document.getElementById(`post-${postId}`);
  if (!card) return;
  const userReactedList = state.reactedMap[String(postId)] || [];
  card.querySelectorAll('[data-react]').forEach((btn) => {
    const emoji = btn.dataset.emoji;
    const countSpan = btn.querySelector('span');
    if (countSpan) countSpan.textContent = reactions[emoji] || 0;
    btn.classList.toggle('is-reacted', userReactedList.includes(emoji));
  });
}

async function handleReaction(postId, emoji) {
  const key = String(postId);
  state.reactedMap[key] = state.reactedMap[key] || [];
  if (state.reactedMap[key].includes(emoji)) {
    showToast('כבר הגבת עם אימוג׳י זה');
    return;
  }
  state.reactedMap[key].push(emoji);
  saveReactedMap();

  if (state.isDemo) {
    const post = state.posts.find((p) => String(p.id) === key);
    if (!post) return;
    post.reactions = post.reactions || {};
    post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
    saveDemoData();
    updateReactionButtonsInDom(postId, post.reactions);
    return;
  }

  const { data, error } = await state.supabase.rpc('increment_reaction', {
    p_post_id: Number(postId),
    p_emoji: emoji
  });
  if (!error && data) {
    const post = state.posts.find((p) => String(p.id) === key);
    if (post) {
      post.reactions = data;
      updateReactionButtonsInDom(postId, data);
    }
  }
}

function updateMediaPreview(file = null) {
  if (!el.mediaPreviewBox) return;
  if (!file) {
    el.mediaPreviewBox.classList.add('hidden');
    el.mediaPreviewBox.innerHTML = '';
    el.dropzoneText.textContent = 'גרור לכאן קובץ (תמונה, סרטון, שמע) או לחץ לבחירה';
    return;
  }

  el.dropzoneText.textContent = `נבחר: ${file.name} (${formatBytes(file.size)})`;
  const objectUrl = URL.createObjectURL(file);

  if (file.type.startsWith('image/')) {
    el.postMediaType.value = 'image';
    el.mediaPreviewBox.innerHTML = `<img src="${objectUrl}" alt="תצוגה מקדימה" /><span class="media-preview-meta">${escapeHtml(file.name)} • ${formatBytes(file.size)}</span>`;
  } else if (file.type.startsWith('video/')) {
    el.postMediaType.value = 'video';
    el.mediaPreviewBox.innerHTML = `<video src="${objectUrl}" controls muted></video><span class="media-preview-meta">${escapeHtml(file.name)} • ${formatBytes(file.size)}</span>`;
  } else if (file.type.startsWith('audio/')) {
    el.postMediaType.value = 'audio';
    el.mediaPreviewBox.innerHTML = `<audio src="${objectUrl}" controls></audio><span class="media-preview-meta">${escapeHtml(file.name)} • ${formatBytes(file.size)}</span>`;
  } else {
    el.postMediaType.value = 'file';
    el.mediaPreviewBox.innerHTML = `<span class="media-preview-meta">📎 ${escapeHtml(file.name)} • ${formatBytes(file.size)}</span>`;
  }

  el.mediaInputs.classList.remove('hidden');
  el.mediaPreviewBox.classList.remove('hidden');
}

function openPostModal(post = null) {
  el.postFormError.classList.add('hidden');
  el.postMediaFile.value = '';
  updateMediaPreview(null);

  if (post) {
    el.postModalTitle.textContent = 'עריכת פוסט';
    el.editPostId.value = post.id;
    el.postCategory.value = post.category || 'כללי';
    el.postPinned.checked = Boolean(post.is_pinned);
    el.postEditor.innerHTML = formatContent(post.content || '');
    el.postMediaType.value = post.media_type || 'none';
    el.postMediaUrl.value = post.media_url || '';
    el.postMediaName.value = post.media_name || '';
  } else {
    el.postModalTitle.textContent = 'פוסט חדש';
    el.editPostId.value = '';
    el.postCategory.value = (CONFIG.CATEGORIES && CONFIG.CATEGORIES[0]) || 'כללי';
    el.postPinned.checked = false;
    el.postEditor.innerHTML = '';
    el.postMediaType.value = 'none';
    el.postMediaUrl.value = '';
    el.postMediaName.value = '';
  }

  const showMediaFields = el.postMediaType.value !== 'none';
  el.mediaInputs.classList.toggle('hidden', !showMediaFields);
  openModal('postModal');
  setTimeout(() => el.postEditor.focus(), 60);
}

function uploadFileWithProgress(file, path) {
  return new Promise((resolve, reject) => {
    const token = state.session?.access_token;
    if (!token) {
      reject(new Error('פג תוקף ההתחברות — יש להתחבר מחדש כדי להעלות קבצים.'));
      return;
    }

    const url = `${CONFIG.SUPABASE_URL}/storage/v1/object/channel-media/${path}`;
    const xhr = new XMLHttpRequest();
    state.activeUploadXhr = xhr;
    const startedAt = Date.now();

    el.uploadStatusWidget.classList.remove('hidden');
    el.uploadFileLabel.textContent = `מעלה ברקע: ${file.name}`;
    el.uploadPercentText.textContent = '0%';
    el.uploadProgressFill.style.width = '0%';
    el.uploadBytesText.textContent = `0 MB / ${formatBytes(file.size)}`;
    el.uploadTimeText.textContent = 'עבר: 00:00 • נותר: מחשב...';

    xhr.open('POST', url, true);
    xhr.setRequestHeader('apikey', CONFIG.SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'false');
    if (file.type) {
      xhr.setRequestHeader('Content-Type', file.type);
    }

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
      const elapsedSec = (Date.now() - startedAt) / 1000;
      const speed = elapsedSec > 0.2 ? evt.loaded / elapsedSec : 0;
      const remainingBytes = Math.max(0, evt.total - evt.loaded);
      const etaSec = speed > 0 ? remainingBytes / speed : 0;

      el.uploadPercentText.textContent = `${pct}%`;
      el.uploadProgressFill.style.width = `${pct}%`;
      el.uploadBytesText.textContent = `${formatBytes(evt.loaded)} / ${formatBytes(evt.total)} (נותר: ${formatBytes(remainingBytes)})`;
      el.uploadTimeText.textContent = `עבר: ${formatDuration(elapsedSec)} • נותר: ${speed > 0 ? formatDuration(etaSec) : 'מחשב...'}`;
    };

    xhr.onload = () => {
      state.activeUploadXhr = null;
      el.uploadStatusWidget.classList.add('hidden');
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(`storage://${path}`);
      } else {
        let msg = 'שגיאה בהעלאת הקובץ לשרת.';
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (parsed?.message) msg = parsed.message;
        } catch {
          // ignore
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      state.activeUploadXhr = null;
      el.uploadStatusWidget.classList.add('hidden');
      reject(new Error('שגיאת רשת בזמן העלאת הקובץ.'));
    };

    xhr.onabort = () => {
      state.activeUploadXhr = null;
      el.uploadStatusWidget.classList.add('hidden');
      reject(new Error('__ABORTED__'));
    };

    xhr.send(file);
  });
}

async function commitPostPayload(id, payload) {
  if (state.isDemo) {
    if (id) {
      const idx = state.posts.findIndex((p) => String(p.id) === String(id));
      if (idx !== -1) state.posts[idx] = { ...state.posts[idx], ...payload };
    } else {
      state.posts.push({
        id: Date.now(),
        ...payload,
        reactions: { '👍': 0, '❤️': 0, '🔥': 0 },
        created_at: new Date().toISOString()
      });
    }
    saveDemoData();
    renderCategories();
    renderFeed({ scrollToBottom: !id });
    return;
  }

  if (id) {
    const { error } = await state.supabase.from('posts').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await state.supabase.from('posts').insert(payload);
    if (error) throw error;
  }
  await fetchLiveData({ skipInitialRestore: true });
  if (!id) scrollToFeedBottom(true);
}

async function savePost(e) {
  e.preventDefault();
  el.postFormError.classList.add('hidden');

  const id = el.editPostId.value;
  const mediaType = el.postMediaType.value;
  const rawUrl = el.postMediaUrl.value.trim();
  const rawName = el.postMediaName.value.trim();
  const file = el.postMediaFile.files[0];
  const rawHtml = sanitizeRichHtml(el.postEditor.innerHTML).trim();
  const plainText = stripHtml(rawHtml);
  const content = plainText ? rawHtml : '';
  const category = el.postCategory.value;
  const isPinned = el.postPinned.checked;

  if (!plainText && !rawUrl && !(mediaType !== 'none' && file)) {
    el.postFormError.textContent = 'יש להזין טקסט או לצרף מדיה.';
    el.postFormError.classList.remove('hidden');
    return;
  }

  if (mediaType !== 'none' && file && !state.isDemo) {
    if (state.activeUploadXhr) {
      el.postFormError.textContent = 'יש כבר העלאה פעילה ברקע, המתן לסיומה או בטל אותה.';
      el.postFormError.classList.remove('hidden');
      return;
    }

    // סוגרים מיד את חלון העריכה כדי שהמנהל יוכל להמשיך לגלוש בזמן שהקובץ עולה ברקע!
    closeModal('postModal');
    showToast('ההעלאה התחילה ברקע — אפשר להמשיך לגלוש כרגיל');

    const rawExt = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    try {
      const uploadedPath = await uploadFileWithProgress(file, path);
      await commitPostPayload(id, {
        content,
        category,
        is_pinned: isPinned,
        media_type: mediaType,
        media_url: uploadedPath,
        media_name: rawName || file.name,
        updated_at: new Date().toISOString()
      });
      showToast(id ? 'הפוסט עודכן בהצלחה!' : 'הקובץ הועלה והפוסט פורסם!', 'success');
    } catch (err) {
      if (err.message === '__ABORTED__') {
        showToast('העלאת הקובץ בוטלה');
      } else {
        showToast(err.message || 'שגיאה בהעלאה ברקע', 'error');
      }
    }
    return;
  }

  el.savePostBtn.disabled = true;
  el.savePostBtn.textContent = 'שומר...';

  try {
    let mediaUrl = rawUrl;
    let mediaName = rawName;
    if (mediaType !== 'none' && file && state.isDemo) {
      mediaUrl = URL.createObjectURL(file);
      if (!mediaName) mediaName = file.name;
    }

    await commitPostPayload(id, {
      content,
      category,
      is_pinned: isPinned,
      media_type: mediaType,
      media_url: mediaType === 'none' ? '' : mediaUrl,
      media_name: mediaType === 'none' ? '' : mediaName,
      updated_at: new Date().toISOString()
    });

    closeModal('postModal');
    showToast(id ? 'הפוסט עודכן בהצלחה' : 'הפוסט פורסם בערוץ!', 'success');
  } catch (err) {
    el.postFormError.textContent = err.message || 'שגיאה בשמירת הפוסט';
    el.postFormError.classList.remove('hidden');
  } finally {
    el.savePostBtn.disabled = false;
    el.savePostBtn.textContent = 'פרסם בערוץ';
  }
}

async function deletePost(postId) {
  if (!confirm('למחוק את הפוסט הזה לצמיתות?')) return;

  if (state.isDemo) {
    state.posts = state.posts.filter((p) => String(p.id) !== String(postId));
    saveDemoData();
    renderCategories();
    renderFeed();
    showToast('הפוסט נמחק');
    return;
  }

  const { error } = await state.supabase.from('posts').delete().eq('id', postId);
  if (!error) {
    await fetchLiveData({ skipInitialRestore: true });
    showToast('הפוסט נמחק');
  } else {
    showToast('שגיאה במחיקת הפוסט', 'error');
  }
}

// --- Feedback & Admin Inbox ---
function loadDemoFeedbacks() {
  try {
    state.feedbacks = JSON.parse(localStorage.getItem(DEMO_FEEDBACK_KEY) || '[]');
  } catch {
    state.feedbacks = [];
  }
  updateInboxBadge();
}

function saveDemoFeedbacks() {
  localStorage.setItem(DEMO_FEEDBACK_KEY, JSON.stringify(state.feedbacks));
}

function updateInboxBadge() {
  const unread = state.feedbacks.filter((f) => !f.is_read).length;
  if (el.inboxUnreadCount) {
    el.inboxUnreadCount.textContent = String(unread);
    el.inboxUnreadCount.classList.toggle('hidden', unread === 0);
  }
  if (el.adminMenuUnreadDot) {
    el.adminMenuUnreadDot.classList.toggle('hidden', unread === 0);
  }
}

async function fetchFeedbacks() {
  if (!state.isAdmin) return;
  if (state.isDemo) {
    loadDemoFeedbacks();
    renderInbox();
    return;
  }
  if (!state.supabase) return;
  const { data } = await state.supabase
    .from('feedback_messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (data) {
    state.feedbacks = data;
    updateInboxBadge();
    renderInbox();
  }
}

function renderInbox() {
  if (!el.inboxList) return;
  if (state.feedbacks.length === 0) {
    el.inboxList.innerHTML = '<div class="inbox-empty">אין הודעות משוב עדיין.</div>';
    return;
  }

  el.inboxList.innerHTML = state.feedbacks
    .map(
      (item) => `
      <div class="inbox-item ${item.is_read ? '' : 'is-unread'}">
        <div class="inbox-item-header">
          <span class="inbox-sender">${escapeHtml(item.sender_email)}</span>
          <time>${escapeHtml(formatDayLabel(item.created_at))} • ${escapeHtml(formatDate(item.created_at))}</time>
        </div>
        <div class="inbox-item-msg">${escapeHtml(item.message)}</div>
        <div class="inbox-item-actions">
          ${
            !item.is_read
              ? `<button type="button" class="btn btn-outline" data-fb-read="${item.id}">סמן כנקרא</button>`
              : ''
          }
          <button type="button" class="btn btn-ghost" data-fb-delete="${item.id}">מחק</button>
        </div>
      </div>`
    )
    .join('');
}

async function submitFeedback(e) {
  e.preventDefault();
  el.feedbackError.classList.add('hidden');
  const message = el.feedbackInput.value.trim();
  if (!message) return;

  el.sendFeedbackSubmit.disabled = true;
  el.sendFeedbackSubmit.textContent = 'שולח...';

  try {
    if (state.isDemo) {
      loadDemoFeedbacks();
      state.feedbacks.unshift({
        id: Date.now(),
        sender_email: state.user?.email || 'demo@user.local',
        message,
        is_read: false,
        created_at: new Date().toISOString()
      });
      saveDemoFeedbacks();
      updateInboxBadge();
      renderInbox();
    } else {
      const { error } = await state.supabase
        .from('feedback_messages')
        .insert({ message });
      if (error) throw error;
    }
    el.feedbackInput.value = '';
    closeModal('feedbackModal');
    showToast('המשוב נשלח למנהלים בהצלחה!', 'success');
  } catch (err) {
    el.feedbackError.textContent = err.message || 'שגיאה בשליחת המשוב';
    el.feedbackError.classList.remove('hidden');
  } finally {
    el.sendFeedbackSubmit.disabled = false;
    el.sendFeedbackSubmit.textContent = 'שלח משוב';
  }
}

async function markFeedbackRead(id) {
  if (state.isDemo) {
    const item = state.feedbacks.find((f) => String(f.id) === String(id));
    if (item) item.is_read = true;
    saveDemoFeedbacks();
    updateInboxBadge();
    renderInbox();
    return;
  }
  const { error } = await state.supabase
    .from('feedback_messages')
    .update({ is_read: true })
    .eq('id', id);
  if (!error) await fetchFeedbacks();
}

async function deleteFeedback(id) {
  if (state.isDemo) {
    state.feedbacks = state.feedbacks.filter((f) => String(f.id) !== String(id));
    saveDemoFeedbacks();
    updateInboxBadge();
    renderInbox();
    return;
  }
  const { error } = await state.supabase
    .from('feedback_messages')
    .delete()
    .eq('id', id);
  if (!error) await fetchFeedbacks();
}

// --- Admin Analytics & Mailing Dashboard ---
async function openAnalyticsDashboard() {
  if (!state.isAdmin) return;
  openModal('analyticsModal');
  el.analyticsKpis.innerHTML = '<div class="inbox-empty">טוען נתוני אנליטיקה...</div>';

  if (state.isDemo) {
    try {
      state.analyticsEvents = JSON.parse(localStorage.getItem(DEMO_ANALYTICS_KEY) || '[]');
    } catch {
      state.analyticsEvents = [];
    }
    try {
      state.mailingSubscribers = JSON.parse(localStorage.getItem(DEMO_MAILING_KEY) || '[]');
    } catch {
      state.mailingSubscribers = [];
    }
    renderAnalyticsDashboard();
    return;
  }

  const [evRes, mailRes] = await Promise.all([
    state.supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000),
    state.supabase
      .from('mailing_subscribers')
      .select('*')
      .order('consented_at', { ascending: false })
  ]);

  state.analyticsEvents = evRes.data || [];
  state.mailingSubscribers = mailRes.data || [];
  renderAnalyticsDashboard();
}

function renderAnalyticsDashboard() {
  const rangeVal = el.analyticsRangeSelect?.value || 'all';
  const nowMs = Date.now();
  const cutoffMs =
    rangeVal === 'all' ? 0 : nowMs - Number(rangeVal) * 24 * 60 * 60 * 1000;

  const events = state.analyticsEvents.filter(
    (ev) => new Date(ev.created_at).getTime() >= cutoffMs
  );

  const countStats = (type) => {
    const matching = events.filter((e) => e.event_type === type);
    const uniqueUsers = new Set(matching.map((e) => e.user_id || e.user_email)).size;
    return { total: matching.length, unique: uniqueUsers };
  };

  const pageViews = countStats('page_view');
  const postViews = countStats('post_view');
  const adViews = countStats('ad_view');
  const adClicks = countStats('ad_click');
  const linkClicks = countStats('link_click');
  const totalClicks = adClicks.total + linkClicks.total;
  const uniqueClickers = new Set(
    events
      .filter((e) => e.event_type === 'ad_click' || e.event_type === 'link_click')
      .map((e) => e.user_id || e.user_email)
  ).size;
  const adCtr = adViews.total > 0 ? ((adClicks.total / adViews.total) * 100).toFixed(1) : '0.0';

  el.analyticsKpis.innerHTML = `
    <div class="kpi-card">
      <span class="kpi-label">כניסות לערוץ</span>
      <span class="kpi-value">${pageViews.total}</span>
      <span class="kpi-sub">ייחודיים: ${pageViews.unique} משתמשים</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-label">צפיות בפוסטים</span>
      <span class="kpi-value">${postViews.total}</span>
      <span class="kpi-sub">צופים ייחודיים: ${postViews.unique}</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-label">צפיות במודעת הצד</span>
      <span class="kpi-value">${adViews.total}</span>
      <span class="kpi-sub">ייחודיים: ${adViews.unique} • הקלקות: ${adClicks.total} (${adCtr}%)</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-label">לחיצות (קישורים ומודעות)</span>
      <span class="kpi-value">${totalClicks}</span>
      <span class="kpi-sub">ייחודיים: ${uniqueClickers} • קישורים בפוסטים: ${linkClicks.total}</span>
    </div>
  `;

  // Tab 1: Posts Breakdown
  const postRows = [...state.posts].reverse().map((post) => {
    const pv = events.filter((e) => e.event_type === 'post_view' && String(e.post_id) === String(post.id));
    const lc = events.filter((e) => e.event_type === 'link_click' && String(e.post_id) === String(post.id));
    const uniquePv = new Set(pv.map((e) => e.user_id || e.user_email)).size;
    const uniqueLc = new Set(lc.map((e) => e.user_id || e.user_email)).size;
    const snippet = escapeHtml((post.content || post.media_name || 'ללא טקסט').slice(0, 48));
    return `
      <tr>
        <td>${snippet}</td>
        <td>${escapeHtml(post.category || 'כללי')}</td>
        <td><strong>${pv.length}</strong></td>
        <td>${uniquePv}</td>
        <td>${lc.length} (${uniqueLc} ייחודיים)</td>
      </tr>`;
  });

  el.analyticsTabPosts.innerHTML = postRows.length
    ? `<table class="analytics-table">
         <thead><tr><th>פוסט</th><th>קטגוריה</th><th>צפיות (סה"כ)</th><th>צופים ייחודיים</th><th>קליקים בקישורים</th></tr></thead>
         <tbody>${postRows.join('')}</tbody>
       </table>`
    : '<div class="inbox-empty">אין עדיין נתוני צפייה בפוסטים.</div>';

  // Tab 2: Ads & Links Breakdown
  const linkMap = new Map();
  events
    .filter((e) => e.event_type === 'ad_click' || e.event_type === 'link_click')
    .forEach((e) => {
      const key = `${e.event_type}|${e.target_url || e.target_label}`;
      if (!linkMap.has(key)) {
        linkMap.set(key, {
          type: e.event_type === 'ad_click' ? 'מודעת צד' : 'קישור בפוסט',
          url: e.target_url || e.target_label || 'קישור',
          total: 0,
          users: new Set()
        });
      }
      const entry = linkMap.get(key);
      entry.total += 1;
      entry.users.add(e.user_id || e.user_email);
    });

  const linkRows = [...linkMap.values()]
    .sort((a, b) => b.total - a.total)
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.type)}</td>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.url)}</td>
        <td><strong>${item.total}</strong></td>
        <td>${item.users.size}</td>
      </tr>`
    );

  el.analyticsTabLinks.innerHTML = linkRows.length
    ? `<table class="analytics-table">
         <thead><tr><th>סוג</th><th>יעד / כתובת</th><th>סך קליקים</th><th>קליקים ייחודיים</th></tr></thead>
         <tbody>${linkRows.join('')}</tbody>
       </table>`
    : '<div class="inbox-empty">אין עדיין קליקים על מודעות או קישורים בטווח שנבחר.</div>';

  // Tab 3: Mailing Subscribers
  const consented = state.mailingSubscribers.filter((s) => s.accepted_mailing);
  const pending = consented.filter((s) => !s.batch_notified);
  const nextBatch = pending.slice(0, 10);

  el.analyticsTabMailing.innerHTML = `
    <div class="mailing-batch-box">
      <div>
        <strong>סה"כ מאשרי דיוור: ${consented.length}</strong> •
        ממתינים לצירוף לקבוצת Google: <strong>${pending.length}</strong>
        (מתוך מנת 10 הבאה: ${Math.min(10, pending.length)}/10)
      </div>
      <div class="mailing-batch-actions">
        <button type="button" class="btn btn-primary btn-xs" id="copyMailingBatchBtn" ${nextBatch.length === 0 ? 'disabled' : ''}>העתק ${nextBatch.length || 10} כתובות הבאות</button>
        <button type="button" class="btn btn-outline btn-xs" id="markMailingBatchBtn" ${nextBatch.length === 0 ? 'disabled' : ''}>סמן כצורפו</button>
      </div>
    </div>
    ${
      consented.length
        ? `<table class="analytics-table">
             <thead><tr><th>אימייל</th><th>תאריך אישור</th><th>סטטוס קבוצה</th></tr></thead>
             <tbody>${consented
               .map(
                 (s) => `
                 <tr>
                   <td>${escapeHtml(s.email)}</td>
                   <td>${escapeHtml(formatDayLabel(s.consented_at))} • ${escapeHtml(formatDate(s.consented_at))}</td>
                   <td>${s.batch_notified ? 'נשלח / צורף ✓' : 'ממתין בקבוצה'}</td>
                 </tr>`
               )
               .join('')}</tbody>
           </table>`
        : '<div class="inbox-empty">עדיין אין נרשמים שאישרו דיוור.</div>'
    }
  `;

  document.getElementById('copyMailingBatchBtn')?.addEventListener('click', () => {
    const emails = nextBatch.map((s) => s.email).join(', ');
    navigator.clipboard?.writeText(emails);
    showToast(`הועתקו ${nextBatch.length} כתובות מייל ללוח!`, 'success');
  });

  document.getElementById('markMailingBatchBtn')?.addEventListener('click', async () => {
    const ids = nextBatch.map((s) => s.id);
    if (ids.length === 0) return;
    if (state.isDemo) {
      state.mailingSubscribers.forEach((s) => {
        if (ids.includes(s.id)) s.batch_notified = true;
      });
      localStorage.setItem(DEMO_MAILING_KEY, JSON.stringify(state.mailingSubscribers));
      renderAnalyticsDashboard();
      showToast('סומן כצורף בהצלחה');
      return;
    }
    const { error } = await state.supabase
      .from('mailing_subscribers')
      .update({ batch_notified: true })
      .in('id', ids);
    if (!error) {
      await openAnalyticsDashboard();
      showToast('סומן כצורף בהצלחה', 'success');
    }
  });
}

// --- Event Listeners ---
function bindEvents() {
  document.querySelectorAll('[data-close]').forEach((node) => {
    node.addEventListener('click', () => closeModal(node.getAttribute('data-close')));
  });

  // Search + Reset filter
  el.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderCategories();
    renderFeed();
  });

  el.resetFilterBtn?.addEventListener('click', () => {
    state.activeCategory = 'הכל';
    state.searchQuery = '';
    el.searchInput.value = '';
    renderCategories();
    renderFeed();
  });

  // Password show/hide toggle
  el.toggleGatePassword?.addEventListener('click', () => {
    const isPass = el.gatePassword.type === 'password';
    el.gatePassword.type = isPass ? 'text' : 'password';
  });

  // Gate Tabs
  el.gateAuthTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-auth-tab]');
    if (!tab) return;
    state.gateMode = tab.dataset.authTab;
    el.gateAuthTabs.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isSignup = state.gateMode === 'signup';
    el.gateSubmitBtn.textContent = isSignup ? 'הרשמה לערוץ' : 'התחבר לערוץ';
    el.gatePassword.autocomplete = isSignup ? 'new-password' : 'current-password';
    el.gateSignupExtras?.classList.toggle('hidden', !isSignup);
    el.gateError.classList.add('hidden');
    el.gateSuccess.classList.add('hidden');
  });

  el.openPrivacyModalBtn?.addEventListener('click', () => openModal('privacyModal'));

  // Gate Login / Signup
  el.gateLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.gateError.classList.add('hidden');
    el.gateSuccess.classList.add('hidden');
    el.gateSubmitBtn.disabled = true;

    try {
      const email = el.gateEmail.value.trim();
      const password = el.gatePassword.value;

      if (state.gateMode === 'signup') {
        if (!el.agreeTermsCheckbox?.checked) {
          el.gateError.textContent = 'כדי להירשם לערוץ יש לאשר את מדיניות הפרטיות ותנאי השימוש.';
          el.gateError.classList.remove('hidden');
          return;
        }

        const acceptedTerms = true;
        const acceptedMailing = Boolean(el.agreeMailingCheckbox?.checked);
        localStorage.setItem(
          PENDING_MAILING_KEY,
          JSON.stringify({ email, acceptedTerms, acceptedMailing })
        );

        const { data, error } = await state.supabase.auth.signUp({ email, password });
        if (error) {
          el.gateError.textContent = translateAuthError(error, 'signup');
          el.gateError.classList.remove('hidden');
        } else if (data.session) {
          await handleAuthChange(data.session);
          showToast('נרשמת והתחברת לערוץ בהצלחה!', 'success');
        } else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          el.gateError.textContent = 'כתובת המייל הזו כבר רשומה בערוץ! עבור ללשונית "התחברות" כדי להיכנס.';
          el.gateError.classList.remove('hidden');
        } else {
          el.gateSuccess.textContent = 'החשבון נוצר! ניתן לעבור כעת ללשונית "התחברות" ולהיכנס (אם אימות המייל פעיל בשרת, יש לאשר את הקישור במייל).';
          el.gateSuccess.classList.remove('hidden');
        }
        return;
      }

      const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
      if (error) {
        el.gateError.textContent = translateAuthError(error, 'signin');
        el.gateError.classList.remove('hidden');
      } else {
        await handleAuthChange(data.session);
      }
    } finally {
      el.gateSubmitBtn.disabled = false;
    }
  });

  // Gate Google OAuth
  el.gateGoogleBtn.addEventListener('click', async () => {
    const { error } = await state.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) {
      el.gateError.textContent = error.message;
      el.gateError.classList.remove('hidden');
    }
  });

  // Hover/tap search toggle
  if (el.hoverSearchWrap) {
    const trigger = el.hoverSearchWrap.querySelector('.hover-search-trigger');
    trigger?.addEventListener('click', () => {
      el.hoverSearchWrap.classList.toggle('is-open');
      if (el.hoverSearchWrap.classList.contains('is-open')) {
        el.searchInput.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (!el.hoverSearchWrap.contains(e.target)) {
        el.hoverSearchWrap.classList.remove('is-open');
      }
    });
  }

  // Gate Demo Mode
  el.gateDemoBtn.addEventListener('click', () => {
    state.user = { id: 'demo-admin', email: 'demo@admin.local' };
    state.isAdmin = true;
    if (!state.loggedPageView) {
      state.loggedPageView = true;
      logAnalyticsEvent('page_view', { target_label: 'כניסה לערוץ' });
    }
    renderAuthUI();
    renderCategories();
    loadDemoFeedbacks();
    renderFeed({ restoreScroll: !hasRestoredInitialScroll });
  });

  // Cancel background upload
  el.cancelUploadBtn?.addEventListener('click', () => {
    if (state.activeUploadXhr) {
      state.activeUploadXhr.abort();
    }
  });

  // Load older posts
  el.loadOlderBtn?.addEventListener('click', loadOlderPosts);

  // Logout
  el.logoutBtn.addEventListener('click', async () => {
    hasRestoredInitialScroll = false;
    clearFeedCache();
    if (state.isDemo) {
      state.user = null;
      state.isAdmin = false;
      renderAuthUI();
      return;
    }
    await state.supabase.auth.signOut();
    showToast('התנתקת מהערוץ');
  });

  // Admin Drawer Toggle (via clicking profile or settings/manage gear button)
  const toggleAdminDrawer = () => {
    if (!state.isAdmin) return;
    const isHidden = el.adminDrawer.classList.toggle('hidden');
    el.adminMenuToggleBtn?.classList.toggle('is-active', !isHidden);
  };

  el.adminMenuToggleBtn?.addEventListener('click', toggleAdminDrawer);
  el.profileTrigger?.addEventListener('click', toggleAdminDrawer);

  // Rich Text Editor Toolbar
  el.rteToolbar?.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) e.preventDefault();
  });

  el.rteToolbar?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cmd]');
    if (!btn) return;
    el.postEditor.focus();
    document.execCommand(btn.dataset.cmd, false, null);
  });

  el.rteFontFamily?.addEventListener('change', () => {
    el.postEditor.focus();
    document.execCommand('fontName', false, el.rteFontFamily.value);
  });

  el.rteFontSize?.addEventListener('change', () => {
    el.postEditor.focus();
    document.execCommand('fontSize', false, el.rteFontSize.value);
  });

  el.rteForeColor?.addEventListener('input', () => {
    el.postEditor.focus();
    document.execCommand('foreColor', false, el.rteForeColor.value);
  });

  el.rteBackColor?.addEventListener('input', () => {
    el.postEditor.focus();
    document.execCommand('hiliteColor', false, el.rteBackColor.value);
  });

  // New / Edit Post & Drag-and-Drop Media
  el.newPostBtn.addEventListener('click', () => openPostModal());
  el.postMediaType.addEventListener('change', () => {
    const show = el.postMediaType.value !== 'none';
    el.mediaInputs.classList.toggle('hidden', !show);
  });

  el.postMediaFile.addEventListener('change', () => {
    updateMediaPreview(el.postMediaFile.files[0] || null);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    el.mediaDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      el.mediaDropzone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    el.mediaDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      el.mediaDropzone.classList.remove('is-dragover');
    });
  });

  el.mediaDropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    el.postMediaFile.files = dt.files;
    updateMediaPreview(file);
  });

  el.postForm.addEventListener('submit', savePost);

  // Settings (including side ad banner)
  el.adminSettingsBtn.addEventListener('click', () => {
    el.settingsTitle.value = state.settings.title;
    el.settingsDesc.value = state.settings.description;
    el.settingsAvatar.value = state.settings.avatar_url || '';
    el.settingsAdTitle.value = state.settings.ad_title || '';
    el.settingsAdDesc.value = state.settings.ad_description || '';
    el.settingsAdImage.value = state.settings.ad_image_url || '';
    el.settingsAdLink.value = state.settings.ad_link_url || '';
    openModal('settingsModal');
  });

  el.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      title: el.settingsTitle.value.trim(),
      description: el.settingsDesc.value.trim(),
      avatar_url: el.settingsAvatar.value.trim(),
      ad_title: el.settingsAdTitle.value.trim() || 'מקום פנוי למודעה שלך',
      ad_description: el.settingsAdDesc.value.trim(),
      ad_image_url: el.settingsAdImage.value.trim(),
      ad_link_url: el.settingsAdLink.value.trim()
    };
    if (state.isDemo) {
      state.settings = { ...state.settings, ...updated };
      saveDemoData();
      renderHeader();
    } else {
      const { error } = await state.supabase
        .from('channel_settings')
        .update(updated)
        .eq('id', 1);
      if (!error) {
        state.settings = { ...state.settings, ...updated };
        renderHeader();
      }
    }
    closeModal('settingsModal');
    showToast('הגדרות הערוץ והמודעה נשמרו', 'success');
  });

  // Feed Delegation
  el.feedContainer.addEventListener('click', (e) => {
    const reactBtn = e.target.closest('[data-react]');
    if (reactBtn) {
      handleReaction(reactBtn.dataset.react, reactBtn.dataset.emoji);
      return;
    }

    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      const post = state.posts.find((p) => String(p.id) === String(editBtn.dataset.edit));
      if (post) openPostModal(post);
      return;
    }

    const delBtn = e.target.closest('[data-delete]');
    if (delBtn) {
      deletePost(delBtn.dataset.delete);
      return;
    }

    const shareBtn = e.target.closest('[data-share]');
    if (shareBtn) {
      const url = `${window.location.origin}${window.location.pathname}#post-${shareBtn.dataset.share}`;
      navigator.clipboard?.writeText(url);
      shareBtn.innerHTML = `${ICONS.check}<span>הועתק!</span>`;
      showToast('הקישור להודעה הועתק');
      setTimeout(() => (shareBtn.innerHTML = `${ICONS.link}<span>העתק קישור</span>`), 1500);
      return;
    }

    const readMoreBtn = e.target.closest('[data-read-more]');
    if (readMoreBtn) {
      const card = readMoreBtn.closest('.post-card');
      const wrap = readMoreBtn.closest('[data-content-wrap]');
      if (card && wrap) {
        const expanded = card.classList.toggle('is-expanded');
        wrap.classList.toggle('is-collapsed', !expanded);
        readMoreBtn.textContent = expanded ? 'צמצם קריאה' : 'המשך קריאה';
      }
      return;
    }

    const linkEl = e.target.closest('.post-content a, .file-attachment');
    if (linkEl) {
      const card = linkEl.closest('.post-card');
      const postId = card ? card.id.replace('post-', '') : null;
      logAnalyticsEvent('link_click', {
        post_id: postId,
        target_url: linkEl.getAttribute('href') || '',
        target_label: (linkEl.textContent || '').trim().slice(0, 60)
      });
      return;
    }

    const mediaTrigger = e.target.closest('[data-fullscreen-src]');
    if (mediaTrigger) {
      const type = mediaTrigger.dataset.fullscreenType;
      const src = mediaTrigger.dataset.fullscreenSrc;
      if (type === 'video') {
        el.lightboxImg.classList.add('hidden');
        el.lightboxVideo.src = src;
        el.lightboxVideo.classList.remove('hidden');
      } else {
        el.lightboxVideo.pause();
        el.lightboxVideo.classList.add('hidden');
        el.lightboxImg.src = src;
        el.lightboxImg.classList.remove('hidden');
      }
      el.lightbox.classList.remove('hidden');
    }
  });

  function closeLightbox() {
    el.lightbox.classList.add('hidden');
    el.lightboxVideo.pause();
    el.lightboxVideo.removeAttribute('src');
    el.lightboxImg.removeAttribute('src');
  }

  el.lightboxClose.addEventListener('click', closeLightbox);
  el.lightbox.addEventListener('click', (e) => {
    if (e.target === el.lightbox) closeLightbox();
  });

  // Browser Notifications Toggle
  el.notifyToggle?.addEventListener('click', toggleBrowserNotifications);

  // User Feedback & Admin Inbox
  el.sendFeedbackBtn?.addEventListener('click', () => {
    el.feedbackError.classList.add('hidden');
    el.feedbackInput.value = '';
    openModal('feedbackModal');
    setTimeout(() => el.feedbackInput.focus(), 60);
  });

  el.feedbackForm?.addEventListener('submit', submitFeedback);

  el.openInboxBtn?.addEventListener('click', async () => {
    await fetchFeedbacks();
    openModal('inboxModal');
  });

  el.inboxList?.addEventListener('click', (e) => {
    const readBtn = e.target.closest('[data-fb-read]');
    if (readBtn) {
      markFeedbackRead(readBtn.dataset.fbRead);
      return;
    }
    const delBtn = e.target.closest('[data-fb-delete]');
    if (delBtn) {
      deleteFeedback(delBtn.dataset.fbDelete);
    }
  });

  // Side Ad Click tracking
  el.adSlotCard?.addEventListener('click', (e) => {
    const link = e.target.closest('a.ad-live-card');
    if (!link) return;
    logAnalyticsEvent('ad_click', {
      target_url: link.getAttribute('href') || '',
      target_label: state.settings.ad_title || 'מודעת צד'
    });
  });

  // Analytics & Mailing Dashboard
  el.openAnalyticsBtn?.addEventListener('click', openAnalyticsDashboard);
  el.analyticsRangeSelect?.addEventListener('change', renderAnalyticsDashboard);
  el.analyticsTabs?.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-analytics-tab]');
    if (!tab) return;
    state.analyticsTab = tab.dataset.analyticsTab;
    el.analyticsTabs.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    el.analyticsTabPosts.classList.toggle('hidden', state.analyticsTab !== 'posts');
    el.analyticsTabLinks.classList.toggle('hidden', state.analyticsTab !== 'links');
    el.analyticsTabMailing.classList.toggle('hidden', state.analyticsTab !== 'mailing');
  });

  // Keyboard shortcuts (Esc to close modals/lightbox, / to search)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!el.lightbox.classList.contains('hidden')) closeLightbox();
      closeModal('postModal');
      closeModal('settingsModal');
      closeModal('feedbackModal');
      closeModal('inboxModal');
      closeModal('privacyModal');
      closeModal('analyticsModal');
    } else if (
      e.key === '/' &&
      state.user &&
      !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
    ) {
      e.preventDefault();
      el.hoverSearchWrap?.classList.add('is-open');
      el.searchInput.focus();
    }
  });

  // Scroll bottom & persistent anchor position
  el.scrollBottomBtn.addEventListener('click', () => scrollToFeedBottom(true));
  let scrollSaveTimer = null;
  window.addEventListener('scroll', () => {
    if (!state.user || !hasRestoredInitialScroll) return;
    const nearBottom = isNearFeedBottom();
    el.scrollBottomBtn.classList.toggle('hidden', nearBottom);
    if (nearBottom) el.newMsgDot.classList.add('hidden');

    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(saveScrollAnchor, 120);
  });
}

// --- Bootstrap ---
async function init() {
  initTheme();
  initBgPicker();
  initNotifications();
  loadReactedMap();
  renderCategories();
  bindEvents();

  if (state.isDemo) {
    loadDemoData();
    renderHeader();
    renderCategories();
    renderAuthUI();
    el.bootLoader.classList.add('hidden');
    if (state.user) renderFeed({ restoreScroll: true });
  } else {
    renderHeader();
    hydrateInstantFromCache();
    await initSupabase();
  }
}

init();
