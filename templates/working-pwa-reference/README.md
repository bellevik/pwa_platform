# Working PWA Reference

This folder is a non-registered, known-good reference built from the working `shopping-list` app.

It exists so future sessions can copy patterns from a PWA that already works for:

- shell discovery
- root and app-local icon handling
- installability
- offline/local-first behavior
- sync and canonical server state
- iPhone hostname-based HTTPS testing

For layout scaffolds, use:

- `templates/layout-presets/scrolling/` for content-first apps
- `templates/layout-presets/single-screen/` for fixed one-screen apps like calculators

## Important

- This folder is not an app and must not be added under `apps/`.
- It must not be registered in the shell.
- It is reference material for future sessions, not runtime content.

## What To Copy From Here

- `frontend/index.html` for mobile/PWA meta tags
- `frontend/vite.config.ts` for Vite + PWA setup
- `frontend/public/` for root-level app icon assets
- `frontend/src/` for a known-good local-first React structure
- `backend/src/app.mjs` for Fastify + SQLite sync patterns
- `backend/src/sync.test.mjs` for backend contract testing style
- `app.config.reference.json` for a working app config shape

## How To Use In A Future Session

If you start a fresh session to build a new app in a new folder, tell the model something like:

```text
Use `templates/working-pwa-reference/` as the known-good PWA reference.
Do not register or modify that reference directly.
Copy its proven patterns into my new app implementation.
```

## Reference Files

- `app.config.reference.json`
- `README.reference.md`
- `START.reference.sh`
- `STOP.reference.sh`
- `RESTART.reference.sh`
- `TEST.reference.sh`

Those files are snapshots of the working `shopping-list` app and should be adapted, not used verbatim in production.
