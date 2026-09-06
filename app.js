// Fixed categorical order (validated adjacent-safe palette) — subjects are
// assigned slots in this order as they're first discovered, never re-cycled.
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const NEUTRAL_DOT = '#c3c2b7';
const DAY = 86400000;
const REMOTE_ON = isRemoteConfigured();

const sources = { mock: USE_MOCK_DATA ? loadMockAssignments() : [], manual: loadManualAssignments(), remote: [] };
const subjectColor = new Map(); // subject name -> hex, assigned in first-seen order
let state = { view: 'upcoming', subject: 'All' };

const completedOverrides = loadCompletedOverrides();

function loadCompletedOverrides() {
    try { return JSON.parse(localStorage.getItem('classroom-dashboard:completed') || '{}'); }
    catch { return {}; }
}
function saveCompletedOverrides() {
    try { localStorage.setItem('classroom-dashboard:completed', JSON.stringify(completedOverrides)); }
    catch { /* storage unavailable — toggle still works for this page load */ }
}

function loadManualAssignments() {
    try {
        const raw = JSON.parse(localStorage.getItem('classroom-dashboard:manual') || '[]');
        return raw.map(a => ({ ...a, due: new Date(a.due), source: 'manual' }));
    } catch { return []; }
}
function saveManualAssignments() {
    const raw = sources.manual.map(a => ({
        id: a.id, title: a.title, subject: a.subject, due: a.due.toISOString(),
        estHours: a.estHours, completed: a.completed,
    }));
    try { localStorage.setItem('classroom-dashboard:manual', JSON.stringify(raw)); }
    catch { /* storage unavailable — entries still work for this page load */ }
}

function allAssignments() {
    const list = [...sources.mock, ...sources.manual, ...sources.remote];
    return list
        .filter(a => a.due.getTime() >= Date.now()) // past-due items drop off the list entirely
        .map(a => ({
            ...a,
            completed: a.source === 'mock' && completedOverrides[a.id] !== undefined ? completedOverrides[a.id] : a.completed,
        }));
}

function colorFor(subject) {
    if (!subjectColor.has(subject)) {
        subjectColor.set(subject, PALETTE[subjectColor.size % PALETTE.length]);
    }
    return subjectColor.get(subject);
}
function hexToRgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
function daysUntil(due) {
    return Math.ceil((due.getTime() - Date.now()) / DAY);
}
function dueLabel(due) {
    const d = daysUntil(due);
    if (d < 0) return { text: `${Math.abs(d)}d overdue`, overdue: true };
    if (d === 0) return { text: 'Today', overdue: false };
    return { text: `In ${d}d`, overdue: false };
}

/* ── filtering ─────────────────────────────────────────────── */
function filteredAssignments() {
    return allAssignments().filter(a => {
        if (state.subject !== 'All' && a.subject !== state.subject) return false;
        if (state.view === 'upcoming') return !a.completed;
        if (state.view === 'completed') return a.completed;
        return true;
    });
}

/* ── stats ─────────────────────────────────────────────────── */
function renderStats(list) {
    const total = list.length;
    const done = list.filter(a => a.completed).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const remaining = list.filter(a => !a.completed);
    const effort = remaining.reduce((sum, a) => sum + (a.estHours || 0), 0);

    document.getElementById('statCompletion').textContent = `${pct}%`;
    document.getElementById('statTodo').textContent = `${remaining.length} left`;
    document.getElementById('statEffort').textContent = `${effort.toFixed(1)}h`;
}

