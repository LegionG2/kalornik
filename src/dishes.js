export function createDishes({ state, store, addEntry, openDialog, closeDialog, utils }) {
  const { n, fmt, esc, normalizeMeal } = utils;
  let draftIngredients = [];
  let usingDishId = null;

  const refs = {
    dlgDishes: document.getElementById('modalDishes'),
    dlgDishForm: document.getElementById('modalDishForm'),
    dlgDishUse: document.getElementById('modalDishUse'),
    dishList: document.getElementById('dishList'),
    dishName: document.getElementById('dishName'),
    ingredientList: document.getElementById('dishIngredientList'),
    ingredientName: document.getElementById('dishIngredientName'),
    ingredientGrams: document.getElementById('dishIngredientGrams'),
    ingredientKcal: document.getElementById('dishIngredientKcal'),
    ingredientProt: document.getElementById('dishIngredientProt'),
    ingredientCarb: document.getElementById('dishIngredientCarb'),
    ingredientFat: document.getElementById('dishIngredientFat'),
    formTotals: document.getElementById('dishFormTotals'),
    useDishName: document.getElementById('useDishName'),
    useDishMeal: document.getElementById('useDishMeal'),
    useDishPreview: document.getElementById('useDishPreview'),
  };
  refs.dishForm = refs.dlgDishForm.querySelector('form');
  refs.dishUseForm = refs.dlgDishUse.querySelector('form');
  refs.ingredientFields = [
    refs.ingredientName,
    refs.ingredientGrams,
    refs.ingredientKcal,
    refs.ingredientProt,
    refs.ingredientCarb,
    refs.ingredientFat,
  ];

  function dishId() {
    return crypto.randomUUID?.() || String(Date.now());
  }

  function totalsFor(ingredients) {
    return ingredients.reduce((totals, item) => {
      totals.grams += n(item.grams);
      totals.kcal += n(item.kcal);
      totals.prot += n(item.prot);
      totals.carb += n(item.carb);
      totals.fat += n(item.fat);
      return totals;
    }, { grams: 0, kcal: 0, prot: 0, carb: 0, fat: 0 });
  }

  function totalsText(totals) {
    return `${fmt(totals.kcal)} kcal • B ${fmt(totals.prot, 1)} g • W ${fmt(totals.carb, 1)} g • T ${fmt(totals.fat, 1)} g`;
  }

  function getDish(id) {
    return state.s.dishes.find((dish) => dish.id === id);
  }

  function renderIngredients() {
    refs.ingredientList.innerHTML = '';

    if (!draftIngredients.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Brak składników.';
      refs.ingredientList.appendChild(empty);
    }

    for (const [index, ingredient] of draftIngredients.entries()) {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `<div><h4>${esc(ingredient.name)}</h4><div class="meta">${fmt(n(ingredient.grams))} g • ${fmt(n(ingredient.kcal))} kcal • B ${fmt(n(ingredient.prot), 1)} g • W ${fmt(n(ingredient.carb), 1)} g • T ${fmt(n(ingredient.fat), 1)} g</div></div><button class="btn" type="button" data-action="del-ingredient" data-idx="${index}">Usuń</button>`;
      refs.ingredientList.appendChild(row);
    }

    refs.formTotals.textContent = `Razem: ${totalsText(totalsFor(draftIngredients))}`;
  }

  function renderDishes() {
    refs.dishList.innerHTML = '';

    if (!state.s.dishes.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Brak dań.';
      refs.dishList.appendChild(empty);
      return;
    }

    for (const dish of state.s.dishes) {
      const totals = totalsFor(dish.ingredients || []);
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `<div><h4>${esc(dish.name)}</h4><div class="meta">${(dish.ingredients || []).length} składników • ${fmt(totals.grams)} g • ${totalsText(totals)}</div></div><div class="row" style="gap:6px"><button class="btn" type="button" data-action="use" data-id="${esc(dish.id)}">Dodaj do dnia</button><button class="btn" type="button" data-action="del" data-id="${esc(dish.id)}">Usuń</button></div>`;
      refs.dishList.appendChild(row);
    }
  }

  function openDishes() {
    renderDishes();
    openDialog(refs.dlgDishes);
  }

  function openDishForm() {
    draftIngredients = [];
    refs.dishName.value = '';
    refs.ingredientName.value = '';
    refs.ingredientGrams.value = '';
    refs.ingredientKcal.value = '';
    refs.ingredientProt.value = '';
    refs.ingredientCarb.value = '';
    refs.ingredientFat.value = '';
    renderIngredients();
    closeDialog(refs.dlgDishes);
    openDialog(refs.dlgDishForm);
  }

  function addIngredient() {
    const ingredient = {
      name: refs.ingredientName.value.trim() || 'Składnik',
      grams: n(refs.ingredientGrams.value),
      kcal: n(refs.ingredientKcal.value),
      prot: n(refs.ingredientProt.value),
      carb: n(refs.ingredientCarb.value),
      fat: n(refs.ingredientFat.value),
    };

    if (ingredient.grams <= 0) {
      alert('Podaj gramaturę składnika.');
      return;
    }

    draftIngredients.push(ingredient);
    refs.ingredientName.value = '';
    refs.ingredientGrams.value = '';
    refs.ingredientKcal.value = '';
    refs.ingredientProt.value = '';
    refs.ingredientCarb.value = '';
    refs.ingredientFat.value = '';
    renderIngredients();
  }

  function saveDish(event) {
    event.preventDefault();
    const name = refs.dishName.value.trim();
    if (!name) {
      alert('Podaj nazwę dania.');
      return;
    }
    if (!draftIngredients.length) {
      alert('Dodaj co najmniej jeden składnik.');
      return;
    }

    state.s.dishes.push({
      id: dishId(),
      name,
      ingredients: draftIngredients.map((item) => ({ ...item })),
    });
    store.save(state.s);
    closeDialog(refs.dlgDishForm);
    openDishes();
  }

  function openUseDish(dish) {
    usingDishId = dish.id;
    refs.useDishName.textContent = dish.name;
    refs.useDishMeal.value = 'other';
    refs.useDishPreview.textContent = totalsText(totalsFor(dish.ingredients || []));
    closeDialog(refs.dlgDishes);
    openDialog(refs.dlgDishUse);
  }

  function addDishEntry(event) {
    event.preventDefault();
    const dish = getDish(usingDishId);
    if (!dish) {
      alert('Nie znaleziono dania.');
      return;
    }
    if (!(dish.ingredients || []).length) {
      alert('Danie nie ma składników.');
      return;
    }

    const totals = totalsFor(dish.ingredients || []);
    const grams = totals.grams > 0 ? totals.grams : 100;
    addEntry({
      name: dish.name,
      grams,
      meal: normalizeMeal(refs.useDishMeal.value),
      kcal100: +(totals.kcal / grams * 100).toFixed(1),
      prot100: +(totals.prot / grams * 100).toFixed(1),
      carb100: +(totals.carb / grams * 100).toFixed(1),
      fat100: +(totals.fat / grams * 100).toFixed(1),
    });
    closeDialog(refs.dlgDishUse);
  }

  function bindEvents() {
    document.getElementById('btnNewDish').addEventListener('click', openDishForm);
    document.getElementById('btnAddDishIngredient').addEventListener('click', addIngredient);
    refs.dishForm.addEventListener('submit', saveDish);
    refs.dishUseForm.addEventListener('submit', addDishEntry);

    for (const field of refs.ingredientFields) {
      field.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        addIngredient();
      });
    }

    refs.ingredientList.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button || button.dataset.action !== 'del-ingredient') return;
      draftIngredients.splice(+button.dataset.idx, 1);
      renderIngredients();
    });

    refs.dishList.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const dish = getDish(button.dataset.id);
      if (!dish) return;

      if (button.dataset.action === 'use') {
        openUseDish(dish);
      }
      if (button.dataset.action === 'del') {
        state.s.dishes = state.s.dishes.filter((item) => item.id !== dish.id);
        store.save(state.s);
        renderDishes();
      }
    });

    refs.dlgDishUse.addEventListener('close', () => {
      usingDishId = null;
    });
  }

  return {
    bindEvents,
    openDishes,
  };
}
