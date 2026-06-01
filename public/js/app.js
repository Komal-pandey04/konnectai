/* ═══════════════════════════════════════════════════
   KonnectAPI — Frontend JS (Production Upgraded)
   - Auth, Chat, Admin, Socket.io real-time, Toasts
═══════════════════════════════════════════════════ */

const API = '';
let token = localStorage.getItem('kapi_token');
let currentUser = (() => { try { return JSON.parse(localStorage.getItem('kapi_user') || 'null'); } catch { return null; } })();
let socket = null;
let chatHistory = [];

/* ── UTILITIES ─────────────────────────────────── */
function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}
function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── TOAST ─────────────────────────────────────── */
function toast(msg, type = 'info', duration = 3500) {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="ti ti-${type === 'ok' ? 'check' : type === 'err' ? 'alert-circle' : 'info-circle'}"></i> ${esc(msg)}`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

/* ── PAGE ROUTING ──────────────────────────────── */
function showPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  document.getElementById('page-' + p)?.classList.add('active');
}

/* ── AUTH TAB ──────────────────────────────────── */
function switchTab(t) {
  ['login', 'signup'].forEach(id => {
    document.getElementById('tab-' + id)?.classList.toggle('active', id === t);
    document.getElementById('form-' + id).style.display = id === t ? '' : 'none';
  });
  document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function fillDemo() {
  document.getElementById('login-email').value = 'demo@konnect.ai';
  document.getElementById('login-pass').value = 'demo123';
}
function fillAdmin() {
  document.getElementById('login-email').value = 'komal@konnect.ai';
  document.getElementById('login-pass').value = 'admin123';
}

/* ── LOGIN ─────────────────────────────────────── */
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) return showAuthError('Please fill all fields');

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const r = await fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const d = await r.json();
    if (!r.ok) { showAuthError(d.error || 'Login failed'); return; }
    saveSession(d.token, d.user);
    enterApp(d.user);
  } catch (e) {
    showAuthError('Cannot connect to server. Is the backend running?');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Login <i class="ti ti-arrow-right" style="vertical-align:-2px"></i>';
  }
}

/* ── SIGNUP ────────────────────────────────────── */
async function doSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;
  if (!name || !email || !pass) return showAuthError('All fields are required');
  if (pass.length < 6) return showAuthError('Password must be at least 6 characters');

  const btn = document.getElementById('btn-signup');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const r = await fetch(API + '/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });
    const d = await r.json();
    if (!r.ok) { showAuthError(d.error || 'Signup failed'); return; }
    saveSession(d.token, d.user);
    enterApp(d.user);
  } catch (e) {
    showAuthError('Cannot connect to server.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Create Account <i class="ti ti-arrow-right" style="vertical-align:-2px"></i>';
  }
}

/* ── SESSION ───────────────────────────────────── */
function saveSession(t, u) {
  token = t; currentUser = u;
  localStorage.setItem('kapi_token', t);
  localStorage.setItem('kapi_user', JSON.stringify(u));
}
function doLogout() {
  token = null; currentUser = null; chatHistory = [];
  socket?.disconnect();
  localStorage.removeItem('kapi_token');
  localStorage.removeItem('kapi_user');
  showPage('landing');
}

/* ── ENTER APP ─────────────────────────────────── */
function enterApp(user) {
  document.getElementById('sb-avatar').textContent   = user.name.charAt(0).toUpperCase();
  document.getElementById('sb-name').textContent     = user.name;
  document.getElementById('sb-email').textContent    = user.email;

  // Show/hide admin nav
  const adminNav = document.getElementById('nav-admin');
  if (adminNav) adminNav.style.display = user.role === 'admin' ? '' : 'none';

  showPage('chat');
  initSocket(user.id);
  loadHistory();
  updateBadge();
}

/* ── SOCKET.IO ─────────────────────────────────── */
function initSocket(userId) {
  if (typeof io === 'undefined') return;
  socket = io();
  socket.emit('register', userId);

  socket.on('komal_reply', (data) => {
    hideTyping();
    renderMsg('ai', data.reply, 'human', data.timestamp, true);
    toast('💬 Komal replied!', 'ok');
  });
}

/* ── VIEWS ─────────────────────────────────────── */
function switchView(v) {
  document.getElementById('view-chat').style.display  = v === 'chat'  ? 'flex' : 'none';
  document.getElementById('view-admin').style.display = v === 'admin' ? 'flex' : 'none';
  document.getElementById('nav-chat')?.classList.toggle('active', v === 'chat');
  document.getElementById('nav-admin')?.classList.toggle('active', v === 'admin');
  if (v === 'admin') loadAdmin();
}

/* ── LOAD HISTORY ──────────────────────────────── */
async function loadHistory() {
  const area = document.getElementById('messages-wrap');
  area.innerHTML = `
    <div class="welcome-banner">
      <span class="wb-icon">👋</span>
      <div class="wb-text">
        <strong>Hey! Main Komal's AI hu 😊</strong>
        <p>Normal questions — main instantly answer karungi. Koi personal cheez ho toh main real Komal ko notify karungi aur woh reply karegi!</p>
      </div>
    </div>`;
  chatHistory = [];

  try {
    const r = await fetch(API + '/api/chat/history', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();
    if (d.messages) {
      d.messages.forEach(m => {
        renderMsg('user', m.message, 'normal', m.timestamp);
        if (m.ai_reply) renderMsg('ai', m.ai_reply, m.message_type, m.timestamp);
        if (m.message_type !== 'sensitive' && m.message_type !== 'blocked') {
          chatHistory.push({ role: 'user', content: m.message });
          if (m.ai_reply) chatHistory.push({ role: 'assistant', content: m.ai_reply });
        }
      });
    }
  } catch (e) {}
  scrollBottom();
}

function clearChat() {
  if (!confirm('Clear chat history?')) return;
  chatHistory = [];
  loadHistory();
}

/* ── RENDER MESSAGE ────────────────────────────── */
function renderMsg(role, content, type, time, scroll = false) {
  if (!content) return;
  const area = document.getElementById('messages-wrap');
  const isUser = role === 'user';

  const row = document.createElement('div');
  row.className = 'msg-row' + (isUser ? ' user' : '');

  const av = document.createElement('div');
  av.className = 'msg-av ' + (isUser ? 'usr' : 'ai');
  av.textContent = isUser
    ? (currentUser?.name?.charAt(0) || 'U').toUpperCase()
    : 'K';

  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap';

  const bub = document.createElement('div');
  const bubClass = isUser ? 'user-b'
    : type === 'sensitive' ? 'sensitive-b'
    : type === 'human' ? 'human-b'
    : type === 'blocked' ? 'blocked-b'
    : 'ai-b';
  bub.className = 'bubble ' + bubClass;
  bub.textContent = content;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = fmtTime(time) || nowTime();

  wrap.appendChild(bub);
  wrap.appendChild(meta);
  row.appendChild(av);
  row.appendChild(wrap);
  area.appendChild(row);
  if (scroll) scrollBottom();
}

/* ── TYPING INDICATOR ──────────────────────────── */
function showTyping() {
  const area = document.getElementById('messages-wrap');
  const row = document.createElement('div');
  row.id = 'typing-row';
  row.className = 'typing-row';
  const av = document.createElement('div');
  av.className = 'msg-av ai';
  av.textContent = 'K';
  const bub = document.createElement('div');
  bub.className = 'typing-bubble';
  bub.innerHTML = '<div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div>';
  row.appendChild(av);
  row.appendChild(bub);
  area.appendChild(row);
  scrollBottom();
}
function hideTyping() {
  document.getElementById('typing-row')?.remove();
}

function scrollBottom() {
  const a = document.getElementById('messages-wrap');
  if (a) setTimeout(() => a.scrollTop = a.scrollHeight, 60);
}

/* ── SEND MESSAGE ──────────────────────────────── */
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

async function sendMessage() {
  const inp = document.getElementById('chat-input');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  inp.style.height = 'auto';

  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;

  renderMsg('user', msg, 'normal', null, true);
  chatHistory.push({ role: 'user', content: msg });
  showTyping();

  // Natural human-like delay (0.6-1.4s)
  await delay(600 + Math.random() * 800);

  try {
    const r = await fetch(API + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ message: msg, history: chatHistory.slice(-20) })
    });
    const d = await r.json();
    hideTyping();

    const reply = d.reply || 'Oops... 😅';
    renderMsg('ai', reply, d.type || 'normal', null, true);

    if (d.type === 'normal') {
      chatHistory.push({ role: 'assistant', content: reply });
      if (chatHistory.length > 40) chatHistory = chatHistory.slice(-30);
    }
    if (d.type === 'sensitive') updateBadge();

  } catch (e) {
    hideTyping();
    renderMsg('ai', 'Server se connect nahi ho pa raha 😅 — is backend running on port 3000?', 'ai-b', null, true);
  }

  sendBtn.disabled = false;
}

/* ── BADGE ─────────────────────────────────────── */
async function updateBadge() {
  if (!token || currentUser?.role !== 'admin') return;
  try {
    const r = await fetch(API + '/api/admin/stats', { headers: { Authorization: 'Bearer ' + token } });
    if (!r.ok) return;
    const d = await r.json();
    const badge = document.getElementById('nav-badge');
    if (badge) {
      badge.textContent = d.pendingReplies;
      badge.style.display = d.pendingReplies > 0 ? '' : 'none';
    }
  } catch {}
}

/* ── ADMIN PANEL ───────────────────────────────── */
async function loadAdmin() {
  try {
    const [sR, mR] = await Promise.all([
      fetch(API + '/api/admin/stats',           { headers: { Authorization: 'Bearer ' + token } }),
      fetch(API + '/api/admin/pending-messages', { headers: { Authorization: 'Bearer ' + token } })
    ]);

    if (sR.ok) {
      const s = await sR.json();
      document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card"><div class="stat-num">${s.totalUsers}</div><div class="stat-lbl">Total Users</div></div>
        <div class="stat-card"><div class="stat-num">${s.totalMessages}</div><div class="stat-lbl">Messages Sent</div></div>
        <div class="stat-card"><div class="stat-num warn">${s.pendingReplies}</div><div class="stat-lbl">Pending Replies</div></div>
        <div class="stat-card"><div class="stat-num">${s.totalSensitive}</div><div class="stat-lbl">Sensitive Msgs</div></div>
        <div class="stat-card"><div class="stat-num">${s.todayMessages}</div><div class="stat-lbl">Today's Messages</div></div>`;
    }

    if (!mR.ok) {
      document.getElementById('admin-list').innerHTML = `<div class="empty-state"><i class="ti ti-lock"></i><p>Admin access required.<br>Login as komal@konnect.ai</p></div>`;
      return;
    }

    const { messages } = await mR.json();
    const list = document.getElementById('admin-list');
    if (!messages?.length) {
      list.innerHTML = `<div class="empty-state"><i class="ti ti-inbox"></i><p>No sensitive messages yet 🎉</p></div>`;
      return;
    }

    list.innerHTML = '';
    messages.forEach(m => {
      const card = document.createElement('div');
      card.className = 'pending-card';
      card.id = 'pc-' + m.id;
      card.innerHTML = `
        <div class="pc-header">
          <div>
            <div class="pc-user"><i class="ti ti-user"></i> ${esc(m.user_name)}
              <span class="pc-email">${esc(m.user_email)}</span>
            </div>
          </div>
          <span class="pc-time">${new Date(m.timestamp).toLocaleString()}</span>
        </div>
        <div class="pc-msg">${esc(m.message)}</div>
        ${m.status === 'replied'
          ? `<span class="status-badge replied"><i class="ti ti-check" style="font-size:11px"></i> Replied</span>
             <div class="replied-reply">💬 ${esc(m.manual_reply)}</div>`
          : `<span class="status-badge pending"><i class="ti ti-clock" style="font-size:11px"></i> Pending</span>
             <div class="reply-form">
               <input class="reply-input" id="ri-${m.id}" placeholder="Type Komal's reply here...">
               <button class="btn-reply" onclick="sendReply(${m.id})">Send Reply</button>
             </div>`
        }`;
      list.appendChild(card);
    });

  } catch (e) {
    console.error('Admin load error:', e);
  }
}

async function sendReply(id) {
  const inp = document.getElementById('ri-' + id);
  const reply = inp?.value?.trim();
  if (!reply) { inp?.focus(); return; }

  const btn = inp.nextElementSibling;
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const r = await fetch(API + '/api/admin/manual-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ sensitiveMessageId: id, reply })
    });
    const d = await r.json();
    if (d.success) {
      toast(d.deliveredRealtime ? '⚡ Reply delivered in real-time!' : '✅ Reply saved (user offline)', 'ok');
      loadAdmin();
      updateBadge();
    } else {
      toast(d.error || 'Failed to send reply', 'err');
      btn.disabled = false;
      btn.textContent = 'Send Reply';
    }
  } catch (e) {
    toast('Server error', 'err');
    btn.disabled = false;
    btn.textContent = 'Send Reply';
  }
}

/* ── MOBILE SIDEBAR ────────────────────────────── */
function toggleSidebar() {
  const sb = document.querySelector('.app-sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb?.classList.toggle('open');
  ov?.classList.toggle('show');
}

/* ── INIT ──────────────────────────────────────── */
window.addEventListener('load', () => {
  if (token && currentUser) enterApp(currentUser);
});
