export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch (error) {
    console.log('SW register failed:', error);
  }
}

export function setupInstallPrompt(button) {
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    button.style.display = 'inline-flex';
  });

  button.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch (_) {
      // Browser may reject if the prompt was dismissed externally.
    }
    deferredPrompt = null;
    button.style.display = 'none';
  });
}
