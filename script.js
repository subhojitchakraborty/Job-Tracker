(() => {
'use strict';
const STATUSES = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
const TYPES = ['Full-time', 'Part-time', 'Internship'];
const KEY = 'jobTracker.jobs.v1', TKEY = 'jobTracker.theme';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const fmtISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => fmtISO(new Date());
const normUrl = u => { u = (u || '').trim(); return !u ? '' : /^https?:\/\//i.test(u) ? u : 'https://' + u; };

/* ---------- storage ---------- */
function clean(j) {
  return {
    id: j.id || uid(),
    company: String(j.company || '').trim(),
    title: String(j.title || '').trim(),
    location: String(j.location || '').trim(),
    type: TYPES.includes(j.type) ? j.type : 'Full-time',
    date: /^\d{4}-\d{2}-\d{2}$/.test(j.date) ? j.date : today(),
    url: normUrl(j.url),
    salary: String(j.salary || '').trim(),
    status: STATUSES.includes(j.status) ? j.status : 'Applied',
    notes: String(j.notes || '').trim(),
    createdAt: Number(j.createdAt) || Date.now()
  };
}
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(d) ? d.map(clean) : []; }
  catch (e) { return []; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(jobs)); }
  catch (e) { toast('Could not save to browser storage', 'error'); }
}
let jobs = load();
let editingId = null, deleteId = null;

/* ---------- helpers ---------- */
function toast(msg, kind) {
  const t = document.createElement('div');
  t.className = 'toast' + (kind ? ' ' + kind : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2800);
}
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function fmtDate(s) {
  return parseDate(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function ago(j) {
  const label = j.status === 'Saved' ? 'Saved' : 'Applied';
  const now = new Date();
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - parseDate(j.date)) / 864e5);
  if (days < 0) return `${label} on ${fmtDate(j.date)}`;
  if (days === 0) return `${label} today`;
  if (days === 1) return `${label} yesterday`;
  if (days < 7) return `${label} ${days} days ago`;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'} ago`;
  if (days < 30) return `${label} ${plural(Math.floor(days / 7), 'week')}`;
  if (days < 365) return `${label} ${plural(Math.floor(days / 30), 'month')}`;
  return `${label} ${plural(Math.floor(days / 365), 'year')}`;
}
const sortJobs = (list, dir) => [...list].sort((a, b) => {
  const r = b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
  return dir === 'old' ? -r : r;
});

/* ---------- rendering ---------- */
function card(j) {
  const opts = STATUSES.map(s => `<option${s === j.status ? ' selected' : ''}>${s}</option>`).join('');
  return `<article class="job" data-id="${esc(j.id)}">
    <div class="job-main">
      <div class="avatar">${esc((j.company[0] || '?').toUpperCase())}</div>
      <div class="job-info">
        <h3>${esc(j.title)}</h3>
        <p class="co">${esc(j.company)}${j.location ? ' · ' + esc(j.location) : ''}</p>
        <div class="meta">
          <span class="badge s-${j.status}">${j.status}</span>
          <span class="chip">${j.type}</span>
          ${j.salary ? `<span class="chip">${esc(j.salary)}</span>` : ''}
          <span class="muted">${ago(j)} · ${fmtDate(j.date)}</span>
        </div>
        ${j.notes ? `<p class="notes">${esc(j.notes)}</p>` : ''}
      </div>
    </div>
    <div class="job-actions">
      <select data-act="status" aria-label="Change status">${opts}</select>
      <button class="btn sm" data-act="view"${j.url ? '' : ' disabled title="No URL saved"'}>View Job</button>
      <div class="row">
        <button class="btn sm" data-act="edit">Edit</button>
        <button class="btn sm" data-act="delete">Delete</button>
      </div>
    </div>
  </article>`;
}
const emptyState = (icon, h, p, btn) => `<div class="empty"><div class="big">${icon}</div><h3>${h}</h3>
  <p class="muted">${p}</p>${btn ? '<button class="btn primary" data-view="add">+ Add your first job</button>' : ''}</div>`;

