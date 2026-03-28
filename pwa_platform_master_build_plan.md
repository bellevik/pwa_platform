# Modular Hot-Swap PWA Platform - Master Build Plan

## Purpose

Build a self-hosted, modular, offline-capable PWA platform hosted on a Mac Mini. The platform must expose a fake iOS-style homescreen at the root route and allow each app to live under its own route, be installable as its own PWA, work offline, and sync back to the Mac Mini when connectivity returns.

This plan is written for OpenCode running with GPT 5.4 or newer, and is designed for remote execution through the OpenCode web interface with minimal manual intervention.

---

## Core Product Goal

Create an always-on local platform where the workflow becomes:

1. User gets an idea for a new app.
2. User asks ChatGPT or OpenCode for a plan/spec for that app.
3. User creates a new project in the OpenCode web interface remotely.
4. OpenCode builds the app inside the platform's modular structure.
5. The new app is registered into the platform and appears on the fake homescreen.
6. The user opens the app route on their phone and saves it to the real iPhone home screen as a PWA.

The platform must be designed around this workflow from day one.

---

## Non-Goals for V1

The following are explicitly excluded from the first version unless needed structurally:

- Public internet exposure
- Advanced authentication and authorization
- External TLS/domain setup for internet access
- Multi-user account systems
- Push notifications
- Advanced real-time collaboration
- Zero-downtime dynamic plugin loading without restarts

Security must be left architecturally possible later, but not implemented now.

---

## High-Level Requirements

### Functional Requirements

1. The platform runs as an always-on service on a Mac Mini.
2. The root route `/` acts as an installable PWA homescreen with an iOS-inspired app grid.
3. Each app is accessible under its own route, for example `/shopping-list/`.
4. Each app can also be installed independently as its own PWA.
5. The homescreen and every app must work offline.
6. Each app must be self-contained in its own folder inside the platform.
7. Each app can have its own frontend, backend, and database.
8. Each app's server-side persistence should be isolated from other apps.
9. The platform must support adding new apps with a controlled rebuild/restart flow.
10. OpenCode must be able to create, modify, rebuild, restart, and verify apps remotely.
11. The shell must automatically discover or regenerate app registration metadata.
12. A baseline example app, Shopping List, must be implemented to prove the architecture.

### Operational Requirements

1. Remote management must work from OpenCode web without expecting the user to sit at the Mac Mini.
2. Scripts and service contracts must be deterministic and standardized.
3. Restarts are acceptable when adding a new app.
4. The system should support partial rebuild/restart of a single app where possible.
5. Health checks and verification scripts must exist.
6. Logs must make failures easy to debug.

### Offline Requirements

1. The shell must open while offline.
2. Each app must open while offline.
3. App state changes must be stored locally while offline.
4. Local offline changes must sync when network access returns.
5. Offline edits must survive refresh/reopen.

---

## Recommended Technical Direction

### Frontend

- React
- TypeScript
- Vite
- React Router
- `vite-plugin-pwa`
- Dexie for IndexedDB

### Backend

Preferred recommendation for V1:

- Node.js
- Fastify

Rationale:

- Clean modular JSON APIs
- Easy app-specific backend setup
- Fast startup
- Good fit with TypeScript frontend tooling
- Easy SQLite integration

Alternative allowed if later chosen deliberately:

- Python + FastAPI

### Database

- SQLite per app on the server side
- IndexedDB per app on the client side for offline state + sync queue

### Routing / Serving

- Caddy as reverse proxy
- Static frontend serving where possible
- Optional backend service per app

### Runtime / Orchestration

- Docker Compose for platform services
- Standardized scripts for build/restart/test/register

---

## Architectural Principles

1. **Strict app isolation**
   - Each app owns its own code, config, storage, and server persistence.
   - The shell must not contain business logic for apps.

2. **Template-first app generation**
   - New apps must be created from a standard template, not improvised from scratch.

3. **Offline-first by design**
   - Offline support is a built-in contract, not an optional future enhancement.

4. **Registry-driven shell**
   - The shell renders discovered apps from generated metadata.

5. **Controlled restart over fake magic**
   - App additions can trigger rebuild/restart. Full live hot-plugging is not required in V1.

