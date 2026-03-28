# App Spec

## Purpose

Every app in this platform must conform to a standard folder contract, metadata contract, and runtime contract so that it can be created, rebuilt, restarted, and verified remotely.

## Required Folder Layout

```text
apps/<slug>/
  frontend/
  backend/
  data/
  icons/
  app.config.json
  README.md
  START.sh
  STOP.sh
  RESTART.sh
  TEST.sh
```

Notes:

- `backend/` may exist as a placeholder even for static-only apps
- `data/` must exist for backend-enabled apps and may exist for future local fixtures or exports
- every app must own its own icons and README

## App Config Contract

Every app must include `app.config.json` as the canonical metadata source.

### Required fields

- `schemaVersion`
- `slug`
- `name`
- `description`
- `route`
- `apiBase`
- `hasBackend`
- `hasDatabase`
- `database`
- `pwa`
- `offline`
- `icon`
- `themeColor`
- `backgroundColor`
- `version`

### Field rules

- `schemaVersion`: integer, starts at `1`
- `slug`: lowercase kebab-case unique app identifier
- `route`: must equal `/<slug>/`
- `apiBase`: must equal `/api/<slug>/`
- `hasBackend`: `true` or `false`
- `hasDatabase`: `true` only when server persistence is required
- `database`: `sqlite` when `hasDatabase` is `true`, otherwise `none`
- `pwa`: must be `true` for V1 apps
- `offline`: must be `true` for V1 apps
- `icon`: must resolve under the app route
- `version`: positive integer app config version

## Runtime Modes

### Static-only app

- `hasBackend: false`
- `hasDatabase: false`
- `database: "none"`
- served as static frontend only

### Backend-enabled app

- `hasBackend: true`
- `hasDatabase` may be `true`
- `database: "sqlite"` when canonical server persistence is required
- one Fastify service allowed for the app

## Frontend Contract

Each app frontend must:

- build under its route scope
- be installable from `/<slug>/`
- cache its own assets for offline use
- store local state in IndexedDB
- store pending sync operations in IndexedDB
- remain usable offline after first successful load

## Backend Contract

When `hasBackend` is `true`, the app backend must:

- expose app-local APIs under `/api/<slug>/`
- never access another app's database or state
- keep persistence inside the app folder boundary
- implement idempotent sync behavior for queued operations

## Data Contract

- local app state is authoritative while offline
- server state becomes canonical after successful sync
- entity IDs are generated client-side as UUIDs
- operation IDs are generated client-side as UUIDs

## Lifecycle Scripts

Each app must provide:

- `START.sh`
- `STOP.sh`
- `RESTART.sh`
- `TEST.sh`

All scripts must be non-interactive, safe for remote execution, and return meaningful exit codes.

## App README Requirements

Each app `README.md` must document:

- purpose of the app
- route and API base
- frontend structure
- backend structure if present
- local data model
- sync model
- test and verification commands

## V1 Minimum Acceptance Criteria

Every V1 app must prove:

1. The app route loads.
2. The app is installable as its own PWA.
3. The app reopens offline after first online load.
4. Core app actions work offline.
5. Offline changes survive refresh or reopen.
6. Pending changes sync when connectivity returns.
