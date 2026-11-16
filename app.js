const CONFIG = window.CHANNEL_CONFIG || {};
const HAS_SUPABASE = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

const state = {
  supabase: null,
  isDemo: !HAS_SUPABASE,
  user: null,
  isAdmin: false,
  posts: [],
  settings: {
    title: CONFIG.DEFAULT_TITLE || 'המקום',
    description: CONFIG.DEFAULT_DESCRIPTION || 'עדכונים, סרטונים ותוכן נקי ומאושר',
    avatar_url: ''
  },
  activeCategory: 'הכל',
  searchQuery: '',
  gateMode: 'signin',
  signedUrlCache: {},
  reactedMap: {},
  feedbacks: [],
  notificationsEnabled: false
};

const DEMO_STORAGE_KEY = 'private_channel_demo_v1';
const DEMO_FEEDBACK_KEY = 'hamakom_demo_feedback_v1';
const SCROLL_STORAGE_KEY = 'hamakom_scroll_anchor_v2';
const BG_STORAGE_KEY = 'hamakom_bg_choice';
const REACTED_STORAGE_KEY = 'hamakom_reacted_v1';
const NOTIFY_STORAGE_KEY = 'hamakom_browser_notify';
let hasRestoredInitialScroll = false;

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
  gateSubmitBtn: document.getElementById('gateSubmitBtn'),
  gateOrDivider: document.getElementById('gateOrDivider'),
  gateGoogleBtn: document.getElementById('gateGoogleBtn'),
  gateDemoBtn: document.getElementById('gateDemoBtn'),
  gateError: document.getElementById('gateError'),
  gateSuccess: document.getElementById('gateSuccess'),
  channelContent: document.getElementById('channelContent'),
  adminBar: document.getElementById('adminBar'),
  adminEmailDisplay: document.getElementById('adminEmailDisplay'),
  openInboxBtn: document.getElementById('openInboxBtn'),
  inboxUnreadCount: document.getElementById('inboxUnreadCount'),
  newPostBtn: document.getElementById('newPostBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  searchInput: document.getElementById('searchInput'),
  categoryChips: document.getElementById('categoryChips'),
  pinnedBanner: document.getElementById('pinnedBanner'),
  pinnedText: document.getElementById('pinnedText'),
  jumpToPinnedBtn: document.getElementById('jumpToPinnedBtn'),
  feedContainer: document.getElementById('feedContainer'),

  postModal: document.getElementById('postModal'),
  postModalTitle: document.getElementById('postModalTitle'),
  postForm: document.getElementById('postForm'),
  editPostId: document.getElementById('editPostId'),
  postCategory: document.getElementById('postCategory'),
  postPinned: document.getElementById('postPinned'),
  postContent: document.getElementById('postContent'),
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

function formatContent(text) {
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
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

// --- Supabase Init ---
async function initSupabase() {
  const { createClient } = await import(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
  );
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

async function handleAuthChange(session) {
  state.user = session?.user || null;
  state.isAdmin = false;

  if (state.user && state.supabase) {
    const { data } = await state.supabase
      .from('admins')
      .select('email')
      .eq('email', state.user.email)
      .maybeSingle();
    state.isAdmin = Boolean(data);
  }

  if (state.user) {
    await fetchLiveData();
    if (state.isAdmin) await fetchFeedbacks();
  } else {
    state.posts = [];
    state.feedbacks = [];
    hasRestoredInitialScroll = false;
    await fetchSettingsOnly();
  }

  renderAuthUI();
  el.bootLoader.classList.add('hidden');
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

async function resolveMediaUrls(posts) {
  if (!state.supabase) return posts;
  const paths = posts
    .map((p) => p.media_url)
    .filter((u) => u && u.startsWith('storage://'))
    .map((u) => u.replace('storage://', ''))
    .filter((path) => !state.signedUrlCache[path]);

  if (paths.length > 0) {
    const { data } = await state.supabase.storage
      .from('channel-media')
      .createSignedUrls(paths, 3600);
    if (Array.isArray(data)) {
      data.forEach((item) => {
        if (item.path && item.signedUrl) {
          state.signedUrlCache[item.path] = item.signedUrl;
        }
      });
    }
  }

  return posts.map((p) => {
    if (p.media_url && p.media_url.startsWith('storage://')) {
      const path = p.media_url.replace('storage://', '');
      return { ...p, resolved_media_url: state.signedUrlCache[path] || '' };
    }
    return { ...p, resolved_media_url: p.media_url };
  });
}

async function fetchLiveData(opts = {}) {
  if (!state.supabase) return;

  await fetchSettingsOnly();
  if (!state.user) return;

  const postsRes = await state.supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: true });

  if (postsRes.data) {
    state.posts = await resolveMediaUrls(postsRes.data);
    renderCategories();
    renderStats();
    renderFeed({
      restoreScroll: !opts.skipInitialRestore && !hasRestoredInitialScroll
    });
  }
}

// --- Render UI ---
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

  if (state.isAdmin) {
    el.adminBar.classList.remove('hidden');
    el.adminSettingsBtn.classList.remove('hidden');
    el.adminEmailDisplay.textContent = state.user?.email || 'מנהל הדגמה';
  } else {
    el.adminBar.classList.add('hidden');
    el.adminSettingsBtn.classList.add('hidden');
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
  el.pinnedText.textContent = pinned.content || pinned.media_name || 'הודעה נעוצה';
  el.jumpToPinnedBtn.onclick = () => {
    const card = document.getElementById(`post-${pinned.id}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('highlight');
      setTimeout(() => card.classList.remove('highlight'), 1800);
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
      (post.content || '').toLowerCase().includes(q) ||
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
    el.postContent.value = post.content || '';
    el.postMediaType.value = post.media_type || 'none';
    el.postMediaUrl.value = post.media_url || '';
    el.postMediaName.value = post.media_name || '';
  } else {
    el.postModalTitle.textContent = 'פוסט חדש';
    el.editPostId.value = '';
    el.postCategory.value = (CONFIG.CATEGORIES && CONFIG.CATEGORIES[0]) || 'כללי';
    el.postPinned.checked = false;
    el.postContent.value = '';
    el.postMediaType.value = 'none';
    el.postMediaUrl.value = '';
    el.postMediaName.value = '';
  }

  const showMediaFields = el.postMediaType.value !== 'none';
  el.mediaInputs.classList.toggle('hidden', !showMediaFields);
  openModal('postModal');
}

async function savePost(e) {
  e.preventDefault();
  el.postFormError.classList.add('hidden');
  el.savePostBtn.disabled = true;
  el.savePostBtn.textContent = 'מעלה ושומר...';

  try {
    const id = el.editPostId.value;
    const mediaType = el.postMediaType.value;
    let mediaUrl = el.postMediaUrl.value.trim();
    let mediaName = el.postMediaName.value.trim();
    const file = el.postMediaFile.files[0];

    if (mediaType !== 'none' && file) {
      if (state.isDemo) {
        mediaUrl = URL.createObjectURL(file);
        if (!mediaName) mediaName = file.name;
      } else {
        const ext = file.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await state.supabase.storage
          .from('channel-media')
          .upload(path, file);
        if (uploadErr) throw uploadErr;

        mediaUrl = `storage://${path}`;
        if (!mediaName) mediaName = file.name;
      }
    }

    const payload = {
      content: el.postContent.value.trim(),
      category: el.postCategory.value,
      is_pinned: el.postPinned.checked,
      media_type: mediaType,
      media_url: mediaType === 'none' ? '' : mediaUrl,
      media_name: mediaType === 'none' ? '' : mediaName,
      updated_at: new Date().toISOString()
    };

    if (!payload.content && !payload.media_url) {
      throw new Error('יש להזין טקסט או לצרף מדיה.');
    }

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
    } else {
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
  if (!el.inboxUnreadCount) return;
  const unread = state.feedbacks.filter((f) => !f.is_read).length;
  el.inboxUnreadCount.textContent = String(unread);
  el.inboxUnreadCount.classList.toggle('hidden', unread === 0);
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
    el.gateSubmitBtn.textContent = state.gateMode === 'signup' ? 'הרשמה לערוץ' : 'התחבר לערוץ';
    el.gatePassword.autocomplete = state.gateMode === 'signup' ? 'new-password' : 'current-password';
    el.gateError.classList.add('hidden');
    el.gateSuccess.classList.add('hidden');
  });

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
        const { data, error } = await state.supabase.auth.signUp({ email, password });
        if (error) {
          el.gateError.textContent = error.message;
          el.gateError.classList.remove('hidden');
        } else if (data.session) {
          await handleAuthChange(data.session);
          showToast('נרשמת והתחברת בהצלחה!', 'success');
        } else {
          el.gateSuccess.textContent = 'נשלח אליך מייל אימות! אשר את הכתובת כדי להיכנס לערוץ.';
          el.gateSuccess.classList.remove('hidden');
        }
        return;
      }

      const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
      if (error) {
        el.gateError.textContent = 'אימייל או סיסמה שגויים.';
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
    state.user = { email: 'demo@admin.local' };
    state.isAdmin = true;
    renderAuthUI();
    renderCategories();
    loadDemoFeedbacks();
    renderFeed({ restoreScroll: !hasRestoredInitialScroll });
  });

  // Logout
  el.logoutBtn.addEventListener('click', async () => {
    hasRestoredInitialScroll = false;
    if (state.isDemo) {
      state.user = null;
      state.isAdmin = false;
      renderAuthUI();
      return;
    }
    await state.supabase.auth.signOut();
    showToast('התנתקת מהערוץ');
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

  // Settings
  el.adminSettingsBtn.addEventListener('click', () => {
    el.settingsTitle.value = state.settings.title;
    el.settingsDesc.value = state.settings.description;
    el.settingsAvatar.value = state.settings.avatar_url || '';
    openModal('settingsModal');
  });

  el.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      title: el.settingsTitle.value.trim(),
      description: el.settingsDesc.value.trim(),
      avatar_url: el.settingsAvatar.value.trim()
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
    showToast('הגדרות הערוץ נשמרו', 'success');
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

  // Keyboard shortcuts (Esc to close modals/lightbox, / to search)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!el.lightbox.classList.contains('hidden')) closeLightbox();
      closeModal('postModal');
      closeModal('settingsModal');
      closeModal('feedbackModal');
      closeModal('inboxModal');
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
    await initSupabase();
  }
}

init();