6. **Remote-agent operability**
   - OpenCode must be able to work on the platform or on a single app without confusion.

7. **Monorepo with hard boundaries**
   - One repository, but with explicit shell/app/shared separation.

---

## Repository Structure

```text
pwa-platform/
  shell/
    src/
    public/
    scripts/
    package.json
    vite.config.ts
    manifest files

  apps/
    shopping-list/
      frontend/
      backend/
      data/
      icons/
      app.config.json
      START.sh
      STOP.sh
      RESTART.sh
      TEST.sh
      README.md

    <future-app>/
      frontend/
      backend/
      data/
      icons/
      app.config.json
      START.sh
      STOP.sh
      RESTART.sh
      TEST.sh
      README.md

  shared/
    contracts/
    ui/
    offline/
    tooling/

  generated/
    app-registry.json

  scripts/
    CREATE_APP.sh
    REGISTER_APPS.sh
    BUILD_ALL.sh
    START_ALL.sh
    STOP_ALL.sh
    RESTART_ALL.sh
    REBUILD_APP.sh
    RESTART_APP.sh
    TEST_ALL.sh
    TEST_APP.sh
    VERIFY_PLATFORM.sh
    VERIFY_APP.sh

  ops/
    docker-compose.yml
    caddy/
      Caddyfile
    healthchecks/

  docs/
    ARCHITECTURE.md
    APP_SPEC.md
    OPERATIONS.md
    OFFLINE_SYNC.md
    CONTRIBUTING_FOR_AGENTS.md

  templates/
    app-template/
      frontend/
      backend/
      app.config.json
      README.md
      START.sh
      STOP.sh
      RESTART.sh
      TEST.sh

  package.json or workspace config
  README.md
```

---

## Platform Responsibilities

### Shell Responsibilities

The shell at `/` is responsible for:

- Showing an iOS-style homescreen UI
- Reading the generated app registry
- Displaying installed/available apps as tiles/icons
- Linking to app routes
- Being installable as a PWA itself
- Loading offline with cached assets and registry snapshot

The shell must **not**:

- Own app-specific business logic
- Access app databases directly
- Become a giant god-object frontend

### App Responsibilities

Each app is responsible for:

- Its own route and route-local frontend
- Its own PWA manifest, icons, and service worker setup
- Its own frontend state
- Its own local offline data model
- Its own sync queue and sync logic
- Its own backend API if needed
- Its own SQLite database if needed
- Its own tests and restart scripts

---

## App Route Model

Use trailing-slash route conventions consistently.

Examples:

- Shell: `/`
- Shopping List app: `/shopping-list/`
- Shopping List backend API: `/api/shopping-list/`

This consistency matters for:

- PWA scope correctness
- service worker scoping
- asset loading
- installability on iOS
- cleaner reverse proxy routing

---

## App Config Contract

Every app must include an `app.config.json` file.

Example:

```json
{
  "slug": "shopping-list",
  "name": "Shopping List",
  "description": "Offline-first shopping list app",
  "route": "/shopping-list/",
  "apiBase": "/api/shopping-list/",
  "hasBackend": true,
  "hasDatabase": true,
  "database": "sqlite",
  "pwa": true,
  "offline": true,
  "icon": "/shopping-list/icons/app-192.png",
  "themeColor": "#101010",
  "backgroundColor": "#ffffff",
  "version": 1
}
```

### Required fields

- `slug`
- `name`
- `route`
- `pwa`
- `offline`
- `icon`
- `hasBackend`
- `hasDatabase`

The shell and registry generator must trust this file as the canonical app metadata source.

---

## Registry Model

### Recommendation

Use **folder scanning + generated registry JSON**.

### Flow

1. Scan `apps/*/app.config.json`
2. Validate each app config
3. Generate `generated/app-registry.json`
4. The shell reads `generated/app-registry.json`
5. Caddy and/or app routing scripts use the same discovery model

### Why this model

- Avoids manual route bookkeeping
- Lets OpenCode add an app with predictable structure
- Reduces platform drift
- Keeps the shell dumb and reliable

---

## Offline Data and Sync Model

### V1 Standard

Each app uses a two-layer storage model:

#### On device/client

