export function createScanner({ state, refs, addEntry, openDialog, closeDialog, utils }) {
  const { n, fmt, portionMacros, isSecureContextLike } = utils;

  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        refs.scanStatus.textContent = 'Twoja przeglądarka nie obsługuje kamery (brak getUserMedia).';
        return false;
      }

      state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      refs.video.srcObject = state.stream;
      await refs.video.play().catch(() => {});

      if (refs.video.readyState < 2) {
        await new Promise((resolve) => refs.video.addEventListener('loadeddata', resolve, { once: true }));
      }

      refs.scanStatus.textContent = 'Kamera uruchomiona';
      return true;
    } catch (error) {
      const msg = error?.name || 'Brak dostępu do kamery';
      refs.scanStatus.textContent = 'Błąd kamery: ' + msg + (isSecureContextLike() ? '' : ' • Włącz HTTPS lub localhost');
      return false;
    }
  }

  async function stopCamera() {
    if (state.fallbackTimer) {
      clearTimeout(state.fallbackTimer);
      state.fallbackTimer = null;
    }
    if (state.zxing) {
      try {
        state.zxing.reset();
      } catch (_) {}
      state.zxing = null;
    }
    if (refs.video) {
      try {
        refs.video.pause();
      } catch (_) {}
      refs.video.srcObject = null;
    }
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }
    if (state.anim) {
      cancelAnimationFrame(state.anim);
      state.anim = null;
    }
    state.detector = null;
  }

  async function runScanner() {
    const supported = 'BarcodeDetector' in window
      && await BarcodeDetector.getSupportedFormats?.()
        .then((formats) => formats.includes('ean_13') || formats.includes('ean_8'))
        .catch(() => false);

    if (!supported) {
      refs.scanStatus.textContent = 'Brak wsparcia BarcodeDetector. Użyję fallbacku ZXing.';
      await runZXingFallback();
      return;
    }

    state.detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    if (refs.video.readyState < 2) {
      refs.scanStatus.textContent = 'Czekam na obraz z kamery…';
      await new Promise((resolve) => refs.video.addEventListener('loadeddata', resolve, { once: true }));
    }

    const detect = async () => {
      if (!state.detector) return;

      try {
        const codes = await state.detector.detect(refs.video);
        if (codes?.length) {
          await handleCode(codes[0].rawValue);
          return;
        }
      } catch (_) {
        // Some browsers throw on transient video frames; keep scanning.
      }
      state.anim = requestAnimationFrame(detect);
    };

    state.anim = requestAnimationFrame(detect);
  }

  async function runZXingFallback() {
    try {
      refs.scanStatus.textContent = 'Uruchamiam fallback ZXing…';
      const lib = await import('https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/+esm');
      const codeReader = new lib.BrowserMultiFormatReader();
      state.zxing = codeReader;

      await codeReader.decodeFromVideoDevice(null, refs.video, (result) => {
        if (result && !state.detected) {
          try {
            codeReader.reset();
          } catch (_) {}
          if (state.anim) {
            cancelAnimationFrame(state.anim);
            state.anim = null;
          }
          state.detector = null;
          handleCode(result.getText(), { force: true });
        }
      });

      refs.scanStatus.textContent = 'Fallback ZXing działa. Skieruj kod EAN na środek.';
    } catch (_) {
      refs.scanStatus.textContent = 'ZXing nie zadziałał. Użyj pola EAN.';
    }
  }

  async function openScan() {
    refs.scanResult.style.display = 'none';
    refs.offPreview.textContent = 'Makra porcji pojawią się tutaj…';
    refs.btnAddFromOFF.disabled = true;
    refs.scanStatus.textContent = 'Startuję skaner…';
    state.detected = false;
    openDialog(refs.dlgScan);

    if (!isSecureContextLike()) {
      refs.scanStatus.textContent = 'Skaner wymaga HTTPS lub localhost. Użyj pola EAN poniżej.';
      return;
    }

    const camOk = await startCamera();
    if (!camOk) return;

    await runScanner();

    if (!state.fallbackTimer) {
      state.fallbackTimer = setTimeout(() => {
        if (!state.detected && !state.zxing) runZXingFallback();
      }, 5000);
    }

    if (!('BarcodeDetector' in window)) {
      refs.scanStatus.textContent = 'Twoja przeglądarka nie obsługuje BarcodeDetector. Próbuję fallbacku ZXing…';
    } else {
      refs.scanStatus.textContent = 'Kamera gotowa. Skieruj kod EAN na środek kadru.';
    }
  }

  async function handleCode(code, options = {}) {
    const cleanCode = String(code || '').replace(/\D/g, '');
    if (!cleanCode) {
      refs.scanStatus.textContent = 'Wpisz poprawny kod EAN.';
      return;
    }
    if (state.detected && !options.force) return;

    state.detected = true;
    if (state.fallbackTimer) {
      clearTimeout(state.fallbackTimer);
      state.fallbackTimer = null;
    }
    if (state.anim) {
      cancelAnimationFrame(state.anim);
      state.anim = null;
    }
    state.detector = null;
    refs.scanStatus.textContent = `Znaleziono kod: ${cleanCode}. Pobieram z Open Food Facts…`;

    const data = await fetchOFF(cleanCode);
    if (!data) {
      state.detected = false;
      refs.scanStatus.textContent = 'Nie znaleziono produktu w Open Food Facts. Wpisz dane ręcznie.';
      return;
    }

    showOFFProduct(mapOFFProduct(data));
  }

  async function fetchOFF(code) {
    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const json = await resp.json();
      if (json && (json.status === 1 || json.product)) return json.product;
      return null;
    } catch (_) {
      return null;
    }
  }

  function mapOFFProduct(prod) {
    const nutr = prod.nutriments || {};
    const kcal100 = n(nutr['energy-kcal_100g'] ?? nutr['energy-kcal_value'] ?? 0);

    return {
      name: prod.product_name || prod.generic_name || 'Produkt',
      code: prod.code || '',
      kcal100,
      prot100: n(nutr['proteins_100g']),
      carb100: n(nutr['carbohydrates_100g']),
      fat100: n(nutr['fat_100g']),
    };
  }

  function showOFFProduct(product) {
    refs.scanResult.style.display = 'grid';
    refs.prodName.textContent = product.name;
    refs.prodCode.textContent = product.code;
    refs.offK.value = product.kcal100 || '';
    refs.offP.value = product.prot100 || '';
    refs.offC.value = product.carb100 || '';
    refs.offF.value = product.fat100 || '';
    refs.offPortion.value = '';
    refs.btnAddFromOFF.disabled = false;
    refs.scanStatus.textContent = 'Załadowano z Open Food Facts';
  }

  function recalcOFF() {
    const per100 = { kcal: n(refs.offK.value), prot: n(refs.offP.value), carb: n(refs.offC.value), fat: n(refs.offF.value) };
    const grams = n(refs.offPortion.value || 0);
    const macros = portionMacros(per100, grams);
    refs.offPreview.textContent = `${grams} g → ${macros.kcal} kcal • B ${fmt(macros.prot, 1)} g • W ${fmt(macros.carb, 1)} g • T ${fmt(macros.fat, 1)} g`;
  }

  function addFromOFF(event) {
    event.preventDefault();
    const grams = n(refs.offPortion.value);
    if (grams <= 0) {
      alert('Podaj gramaturę porcji.');
      return;
    }

    addEntry({
      name: refs.prodName.textContent,
      grams,
      kcal100: n(refs.offK.value),
      prot100: n(refs.offP.value),
      carb100: n(refs.offC.value),
      fat100: n(refs.offF.value),
    });
    closeDialog(refs.dlgScan);
    stopCamera();
  }

  return {
    openScan,
    stopCamera,
    handleCode,
    recalcOFF,
    addFromOFF,
  };
}