/* ── assignment list ───────────────────────────────────────── */
function renderList(list) {
    const rowsEl = document.getElementById('listRows');
    const emptyEl = document.getElementById('listEmpty');
    rowsEl.innerHTML = '';

    const sorted = [...list].sort((a, b) => a.due - b.due);
    emptyEl.hidden = sorted.length > 0;

    for (const a of sorted) {
        const row = document.createElement('div');
        row.className = 'assignment-row' + (a.completed ? ' done' : '');

        const check = document.createElement('button');
        check.className = 'check' + (a.completed ? ' done' : '');
        check.title = a.completed ? 'Mark as not done' : 'Mark as done';
        check.addEventListener('click', async () => {
            if (a.source === 'manual') {
                const m = sources.manual.find(x => x.id === a.id);
                if (m) { m.completed = !m.completed; saveManualAssignments(); }
                renderAll();
            } else if (a.source === 'remote') {
                try {
                    await updateRemoteAssignment(a.remoteId, { completed: !a.completed });
                    await refreshRemote();
                } catch (err) { console.error(err); }
            } else {
                completedOverrides[a.id] = !a.completed;
                saveCompletedOverrides();
                renderAll();
            }
        });

        const main = document.createElement('div');
        main.className = 'assignment-main';
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = a.title;
        const pill = document.createElement('span');
        pill.className = 'subject-pill';
        pill.style.background = hexToRgba(colorFor(a.subject), 0.14);
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = colorFor(a.subject);
        pill.appendChild(dot);
        pill.appendChild(document.createTextNode(a.subject));
        main.appendChild(title);
        main.appendChild(pill);
        if (a.addedBy) {
            const by = document.createElement('span');
            by.className = 'added-by';
            by.textContent = `added by ${a.addedBy}`;
            main.appendChild(by);
        }

        const side = document.createElement('div');
        side.className = 'assignment-side';
        const due = dueLabel(a.due);
        const dueEl = document.createElement('div');
        dueEl.className = 'due' + (due.overdue ? ' overdue' : '');
        dueEl.textContent = due.text;
        const estEl = document.createElement('div');
        estEl.className = 'est';
        estEl.textContent = a.estHours != null ? `${a.estHours}h est.` : '—';
        side.appendChild(dueEl);
        side.appendChild(estEl);

        row.appendChild(check);
        row.appendChild(main);
        row.appendChild(side);

        if (a.source === 'manual' || a.source === 'remote') {
            const del = document.createElement('button');
            del.className = 'rm-btn';
            del.title = 'Delete';
            del.textContent = '✕';
            del.addEventListener('click', async () => {
                if (a.source === 'manual') {
                    sources.manual = sources.manual.filter(m => m.id !== a.id);
                    saveManualAssignments();
                    renderAll();
                } else {
                    try {
                        await deleteRemoteAssignment(a.remoteId);
                        await refreshRemote();
                    } catch (err) { console.error(err); }
                }
            });
            row.appendChild(del);
        }

        rowsEl.appendChild(row);
    }
}

/* ── subject filter pills ─────────────────────────────────── */
function renderSubjectPills() {
    const subjects = [...new Set(allAssignments().map(a => a.subject))];
    const wrap = document.getElementById('subjectPills');
    wrap.innerHTML = '';

    const makeBtn = (label, value) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (state.subject === value) btn.classList.add('active');
        btn.addEventListener('click', () => { state.subject = value; renderAll(); });
        return btn;
    };
    wrap.appendChild(makeBtn('All Subjects', 'All'));
    for (const s of subjects) wrap.appendChild(makeBtn(s, s));

    const datalist = document.getElementById('subjectOptions');
    datalist.innerHTML = '';
    for (const s of subjects) {
        const opt = document.createElement('option');
        opt.value = s;
        datalist.appendChild(opt);
    }
}

/* ── chart ─────────────────────────────────────────────────── */
const VB_W = 860, VB_H = 300;
const PAD = { l: 34, r: 14, t: 14, b: 32 };
const PLOT_W = VB_W - PAD.l - PAD.r;
const PLOT_H = VB_H - PAD.t - PAD.b;
const NUM_DAYS = 10;

function xForDay(day) { return PAD.l + ((day - 1) / (NUM_DAYS - 1)) * PLOT_W; }
function yForVal(v, maxY) { return PAD.t + (1 - v / maxY) * PLOT_H; }

function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
}