- IndexedDB for local persistent data
- IndexedDB for pending sync queue
- Service worker for offline shell/assets

#### On server/Mac Mini

- SQLite for canonical persisted app data

### Sync Strategy

Use an **operation queue** instead of naive full-state overwrite.

Each local action creates a syncable operation, for example:

```json
{
  "id": "op_001",
  "type": "item_add",
  "entityId": "item_123",
  "payload": {
    "text": "Milk"
  },
  "createdAt": "2026-03-28T10:00:00Z",
  "status": "pending"
}
```

### Sync lifecycle

1. User performs action offline or online.
2. App writes local state immediately.
3. App appends an operation to pending sync queue.
4. When online, app sends unsynced ops to backend.
5. Backend applies ops idempotently.
6. Backend returns acknowledgements and canonical latest state.
7. Client marks ops synced and reconciles local state.

### Conflict policy for V1

Keep it simple:

- Single-user, multi-device assumptions
- Last write wins for edits
- Idempotent create/delete behavior
- UUIDs per entity and per operation

Do not implement CRDTs in V1.

---

## PWA Requirements

### Shell PWA

The shell must include:

- `manifest.webmanifest`
- icons
- service worker
- offline asset caching
- start URL `/`
- installability on iPhone

### Each App PWA

Every app must include:

- app-specific manifest
- app-specific icons
- service worker scoped to app route
- proper base path configuration
- start URL for that app route
- installability from `/<app-slug>/`

### Important Note

Each app must behave like a real independent PWA under its own route and scope. This is a major design constraint and should not be hacked around with fragile shared manifest logic.

---

## Recommended Runtime Model

### Components

1. **Caddy reverse proxy**
2. **Shell frontend service**
3. **Per-app frontend build output**
4. **Optional per-app backend services**
5. **SQLite files stored within each app's data area**

### Routing example

- `/` -> shell frontend
- `/shopping-list/` -> shopping-list frontend
- `/api/shopping-list/*` -> shopping-list backend

### Recommendation for V1 app hosting

- Serve app frontends as static builds where possible
- Run backend only for apps that need it

This keeps resource usage down and avoids unnecessary moving parts.

---

## Docker / Service Strategy

### Use Docker Compose

Why:

- Repeatable startup/restart behavior
- Remote friendly for OpenCode
- Easy app-specific rebuilds
- Cleaner future deployment path
- Service contracts are explicit

### Compose responsibilities

- Reverse proxy
- Shell frontend serving
- Any app backend services
- Optional internal helper services if needed later

### Resource goals

The platform should be lightweight enough for a Mac Mini home server use case and avoid running unnecessary backends for frontend-only apps.

---

## Script Contracts

All scripts must be idempotent where possible.

### Root scripts

- `scripts/CREATE_APP.sh <slug>`
- `scripts/REGISTER_APPS.sh`
- `scripts/BUILD_ALL.sh`
- `scripts/START_ALL.sh`
- `scripts/STOP_ALL.sh`
- `scripts/RESTART_ALL.sh`
- `scripts/REBUILD_APP.sh <slug>`
- `scripts/RESTART_APP.sh <slug>`
- `scripts/TEST_ALL.sh`
- `scripts/TEST_APP.sh <slug>`
- `scripts/VERIFY_PLATFORM.sh`
- `scripts/VERIFY_APP.sh <slug>`

### Per-app scripts

- `START.sh`
- `STOP.sh`
- `RESTART.sh`
- `TEST.sh`

### Minimum requirements for all scripts

- Non-interactive
- Clear exit codes
- Log useful output
- Safe for remote execution
- Avoid requiring manual editor use

---

## OpenCode Compatibility Rules

This repository must be easy for OpenCode to work on remotely.

### Required guardrails

1. Working on `shell/` should only change shell/base platform code.
2. Working on `apps/<slug>/` should only change that app unless the task explicitly requires shared/platform edits.
3. `docs/CONTRIBUTING_FOR_AGENTS.md` must explain boundaries clearly.
4. Every app must have a clear README describing how it is structured and tested.
5. New app creation must use a template generator script.
6. Verification scripts must confirm that changes actually work.

### Why this matters

