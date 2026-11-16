const CONFIG = window.CHANNEL_CONFIG || {};
const HAS_SUPABASE = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

const state = {
  supabase: null,
  isDemo: !HAS_SUPABASE,
  user: null,
  isAdmin: false,
  posts: [],
  settings: {
    title: CONFIG.DEFAULT_TITLE || 'הערוץ שלי',
    description: CONFIG.DEFAULT_DESCRIPTION || 'עדכונים ותוכן נקי',
    avatar_url: ''
  },
  activeCategory: 'הכל',
  searchQuery: ''
};

const DEMO_STORAGE_KEY = 'private_channel_demo_v1';

// --- DOM Elements ---
const el = {
  channelTitle: document.getElementById('channelTitle'),
  channelDescription: document.getElementById('channelDescription'),
  channelAvatar: document.getElementById('channelAvatar'),
  modeBadge: document.getElementById('modeBadge'),
  themeToggle: document.getElementById('themeToggle'),
  adminSettingsBtn: document.getElementById('adminSettingsBtn'),
  authBtn: document.getElementById('authBtn'),
  adminBar: document.getElementById('adminBar'),
  adminEmailDisplay: document.getElementById('adminEmailDisplay'),
  newPostBtn: document.getElementById('newPostBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  searchInput: document.getElementById('searchInput'),
  categoryChips: document.getElementById('categoryChips'),
  pinnedBanner: document.getElementById('pinnedBanner'),
  pinnedText: document.getElementById('pinnedText'),
  jumpToPinnedBtn: document.getElementById('jumpToPinnedBtn'),
  feedContainer: document.getElementById('feedContainer'),

  // Modals
  loginModal: document.getElementById('loginModal'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  googleLoginBtn: document.getElementById('googleLoginBtn'),
  demoLoginBtn: document.getElementById('demoLoginBtn'),
  demoLoginNotice: document.getElementById('demoLoginNotice'),
  loginError: document.getElementById('loginError'),

  postModal: document.getElementById('postModal'),
  postModalTitle: document.getElementById('postModalTitle'),
  postForm: document.getElementById('postForm'),
  editPostId: document.getElementById('editPostId'),
  postCategory: document.getElementById('postCategory'),
  postPinned: document.getElementById('postPinned'),
  postContent: document.getElementById('postContent'),
  postMediaType: document.getElementById('postMediaType'),
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
  lightboxClose: document.getElementById('lightboxClose')
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
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// --- Theme ---
function initTheme() {
  const saved = localStorage.getItem('channel_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  el.themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';

  el.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('channel_theme', next);
    el.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

// --- Demo Data ---
function loadDemoData() {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state.posts = parsed.posts || [];
      state.settings = parsed.settings || state.settings;
      return;
    } catch {
      // ignore corrupted demo storage
    }
  }

  state.posts = [
    {
      id: 1,
      content: 'ברוכים הבאים לערוץ החדש! 🎉\nהערוץ פועל כרגע במצב הדגמה מקומי. לאחר חיבור קובץ config.js ל-Supabase (חינמי ללא כרטיס אשראי), כל הפוסטים, התמונות והסרטונים יישמרו בענן ויתעדכנו בזמן אמת.',
      media_type: 'none',
      media_url: '',
      media_name: '',
      category: 'עדכונים',
      is_pinned: true,
      reactions: { '👍': 12, '❤️': 8, '🔥': 5 },
      created_at: new Date().toISOString()
    },
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

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    await handleAuthChange(session);
  });

  // Realtime updates
  state.supabase
    .channel('public:posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      async () => {
        await fetchLiveData();
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

  renderAuthUI();
  renderFeed();
}

async function fetchLiveData() {
  if (!state.supabase) return;

  const [settingsRes, postsRes] = await Promise.all([
    state.supabase.from('channel_settings').select('*').eq('id', 1).maybeSingle(),
    state.supabase.from('posts').select('*').order('created_at', { ascending: false })
  ]);

  if (settingsRes.data) {
    state.settings = settingsRes.data;
    renderHeader();
  }

  if (postsRes.data) {
    state.posts = postsRes.data;
    renderFeed();
  }
}

// --- Render UI ---
function renderHeader() {
  document.title = state.settings.title;
  el.channelTitle.textContent = state.settings.title;
  el.channelDescription.textContent = state.settings.description;

  if (state.settings.avatar_url) {
    el.channelAvatar.innerHTML = `<img src="${escapeHtml(state.settings.avatar_url)}" alt="${escapeHtml(state.settings.title)}" />`;
  } else {
    el.channelAvatar.textContent = (state.settings.title || 'ע').trim().charAt(0);
  }

  el.modeBadge.textContent = state.isDemo ? 'מצב הדגמה' : 'שידור חי';
}

function renderAuthUI() {
  if (state.isAdmin) {
    el.authBtn.classList.add('hidden');
    el.adminBar.classList.remove('hidden');
    el.adminSettingsBtn.classList.remove('hidden');
    el.adminEmailDisplay.textContent = state.user?.email || 'מנהל הדגמה';
  } else {
    el.authBtn.classList.remove('hidden');
    el.adminBar.classList.add('hidden');
    el.adminSettingsBtn.classList.add('hidden');
  }
}

function renderCategories() {
  const categories = ['הכל', ...(CONFIG.CATEGORIES || ['כללי'])];
  el.categoryChips.innerHTML = '';

  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = `chip ${state.activeCategory === cat ? 'active' : ''}`;
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      state.activeCategory = cat;
      renderCategories();
      renderFeed();
    });
    el.categoryChips.appendChild(btn);
  });

  // Populate select inside postModal
  el.postCategory.innerHTML = (CONFIG.CATEGORIES || ['כללי'])
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join('');
}