function renderStats() {
  const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
  jobs.forEach(j => counts[j.status]++);
  const total = jobs.length;
  const items = [['Total Applications', total, 'var(--primary)'],
    ...['Applied', 'Interview', 'Offer', 'Rejected', 'Saved'].map(s => [s, counts[s], `var(--c-${s})`])];
  $('#stats').innerHTML = items.map(([l, n, c]) => `<div class="stat" style="--c:${c}"><b>${n}</b><span>${l}</span></div>`).join('');
  $('#chart').innerHTML = total ? ['Applied', 'Interview', 'Offer', 'Rejected', 'Saved'].map(s => {
    const pct = Math.round(counts[s] / total * 100);
    return `<div class="bar-row" style="--c:var(--c-${s})"><span>${s}</span>
      <div class="track"><div class="fill" style="width:${pct}%"></div></div><em>${counts[s]} (${pct}%)</em></div>`;
  }).join('') : '<p class="muted">No data yet. Add an application to see the breakdown.</p>';
}
function filtered() {
  const q = $('#q').value.trim().toLowerCase(), fs = $('#fStatus').value, ft = $('#fType').value;
  return sortJobs(jobs.filter(j =>
    (!fs || j.status === fs) && (!ft || j.type === ft) &&
    (!q || [j.company, j.title, j.location, j.notes, j.salary].some(v => v.toLowerCase().includes(q)))
  ), $('#fSort').value);
}
function render() {
  renderStats();
  $('#recent').innerHTML = jobs.length ? sortJobs(jobs, 'new').slice(0, 5).map(card).join('')
    : emptyState('📭', 'No applications yet', 'Track every job and internship you apply for in one place.', true);
  const list = filtered();
  $('#count').textContent = jobs.length ? `Showing ${list.length} of ${jobs.length}` : '';
  $('#list').innerHTML = list.length ? list.map(card).join('')
    : jobs.length ? emptyState('🔍', 'No matching applications', 'Try a different search or clear the filters.', false)
    : emptyState('📭', 'No applications yet', 'Track every job and internship you apply for in one place.', true);
}

/* ---------- navigation ---------- */
const TITLES = { dashboard: 'Dashboard', applications: 'Applications', add: 'Add Application' };
function show(view) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  $('#pageTitle').textContent = view === 'add' && editingId ? 'Edit Application' : TITLES[view];
  window.scrollTo(0, 0);
}

/* ---------- form ---------- */
const form = $('#jobForm');
function resetForm() {
  editingId = null;
  form.reset();
  form.elements.id.value = '';
  form.elements.date.value = today();
  form.elements.status.value = 'Applied';
  form.elements.type.value = 'Full-time';
  $('#formTitle').textContent = 'Add Application';
  $('#submitBtn').textContent = 'Add application';
}
function startEdit(id) {
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  resetForm();
  editingId = id;
  ['company', 'title', 'location', 'type', 'date', 'url', 'salary', 'status', 'notes'].forEach(k => form.elements[k].value = j[k]);
  $('#formTitle').textContent = 'Edit Application';
  $('#submitBtn').textContent = 'Save changes';
  show('add');
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const f = form.elements;
  const data = clean({
    id: editingId, company: f.company.value, title: f.title.value, location: f.location.value,
    type: f.type.value, date: f.date.value, url: f.url.value, salary: f.salary.value,
    status: f.status.value, notes: f.notes.value
  });
  if (!data.company || !data.title) { toast('Company and job title are required', 'error'); return; }
  if (editingId) {
    const i = jobs.findIndex(x => x.id === editingId);
    if (i > -1) { data.createdAt = jobs[i].createdAt; jobs[i] = data; }
    toast('Application updated');
  } else {
    jobs.push(data);
    toast('Application added');
  }
  save(); resetForm(); render(); show('applications');
});
$('#cancelBtn').addEventListener('click', () => { resetForm(); show('applications'); });

/* ---------- delete dialog ---------- */
const dlg = $('#dlg');
function askDelete(id) {
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  deleteId = id;
  if (typeof dlg.showModal === 'function') {
    $('#dlgText').textContent = `${j.title} at ${j.company} will be permanently removed.`;
    dlg.showModal();
  } else if (confirm(`Delete "${j.title}" at ${j.company}?`)) doDelete();
}
function doDelete() {
  jobs = jobs.filter(x => x.id !== deleteId);
  if (editingId === deleteId) resetForm();
  deleteId = null;
  save(); render(); toast('Application deleted');
}
$('#dlgNo').addEventListener('click', () => { deleteId = null; dlg.close(); });
$('#dlgYes').addEventListener('click', () => { dlg.close(); doDelete(); });