Without strict boundaries, an agent will eventually decide your grocery list app should refactor your routing layer, and then everyone gets to enjoy a charming little disaster.

---

## Logging and Verification

### Platform-level verification

`VERIFY_PLATFORM.sh` should verify at minimum:

- Shell route responds
- Generated app registry exists and is valid JSON
- Proxy is running
- Each registered route is reachable
- Shell assets load
- Shell manifest exists
- Shell service worker exists

### App-level verification

`VERIFY_APP.sh <slug>` should verify at minimum:

- App config is valid
- App route responds
- App manifest exists
- App service worker exists
- App frontend builds
- App backend responds if present
- App database path exists if required

### Logging expectations

- Scripts should emit useful plain logs
- Startup failures should be easy to identify
- App verification should produce actionable errors

---

## Example App: Shopping List

The first real app should prove the platform architecture.

### Purpose

Demonstrate a self-contained app that has:

- frontend
- backend
- local offline storage
- server persistence
- sync behavior
- independent route/PWA installability

### V1 Features

- View shopping list items
- Add item
- Mark item complete/incomplete
- Delete item
- Persist locally offline
- Queue changes offline
- Sync when online
- Persist canonical state in app-specific SQLite DB on Mac Mini

### V1 Assumptions

- Single user
- Multiple devices allowed on same LAN
- Simple list structure only
- No account system
- No shared invites/collaboration yet

### Shopping list acceptance criteria

1. `/shopping-list/` loads in browser
2. It can be added to iPhone home screen as a PWA
3. It opens offline after first install/load
4. Items can be added offline
5. Offline changes survive refresh/reopen
6. When back online, changes sync to backend
7. Reloading from another device on the same LAN shows synced canonical state
8. App data is isolated to its own folder and database

---

## Phased Build Plan

# Phase 0 - Lock Decisions and Contracts

### Goal

Make the architecture explicit before implementation begins.

### Deliverables

- `docs/ARCHITECTURE.md`
- `docs/APP_SPEC.md`
- `docs/OFFLINE_SYNC.md`
- `docs/OPERATIONS.md`
- `docs/CONTRIBUTING_FOR_AGENTS.md`

### Decisions to lock

- Monorepo structure
- Route conventions
- App folder contract
- App config schema
- Registry generation model
- PWA scope strategy
- IndexedDB + sync queue standard
- SQLite-per-app rule
- Docker Compose usage
- Root/per-app script contract

### Acceptance criteria

- Docs are complete and consistent
- Another agent can understand the platform without guessing
- No major unresolved architectural ambiguity remains

---

# Phase 1 - Bootstrap Repository Skeleton

### Goal

Create the initial repo layout with empty but valid platform structure.

### Tasks

- Create repo folders
- Add shell scaffold
- Add apps folder
- Add templates folder
- Add generated folder
- Add scripts folder
- Add ops folder
- Add docs folder
- Add workspace/package configuration

### Acceptance criteria

- Repo structure matches architecture docs
- Shell can be started in basic placeholder form
- Root scripts exist as placeholders or first implementation

---

# Phase 2 - Implement Base Shell

### Goal

Build the fake iOS-style homescreen shell at `/`.

### Tasks

- Build shell frontend using React + TypeScript + Vite
- Create homescreen icon grid UI
- Read generated app registry JSON
- Render app tiles with route links
- Add app metadata display support
- Add shell offline handling

### Acceptance criteria

- Visiting `/` shows homescreen shell
- Shell renders app tiles from registry
- UI still loads after first visit when offline

---

# Phase 3 - Implement Shell PWA

### Goal

Make the shell independently installable as a PWA.

### Tasks

- Add shell manifest
- Add shell icons
- Add service worker
- Configure `vite-plugin-pwa`
- Ensure installability and offline asset caching
- Confirm base path and scope behavior

### Acceptance criteria

- Shell can be installed to iPhone home screen
- Shell opens offline after being cached
- Manifest and service worker are correctly served

---

# Phase 4 - Build App Template System

### Goal

Standardize future app creation.

### Tasks

- Create `templates/app-template/`
- Include template frontend
- Include template backend
- Include app manifest and service worker skeleton
- Include `app.config.json` template
- Include per-app scripts
- Implement `scripts/CREATE_APP.sh <slug>`