function renderPinnedBanner() {
  const pinned = state.posts.find((p) => p.is_pinned);
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
  if (!post.media_url || post.media_type === 'none') return '';
  const url = escapeHtml(post.media_url);
  const name = escapeHtml(post.media_name || 'קובץ מצורף');

  switch (post.media_type) {
    case 'image':
      return `<div class="post-media"><img src="${url}" alt="${name}" loading="lazy" data-lightbox="${url}" /></div>`;
    case 'video':
      return `<div class="post-media"><video src="${url}" controls preload="metadata"></video></div>`;
    case 'audio':
      return `<div class="post-media"><audio src="${url}" controls preload="metadata"></audio></div>`;
    case 'file':
      return `<div class="post-media"><a class="file-attachment" href="${url}" target="_blank" rel="noopener noreferrer">📎 ${name}</a></div>`;
    default:
      return '';
  }
}

function renderFeed() {
  renderPinnedBanner();

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
    return;
  }

  const allowedReactions = CONFIG.ALLOWED_REACTIONS || ['👍', '❤️', '🔥'];

  el.feedContainer.innerHTML = filtered
    .map((post) => {
      const reactions = post.reactions || {};
      const reactionsHtml = allowedReactions
        .map((emoji) => {
          const count = reactions[emoji] || 0;
          return `<button class="reaction-btn" data-react="${post.id}" data-emoji="${emoji}">${emoji} <span>${count}</span></button>`;
        })
        .join('');

      const adminControls = state.isAdmin
        ? `
          <div class="post-admin-actions">
            <button data-edit="${post.id}">עריכה</button>
            <button class="delete-btn" data-delete="${post.id}">מחיקה</button>
          </div>`
        : '';

      return `
        <article class="post-card" id="post-${post.id}">
          <div class="post-header">
            <div class="post-meta">
              <span class="post-cat">${escapeHtml(post.category || 'כללי')}</span>
              ${post.is_pinned ? '<span class="post-pin-tag">📌 נעוץ</span>' : ''}
              <time datetime="${escapeHtml(post.created_at)}">${formatDate(post.created_at)}</time>
            </div>
            ${adminControls}
          </div>
          ${post.content ? `<div class="post-content">${formatContent(post.content)}</div>` : ''}
          ${renderMedia(post)}
          <div class="post-footer">
            <div class="reactions-row">${reactionsHtml}</div>
            <button class="share-btn" data-share="${post.id}">🔗 העתק קישור</button>
          </div>
        </article>
      `;
    })
    .join('');
}

// --- Actions ---
async function handleReaction(postId, emoji) {
  if (state.isDemo) {
    const post = state.posts.find((p) => String(p.id) === String(postId));
    if (!post) return;
    post.reactions = post.reactions || {};
    post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
    saveDemoData();
    renderFeed();
    return;
  }

  const { data, error } = await state.supabase.rpc('increment_reaction', {
    p_post_id: Number(postId),
    p_emoji: emoji
  });
  if (!error && data) {
    const post = state.posts.find((p) => String(p.id) === String(postId));
    if (post) {
      post.reactions = data;
      renderFeed();
    }
  }
}

function openPostModal(post = null) {
  el.postFormError.classList.add('hidden');
  el.postMediaFile.value = '';

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

  el.mediaInputs.classList.toggle('hidden', el.postMediaType.value === 'none');
  openModal('postModal');
}

