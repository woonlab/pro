/* global Chart */
const $ = (s) => document.querySelector(s);
const won = (n) => (n == null ? '-' : `${Math.round(n).toLocaleString('ko-KR')}원`);
const num = (n) => (n == null ? '' : Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 2 }));
const monthLabel = (ym) => `${Number(ym.slice(5))}월`;
const monthLong = (ym) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월`;
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

let categories = [];
let catIndex = {};
let bills = [];
let pendingFile = null;
let rawText = null;
let editingId = null;
const charts = {};

// ── API ────────────────────────────────────────────────────
async function api(url, opts = {}) {
  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `오류 (${res.status})`), { body });
  return body;
}

async function loadBills() {
  bills = await api('api/bills');
  refreshRangeOptions();
  refreshListFilters();
  renderDashboard();
  renderList();
}

// ── 탭 ────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = p.id !== `tab-${name}`));
  if (name === 'dashboard') renderDashboard();
  try { localStorage.setItem('tab', name); } catch { /* 저장 못 해도 괜찮음 */ }
}
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.goto)));

// ── 기간 계산 ───────────────────────────────────────────────
function addMonths(ym, n) {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function years() {
  return [...new Set(bills.map((b) => b.billing_month.slice(0, 4)))].sort().reverse();
}
function refreshRangeOptions() {
  const sel = $('#range');
  const prev = sel.value || 'last12';
  sel.innerHTML = '<option value="last12">최근 12개월</option>' + years().map((y) => `<option value="${y}">${y}년</option>`).join('');
  sel.value = [...sel.options].some((o) => o.value === prev) ? prev : 'last12';
}
function rangeMonths() {
  const v = $('#range').value;
  if (v === 'last12') {
    const latest = bills.reduce((m, b) => (b.billing_month > m ? b.billing_month : m), thisMonth());
    const end = latest > thisMonth() ? latest : thisMonth();
    return Array.from({ length: 12 }, (_, i) => addMonths(end, i - 11));
  }
  return Array.from({ length: 12 }, (_, i) => `${v}-${String(i + 1).padStart(2, '0')}`);
}
function sumBy(list, keyFn) {
  const m = {};
  for (const b of list) m[keyFn(b)] = (m[keyFn(b)] ?? 0) + b.amount;
  return m;
}

// ── 차트 공통 ───────────────────────────────────────────────
function catColor(key) {
  return css(`--cat-${(catIndex[key] ?? categories.length - 1) + 1}`);
}
function baseOptions() {
  const grid = css('--grid');
  const text2 = css('--text-2');
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', align: 'start', labels: { color: text2, boxWidth: 12, boxHeight: 12, useBorderRadius: true, borderRadius: 3 } },
      tooltip: {
        backgroundColor: css('--surface'), titleColor: css('--text'), bodyColor: text2,
        borderColor: css('--border'), borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: text2 }, border: { color: css('--border') } },
      y: { grid: { color: grid }, border: { display: false }, ticks: { color: text2, callback: (v) => shortWon(v) }, beginAtZero: true },
    },
  };
}
function shortWon(v) {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`;
  return v.toLocaleString('ko-KR');
}
function draw(id, config) {
  charts[id]?.destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

// ── 대시보드 ───────────────────────────────────────────────
function renderDashboard() {
  if ($('#tab-dashboard').hidden) return;
  const empty = bills.length === 0;
  $('#empty-dashboard').hidden = !empty;
  $('#dashboard-body').hidden = empty;
  $('#range').closest('.filters').hidden = empty;
  if (empty) return;

  const months = rangeMonths();
  const inRange = bills.filter((b) => months.includes(b.billing_month));
  renderKpis(months, inRange);
  renderMonthly(months, inRange);
  renderShare(inRange);
  renderUsage(months);
  renderYoy(months);
}

function renderKpis(months, inRange) {
  const byMonth = sumBy(inRange, (b) => b.billing_month);
  const filled = months.filter((m) => byMonth[m] != null);
  const latest = filled.at(-1);
  if (latest) {
    $('#kpi-latest-label').textContent = `${monthLong(latest)} 합계 · ${inRange.filter((b) => b.billing_month === latest).length}건`;
    $('#kpi-latest').textContent = won(byMonth[latest]);
    const prevAll = sumBy(bills, (b) => b.billing_month)[addMonths(latest, -1)];
    if (prevAll) {
      const diff = byMonth[latest] - prevAll;
      const pct = Math.round((diff / prevAll) * 100);
      $('#kpi-latest-sub').innerHTML = diff === 0 ? '전월과 같음'
        : `전월보다 <span class="${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '▲' : '▼'} ${won(Math.abs(diff))} (${Math.abs(pct)}%)</span>`;
    } else $('#kpi-latest-sub').textContent = '전월 기록 없음';
  } else {
    $('#kpi-latest-label').textContent = '최근 달 합계';
    $('#kpi-latest').textContent = '-';
    $('#kpi-latest-sub').textContent = '이 기간에 기록 없음';
  }
  const total = inRange.reduce((s, b) => s + b.amount, 0);
  $('#kpi-avg').textContent = filled.length ? won(total / filled.length) : '-';
  $('#kpi-avg-sub').textContent = filled.length ? `기록 있는 ${filled.length}개월 기준` : '';
  $('#kpi-total').textContent = won(total);
  $('#kpi-total-sub').textContent = `${months[0].replace('-', '.')} ~ ${months.at(-1).replace('-', '.')}`;
  const unpaid = bills.filter((b) => !b.paid);
  $('#kpi-unpaid').textContent = unpaid.length ? won(unpaid.reduce((s, b) => s + b.amount, 0)) : '없음';
  $('#kpi-unpaid-sub').textContent = unpaid.length ? `${unpaid.length}건 (전체 기간)` : '모두 납부했어요';
}

function renderMonthly(months, inRange) {
  const surface = css('--surface');
  const used = categories.filter((c) => inRange.some((b) => b.category === c.key));
  const valueAt = (key, m) => inRange.filter((b) => b.category === key && b.billing_month === m).reduce((s, b) => s + b.amount, 0) || null;
  const datasets = used.map((c, ci) => ({
    label: c.label,
    data: months.map((m) => valueAt(c.key, m)),
    backgroundColor: catColor(c.key),
    borderColor: surface,
    borderWidth: { top: 2, bottom: 0, left: 0, right: 0 },
    // 막대 맨 위 조각만 모서리를 둥글게
    borderRadius: (ctx) => {
      const m = months[ctx.dataIndex];
      const isTop = !used.slice(ci + 1).some((u) => valueAt(u.key, m));
      return isTop ? { topLeft: 4, topRight: 4 } : 0;
    },
    borderSkipped: false,
    maxBarThickness: 36,
    stack: 'all',
  }));
  const opts = baseOptions();
  opts.scales.x.stacked = true;
  opts.scales.y.stacked = true;
  opts.plugins.tooltip.callbacks = {
    title: (items) => monthLong(months[items[0].dataIndex]),
    label: (ctx) => ` ${ctx.dataset.label}  ${won(ctx.raw)}`,
    footer: (items) => `합계  ${won(items.reduce((s, i) => s + (i.raw ?? 0), 0))}`,
  };
  opts.plugins.tooltip.footerColor = css('--text');
  draw('chart-monthly', { type: 'bar', data: { labels: months.map(monthLabel), datasets }, options: opts });
}

function renderShare(inRange) {
  const totals = sumBy(inRange, (b) => b.category);
  const all = Object.values(totals).reduce((s, v) => s + v, 0);
  const rows = categories.filter((c) => totals[c.key]).sort((a, b) => totals[b.key] - totals[a.key]);
  $('#share-sub').textContent = rows.length ? `가장 큰 항목: ${rows[0].label} (${Math.round((totals[rows[0].key] / all) * 100)}%)` : '이 기간에 기록 없음';
  const opts = baseOptions();
  opts.indexAxis = 'y';
  opts.interaction = { mode: 'nearest', axis: 'y', intersect: false };
  opts.plugins.legend.display = false;
  opts.scales = {
    x: { grid: { color: css('--grid') }, border: { display: false }, ticks: { color: css('--text-2'), callback: (v) => shortWon(v) }, beginAtZero: true },
    y: { grid: { display: false }, ticks: { color: css('--text') }, border: { color: css('--border') } },
  };
  opts.plugins.tooltip.callbacks = {
    label: (ctx) => ` ${won(ctx.raw)} (${Math.round((ctx.raw / all) * 100)}%)`,
  };
  draw('chart-share', {
    type: 'bar',
    data: {
      labels: rows.map((c) => c.label),
      datasets: [{
        data: rows.map((c) => totals[c.key]),
        backgroundColor: rows.map((c) => catColor(c.key)),
        borderRadius: 4, borderSkipped: 'left', maxBarThickness: 26,
      }],
    },
    options: opts,
  });
}

function renderUsage(months) {
  const sel = $('#usage-cat');
  const withUsage = categories.filter((c) => bills.some((b) => b.category === c.key && b.usage != null));
  const options = withUsage.length ? withUsage : categories.filter((c) => c.unit);
  const prev = sel.value;
  sel.innerHTML = options.map((c) => `<option value="${c.key}">${c.label}</option>`).join('');
  if (options.some((c) => c.key === prev)) sel.value = prev;
  const cat = categories.find((c) => c.key === sel.value);
  const rows = bills.filter((b) => b.category === cat.key && b.usage != null && months.includes(b.billing_month));
  const unit = rows.find((b) => b.usage_unit)?.usage_unit ?? cat.unit;
  const data = months.map((m) => {
    const r = rows.filter((b) => b.billing_month === m);
    return r.length ? r.reduce((s, b) => s + b.usage, 0) : null;
  });
  $('#usage-empty').hidden = rows.length > 0;
  $('#usage-sub').textContent = rows.length ? `${cat.label} 사용량 (${unit})` : '';
  const color = catColor(cat.key);
  const opts = baseOptions();
  opts.plugins.legend.display = false;
  opts.scales.y.ticks.callback = (v) => v.toLocaleString('ko-KR');
  opts.plugins.tooltip.callbacks = {
    title: (items) => monthLong(months[items[0].dataIndex]),
    label: (ctx) => ` ${num(ctx.raw)} ${unit}`,
  };
  draw('chart-usage', {
    type: 'line',
    data: {
      labels: months.map(monthLabel),
      datasets: [{
        data, borderColor: color, backgroundColor: color, borderWidth: 2, cubicInterpolationMode: 'monotone', spanGaps: true,
        pointRadius: 4, pointHoverRadius: 6, pointBorderColor: css('--surface'), pointBorderWidth: 2,
      }],
    },
    options: opts,
  });
}

function renderYoy(months) {
  const totals = sumBy(bills, (b) => b.billing_month);
  const cur = months.map((m) => totals[m] ?? null);
  const prev = months.map((m) => totals[addMonths(m, -12)] ?? null);
  const pairs = cur.map((c, i) => [c, prev[i]]).filter(([c, p]) => c != null && p != null);
  if (pairs.length) {
    const diff = pairs.reduce((s, [c, p]) => s + c - p, 0);
    $('#yoy-sub').textContent = `두 해 모두 기록 있는 ${pairs.length}개월 기준, 작년보다 ${won(Math.abs(diff))} ${diff > 0 ? '더 냈어요' : diff < 0 ? '덜 냈어요' : '같아요'}`;
  } else $('#yoy-sub').textContent = '작년 같은 달 기록이 쌓이면 비교가 보입니다';
  const opts = baseOptions();
  opts.plugins.tooltip.callbacks = {
    title: (items) => `${Number(months[items[0].dataIndex].slice(5))}월`,
    label: (ctx) => ` ${ctx.dataset.label}  ${won(ctx.raw)}`,
  };
  const surface = css('--surface');
  const bar = { borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 22, borderColor: surface, borderWidth: { left: 1, right: 1 } };
  draw('chart-yoy', {
    type: 'bar',
    data: {
      labels: months.map(monthLabel),
      datasets: [
        { label: '1년 전', data: prev, backgroundColor: css('--prev-year'), ...bar },
        { label: '선택 기간', data: cur, backgroundColor: css('--accent'), ...bar },
      ],
    },
    options: opts,
  });
}

$('#range').addEventListener('change', renderDashboard);
$('#usage-cat').addEventListener('change', () => renderUsage(rangeMonths()));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderDashboard);