/* ---------- global events ---------- */
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-view]');
  if (nav) { if (nav.dataset.view === 'add') resetForm(); show(nav.dataset.view); return; }
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.tagName === 'SELECT') return;
  const id = btn.closest('.job')?.dataset.id;
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  if (btn.dataset.act === 'edit') startEdit(id);
  else if (btn.dataset.act === 'delete') askDelete(id);
  else if (btn.dataset.act === 'view' && j.url) window.open(j.url, '_blank', 'noopener');
});
document.addEventListener('change', e => {
  if (e.target.dataset.act !== 'status') return;
  const j = jobs.find(x => x.id === e.target.closest('.job')?.dataset.id);
  if (!j) return;
  j.status = e.target.value;
  save(); render(); toast(`Status changed to ${j.status}`);
});
['q', 'fStatus', 'fType', 'fSort'].forEach(id => {
  $('#' + id).addEventListener('input', render);
  $('#' + id).addEventListener('change', render);
});

/* ---------- theme ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $('#themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
}
let savedTheme = null;
try { savedTheme = localStorage.getItem(TKEY); } catch (e) {}
applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#themeBtn').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(t);
  try { localStorage.setItem(TKEY, t); } catch (e) {}
});

/* ---------- CSV ---------- */
const HEADERS = ['Company', 'Job Title', 'Location', 'Job Type', 'Application Date', 'Job URL', 'Salary', 'Status', 'Notes'];
const FIELDS = ['company', 'title', 'location', 'type', 'date', 'url', 'salary', 'status', 'notes'];
const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
function exportCSV() {
  if (!jobs.length) { toast('Nothing to export yet', 'error'); return; }
  const rows = [HEADERS.map(csvCell).join(',')].concat(sortJobs(jobs, 'new').map(j => FIELDS.map(k => csvCell(j[k])).join(',')));
  const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `job-tracker-${today()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported ${jobs.length} application${jobs.length === 1 ? '' : 's'}`);
}
function parseCSV(t) {
  const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; rows.push(r); r = []; }
    else c += ch;
  }
  if (c !== '' || r.length) { r.push(c); rows.push(r); }
  return rows.filter(x => x.some(v => v.trim() !== ''));
}
const ALIAS = { company: 'company', jobtitle: 'title', title: 'title', position: 'title', location: 'location',
  jobtype: 'type', type: 'type', applicationdate: 'date', date: 'date', joburl: 'url', url: 'url',
  salary: 'salary', status: 'status', notes: 'notes' };
const matchList = (v, list) => list.find(x => x.toLowerCase().replace(/[^a-z]/g, '') === String(v).toLowerCase().replace(/[^a-z]/g, ''));
function normDate(v) {
  v = (v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return v && !isNaN(d) ? fmtISO(d) : today();
}
function importCSV(text) {
  const rows = parseCSV(text.replace(/^\ufeff/, ''));
  if (rows.length < 2) { toast('CSV has no data rows', 'error'); return; }
  const map = rows[0].map(h => ALIAS[h.toLowerCase().replace(/[^a-z]/g, '')]);
  if (!map.includes('company') && !map.includes('title')) { toast('CSV needs Company and Job Title columns', 'error'); return; }
  let added = 0;
  rows.slice(1).forEach(r => {
    const o = {};
    map.forEach((k, i) => { if (k) o[k] = (r[i] || '').trim(); });
    if (!o.company && !o.title) return;
    o.company = o.company || 'Unknown company';
    o.title = o.title || 'Untitled role';
    o.type = matchList(o.type, TYPES) || 'Full-time';
    o.status = matchList(o.status, STATUSES) || 'Applied';
    o.date = normDate(o.date);
    jobs.push(clean({ ...o, id: uid(), createdAt: Date.now() + added }));
    added++;
  });
  if (!added) { toast('No valid rows found', 'error'); return; }
  save(); render(); toast(`Imported ${added} application${added === 1 ? '' : 's'}`);
}
$('#exportBtn').addEventListener('click', exportCSV);
$('#importBtn').addEventListener('click', () => $('#csvFile').click());
$('#csvFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => importCSV(String(reader.result));
  reader.onerror = () => toast('Could not read file', 'error');
  reader.readAsText(file);
  e.target.value = '';
});

/* ---------- init ---------- */
$('#fStatus').innerHTML += STATUSES.map(s => `<option>${s}</option>`).join('');
$('#fType').innerHTML += TYPES.map(s => `<option>${s}</option>`).join('');
form.elements.type.innerHTML = TYPES.map(s => `<option>${s}</option>`).join('');
form.elements.status.innerHTML = STATUSES.map(s => `<option>${s}</option>`).join('');
resetForm();
render();
show('dashboard');
})();
