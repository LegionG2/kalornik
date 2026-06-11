export function createBackup({ state, store, openDialog, closeDialog, refresh, refs }) {
  const REQUIRED_KEYS = ['goals', 'entries', 'favs', 'products'];

  function setStatus(message) {
    refs.backupStatus.textContent = message;
  }

  function backupDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function validateBackup(data) {
    if (!isObject(data)) return false;
    if (!REQUIRED_KEYS.every((key) => Object.prototype.hasOwnProperty.call(data, key))) return false;
    if (!isObject(data.goals)) return false;
    if (!isObject(data.entries)) return false;
    if (!Array.isArray(data.favs)) return false;
    if (!Array.isArray(data.products)) return false;
    return true;
  }

  function normalizeBackup(data) {
    return {
      ...data,
      goals: data.goals,
      entries: data.entries,
      favs: data.favs,
      products: data.products,
    };
  }

  function exportData() {
    const data = JSON.stringify(state.s, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kalornik-backup-${backupDate()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Eksport zakończony.');
  }

  function importData(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        const data = JSON.parse(String(reader.result || ''));
        if (!validateBackup(data)) {
          setStatus('Błąd importu: plik nie wygląda jak backup Kalornika.');
          alert('Błąd importu: plik nie wygląda jak backup Kalornika.');
          return;
        }

        const confirmed = confirm('Import danych nadpisze obecne dane aplikacji. Czy kontynuować?');
        if (!confirmed) {
          setStatus('Import anulowany.');
          return;
        }

        state.s = normalizeBackup(data);
        store.save(state.s);
        refresh();
        closeDialog(refs.dlgBackup);
        alert('Import zakończony.');
      } catch (_) {
        setStatus('Błąd importu: plik nie jest poprawnym JSON-em.');
        alert('Błąd importu: plik nie jest poprawnym JSON-em.');
      } finally {
        refs.backupFile.value = '';
      }
    });

    reader.addEventListener('error', () => {
      refs.backupFile.value = '';
      setStatus('Błąd importu: nie udało się odczytać pliku.');
      alert('Błąd importu: nie udało się odczytać pliku.');
    });

    reader.readAsText(file);
  }

  function openBackup() {
    setStatus('Eksport zapisze kopię danych aplikacji do pliku JSON.');
    openDialog(refs.dlgBackup);
  }

  function bindEvents() {
    document.getElementById('btnExportData').addEventListener('click', exportData);
    document.getElementById('btnImportData').addEventListener('click', () => refs.backupFile.click());
    refs.backupFile.addEventListener('change', () => importData(refs.backupFile.files?.[0]));
  }

  return {
    bindEvents,
    openBackup,
  };
}
