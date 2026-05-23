// ============================================================
// admin.js – We4you Transport Admin Dashboard
// Firebase Auth + Firestore CRUD
// ============================================================

import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, orderBy, query }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCw7dSkdHge57ERAbJRrp8ioFJOVBDbdXc",
  authDomain: "we4you-transport.firebaseapp.com",
  projectId: "we4you-transport",
  storageBucket: "we4you-transport.firebasestorage.app",
  messagingSenderId: "980715177871",
  appId: "1:980715177871:web:72e23e75f177d455d06dfa"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── DOM refs ──
const loginScreen    = document.getElementById('loginScreen');
const dashboard      = document.getElementById('dashboard');
const loginForm      = document.getElementById('loginForm');
const loginEmail     = document.getElementById('loginEmail');
const loginPass      = document.getElementById('loginPass');
const loginError     = document.getElementById('loginError');
const loginBtnText   = document.getElementById('loginBtnText');
const loginBtnLoader = document.getElementById('loginBtnLoader');
const passToggle     = document.getElementById('passToggle');
const logoutBtn      = document.getElementById('logoutBtn');
const userEmail      = document.getElementById('userEmail');
const userAvatar     = document.getElementById('userAvatar');
const refreshBtn     = document.getElementById('refreshBtn');
const lastUpdated    = document.getElementById('lastUpdated');
const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebar        = document.querySelector('.sidebar');
const searchBox      = document.getElementById('searchBox');
const filterStatus   = document.getElementById('filterStatus');
const filterFreight  = document.getElementById('filterFreight');
const tableLoading   = document.getElementById('tableLoading');
const tableEmpty     = document.getElementById('tableEmpty');
const quotesTable    = document.getElementById('quotesTable');
const quotesBody     = document.getElementById('quotesBody');
const pagination     = document.getElementById('pagination');
const modalOverlay   = document.getElementById('modalOverlay');
const modalClose     = document.getElementById('modalClose');
const modalTitle     = document.getElementById('modalTitle');
const modalBody      = document.getElementById('modalBody');
const modalStatusSel = document.getElementById('modalStatusSelect');
const saveStatusBtn  = document.getElementById('saveStatusBtn');
const deleteQuoteBtn = document.getElementById('deleteQuoteBtn');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmClose   = document.getElementById('confirmClose');
const confirmCancel  = document.getElementById('confirmCancel');
const confirmDelete  = document.getElementById('confirmDelete');
const toast          = document.getElementById('toast');
const topbarTitle    = document.getElementById('topbarTitle');

// Stats
const statTotal    = document.getElementById('statTotal');
const statNew      = document.getElementById('statNew');
const statProgress = document.getElementById('statProgress');
const statDone     = document.getElementById('statDone');

// ── State ──
let allQuotes   = [];
let filtered    = [];
let currentPage = 1;
const PAGE_SIZE = 10;
let activeDocId = null;
let toastTimer  = null;

// ── DEMO DATA (used when Firebase is not configured) ──
const DEMO_QUOTES = [
  { id:'demo1', name:'Marcus Donaldson', company:'Steel Parts Inc.', email:'marcus@steelparts.ca', phone:'416-555-0101', origin:'Brampton, ON', destination:'Ottawa, ON', freightType:'Dry Van', weight:'38000', message:'Need pickup by Friday morning.', status:'new', createdAt: { seconds: Date.now()/1000 - 3600 } },
  { id:'demo2', name:'Priya Sharma', company:'Fresh Farms Ltd.', email:'priya@freshfarms.ca', phone:'905-555-0202', origin:'Mississauga, ON', destination:'Montreal, QC', freightType:'Refrigerated', weight:'22000', message:'Temperature must stay below 4°C.', status:'in-progress', createdAt: { seconds: Date.now()/1000 - 86400 } },
  { id:'demo3', name:'Jason Lee', company:'Lee Logistics', email:'jason@leelogistics.ca', phone:'647-555-0303', origin:'Toronto, ON', destination:'Windsor, ON', freightType:'Flatbed', weight:'45000', message:'Oversized machinery. Permits required.', status:'new', createdAt: { seconds: Date.now()/1000 - 7200 } },
  { id:'demo4', name:'Aisha Patel', company:'Patel Construction', email:'aisha@patelconst.ca', phone:'905-555-0404', origin:'Hamilton, ON', destination:'Kingston, ON', freightType:'Dry Van', weight:'18000', message:'', status:'completed', createdAt: { seconds: Date.now()/1000 - 172800 } },
  { id:'demo5', name:'Carlos Rivera', company:'Rivera Foods', email:'carlos@riverafoods.ca', phone:'416-555-0505', origin:'Etobicoke, ON', destination:'Québec City, QC', freightType:'Refrigerated', weight:'25000', message:'Rush order - needed by Monday.', status:'new', createdAt: { seconds: Date.now()/1000 - 1800 } },
  { id:'demo6', name:'Sandra Wu', company:'GTA Electronics', email:'sandra@gtaelec.ca', phone:'416-555-0606', origin:'Scarborough, ON', destination:'London, ON', freightType:'Dry Van', weight:'12000', message:'Fragile equipment – handle with care.', status:'declined', createdAt: { seconds: Date.now()/1000 - 259200 } },
];

