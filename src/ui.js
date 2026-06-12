import { createBackup } from './backup.js?v=10';
import { createProducts } from './products.js?v=10';
import { createScanner } from './scanner.js?v=10';

const MEALS = [
  { id: 'breakfast', label: 'Śniadanie' },
  { id: 'lunch', label: 'Obiad' },
  { id: 'dinner', label: 'Kolacja' },
  { id: 'snacks', label: 'Przekąski' },
  { id: 'other', label: 'Inne' },
];

export function createUI({ state, store }) {
  const todayISO = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const refs = {
    summaryTitle: document.getElementById('summaryTitle'),
    targets: document.getElementById('targets'),
    todayLabel: document.getElementById('todayLabel'),
    entriesTitle: document.getElementById('entriesTitle'),
    activeDate: document.getElementById('activeDate'),
    entries: document.getElementById('entries'),
    totalsText: document.getElementById('totalsText'),
    dlgGoals: document.getElementById('modalGoals'),
    dlgAdd: document.getElementById('modalAdd'),
    dlgFavs: document.getElementById('modalFavs'),
    dlgHist: document.getElementById('modalHistory'),
    dlgWeek: document.getElementById('modalWeek'),
    dlgScan: document.getElementById('modalScan'),
    dlgBackup: document.getElementById('modalBackup'),
    goalK: document.getElementById('goalKcal'),
    goalP: document.getElementById('goalProt'),
    goalC: document.getElementById('goalCarb'),
    goalF: document.getElementById('goalFat'),
    addTitle: document.getElementById('addModalTitle'),
    addBtn: document.getElementById('btnAddEntry'),
    addName: document.getElementById('addName'),
    addK: document.getElementById('addKcal100'),
    addP: document.getElementById('addProt100'),
    addC: document.getElementById('addCarb100'),
    addF: document.getElementById('addFat100'),
    addMeal: document.getElementById('addMeal'),
    addPortion: document.getElementById('addPortion'),
    calcPreview: document.getElementById('calcPreview'),
    favList: document.getElementById('favList'),
    histList: document.getElementById('historyList'),
    weekRange: document.getElementById('weekRange'),
    weekList: document.getElementById('weekList'),
    weekTotal: document.getElementById('weekTotal'),
    weekAverage: document.getElementById('weekAverage'),
    weekGoalCompare: document.getElementById('weekGoalCompare'),
    video: document.getElementById('video'),
    scanStatus: document.getElementById('scanStatus'),
    eanManual: document.getElementById('eanManual'),
    prodName: document.getElementById('prodName'),
    prodCode: document.getElementById('prodCode'),
    offK: document.getElementById('offKcal100'),
    offP: document.getElementById('offProt100'),
    offC: document.getElementById('offCarb100'),
    offF: document.getElementById('offFat100'),
    offPortion: document.getElementById('offPortion'),
    offPreview: document.getElementById('offPreview'),
    btnAddFromOFF: document.getElementById('btnAddFromOFF'),
    scanResult: document.getElementById('scanResult'),
  };

  const supportsDialog = typeof HTMLDialogElement !== 'undefined' && 'showModal' in HTMLDialogElement.prototype;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const n = (value) => Number.isFinite(+value) ? +value : 0;
  const fmt = (value, decimals = 0) => Number.isFinite(value) ? value.toFixed(decimals) : '0';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const isSecureContextLike = () => location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const mealIds = new Set(MEALS.map((meal) => meal.id));

  function openDialog(dlg) {
    if (supportsDialog) {
      dlg.showModal();
      return;
    }

    dlg.setAttribute('open', '');
    dlg.style.position = 'fixed';
    dlg.style.inset = '10px';
    dlg.style.margin = '0 auto';
    dlg.style.maxWidth = '92vw';
    document.body.style.overflow = 'hidden';
  }

  function closeDialog(dlg) {
    if (supportsDialog) {
      try {
        dlg.close();
      } catch (_) {}
      return;
    }

    dlg.removeAttribute('open');
    document.body.style.overflow = '';
  }

  function portionMacros(per100, grams) {
    const factor = grams / 100;
    return {
      kcal: Math.round(n(per100.kcal) * factor),
      prot: +(n(per100.prot) * factor).toFixed(1),
      carb: +(n(per100.carb) * factor).toFixed(1),
      fat: +(n(per100.fat) * factor).toFixed(1),
    };
  }

  function normalizeMeal(meal) {
    return mealIds.has(meal) ? meal : 'other';
  }

  function emptyTotals() {
    return { kcal: 0, prot: 0, carb: 0, fat: 0 };
  }

  function addMacros(acc, item) {
    const macros = portionMacros({ kcal: item.kcal100, prot: item.prot100, carb: item.carb100, fat: item.fat100 }, item.grams);
    acc.kcal += macros.kcal;
    acc.prot += macros.prot;
    acc.carb += macros.carb;
    acc.fat += macros.fat;
    return macros;
  }

  function totalsText(totals) {
    return `${fmt(totals.kcal)} kcal • B ${fmt(totals.prot, 1)} g • W ${fmt(totals.carb, 1)} g • T ${fmt(totals.fat, 1)} g`;
  }

  function entryCountText(count) {
    return count === 1 ? '1 wpis' : `${count} wpisów`;
  }

  function formatISODatePL(dateISO) {
    const [year, month, day] = String(dateISO).split('-');
    return year && month && day ? `${day}.${month}.${year}` : dateISO;
  }

  function ensureDay(dateISO) {
    if (!state.s.entries[dateISO]) state.s.entries[dateISO] = [];
  }

  function activeDateISO() {
    if (!state.activeDate) state.activeDate = todayISO();
    return state.activeDate;
  }

  function isToday(dateISO) {
    return dateISO === todayISO();
  }

  function shiftDate(dateISO, days) {
    const [year, month, day] = String(dateISO).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const shiftedYear = date.getFullYear();
    const shiftedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const shiftedDay = String(date.getDate()).padStart(2, '0');
    return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
  }

  function dateFromISO(dateISO) {
    const [year, month, day] = String(dateISO).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function dateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function weekDatesFor(dateISO) {
    const start = dateFromISO(dateISO);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return Array.from({ length: 7 }, (_, index) => shiftDate(dateToISO(start), index));
  }

  function setActiveDate(dateISO) {
    if (!dateISO) return;
    state.activeDate = dateISO;
    refresh();
  }

  function getTotals(dateISO) {
    const list = state.s.entries[dateISO] || [];
    return list.reduce((acc, item) => {
      addMacros(acc, item);
      return acc;
    }, emptyTotals());
  }

  function renderSummary() {
    const dateISO = activeDateISO();
    refs.summaryTitle.textContent = isToday(dateISO) ? 'Dzisiaj' : 'Wybrany dzień';
    refs.todayLabel.textContent = isToday(dateISO)
      ? new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: '2-digit', month: '2-digit' })
      : formatISODatePL(dateISO);
    const goals = state.s.goals;
    const totals = getTotals(dateISO);
    refs.targets.innerHTML = '';

    const blocks = [
      { label: 'Kalorie', val: totals.kcal, goal: goals.kcal, unit: 'kcal', decimals: 0 },
      { label: 'Białko', val: totals.prot, goal: goals.prot, unit: 'g', decimals: 1 },
      { label: 'Węglowodany', val: totals.carb, goal: goals.carb, unit: 'g', decimals: 1 },
      { label: 'Tłuszcz', val: totals.fat, goal: goals.fat, unit: 'g', decimals: 1 },
    ];

    for (const block of blocks) {
      const over = block.goal > 0 && block.val > block.goal;
      const pct = block.goal > 0 ? clamp((block.val / block.goal) * 100, 0, 100) : 0;
      const diff = over ? block.val - block.goal : 0;
      const diffHtml = over ? `<span class="overdiff">(${fmt(diff, block.unit === 'kcal' ? 0 : 1)})</span>` : '';
      const el = document.createElement('div');
      el.className = 'target';
      el.innerHTML = `<div class="row"><span>${block.label}</span><span class="muted">${fmt(block.val, block.decimals)} / ${fmt(block.goal, 0)} ${block.unit}${diffHtml}</span></div>
      <div class="progress ${over ? 'over' : ''}"><i style="width:${pct}%"></i></div>`;
      refs.targets.appendChild(el);
    }

    refs.totalsText.textContent = totalsText(totals);
  }

  function renderEntries() {
    const dateISO = activeDateISO();
    refs.entriesTitle.textContent = isToday(dateISO) ? 'Dzisiejsze wpisy' : `Wpisy z dnia ${dateISO}`;
    refs.activeDate.value = dateISO;
    const list = state.s.entries[dateISO] || [];
    refs.entries.innerHTML = '';

    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = isToday(dateISO)
        ? 'Brak wpisów na dziś. Dodaj produkt ręcznie, z ulubionych albo przez EAN.'
        : 'Brak wpisów dla wybranej daty. Dodaj produkt ręcznie, z ulubionych albo przez EAN.';
      refs.entries.appendChild(empty);
      return;
    }

    for (const meal of MEALS) {
      const mealItems = list.filter((item) => normalizeMeal(item.meal) === meal.id);
      if (!mealItems.length) continue;

      const totals = emptyTotals();
      const group = document.createElement('div');
      group.className = 'meal-group';
      group.innerHTML = `<div class="row"><strong>${meal.label}</strong><span class="muted" data-meal-total>Razem: 0 kcal • B 0.0 g • W 0.0 g • T 0.0 g</span></div>`;

      for (const item of mealItems) {
        const macros = addMacros(totals, item);
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `<div><h4>${esc(item.name)}</h4><div class="meta">${fmt(n(item.grams), 0)} g • ${macros.kcal} kcal • B ${fmt(macros.prot, 1)} g • W ${fmt(macros.carb, 1)} g • T ${fmt(macros.fat, 1)} g</div></div><div class="row" style="gap:6px"><button class="btn" data-action="edit" data-id="${esc(item.id)}">Edytuj</button><button class="btn" data-action="del" data-id="${esc(item.id)}">Usuń</button></div>`;
        group.appendChild(row);
      }

      group.querySelector('[data-meal-total]').textContent = `Razem: ${totalsText(totals)}`;
      refs.entries.appendChild(group);
    }
  }

  function openGoals() {
    const goals = state.s.goals;
    refs.goalK.value = goals.kcal || '';
    refs.goalP.value = goals.prot || '';
    refs.goalC.value = goals.carb || '';
    refs.goalF.value = goals.fat || '';
    openDialog(refs.dlgGoals);
  }

  function openAdd(prefill) {
    state.editingId = prefill?.id || null;
    refs.addTitle.textContent = state.editingId ? 'Edytuj pozycję' : 'Dodaj pozycję ręcznie';
    refs.addBtn.textContent = state.editingId ? 'Zapisz zmiany' : 'Dodaj do dnia';
    refs.addName.value = prefill?.name || '';
    refs.addK.value = prefill?.kcal100 ?? '';
    refs.addP.value = prefill?.prot100 ?? '';
    refs.addC.value = prefill?.carb100 ?? '';
    refs.addF.value = prefill?.fat100 ?? '';
    refs.addMeal.value = normalizeMeal(prefill?.meal);
    refs.addPortion.value = prefill?.grams ?? '';
    refs.calcPreview.textContent = 'Makra porcji pojawią się tutaj…';
    if (prefill?.grams) recalcManual();
    openDialog(refs.dlgAdd);
  }

  function recalcManual() {
    const per100 = { kcal: n(refs.addK.value), prot: n(refs.addP.value), carb: n(refs.addC.value), fat: n(refs.addF.value) };
    const grams = n(refs.addPortion.value);
    const macros = portionMacros(per100, grams);
    refs.calcPreview.textContent = `${grams} g → ${macros.kcal} kcal • B ${fmt(macros.prot, 1)} g • W ${fmt(macros.carb, 1)} g • T ${fmt(macros.fat, 1)} g`;
  }

  function addEntry(obj) {
    const dateISO = activeDateISO();
    ensureDay(dateISO);
    const item = { id: crypto.randomUUID?.() || String(Date.now()), ...obj, meal: normalizeMeal(obj.meal) };
    state.s.entries[dateISO].push(item);
    store.save(state.s);
    renderEntries();
    renderSummary();
  }

  function upsertEntry(obj) {
    const dateISO = activeDateISO();
    ensureDay(dateISO);
    const list = state.s.entries[dateISO];
    const entry = { ...obj, meal: normalizeMeal(obj.meal) };

    if (state.editingId) {
      const index = list.findIndex((item) => item.id === state.editingId);
      if (index >= 0) {
        list[index] = { ...list[index], ...entry };
      } else {
        addEntry(entry);
      }
      state.editingId = null;
    } else {
      addEntry(entry);
      return;
    }

    store.save(state.s);
    renderEntries();
    renderSummary();
  }

  function saveGoals() {
    state.s.goals = { kcal: n(refs.goalK.value), prot: n(refs.goalP.value), carb: n(refs.goalC.value), fat: n(refs.goalF.value) };
    store.save(state.s);
    renderSummary();
  }

  function renderFavs() {
    refs.favList.innerHTML = '';

    if (!state.s.favs.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Brak ulubionych. Zapisz produkt z okna „Dodaj”.';
      refs.favList.appendChild(empty);
      return;
    }

    for (const [idx, fav] of state.s.favs.entries()) {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `<div><h4>${esc(fav.name)}</h4><div class="meta">100 g → ${fmt(n(fav.kcal100), 0)} kcal • B ${fmt(n(fav.prot100), 1)} g • W ${fmt(n(fav.carb100), 1)} g • T ${fmt(n(fav.fat100), 1)} g</div></div><div class="row" style="gap:6px"><button class="btn" data-action="use" data-idx="${idx}">Użyj</button><button class="btn" data-action="del" data-idx="${idx}">Usuń</button></div>`;
      refs.favList.appendChild(row);
    }
  }

  function openFavs() {
    renderFavs();
    openDialog(refs.dlgFavs);
  }

  function openHistory() {
    const dates = Object.keys(state.s.entries)
      .filter((dateISO) => (state.s.entries[dateISO] || []).length > 0)
      .sort()
      .reverse();
    refs.histList.innerHTML = '';

    if (!dates.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Brak historii.';
      refs.histList.appendChild(empty);
      openDialog(refs.dlgHist);
      return;
    }

    for (const dateISO of dates) {
      const t = getTotals(dateISO);
      const g = state.s.goals;
      const ok = (g.kcal && t.kcal >= g.kcal * 0.98 && t.kcal <= g.kcal * 1.02)
        && (g.prot && t.prot >= g.prot)
        && (g.carb && t.carb >= g.carb)
        && (g.fat && t.fat >= g.fat);
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `<div><h4>${formatISODatePL(dateISO)}</h4><div class="meta">${fmt(t.kcal)} kcal • B ${fmt(t.prot, 1)} g • W ${fmt(t.carb, 1)} g • T ${fmt(t.fat, 1)} g</div></div><span class="chip ${ok ? '' : 'danger'}">${ok ? '✔ w celu' : '◦ poza celem'}</span>`;
      refs.histList.appendChild(row);
    }
    openDialog(refs.dlgHist);
  }

  function openWeek() {
    const dates = weekDatesFor(activeDateISO());
    const total = emptyTotals();
    refs.weekRange.textContent = `Tydzień: ${dates[0]} – ${dates[6]}`;
    refs.weekList.innerHTML = '';

    for (const dateISO of dates) {
      const list = state.s.entries[dateISO] || [];
      const totals = getTotals(dateISO);
      total.kcal += totals.kcal;
      total.prot += totals.prot;
      total.carb += totals.carb;
      total.fat += totals.fat;

      const row = document.createElement('div');
      row.className = 'item';
      const dayLabel = dateFromISO(dateISO).toLocaleDateString('pl-PL', { weekday: 'long' });
      const status = list.length ? totalsText(totals) : 'Brak wpisów';
      row.innerHTML = `<div><h4>${dayLabel} ${dateISO}</h4><div class="meta">${status}</div></div><span class="chip">${list.length ? entryCountText(list.length) : 'pusto'}</span>`;
      refs.weekList.appendChild(row);
    }

    const average = {
      kcal: total.kcal / 7,
      prot: total.prot / 7,
      carb: total.carb / 7,
      fat: total.fat / 7,
    };
    const goalKcal = n(state.s.goals.kcal);
    refs.weekTotal.textContent = totalsText(total);
    refs.weekAverage.textContent = totalsText(average);
    refs.weekGoalCompare.textContent = goalKcal > 0
      ? `Średnia kcal: ${fmt(average.kcal)} / ${fmt(goalKcal)} kcal celu dziennego (${fmt((average.kcal / goalKcal) * 100)}%).`
      : 'Cel kcal nie jest ustawiony.';
    openDialog(refs.dlgWeek);
  }

  const scanner = createScanner({
    state,
    refs,
    addEntry,
    openDialog,
    closeDialog,
    utils: { n, fmt, portionMacros, isSecureContextLike },
  });

  const products = createProducts({
    state,
    store,
    addEntry,
    openDialog,
    closeDialog,
    utils: { n, fmt, esc, normalizeMeal, portionMacros },
  });

  function refresh() {
    renderEntries();
    renderSummary();
  }

  const backup = createBackup({
    state,
    store,
    openDialog,
    closeDialog,
    refresh,
    refs: {
      dlgBackup: refs.dlgBackup,
      backupFile: document.getElementById('backupFile'),
      backupStatus: document.getElementById('backupStatus'),
    },
  });

  function bindEvents() {
    document.getElementById('btnBackup').addEventListener('click', backup.openBackup);
    document.getElementById('btnGoals').addEventListener('click', openGoals);
    document.getElementById('btnScan').addEventListener('click', scanner.openScan);
    document.getElementById('btnAdd').addEventListener('click', () => openAdd());
    document.getElementById('btnQuickAdd').addEventListener('click', () => openAdd());
    document.getElementById('btnQuickFav').addEventListener('click', openFavs);
    document.getElementById('btnPrevDay').addEventListener('click', () => setActiveDate(shiftDate(activeDateISO(), -1)));
    document.getElementById('btnNextDay').addEventListener('click', () => setActiveDate(shiftDate(activeDateISO(), 1)));
    document.getElementById('btnToday').addEventListener('click', () => setActiveDate(todayISO()));
    refs.activeDate.addEventListener('change', () => setActiveDate(refs.activeDate.value));
    document.getElementById('btnProducts').addEventListener('click', products.openProducts);
    document.getElementById('btnHistory').addEventListener('click', openHistory);
    document.getElementById('btnWeek').addEventListener('click', openWeek);
    document.getElementById('btnFavs').addEventListener('click', openFavs);
    products.bindEvents();
    backup.bindEvents();

    document.getElementById('saveGoals').addEventListener('click', (event) => {
      event.preventDefault();
      saveGoals();
      closeDialog(refs.dlgGoals);
    });

    document.getElementById('btnRecalc').addEventListener('click', recalcManual);
    document.getElementById('btnAddEntry').addEventListener('click', (event) => {
      event.preventDefault();
      const obj = {
        name: refs.addName.value.trim() || 'Pozycja',
        grams: n(refs.addPortion.value),
        meal: normalizeMeal(refs.addMeal.value),
        kcal100: n(refs.addK.value),
        prot100: n(refs.addP.value),
        carb100: n(refs.addC.value),
        fat100: n(refs.addF.value),
      };
      if (obj.grams <= 0) {
        alert('Podaj gramaturę.');
        return;
      }
      upsertEntry(obj);
      closeDialog(refs.dlgAdd);
    });

    document.getElementById('btnSaveFav').addEventListener('click', () => {
      const fav = {
        name: refs.addName.value.trim() || 'Pozycja',
        kcal100: n(refs.addK.value),
        prot100: n(refs.addP.value),
        carb100: n(refs.addC.value),
        fat100: n(refs.addF.value),
      };
      if (!(fav.kcal100 || fav.prot100 || fav.carb100 || fav.fat100)) {
        alert('Uzupełnij wartości dla 100 g');
        return;
      }
      state.s.favs.push(fav);
      store.save(state.s);
      alert('Zapisano w ulubionych');
    });

    refs.favList.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;

      const idx = +target.dataset.idx;
      if (target.dataset.action === 'del') {
        state.s.favs.splice(idx, 1);
        store.save(state.s);
        renderFavs();
      }
      if (target.dataset.action === 'use') {
        const fav = state.s.favs[idx];
        closeDialog(refs.dlgFavs);
        openAdd({ name: fav.name, kcal100: fav.kcal100, prot100: fav.prot100, carb100: fav.carb100, fat100: fav.fat100 });
      }
    });

    refs.entries.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const id = button.dataset.id;
      const list = state.s.entries[activeDateISO()] || [];
      const index = list.findIndex((item) => item.id === id);
      if (index < 0) return;

      if (button.dataset.action === 'del') {
        list.splice(index, 1);
        store.save(state.s);
        renderEntries();
        renderSummary();
      }
      if (button.dataset.action === 'edit') {
        const item = list[index];
        openAdd({ id: item.id, name: item.name, kcal100: item.kcal100, prot100: item.prot100, carb100: item.carb100, fat100: item.fat100, grams: item.grams, meal: item.meal });
      }
    });

    document.getElementById('btnLookup').addEventListener('click', () => {
      const code = refs.eanManual.value.trim();
      if (!code) return;
      state.detected = false;
      scanner.handleCode(code, { force: true });
    });
    document.getElementById('btnRecalcOFF').addEventListener('click', scanner.recalcOFF);
    document.getElementById('btnAddFromOFF').addEventListener('click', scanner.addFromOFF);
    document.getElementById('btnStopCam').addEventListener('click', scanner.stopCamera);

    refs.dlgAdd.addEventListener('close', () => {
      state.editingId = null;
      refs.addBtn.textContent = 'Dodaj do dnia';
      refs.addTitle.textContent = 'Dodaj pozycję ręcznie';
    });
    refs.dlgScan.addEventListener('close', scanner.stopCamera);
  }

  function init() {
    bindEvents();
    refresh();
  }

  return { init, refs };
}