// ── 등록 ──────────────────────────────────────────────────
const form = $('#bill-form');
const dz = $('#dropzone');
const fileInput = $('#file-input');

function setMsg(el, text, kind = '') {
  el.textContent = text;
  el.className = `msg ${kind}`;
}

dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('over'));
dz.addEventListener('drop', (e) => {
  e.preventDefault();
  dz.classList.remove('over');
  if (e.dataTransfer.files[0]) {
    const dt = new DataTransfer();
    dt.items.add(e.dataTransfer.files[0]);
    fileInput.files = dt.files;
    onFileChosen();
  }
});
fileInput.addEventListener('change', onFileChosen);
function onFileChosen() {
  const f = fileInput.files[0];
  $('#dz-file').textContent = f ? `선택됨: ${f.name}` : '';
  if (f) parse();
}

$('#btn-parse').addEventListener('click', parse);
async function parse() {
  const file = fileInput.files[0];
  const text = $('#paste-text').value;
  if (!file && !text.trim()) return setMsg($('#parse-msg'), '파일을 고르거나 내용을 붙여 넣어 주세요.', 'error');
  const fd = new FormData();
  if (file) fd.append('file', file);
  else fd.append('text', text);
  $('#btn-parse').disabled = true;
  setMsg($('#parse-msg'), '분석 중…');
  try {
    const r = await api('api/parse', { method: 'POST', body: fd });
    startNew();
    pendingFile = r.pending_file;
    rawText = r.text;
    fillForm({ ...r.fields, paid: false });
    showRaw(r.text);
    const found = ['billing_month', 'amount'].filter((k) => r.fields[k] != null).length;
    setMsg($('#parse-msg'), found === 2 ? '분석 완료! 오른쪽 내용을 확인하고 저장하세요.' : '일부 값을 찾지 못했어요. 빈 칸을 채워 주세요.', found === 2 ? 'ok' : '');
    updateAttached();
    form.querySelector('[name=amount]').focus({ preventScroll: matchMedia('(min-width: 861px)').matches });
  } catch (err) {
    setMsg($('#parse-msg'), err.message, 'error');
    if (err.body?.pending_file) {
      startNew();
      pendingFile = err.body.pending_file;
      updateAttached();
    }
  } finally {
    $('#btn-parse').disabled = false;
  }
}