### Acceptance criteria

- Running app creation script generates a valid new app folder
- New app has required files and contracts
- Generated app can be built with minimal edits

---

# Phase 5 - Implement Registry Generation and App Discovery

### Goal

Automatically discover apps and expose them to the shell.

### Tasks

- Implement scan of `apps/*/app.config.json`
- Validate config structure
- Generate `generated/app-registry.json`
- Wire shell to consume generated registry
- Add script to rebuild registry

### Acceptance criteria

- Adding a valid app config causes it to appear in generated registry
- Shell reflects new app after rebuild/restart
- Invalid app configs fail clearly

---

# Phase 6 - Implement Reverse Proxy and Route Model

### Goal

Ensure root shell and app routes behave consistently.

### Tasks

- Configure Caddy
- Serve shell route at `/`
- Route app paths like `/<slug>/`
- Route app APIs like `/api/<slug>/`
- Ensure static asset serving works with subpaths
- Ensure trailing slash behavior is consistent

### Acceptance criteria

- Shell route works
- App route works
- API route works when backend exists
- Assets load correctly under nested route scopes

---

# Phase 7 - Implement Shared Offline Framework

### Goal

Create a reusable offline-first app contract.

### Tasks

- Create shared IndexedDB helpers
- Create sync queue utilities
- Create online/offline detection helpers
- Create operation queue contract
- Define sync API shape
- Document expected backend sync behavior

### Acceptance criteria

- Shared offline utilities can be used from any app
- Local changes persist across refresh/reopen
- Pending sync queue survives offline periods

---

# Phase 8 - Build Shopping List App

### Goal

Prove the architecture with a real self-contained app.

### Tasks

- Generate `apps/shopping-list/`
- Build list UI
- Build IndexedDB local store
- Build pending ops queue
- Build Fastify backend
- Build SQLite persistence
- Build sync endpoint(s)
- Build app-specific PWA setup

### Acceptance criteria

- Shopping List works at `/shopping-list/`
- Can add/edit/delete items locally
- Works while offline
- Syncs when online
- Persists canonically in app SQLite DB
- Is installable as its own PWA

---

# Phase 9 - Implement Platform Operations Scripts

### Goal

Make remote management safe and boring.

### Tasks

- Implement build scripts
- Implement restart scripts
- Implement per-app rebuild/restart scripts
- Implement verification scripts
- Ensure everything is non-interactive

### Acceptance criteria

- OpenCode can rebuild and restart platform remotely
- OpenCode can rebuild and restart a single app remotely
- Failures return useful errors

---

# Phase 10 - Harden for Remote Agent Use

### Goal

Reduce agent mistakes and platform drift.

### Tasks

- Improve docs for agents
- Add clear code ownership boundaries
- Add lint/typecheck/test wiring
- Add app config validation tests
- Add route verification tests
- Add rollback-safe restart behavior where practical

### Acceptance criteria

- Working on one app does not unintentionally damage others
- Agents have enough docs to operate without guessing
- The system is stable enough for repeated app generation cycles

---

# Phase 11 - First End-to-End Creation Flow Test

### Goal

Prove the final desired workflow.

### Test scenario

1. Create a brand new app from template.
2. Register it.
3. Build and restart affected services.
4. Confirm it appears in shell.
5. Open the route on phone.
6. Confirm it is installable as a PWA.

### Acceptance criteria

- The flow works remotely from OpenCode web
- Minimal manual intervention is required
- The architecture supports future app creation cleanly

---

## Data Ownership and Boundaries

### Shell owns

- app registry display
- shell UI
- routing links
- shell installability

### Each app owns

- frontend UI and logic
- backend if needed
- local IndexedDB schema
- server SQLite schema
- sync rules
- tests
- icons and manifest

### Shared folder may own

- reusable UI primitives
- reusable IndexedDB helpers
- reusable sync helpers
- contracts/interfaces

The shell must never become the dumping ground for app logic.

---

## Standards for New Apps

Every future app should start with these questions answered in its own app plan:

