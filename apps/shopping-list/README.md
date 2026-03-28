# Shopping List

## Purpose

Offline-first shopping list with local queue and sync-ready backend

## Route Contract

- frontend route: `/shopping-list/`
- API base: `/api/shopping-list/`
- backend enabled: `true`
- database enabled: `true`

## Structure

- `frontend/` contains the app UI
- `backend/` contains the Fastify service when enabled
- `data/` stores app-local persistent files
- `icons/` stores app-owned icon assets

## Current Implementation

- add, toggle, and delete items locally with immediate UI updates
- persist local items and pending operations in IndexedDB via Dexie
- sync queued operations to `/api/shopping-list/sync/`
- persist canonical server state in `data/shopping-list.sqlite`
- reopen from the app route after first successful load as a scoped PWA

## Offline Contract

- the app must remain usable offline after first successful online load
- local state must persist in IndexedDB
- pending sync operations must persist locally until acknowledged

## Commands

- `./START.sh`
- `./STOP.sh`
- `./RESTART.sh`
- `./TEST.sh`

## Verification Notes

- frontend build: `pnpm --filter @pwa-platform/shopping-list-frontend build`
- backend health: `GET /api/shopping-list/health/`
- sync endpoint: `POST /api/shopping-list/sync/`