function renderChart(list) {
    const svg = document.getElementById('chartSvg');
    const tooltip = document.getElementById('tooltip');
    svg.innerHTML = '';

    // Bucket by day-from-now (1..10)
    const buckets = Array.from({ length: NUM_DAYS }, () => ({ hours: 0, items: [] }));
    for (const a of list) {
        const d = daysUntil(a.due);
        if (d >= 1 && d <= NUM_DAYS) {
            buckets[d - 1].hours += (a.estHours || 0);
            buckets[d - 1].items.push(a);
        }
    }

    const maxVal = Math.max(...buckets.map(b => b.hours), 0);
    const maxY = Math.max(8, Math.ceil((maxVal || 1) / 2) * 2);

    // gridlines + y labels
    for (let v = 0; v <= maxY; v += 2) {
        const y = yForVal(v, maxY);
        svg.appendChild(svgEl('line', {
            x1: PAD.l, x2: VB_W - PAD.r, y1: y, y2: y,
            class: v === 0 ? 'baseline' : 'gridline',
        }));
        const label = svgEl('text', { x: PAD.l - 8, y: y + 3, class: 'axis-label', 'text-anchor': 'end' });
        label.textContent = `${v}h`;
        svg.appendChild(label);
    }

    // x labels
    for (let d = 1; d <= NUM_DAYS; d++) {
        const label = svgEl('text', { x: xForDay(d), y: VB_H - PAD.b + 18, class: 'axis-label', 'text-anchor': 'middle' });
        label.textContent = `In ${d}d`;
        svg.appendChild(label);
    }

    // trend line
    const pathD = buckets.map((b, i) => `${i === 0 ? 'M' : 'L'} ${xForDay(i + 1)} ${yForVal(b.hours, maxY)}`).join(' ');
    svg.appendChild(svgEl('path', { d: pathD, class: 'trend-line' }));

    // markers (only where something is due)
    buckets.forEach((b, i) => {
        if (!b.items.length) return;
        const x = xForDay(i + 1), y = yForVal(b.hours, maxY);
        const subjectsHere = new Set(b.items.map(it => it.subject));
        const color = subjectsHere.size === 1 ? colorFor(b.items[0].subject) : NEUTRAL_DOT;
        svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 7, class: 'point-ring' }));
        svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 5, fill: color, class: 'point-dot' }));
    });

    // crosshair (hidden until hover)
    const crosshair = svgEl('line', { x1: 0, x2: 0, y1: PAD.t, y2: VB_H - PAD.b, class: 'crosshair' });
    svg.appendChild(crosshair);

    // per-day hit columns — crosshair-style hover across the whole line
    const colWidth = PLOT_W / NUM_DAYS;
    buckets.forEach((b, i) => {
        const x = PAD.l + i * colWidth;
        const hit = svgEl('rect', { x, y: PAD.t, width: colWidth, height: PLOT_H, class: 'hit-area' });
        const day = i + 1;
        hit.addEventListener('pointerenter', () => showTooltip(day, b, crosshair, tooltip, svg));
        hit.addEventListener('pointermove', () => showTooltip(day, b, crosshair, tooltip, svg));
        hit.addEventListener('pointerleave', () => hideTooltip(crosshair, tooltip));
        hit.addEventListener('focus', () => showTooltip(day, b, crosshair, tooltip, svg));
        hit.addEventListener('blur', () => hideTooltip(crosshair, tooltip));
        hit.setAttribute('tabindex', '0');
        svg.appendChild(hit);
    });

    renderLegend(list);
}

function showTooltip(day, bucket, crosshair, tooltip, svg) {
    const x = xForDay(day);
    crosshair.setAttribute('x1', x);
    crosshair.setAttribute('x2', x);
    crosshair.style.opacity = '1';

    tooltip.innerHTML = '';
    const dateRow = document.createElement('div');
    dateRow.className = 'tt-date';
    dateRow.textContent = `In ${day}d`;
    tooltip.appendChild(dateRow);

    if (!bucket.items.length) {
        const row = document.createElement('div');
        row.className = 'tt-row';
        row.textContent = 'Nothing due';
        tooltip.appendChild(row);
    } else {
        for (const item of bucket.items) {
            const row = document.createElement('div');
            row.className = 'tt-row';
            const key = document.createElement('span');
            key.className = 'key';
            key.style.background = colorFor(item.subject);
            const val = document.createElement('span');
            val.className = 'val';
            val.textContent = item.estHours != null ? `${item.estHours}h` : '—';
            const lbl = document.createElement('span');
            lbl.className = 'lbl';
            lbl.textContent = item.title;
            row.appendChild(key);
            row.appendChild(val);
            row.appendChild(lbl);
            tooltip.appendChild(row);
        }
    }

    // position tooltip relative to the chart wrapper, scaled from viewBox to actual pixels
    const rect = svg.getBoundingClientRect();
    const wrapRect = svg.parentElement.getBoundingClientRect();
    const scaleX = rect.width / VB_W;
    const px = (x * scaleX) + (rect.left - wrapRect.left);
    tooltip.style.left = `${px}px`;
    tooltip.style.top = `20px`;
    tooltip.classList.add('show');
}
function hideTooltip(crosshair, tooltip) {
    crosshair.style.opacity = '0';
    tooltip.classList.remove('show');
}

