# Session Prompt For New Apps

Use this prompt in a fresh coding session when you want a new app to follow the proven PWA patterns from this repository.

## Copy/Paste Prompt

```text
Build my new app using `templates/working-pwa-reference/` as the known-good PWA reference.

Important rules:
- Do not register or modify `templates/working-pwa-reference/` directly.
- Use it only as a working implementation reference.
- Preserve the proven PWA/install/offline patterns from that reference.
- Preserve the proven iPhone-compatible icon/meta patterns from that reference.
- Keep the new app isolated in its own folder and route scope.
- Follow the platform conventions already used in this repo.

What to copy conceptually from the reference:
- `frontend/index.html` for PWA/iPhone meta tags
- `frontend/vite.config.ts` for Vite + PWA manifest setup
- `frontend/public/` for root-level icon assets
- `frontend/src/` for local-first UI/state structure
- `backend/src/app.mjs` for Fastify + SQLite sync patterns if the app needs a backend
- `app.config.reference.json` for metadata shape

For this task:
- create a new app in the target folder
- adapt names, routes, icons, and UI to the new app
- do not leave shopping-list-specific labels or logic in place
- ensure the app builds and verifies cleanly
```

## Recommended Extra Instruction

If the new app is frontend-only, add this line to the session prompt:

```text
This app is static-only and should not include backend or sync logic unless explicitly needed.
```

If the new app needs local-first sync, add this line:

```text
This app should follow the local-first offline/sync patterns used by the shopping-list reference.
```
