const state = { category: 'domestic', last: null };
const $ = (id) => document.getElementById(id);
const HISTORY_KEY = 'nellaiPowerCalcHistory';
const SETTINGS_KEY = 'nellaiPowerCalcSettings';

// TN tariff reference used by this estimate tool. Verify the latest TNERC/TNPDCL order before billing.
const TARIFF = {
  domesticUnder500: [
    { label: '0–200 (Free Slab)', from: 0, to: 200, rate: 0 },
    { label: '201–400', from: 200, to: 400, rate: 4.70 },
    { label: '401–500', from: 400, to: 500, rate: 6.30 }
  ],
  domesticOver500: [
    { label: '0–200', from: 0, to: 200, rate: 4.70 },
    { label: '201–400', from: 200, to: 400, rate: 4.70 },
    { label: '401–500', from: 400, to: 500, rate: 6.30 },
    { label: '501–600', from: 500, to: 600, rate: 8.40 },
    { label: '601–800', from: 600, to: 800, rate: 9.45 },
    { label: '801–1000', from: 800, to: 1000, rate: 10.50 },
    { label: '1001+', from: 1000, to: Infinity, rate: 11.55 }
  ],
  commercial: [{ label: 'All units', from: 0, to: Infinity, rate: 8.50 }]
};

function money(value) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value); }
function today() { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date()); }
function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } }
function saveHistory(items) { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); }
function getSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; } }

function calculate() {
  const units = Math.floor(Number($('units').value));
  if (!Number.isFinite(units) || units < 0 || units > 10000) {
    $('error').textContent = 'Enter a valid value from 0 to 10,000 units.'; return;
  }
  $('error').textContent = '';
  const rows = [];
  let energy = 0;
  const fixed = state.category === 'commercial' ? 0 : 0;
  const isDomesticFreeBand = state.category === 'domestic' && units <= 500;
  const slabs = state.category === 'commercial' ? TARIFF.commercial : (isDomesticFreeBand ? TARIFF.domesticUnder500 : TARIFF.domesticOver500);

  slabs.forEach((slab) => {
    const used = Math.max(0, Math.min(units, slab.to) - slab.from);
    if (!used) return;
    const amount = used * slab.rate;
    rows.push([slab.label, used, slab.rate === 0 ? 'FREE' : slab.rate, amount]);
    energy += amount;
  });

  // Electricity duty is shown separately as an estimate; actual bills can include FAC and other approved charges.
  const dutyRate = state.category === 'commercial' ? 0.09 : 0.05;
  const duty = energy * dutyRate;
  const total = energy + fixed + duty;
  const savings = state.category === 'domestic' && units <= 500 ? Math.min(units, 200) * 4.70 : 0;
  state.last = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), units, category: state.category,
    energy, fixed, duty, dutyRate, total, savings, rows,
    customer: $('customerName').value.trim(), meter: $('meterNumber').value.trim(),
    period: $('billDate').value.trim() || today(), createdAt: new Date().toISOString()
  };
  renderBill(state.last);
}