// ── Helpers ──
function showToast(msg, type = 'info') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.style.borderColor = type === 'success' ? 'rgba(52,201,123,0.4)'
    : type === 'error' ? 'rgba(226,75,75,0.4)' : 'rgba(255,255,255,0.12)';
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
       + ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

function badgeHtml(status) {
  const labels = { new: 'New', 'in-progress': 'In Progress', completed: 'Completed', declined: 'Declined' };
  const cls = { new: 'badge-new', 'in-progress': 'badge-in-progress', completed: 'badge-completed', declined: 'badge-declined' };
  return `<span class="badge ${cls[status] || 'badge-new'}">${labels[status] || status}</span>`;
}

// ── Auth ──
onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    userEmail.textContent = user.email;
    userAvatar.textContent = user.email[0].toUpperCase();
    loadQuotes();
  } else {
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
});

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginBtnText.classList.add('hidden');
  loginBtnLoader.classList.remove('hidden');
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPass.value);
  } catch (err) {
    const msgs = {
      'auth/invalid-credential':      'Invalid email or password.',
      'auth/user-not-found':          'No account found with that email.',
      'auth/wrong-password':          'Incorrect password.',
      'auth/too-many-requests':       'Too many attempts. Try again later.',
      'auth/invalid-api-key':         '⚠️ Firebase not configured yet – replace firebaseConfig in admin.js',
    };
    loginError.textContent = msgs[err.code] || `Error: ${err.message}`;
    loginError.classList.remove('hidden');
  } finally {
    loginBtnText.classList.remove('hidden');
    loginBtnLoader.classList.add('hidden');
  }
});

passToggle.addEventListener('click', () => {
  loginPass.type = loginPass.type === 'password' ? 'text' : 'password';
  passToggle.textContent = loginPass.type === 'password' ? '👁' : '🙈';
});

logoutBtn.addEventListener('click', () => signOut(auth));

// ── Sidebar toggle (mobile) ──
sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
document.addEventListener('click', e => {
  if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target))
    sidebar.classList.remove('open');
});

// ── Nav views ──
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    const view = item.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + view).classList.remove('hidden');
    topbarTitle.textContent = item.textContent.trim();
    if (view === 'stats') renderCharts();
    sidebar.classList.remove('open');
  });
});

// ── Load quotes ──
async function loadQuotes() {
  tableLoading.classList.remove('hidden');
  tableEmpty.classList.add('hidden');
  quotesTable.classList.add('hidden');

  let isDemoMode = false;

  try {
    const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    allQuotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (allQuotes.length === 0) {
      // Check if Firebase is not configured (demo mode fallback)
      allQuotes = DEMO_QUOTES;
      isDemoMode = true;
    }
  } catch (err) {
    console.warn('Firebase read failed (not configured?) — loading demo data.', err.code);
    allQuotes = DEMO_QUOTES;
    isDemoMode = true;
  }

  lastUpdated.textContent = isDemoMode ? '⚠️ Demo mode – configure Firebase' : `Updated ${new Date().toLocaleTimeString()}`;
  applyFilters();
  tableLoading.classList.add('hidden');
}

refreshBtn.addEventListener('click', loadQuotes);