async function savePost(e) {
  e.preventDefault();
  el.postFormError.classList.add('hidden');
  el.savePostBtn.disabled = true;
  el.savePostBtn.textContent = 'שומר...';

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

        const { data: pub } = state.supabase.storage.from('channel-media').getPublicUrl(path);
        mediaUrl = pub.publicUrl;
        if (!mediaName) mediaName = file.name;
      }
    }

    const payload = {
      content: el.postContent.value.trim(),
      category: el.postCategory.value,
      is_pinned: el.postPinned.checked,
      media_type: mediaType,
      media_url: mediaType === 'none' ? '' : mediaUrl,
      media_name: mediaType === 'none' ? '' : mediaName
    };

    if (!payload.content && !payload.media_url) {
      throw new Error('יש להזין טקסט או לצרף מדיה.');
    }

    if (state.isDemo) {
      if (id) {
        const idx = state.posts.findIndex((p) => String(p.id) === String(id));
        if (idx !== -1) state.posts[idx] = { ...state.posts[idx], ...payload };
      } else {
        state.posts.unshift({
          id: Date.now(),
          ...payload,
          reactions: { '👍': 0, '❤️': 0, '🔥': 0 },
          created_at: new Date().toISOString()
        });
      }
      saveDemoData();
      renderFeed();
    } else {
      if (id) {
        const { error } = await state.supabase.from('posts').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await state.supabase.from('posts').insert(payload);
        if (error) throw error;
      }
      await fetchLiveData();
    }

    closeModal('postModal');
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
    renderFeed();
    return;
  }

  const { error } = await state.supabase.from('posts').delete().eq('id', postId);
  if (!error) await fetchLiveData();
}

// --- Event Listeners ---
function bindEvents() {
  // Close modals
  document.querySelectorAll('[data-close]').forEach((node) => {
    node.addEventListener('click', () => closeModal(node.getAttribute('data-close')));
  });

  // Search
  el.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderFeed();
  });

  // Auth button
  el.authBtn.addEventListener('click', () => {
    el.loginError.classList.add('hidden');
    el.demoLoginNotice.classList.toggle('hidden', !state.isDemo);
    el.demoLoginBtn.classList.toggle('hidden', !state.isDemo);
    el.loginForm.classList.toggle('hidden', state.isDemo);
    el.googleLoginBtn.classList.toggle('hidden', state.isDemo);
    openModal('loginModal');
  });

  // Demo login
  el.demoLoginBtn.addEventListener('click', () => {
    state.user = { email: 'demo@admin.local' };
    state.isAdmin = true;
    renderAuthUI();
    renderFeed();
    closeModal('loginModal');
  });

  // Email/Password login
  el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.loginError.classList.add('hidden');
    const { error } = await state.supabase.auth.signInWithPassword({
      email: el.loginEmail.value.trim(),
      password: el.loginPassword.value
    });
    if (error) {
      el.loginError.textContent = error.message;
      el.loginError.classList.remove('hidden');
    } else {
      closeModal('loginModal');
    }
  });

  // Google OAuth login
  el.googleLoginBtn.addEventListener('click', async () => {
    const { error } = await state.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) {
      el.loginError.textContent = error.message;
      el.loginError.classList.remove('hidden');
    }
  });

  // Logout
  el.logoutBtn.addEventListener('click', async () => {
    if (state.isDemo) {
      state.user = null;
      state.isAdmin = false;
      renderAuthUI();
      renderFeed();
      return;
    }
    await state.supabase.auth.signOut();
  });

  // New / Edit Post
  el.newPostBtn.addEventListener('click', () => openPostModal());
  el.postMediaType.addEventListener('change', () => {
    el.mediaInputs.classList.toggle('hidden', el.postMediaType.value === 'none');
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
  });

  // Feed delegation (reactions, edit, delete, share, lightbox)
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
      shareBtn.textContent = '✓ הועתק!';
      setTimeout(() => (shareBtn.textContent = '🔗 העתק קישור'), 1500);
      return;
    }

    const img = e.target.closest('[data-lightbox]');
    if (img) {
      el.lightboxImg.src = img.dataset.lightbox;
      el.lightbox.classList.remove('hidden');
    }
  });

  // Lightbox close
  el.lightboxClose.addEventListener('click', () => el.lightbox.classList.add('hidden'));
  el.lightbox.addEventListener('click', (e) => {
    if (e.target === el.lightbox) el.lightbox.classList.add('hidden');
  });
}

// --- Bootstrap ---
async function init() {
  initTheme();
  renderCategories();
  bindEvents();

  if (state.isDemo) {
    loadDemoData();
    renderHeader();
    renderAuthUI();
    renderFeed();
  } else {
    renderHeader();
    await initSupabase();
    await fetchLiveData();
  }

  // Deep link to specific post
  if (window.location.hash.startsWith('#post-')) {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }
}

init();
