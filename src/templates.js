export function createTemplates({ state, store, openDialog, closeDialog, refresh, getActiveDate, ensureDay, entryId, utils }) {
  const { n, fmt, esc, normalizeMeal, portionMacros } = utils;
  let pendingTemplate = null;

  const refs = {
    dlgTemplates: document.getElementById('modalTemplates'),
    dlgTemplateName: document.getElementById('modalTemplateName'),
    templateName: document.getElementById('templateName'),
    templateList: document.getElementById('templateList'),
  };

  function templateId() {
    return crypto.randomUUID?.() || String(Date.now());
  }

  function templateEntry(item) {
    return {
      name: item.name,
      grams: n(item.grams),
      kcal100: n(item.kcal100 ?? item.kcal),
      prot100: n(item.prot100 ?? item.prot),
      carb100: n(item.carb100 ?? item.carb),
      fat100: n(item.fat100 ?? item.fat),
      meal: normalizeMeal(item.meal),
    };
  }

  function templateTotals(template) {
    return (template.items || []).reduce((totals, item) => {
      const macros = portionMacros({ kcal: item.kcal100, prot: item.prot100, carb: item.carb100, fat: item.fat100 }, item.grams);
      totals.kcal += macros.kcal;
      totals.prot += macros.prot;
      totals.carb += macros.carb;
      totals.fat += macros.fat;
      return totals;
    }, { kcal: 0, prot: 0, carb: 0, fat: 0 });
  }

  function totalsText(totals) {
    return `${fmt(totals.kcal)} kcal • B ${fmt(totals.prot, 1)} g • W ${fmt(totals.carb, 1)} g • T ${fmt(totals.fat, 1)} g`;
  }

  function saveMealTemplate(mealId, items) {
    if (!items.length) return;

    pendingTemplate = {
      meal: normalizeMeal(mealId),
      items: items.map(templateEntry),
    };
    refs.templateName.value = '';
    openDialog(refs.dlgTemplateName);
  }

  function savePendingTemplate(event) {
    event.preventDefault();
    if (!pendingTemplate) return;

    const name = refs.templateName.value.trim();
    if (!name) {
      alert('Podaj nazwę szablonu.');
      return;
    }

    state.s.templates.push({
      id: templateId(),
      name,
      meal: pendingTemplate.meal,
      items: pendingTemplate.items,
    });
    store.save(state.s);
    pendingTemplate = null;
    closeDialog(refs.dlgTemplateName);
    alert('Zapisano szablon posiłku.');
  }

  function renderTemplates() {
    refs.templateList.innerHTML = '';

    if (!state.s.templates.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Brak szablonów.';
      refs.templateList.appendChild(empty);
      return;
    }

    for (const template of state.s.templates) {
      const itemCount = (template.items || []).length;
      const totals = templateTotals(template);
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `<div><h4>${esc(template.name)}</h4><div class="meta">${itemCount} ${itemCount === 1 ? 'wpis' : 'wpisów'} • ${totalsText(totals)}</div></div><div class="row" style="gap:6px"><button class="btn" data-action="use" data-id="${esc(template.id)}">Użyj</button><button class="btn" data-action="del" data-id="${esc(template.id)}">Usuń</button></div>`;
      refs.templateList.appendChild(row);
    }
  }

  function openTemplates() {
    renderTemplates();
    openDialog(refs.dlgTemplates);
  }

  function getTemplate(id) {
    return state.s.templates.find((template) => template.id === id);
  }

  function useTemplate(template) {
    if (!(template.items || []).length) {
      alert('Szablon nie ma wpisów.');
      return;
    }

    const dateISO = getActiveDate();
    ensureDay(dateISO);
    for (const item of template.items || []) {
      state.s.entries[dateISO].push({
        id: entryId(),
        ...templateEntry(item),
      });
    }
    store.save(state.s);
    refresh();
    closeDialog(refs.dlgTemplates);
  }

  function bindEvents() {
    document.getElementById('btnSaveTemplateName').addEventListener('click', savePendingTemplate);
    refs.dlgTemplateName.addEventListener('close', () => {
      pendingTemplate = null;
    });

    refs.templateList.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const template = getTemplate(button.dataset.id);
      if (!template) return;

      if (button.dataset.action === 'use') {
        useTemplate(template);
      }
      if (button.dataset.action === 'del') {
        state.s.templates = state.s.templates.filter((item) => item.id !== template.id);
        store.save(state.s);
        renderTemplates();
      }
    });
  }

  return {
    bindEvents,
    openTemplates,
    saveMealTemplate,
  };
}