1. App slug?
2. Does it need backend?
3. Does it need server persistence?
4. What is stored locally offline?
5. What sync operations exist?
6. What is the canonical server data model?
7. What does the initial UI need to do offline?
8. What are the installability/PWA requirements?
9. What are the minimum tests?
10. What verification script checks should pass?

This becomes the contract for all future app generation.

---

## Recommended Initial Decisions for V1

Unless explicitly changed, use these defaults:

- **Monorepo**: yes
- **Shell frontend**: React + TypeScript + Vite
- **App frontends**: React + TypeScript + Vite
- **PWA tooling**: `vite-plugin-pwa`
- **Local offline storage**: IndexedDB via Dexie
- **Backend stack**: Node + Fastify
- **Server DB**: SQLite per app
- **Proxy**: Caddy
- **Runtime orchestration**: Docker Compose
- **App registry**: generated from folder scan
- **App loading strategy**: controlled restart-based registration
- **Conflict policy**: simple single-user multi-device with last-write-wins

---

## Risks and Mitigations

### Risk 1: iOS PWA quirks

**Problem:** iOS can be picky about manifests, scopes, caching, and updates.

**Mitigation:**
- Lock a known-good template early
- Keep path/scope conventions strict
- Test shell and first app on actual iPhone before scaling out

### Risk 2: Agents editing the wrong part of the repo

**Problem:** OpenCode may overreach.

**Mitigation:**
- Strong folder boundaries
- Strong docs
- Per-app work instructions
- Verification scripts

### Risk 3: Offline sync gets messy

**Problem:** naive sync design becomes fragile fast.

**Mitigation:**
- Use operation queue from the beginning
- Keep conflict rules simple
- Keep V1 single-user

### Risk 4: New app registration becomes manual pain

**Problem:** adding apps becomes annoying and error-prone.

**Mitigation:**
- Generated app registry
- Standard app config contract
- Registration script

### Risk 5: Platform becomes too coupled

**Problem:** shell and apps become entangled.

**Mitigation:**
- Keep shell dumb
- Keep app logic inside app folders
- Only share deliberate abstractions

---

## V1 Definition of Done

The V1 platform is considered complete when all of the following are true:

1. The Mac Mini hosts the platform as an always-on service.
2. The shell at `/` is installable as a PWA and works offline.
3. At least one app, Shopping List, exists at `/shopping-list/`.
4. The Shopping List app is installable as its own PWA.
5. The Shopping List app works offline and syncs when online.
6. Each app has its own self-contained folder and isolated persistence.
7. App registration is driven by app config scanning and generated registry output.
8. OpenCode can create, rebuild, restart, and verify the platform remotely.
9. The path from “new app idea” to “new installed PWA on phone” is proven end to end.

---

## Suggested Order of Execution for OpenCode

1. Create documentation/contracts first.
2. Bootstrap repo structure.
3. Build shell UI.
4. Make shell installable as a PWA.
5. Create app template system.
6. Implement app discovery and generated registry.
7. Implement proxy/routing.
8. Implement shared offline framework.
9. Build Shopping List app.
10. Build restart/test/verification scripts.
11. Run full end-to-end test.

Do not jump straight into building several apps. Prove the platform with one real app first.

---

## Instruction Notes for OpenCode

When building this platform:

- Prefer complete, explicit files over partial snippets.
- Keep all code and scripts non-interactive where possible.
- Respect folder ownership boundaries.
- Do not improvise alternate architectures unless clearly better and documented.
- Favor simple, repeatable contracts over cleverness.
- Optimize for remote maintainability.
- Ensure every claimed feature is verified by script or test where practical.

---

## Final Summary

This platform is not just a PWA app. It is a **PWA app host** designed around a specific workflow:

- idea arrives
- app gets planned
- OpenCode builds it remotely
- app registers into a fake iOS-style homescreen
- route becomes available
- app gets installed to a real phone home screen

The correct V1 architecture is therefore:

- monorepo
- shell + isolated apps
- route-based independent PWAs
- IndexedDB offline layer
- SQLite per app on server
- generated app registry
- Docker Compose + Caddy
- controlled rebuild/restart instead of trying to fake dynamic plugin magic too early

Build the platform around that workflow, prove it with Shopping List, and only then start minting more apps.
