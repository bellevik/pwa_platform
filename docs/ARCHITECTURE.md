# Architecture

## Product Model

The platform is a self-hosted PWA host that runs on a Mac Mini and serves:

- a shell PWA at `/`
- isolated apps at `/<slug>/`
- app APIs at `/api/<slug>/` when an app has a backend

The primary workflow is:

1. A new app idea is planned.
2. A new app is generated from the template.
3. The app is registered through generated metadata.
4. The app appears in the shell homescreen.
5. The app is opened and installed as its own PWA.

## Locked V1 Decisions

- Monorepo layout
- `pnpm` workspaces
- Node 22 LTS
- React + TypeScript + Vite for shell and app frontends
- `vite-plugin-pwa` for shell and app PWAs
- IndexedDB via Dexie for local offline state and sync queues
- Fastify for app backends
- SQLite per app for server persistence
- Caddy as the reverse proxy and static file server
- Docker Compose for runtime orchestration
- Runtime-fetched app registry with cached offline snapshot
- Frontend-only apps are static; only apps with `hasBackend: true` run backend services

## Design Principles

1. Strict app isolation
2. Template-first app generation
3. Offline-first app behavior after first successful load
4. Registry-driven shell
5. Controlled rebuild and restart flows
6. Remote-agent-safe repository boundaries

## Repository Shape

```text
docs/
generated/
ops/
scripts/
shared/
shell/
templates/
apps/
```

Detailed folder responsibilities are defined in `docs/CONTRIBUTING_FOR_AGENTS.md`.

## Ownership Boundaries

### Shell owns

- homescreen UI
- app tile rendering
- registry loading and offline registry snapshot
- shell installability and shell asset caching

### Apps own

- route-local UI and business logic
- app-specific manifest, service worker, and icons
- IndexedDB schema and local data model
- sync rules and sync queue usage
- backend and SQLite schema if needed

### Shared owns

- reusable types and contracts
- reusable Dexie helpers
- reusable sync helpers
- low-level UI primitives if later needed

## Route Model

Trailing slashes are mandatory.

- Shell: `/`
- App frontend: `/<slug>/`
- App API: `/api/<slug>/`
- App manifest: `/<slug>/manifest.webmanifest`
- App service worker: `/<slug>/sw.js`

This is required to keep installability, scope handling, and asset loading predictable on iOS.

## Registry Model

The canonical source for app discovery is `apps/*/app.config.json`.

Generation flow:

1. Scan app folders for `app.config.json`.
2. Validate each config against the schema.
3. Emit `generated/app-registry.json`.
4. Serve that file as static JSON.
5. Have the shell fetch it at runtime and cache the last valid snapshot.

The shell must never hardcode app routes or app metadata.

## Runtime Model

### Static-only app

- built frontend assets only
- no dedicated backend process
- served directly by Caddy from build output

### Backend-enabled app

- built frontend assets
- one Fastify service
- one SQLite database stored under `apps/<slug>/data/`
- Caddy reverse-proxies `/api/<slug>/` to the app backend

This keeps the platform lightweight while preserving full app isolation.

## PWA Scope Rules

### Shell

- route: `/`
- start URL: `/`
- manifest path: `/manifest.webmanifest`
- service worker path: `/sw.js`
- scope: `/`

### App

- route: `/<slug>/`
- start URL: `/<slug>/`
- manifest path: `/<slug>/manifest.webmanifest`
- service worker path: `/<slug>/sw.js`
- scope: `/<slug>/`

Every app must behave like an independent PWA under its own route. Shared manifest tricks are not allowed.

## Offline Model

After the first successful online load, the shell and every app must reopen offline.

- the shell caches its assets and the last valid registry snapshot
- each app caches its own assets within its own route scope
- each app persists local state and pending operations in IndexedDB
- each backend-enabled app persists canonical state in its own SQLite database

## Sync Model

- local-first writes
- operation queue in IndexedDB
- automatic retry on reconnect
- idempotent backend apply keyed by operation ID
- full canonical state returned after sync in V1
- last-write-wins conflict policy for single-user multi-device use

See `docs/OFFLINE_SYNC.md` for the exact sync contract.

## Acceptance Bar For Architecture Phase

The architecture is considered locked when:

- routes and scopes are fully defined
- app ownership boundaries are documented
- runtime and service model are documented
- offline and sync behavior are documented
- no shell rebuild is required for simple app registration updates