function renderBill(bill) {
  $('breakdown').innerHTML = bill.rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${typeof r[2] === 'number' ? money(r[2]) : r[2]}</td><td>${money(r[3])}</td></tr>`).join('');
  $('energy').textContent = money(bill.energy); $('fixed').textContent = money(bill.fixed); $('duty').textContent = money(bill.duty); $('total').textContent = money(bill.total);
  $('statUnits').textContent = `${bill.units} units`; $('statTotal').textContent = money(bill.total); $('statSavings').textContent = money(bill.savings);
  $('cycleBadge').textContent = `Bi-monthly • ${bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN') : today()}`;
}

function renderHistory() {
  const list = $('historyList'); const items = getHistory();
  if (!items.length) { list.innerHTML = '<p class="empty-state">No history yet. Calculate and save your first bill!</p>'; return; }
  list.innerHTML = items.map((b) => `<article class="history-item"><div><strong>${b.category[0].toUpperCase() + b.category.slice(1)} • ${b.units} units</strong><small>${b.customer || 'Unnamed customer'}${b.meter ? ` • Meter ${b.meter}` : ''} • ${new Date(b.createdAt).toLocaleString('en-IN')}</small></div><strong class="green">${money(b.total)}</strong><button class="history-load" data-id="${b.id}">Load</button></article>`).join('');
  document.querySelectorAll('.history-load').forEach((button) => button.addEventListener('click', () => {
    const bill = getHistory().find((item) => item.id === button.dataset.id); if (!bill) return;
    state.category = bill.category; $('units').value = bill.units; $('customerName').value = bill.customer || ''; $('meterNumber').value = bill.meter || ''; $('billDate').value = bill.period || '';
    document.querySelectorAll('.segment').forEach((x) => x.classList.toggle('selected', x.dataset.category === state.category)); state.last = bill; renderBill(bill); activateTab('dashboard');
  }));
}

function activateTab(tab) {
  document.querySelectorAll('.tab-content').forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
  document.querySelectorAll('.nav-link').forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
  if (tab === 'history') renderHistory();
  location.hash = tab;
}

function downloadEstimate() {
  if (!state.last) calculate();
  const b = state.last;
  const lines = ['Nellai PowerCalc - Electricity Bill Estimate', `Generated: ${today()}`, `Category: ${b.category}`, `Units: ${b.units} kWh`, '', ...b.rows.map((r) => `${r[0]} | ${r[1]} units | ${r[2]} | ${money(r[3])}`), '', `Energy charge: ${money(b.energy)}`, `Fixed charge: ${money(b.fixed)}`, `Electricity duty (${b.dutyRate * 100}%): ${money(b.duty)}`, `TOTAL: ${money(b.total)}`, '', 'Estimate only. Verify current charges with the official TNPDCL/TNERC tariff order.'];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `tneb-estimate-${b.units}-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
}

document.querySelectorAll('.segment').forEach((btn) => btn.addEventListener('click', () => { document.querySelectorAll('.segment').forEach((x) => x.classList.remove('selected')); btn.classList.add('selected'); state.category = btn.dataset.category; calculate(); }));
$('calculate').addEventListener('click', calculate); $('saveBill').addEventListener('click', () => { if (!state.last) calculate(); const items = getHistory().filter((b) => b.id !== state.last.id); saveHistory([state.last, ...items].slice(0, 50)); renderHistory(); alert('Bill saved to history.'); }); $('download').addEventListener('click', downloadEstimate);
$('clearHistory').addEventListener('click', () => { if (confirm('Delete all saved calculations?')) { saveHistory([]); renderHistory(); } });
$('exportData').addEventListener('click', () => { const items = getHistory(); const csv = ['Date,Category,Units,Energy,Fixed,Duty,Total', ...items.map((b) => [b.createdAt, b.category, b.units, b.energy, b.fixed, b.duty, b.total].join(','))].join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'tneb-calculation-history.csv'; a.click(); URL.revokeObjectURL(url); });
$('themeToggle').addEventListener('click', () => { document.body.classList.toggle('dark'); const dark = document.body.classList.contains('dark'); $('themeToggle').innerHTML = dark ? '☀ <span>Light mode</span>' : '☾ <span>Dark mode</span>'; localStorage.setItem('tnebDarkMode', dark ? '1' : '0'); });
document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); activateTab(link.dataset.tab); }));
const settings = getSettings(); $('customerName').value = settings.customer || ''; $('meterNumber').value = settings.meter || ''; $('billDate').value = settings.period || today(); ['customerName', 'meterNumber', 'billDate'].forEach((id) => $(id).addEventListener('change', () => localStorage.setItem(SETTINGS_KEY, JSON.stringify({ customer: $('customerName').value, meter: $('meterNumber').value, period: $('billDate').value }))));
$('dateToday').textContent = new Date().getDate(); $('footerDate').textContent = today();
if (localStorage.getItem('tnebDarkMode') === '1') { document.body.classList.add('dark'); $('themeToggle').innerHTML = '☀ <span>Light mode</span>'; }
if (location.hash === '#slabs' || location.hash === '#history') activateTab(location.hash.slice(1));
calculate();
