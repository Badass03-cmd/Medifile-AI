# MediFile AI

Static web app, no build step. Open `index.html` in a browser (or serve the folder with any static server).
Data stays in the browser (localStorage).

## Structure

- `index.html` – page markup; loads the CSS and JS files below
- `css/` – `base.css` -> `palette.css` -> `polish.css` -> `pages.css` (later files override earlier ones)
- `core/` – `logo.js`, `translations.js`, `data.js`, `helpers.js`, `i18n-extra.js`, `main.js` (startup)
- `ui/` – `views.js`, `events-core.js`, `events-fhir.js`
- `features/` – `assistant.js`, `chat-kb.js`, `scanner.js`, `review-fhir.js`, `vitals-extras.js`, `reminders.js`, `mood-chat.js`
- `accounts/` – `accounts.js`, `login-share.js`
- The scripts share one global scope, so the order of the `<script>` tags in `index.html` matters; don't reorder them.

## Demo accounts

`demo-patient`, `DR-1001`, `HOSP-2001` (local demo only, no server).
