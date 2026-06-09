# Kalornik

Kalornik to mała, framework-free PWA do lokalnego notowania kalorii, makroskładników, dziennych wpisów, celów, ulubionych produktów, historii oraz produktów wyszukiwanych po kodzie EAN przez Open Food Facts.

## Uruchamianie lokalnie

Uruchom projekt z prostego lokalnego serwera HTTP, na przykład:

```powershell
python -m http.server 8000
```

Następnie otwórz:

```text
http://localhost:8000
```

## Struktura projektu

```text
index.html              Główny dokument i markup aplikacji
src/styles.css          Style aplikacji
src/app.js              Start aplikacji i centralny stan
src/storage.js          Warstwa localStorage
src/ui.js               Renderowanie i obsługa UI
src/scanner.js          Kamera, skaner EAN i Open Food Facts
src/pwa.js              Instalacja PWA i rejestracja service workera
sw.js                   Service worker i cache offline
manifest.webmanifest    Manifest PWA
icons/                  Ikony aplikacji
```

## Dane i offline-first

Kalornik jest obecnie aplikacją localStorage-based i offline-first. Dane użytkownika są zapisywane lokalnie w przeglądarce, bez kont, backendu i synchronizacji w chmurze.
