import { store } from './storage.js?v=5';
import { createUI } from './ui.js?v=5';
import { registerServiceWorker, setupInstallPrompt } from './pwa.js?v=5';

const state = {
  s: store.init(),
  stream: null,
  detector: null,
  anim: null,
  zxing: null,
  detected: false,
  fallbackTimer: null,
  editingId: null,
};

function init() {
  const ui = createUI({ state, store });
  ui.init();
  registerServiceWorker();
  setupInstallPrompt(document.getElementById('btnInstall'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