// ── Filter & Search ──
function applyFilters() {
  const q  = searchBox.value.toLowerCase();
  const st = filterStatus.value;
  const fr = filterFreight.value;

  filtered = allQuotes.filter(r => {
    const matchSearch = !q ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.company || '').toLowerCase().includes(q) ||
      (r.origin || '').toLowerCase().includes(q) ||
      (r.destination || '').toLowerCase().includes(q);
    const matchStatus  = !st || r.status === st;
    const matchFreight = !fr || r.freightType === fr;
    return matchSearch && matchStatus && matchFreight;
  });

  currentPage = 1;
  renderTable();
  updateStats();
}

searchBox.addEventListener('input',    applyFilters);
filterStatus.addEventListener('change', applyFilters);
filterFreight.addEventListener('change', applyFilters);

// ── Render Table ──
function renderTable() {
  if (filtered.length === 0) {
    tableEmpty.classList.remove('hidden');
    quotesTable.classList.add('hidden');
    pagination.innerHTML = '';
    return;
  }
  tableEmpty.classList.add('hidden');
  quotesTable.classList.remove('hidden');

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filtered.slice(start, start + PAGE_SIZE);

  quotesBody.innerHTML = page.map(r => `
    <tr data-id="${r.id}">
      <td class="td-date">${formatDate(r.createdAt)}</td>
      <td class="td-name">
        <strong>${r.name || '—'}</strong>
        <span>${r.company || ''}</span>
      </td>
      <td class="td-contact">
        <a href="mailto:${r.email}" onclick="event.stopPropagation()">${r.email || '—'}</a>
        <span>${r.phone || ''}</span>
      </td>
      <td class="td-route">${r.origin || '?'}<span class="arrow">→</span>${r.destination || '?'}</td>
      <td>${r.freightType || '—'}</td>
      <td>${badgeHtml(r.status || 'new')}</td>
      <td class="td-actions">
        <button class="btn-view" data-id="${r.id}">View</button>
      </td>
    </tr>
  `).join('');

  // Row click → open modal
  quotesBody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => openModal(row.dataset.id));
  });
  quotesBody.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openModal(btn.dataset.id); });
  });

  renderPagination();
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PAGE_SIZE);
  if (total <= 1) { pagination.innerHTML = ''; return; }
  let html = `<button class="pg-btn" ${currentPage===1?'disabled':''} id="pgPrev">← Prev</button>`;
  for (let i = 1; i <= total; i++)
    html += `<button class="pg-btn ${i===currentPage?'active':''}" data-pg="${i}">${i}</button>`;
  html += `<button class="pg-btn" ${currentPage===total?'disabled':''} id="pgNext">Next →</button>`;
  pagination.innerHTML = html;
  pagination.querySelector('#pgPrev')?.addEventListener('click', () => { currentPage--; renderTable(); });
  pagination.querySelector('#pgNext')?.addEventListener('click', () => { currentPage++; renderTable(); });
  pagination.querySelectorAll('[data-pg]').forEach(btn =>
    btn.addEventListener('click', () => { currentPage = +btn.dataset.pg; renderTable(); }));
}

// ── Stats ──
function updateStats() {
  const counts = { new: 0, 'in-progress': 0, completed: 0, declined: 0 };
  allQuotes.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  statTotal.textContent    = allQuotes.length;
  statNew.textContent      = counts.new;
  statProgress.textContent = counts['in-progress'];
  statDone.textContent     = counts.completed;
}

// ── Charts ──
function renderCharts() {
  const statusCounts  = { new: 0, 'in-progress': 0, completed: 0, declined: 0 };
  const freightCounts = {};
  const dayCounts     = {};

  allQuotes.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (r.freightType) freightCounts[r.freightType] = (freightCounts[r.freightType] || 0) + 1;
    const d = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000) : new Date();
    const key = d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    dayCounts[key] = (dayCounts[key] || 0) + 1;
  });

  const statusColors  = { new: 'orange', 'in-progress': 'blue', completed: 'green', declined: 'red' };
  const freightColors = ['orange','blue','green','yellow','teal','red'];
  const maxS = Math.max(...Object.values(statusCounts), 1);
  const maxF = Math.max(...Object.values(freightCounts), 1);

  document.getElementById('statusChart').innerHTML =
    Object.entries(statusCounts).map(([k,v]) => barRow(k, v, maxS, statusColors[k] || 'orange')).join('');

  document.getElementById('freightChart').innerHTML =
    Object.entries(freightCounts).map(([k,v], i) => barRow(k, v, maxF, freightColors[i % freightColors.length])).join('');

  // Last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }));
  }
  const maxD = Math.max(...days.map(d => dayCounts[d] || 0), 1);
  document.getElementById('activityChart').innerHTML =
    days.map(d => barRow(d, dayCounts[d] || 0, maxD, 'orange')).join('');
}

