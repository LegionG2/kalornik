export function createProducts({ state, store, addEntry, openDialog, closeDialog, utils }) {
  const { n, fmt, esc, portionMacros } = utils;

  let editingProductId = null;
  let usingProductId = null;

  const refs = {
    dlgProducts: document.getElementById('modalProducts'),
    dlgProductForm: document.getElementById('modalProductForm'),
    dlgProductUse: document.getElementById('modalProductUse'),
    productList: document.getElementById('productList'),
    productTitle: document.getElementById('productModalTitle'),
    productName: document.getElementById('productName'),
    productK: document.getElementById('productKcal100'),
    productP: document.getElementById('productProt100'),
    productC: document.getElementById('productCarb100'),
    productF: document.getElementById('productFat100'),
    useProductName: document.getElementById('useProductName'),
    useProductGrams: document.getElementById('useProductGrams'),
    useProductPreview: document.getElementById('useProductPreview'),
  };

  function productId() {
    return crypto.randomUUID?.() || String(Date.now());
  }

  function productFromForm() {
    return {
      name: refs.productName.value.trim() || 'Produkt',
      kcal100: n(refs.productK.value),
      prot100: n(refs.productP.value),
      carb100: n(refs.productC.value),
      fat100: n(refs.productF.value),
    };
  }

  function getProduct(id) {
    return state.s.products.find((product) => product.id === id);
  }

  function renderProducts() {
    refs.productList.innerHTML = '';

    if (!state.s.products.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Brak własnych produktów.';
      refs.productList.appendChild(empty);
      return;
    }

    for (const product of state.s.products) {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `<div><h4>${esc(product.name)}</h4><div class="meta">100 g → ${fmt(n(product.kcal100), 0)} kcal • B ${fmt(n(product.prot100), 1)} g • W ${fmt(n(product.carb100), 1)} g • T ${fmt(n(product.fat100), 1)} g</div></div><div class="row" style="gap:6px"><button class="btn" data-action="use" data-id="${esc(product.id)}">Użyj</button><button class="btn" data-action="edit" data-id="${esc(product.id)}">Edytuj</button><button class="btn" data-action="del" data-id="${esc(product.id)}">Usuń</button></div>`;
      refs.productList.appendChild(row);
    }
  }

  function openProducts() {
    renderProducts();
    openDialog(refs.dlgProducts);
  }

  function openProductForm(product) {
    editingProductId = product?.id || null;
    refs.productTitle.textContent = editingProductId ? 'Edytuj produkt' : 'Dodaj produkt';
    refs.productName.value = product?.name || '';
    refs.productK.value = product?.kcal100 ?? '';
    refs.productP.value = product?.prot100 ?? '';
    refs.productC.value = product?.carb100 ?? '';
    refs.productF.value = product?.fat100 ?? '';
    closeDialog(refs.dlgProducts);
    openDialog(refs.dlgProductForm);
  }

  function saveProduct(event) {
    event.preventDefault();
    const product = productFromForm();
    if (!(product.kcal100 || product.prot100 || product.carb100 || product.fat100)) {
      alert('Uzupełnij wartości dla 100 g');
      return;
    }

    if (editingProductId) {
      const index = state.s.products.findIndex((item) => item.id === editingProductId);
      if (index >= 0) {
        state.s.products[index] = { ...state.s.products[index], ...product };
      }
    } else {
      state.s.products.push({ id: productId(), ...product });
    }

    store.save(state.s);
    editingProductId = null;
    renderProducts();
    closeDialog(refs.dlgProductForm);
    openDialog(refs.dlgProducts);
  }

  function openUseProduct(product) {
    usingProductId = product.id;
    refs.useProductName.textContent = product.name;
    refs.useProductGrams.value = '';
    refs.useProductPreview.textContent = 'Makra porcji pojawią się tutaj…';
    closeDialog(refs.dlgProducts);
    openDialog(refs.dlgProductUse);
  }

  function recalcUseProduct() {
    const product = getProduct(usingProductId);
    const grams = n(refs.useProductGrams.value);
    if (!product) {
      refs.useProductPreview.textContent = 'Nie znaleziono produktu.';
      return;
    }

    const macros = portionMacros({ kcal: product.kcal100, prot: product.prot100, carb: product.carb100, fat: product.fat100 }, grams);
    refs.useProductPreview.textContent = `${grams} g → ${macros.kcal} kcal • B ${fmt(macros.prot, 1)} g • W ${fmt(macros.carb, 1)} g • T ${fmt(macros.fat, 1)} g`;
  }

  function addProductEntry(event) {
    event.preventDefault();
    const product = getProduct(usingProductId);
    const grams = n(refs.useProductGrams.value);
    if (!product) {
      alert('Nie znaleziono produktu.');
      return;
    }
    if (grams <= 0) {
      alert('Podaj gramaturę porcji.');
      return;
    }

    addEntry({
      name: product.name,
      grams,
      kcal100: n(product.kcal100),
      prot100: n(product.prot100),
      carb100: n(product.carb100),
      fat100: n(product.fat100),
    });
    closeDialog(refs.dlgProductUse);
  }

  function bindEvents() {
    document.getElementById('btnNewProduct').addEventListener('click', () => openProductForm());
    document.getElementById('btnSaveProduct').addEventListener('click', saveProduct);
    document.getElementById('btnAddProductEntry').addEventListener('click', addProductEntry);
    refs.useProductGrams.addEventListener('input', recalcUseProduct);

    refs.productList.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const product = getProduct(button.dataset.id);
      if (!product) return;

      if (button.dataset.action === 'use') {
        openUseProduct(product);
      }
      if (button.dataset.action === 'edit') {
        openProductForm(product);
      }
      if (button.dataset.action === 'del') {
        state.s.products = state.s.products.filter((item) => item.id !== product.id);
        store.save(state.s);
        renderProducts();
      }
    });

    refs.dlgProductForm.addEventListener('close', () => {
      editingProductId = null;
    });
    refs.dlgProductUse.addEventListener('close', () => {
      usingProductId = null;
    });
  }

  return {
    bindEvents,
    openProducts,
  };
}