$('#btn-manual').addEventListener('click', () => {
  startNew();
  form.querySelector('[name=billing_month]').value = thisMonth();
  form.querySelector('[name=category]').focus();
});

function startNew() {
  editingId = null;
  pendingFile = null;
  rawText = null;
  form.reset();
  $('#form-card').classList.remove('editing');
  $('#form-title').textContent = '2. 내용 확인 후 저장';
  $('#form-sub').textContent = '자동으로 찾은 값입니다. 틀린 곳이 있으면 고쳐 주세요.';
  $('#raw-box').hidden = true;
  setMsg($('#save-msg'), '');
  updateAttached();
}

function fillForm(v) {
  for (const [k, val] of Object.entries(v)) {
    const el = form.elements[k];
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = Boolean(val);
    else el.value = val ?? '';
  }
  if (!v.usage_unit && v.category) {
    form.elements.usage_unit.value = categories.find((c) => c.key === v.category)?.unit ?? '';
  }
}

function showRaw(text) {
  $('#raw-text').textContent = text ?? '';
  $('#raw-box').hidden = !text;
}

function updateAttached(existingName) {
  const name = pendingFile?.name ?? existingName;
  $('#attached').textContent = name ? `원본 파일: ${name} (함께 저장됩니다)` : '';
}

form.elements.category.addEventListener('change', () => {
  const unit = categories.find((c) => c.key === form.elements.category.value)?.unit;
  if (unit && !form.elements.usage_unit.value) form.elements.usage_unit.value = unit;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const body = Object.fromEntries(fd.entries());
  body.paid = form.elements.paid.checked;
  body.amount = String(body.amount).replace(/[,원\s]/g, '');
  body.usage = String(body.usage ?? '').replace(/[,\s]/g, '');
  $('#btn-save').disabled = true;
  try {
    if (editingId) {
      await api(`api/bills/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await api('api/bills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, pending_file: pendingFile, raw_text: rawText }),
      });
    }
    const wasEdit = Boolean(editingId);
    startNew();
    fileInput.value = '';
    $('#dz-file').textContent = '';
    $('#paste-text').value = '';
    setMsg($('#parse-msg'), '');
    setMsg($('#save-msg'), wasEdit ? '수정했습니다.' : '저장했습니다. 다음 고지서를 올려도 돼요.', 'ok');
    await loadBills();
    if (wasEdit) showTab('list');
  } catch (err) {
    setMsg($('#save-msg'), err.message, 'error');
  } finally {
    $('#btn-save').disabled = false;
  }
});

$('#btn-cancel').addEventListener('click', () => {
  const wasEdit = Boolean(editingId);
  startNew();
  if (wasEdit) showTab('list');
});

async function startEdit(id) {
  const b = await api(`api/bills/${id}`);
  startNew();
  editingId = id;
  fillForm(b);
  showRaw(b.raw_text);
  updateAttached(b.file_name);
  $('#attached').textContent = b.file_name ? `원본 파일: ${b.file_name}` : '';
  $('#form-card').classList.add('editing');
  $('#form-title').textContent = `${monthLong(b.billing_month)} ${categories[catIndex[b.category]]?.label ?? ''} 수정`;
  $('#form-sub').textContent = '고친 뒤 저장을 누르세요.';
  showTab('register');
  form.elements.amount.focus();
}

// ── 내역 ──────────────────────────────────────────────────
function refreshListFilters() {
  const ySel = $('#list-year');
  const prevY = ySel.value;
  ySel.innerHTML = '<option value="">전체</option>' + years().map((y) => `<option value="${y}">${y}년</option>`).join('');
  ySel.value = [...ySel.options].some((o) => o.value === prevY) ? prevY : '';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderList() {
  const y = $('#list-year').value;
  const c = $('#list-cat').value;
  const rows = bills.filter((b) => (!y || b.billing_month.startsWith(y)) && (!c || b.category === c));
  $('#list-body').innerHTML = rows.map((b) => {
    const cat = categories[catIndex[b.category]];
    return `<tr data-id="${b.id}">
      <td>${b.billing_month.replace('-', '.')}</td>
      <td><span class="chip" style="--chip: var(--cat-${catIndex[b.category] + 1})">${escapeHtml(cat?.label ?? b.category)}</span></td>
      <td>${escapeHtml(b.provider ?? '')}</td>
      <td class="num">${won(b.amount)}</td>
      <td class="num">${b.usage != null ? `${num(b.usage)} ${escapeHtml(b.usage_unit ?? '')}` : ''}</td>
      <td>${b.due_date ? b.due_date.replaceAll('-', '.') : ''}</td>
      <td><button class="paid-btn ${b.paid ? 'yes' : 'no'}" data-act="paid" title="눌러서 바꾸기">${b.paid ? '납부' : '미납'}</button></td>
      <td>
        ${b.has_file ? `<a class="button link" href="api/bills/${b.id}/file" target="_blank" rel="noopener">원본</a>` : ''}
        <button class="link" data-act="edit">수정</button>
        <button class="link danger" data-act="del">삭제</button>
      </td>
    </tr>`;
  }).join('');
  $('#list-total').textContent = won(rows.reduce((s, b) => s + b.amount, 0));
  $('#list-empty').hidden = rows.length > 0;
}

$('#list-year').addEventListener('change', renderList);
$('#list-cat').addEventListener('change', renderList);
$('#list-body').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = Number(btn.closest('tr').dataset.id);
  const b = bills.find((x) => x.id === id);
  try {
    if (btn.dataset.act === 'edit') return startEdit(id);
    if (btn.dataset.act === 'paid') {
      await api(`api/bills/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid: !b.paid }) });
    }
    if (btn.dataset.act === 'del') {
      const label = categories[catIndex[b.category]]?.label ?? '';
      if (!confirm(`${monthLong(b.billing_month)} ${label} ${won(b.amount)} 내역을 삭제할까요?\n저장된 원본 파일도 함께 지워지고 되돌릴 수 없습니다.`)) return;
      await api(`api/bills/${id}`, { method: 'DELETE' });
    }
    await loadBills();
  } catch (err) {
    alert(err.message);
  }
});

// ── 시작 ──────────────────────────────────────────────────
(async function init() {
  categories = await api('api/categories');
  catIndex = Object.fromEntries(categories.map((c, i) => [c.key, i]));
  const opts = categories.map((c) => `<option value="${c.key}">${c.label}</option>`).join('');
  form.elements.category.innerHTML = opts;
  $('#list-cat').innerHTML = '<option value="">전체</option>' + opts;
  let tab = 'dashboard';
  try { tab = localStorage.getItem('tab') ?? 'dashboard'; } catch { /* 무시 */ }
  showTab(['dashboard', 'register', 'list'].includes(tab) ? tab : 'dashboard');
  await loadBills();
})().catch((err) => {
  document.querySelector('main').innerHTML = `<p class="empty">서버에 연결하지 못했습니다: ${escapeHtml(err.message)}</p>`;
});