function barRow(label, count, max, color) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return `<div class="bar-row">
    <span class="bar-label">${label}</span>
    <div class="bar-track"><div class="bar-fill ${color}" style="width:${pct}%"></div></div>
    <span class="bar-count">${count}</span>
  </div>`;
}

// ── Modal ──
function openModal(id) {
  const r = allQuotes.find(q => q.id === id);
  if (!r) return;
  activeDocId = id;
  modalTitle.textContent = r.name || 'Quote Detail';
  modalStatusSel.value = r.status || 'new';

  modalBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><span class="dl">Name</span><span class="dv">${r.name || '—'}</span></div>
      <div class="detail-item"><span class="dl">Company</span><span class="dv">${r.company || '—'}</span></div>
      <div class="detail-item"><span class="dl">Email</span><span class="dv"><a href="mailto:${r.email}" style="color:var(--orange)">${r.email || '—'}</a></span></div>
      <div class="detail-item"><span class="dl">Phone</span><span class="dv">${r.phone || '—'}</span></div>
      <div class="detail-divider"></div>
      <div class="detail-item"><span class="dl">Origin</span><span class="dv">${r.origin || '—'}</span></div>
      <div class="detail-item"><span class="dl">Destination</span><span class="dv">${r.destination || '—'}</span></div>
      <div class="detail-item"><span class="dl">Freight Type</span><span class="dv">${r.freightType || '—'}</span></div>
      <div class="detail-item"><span class="dl">Weight (lbs)</span><span class="dv">${r.weight ? Number(r.weight).toLocaleString() : '—'}</span></div>
      <div class="detail-divider"></div>
      <div class="detail-item full"><span class="dl">Additional Details</span><span class="dv">${r.message || 'None provided.'}</span></div>
      <div class="detail-item"><span class="dl">Status</span><span class="dv">${badgeHtml(r.status || 'new')}</span></div>
      <div class="detail-item"><span class="dl">Submitted</span><span class="dv">${formatDate(r.createdAt)}</span></div>
    </div>`;

  modalOverlay.classList.remove('hidden');
}

[modalClose, modalOverlay].forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) modalOverlay.classList.add('hidden');
  });
});

// ── Save Status ──
saveStatusBtn.addEventListener('click', async () => {
  if (!activeDocId) return;
  const newStatus = modalStatusSel.value;

  // Update local state
  const idx = allQuotes.findIndex(q => q.id === activeDocId);
  if (idx !== -1) allQuotes[idx].status = newStatus;

  // Try Firebase update (skip gracefully in demo mode)
  const isDemoId = activeDocId.startsWith('demo');
  if (!isDemoId) {
    try {
      await updateDoc(doc(db, 'quotes', activeDocId), { status: newStatus });
    } catch (err) {
      console.warn('Status update failed:', err.message);
    }
  }

  applyFilters();
  modalOverlay.classList.add('hidden');
  showToast(`Status updated to "${newStatus}"`, 'success');
});

// ── Delete ──
deleteQuoteBtn.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
  confirmOverlay.classList.remove('hidden');
});
[confirmClose, confirmCancel, confirmOverlay].forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el || el === confirmClose || el === confirmCancel)
      confirmOverlay.classList.add('hidden');
  });
});

confirmDelete.addEventListener('click', async () => {
  if (!activeDocId) return;
  confirmOverlay.classList.add('hidden');

  allQuotes = allQuotes.filter(q => q.id !== activeDocId);

  const isDemoId = activeDocId.startsWith('demo');
  if (!isDemoId) {
    try {
      await deleteDoc(doc(db, 'quotes', activeDocId));
    } catch (err) {
      console.warn('Delete failed:', err.message);
    }
  }

  applyFilters();
  showToast('Quote deleted.', 'info');
  activeDocId = null;
});

console.log('🚛 We4you Admin — ready');