function renderLegend(list) {
    const legend = document.getElementById('legend');
    legend.innerHTML = '';
    const subjects = [...new Set(list.map(a => a.subject))];
    if (subjects.length < 2) return; // single series needs no legend box
    for (const s of subjects) {
        const item = document.createElement('div');
        item.className = 'legend-item';
        const dot = document.createElement('span');
        dot.className = 'legend-dot';
        dot.style.background = colorFor(s);
        item.appendChild(dot);
        item.appendChild(document.createTextNode(s));
        legend.appendChild(item);
    }
}

/* ── top-level render ──────────────────────────────────────── */
function renderAll() {
    // Ensure every known subject has a stable color before drawing anything
    // (fixed first-seen order — never re-cycled when filters change).
    [...new Set(allAssignments().map(a => a.subject))].forEach(colorFor);

    const list = filteredAssignments();
    document.querySelectorAll('#viewTabs button').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
    renderStats(list);
    renderChart(list);
    renderList(list);
    renderSubjectPills();
}

/* ── wiring ────────────────────────────────────────────────── */
document.querySelectorAll('#viewTabs button').forEach(btn => {
    btn.addEventListener('click', () => { state.view = btn.dataset.view; renderAll(); });
});

function todayISO() { return new Date().toISOString().slice(0, 10); }

function showRemoteError(message) {
    const el = document.getElementById('remoteError');
    el.textContent = message;
    el.hidden = !message;
}

async function refreshRemote() {
    try {
        sources.remote = await fetchRemoteAssignments();
        showRemoteError(null);
    } catch (err) {
        console.error('Could not load shared assignments:', err.message);
        showRemoteError(`Couldn't load the shared list: ${err.message}`);
    }
    renderAll();
}

const addForm = document.getElementById('addForm');
const addNameInput = document.getElementById('addName');
document.getElementById('addDue').value = todayISO();

if (REMOTE_ON) {
    addNameInput.hidden = false;
    try { addNameInput.value = localStorage.getItem('classroom-dashboard:username') || ''; } catch { /* ignore */ }
}

const addSubmitBtn = addForm.querySelector('button[type="submit"]');

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = addNameInput.value.trim();
    const title = document.getElementById('addTitle').value.trim();
    const subject = document.getElementById('addSubject').value.trim();
    const dueStr = document.getElementById('addDue').value;
    const hoursStr = document.getElementById('addHours').value;
    if (!title || !subject || !dueStr) return;

    const due = new Date(`${dueStr}T23:59:00`);
    const estHours = hoursStr ? parseFloat(hoursStr) : null;

    if (REMOTE_ON) {
        try { localStorage.setItem('classroom-dashboard:username', name); } catch { /* ignore */ }
        addSubmitBtn.disabled = true;
        addSubmitBtn.textContent = 'Adding…';
        try {
            await insertRemoteAssignment({ title, subject, due, estHours, completed: false, addedBy: name || null });
            await refreshRemote();
        } catch (err) {
            console.error(err);
            alert(`Could not add to the shared list: ${err.message}`);
            return;
        } finally {
            addSubmitBtn.disabled = false;
            addSubmitBtn.textContent = '+ Add';
        }
    } else {
        sources.manual.push({
            id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title,
            subject,
            due,
            estHours,
            completed: false,
            source: 'manual',
        });
        saveManualAssignments();
        renderAll();
    }

    const keepName = addNameInput.value;
    addForm.reset();
    addNameInput.value = keepName;
    document.getElementById('addDue').value = todayISO();
});

if (REMOTE_ON) {
    refreshRemote();
    subscribeRemote(() => refreshRemote());
} else {
    renderAll();
}
