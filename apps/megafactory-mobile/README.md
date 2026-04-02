# Pocket Megafactory

## Purpose

Portrait-only offline-first consumer-tech factory sim with visible conveyor movement and cloud backup.

## Route Contract

- frontend route: `/megafactory-mobile/`
- API base: `/api/megafactory-mobile/`
- backend enabled: `true`
- database enabled: `true`

## Structure

- `frontend/` contains the portrait game client, renderer, and IndexedDB store
- `backend/` contains the Fastify sync and recovery-code backup service
- `data/` stores the canonical SQLite save database
- `icons/` stores app-owned icon assets

## Current Implementation

- portrait-only factory board with touch-first machine placement
- visible conveyor movement for live materials on the active floor
- multiple production lines with optional floor expansion
- local autosave and queued sync operations in IndexedDB
- recovery-code backup bootstrap and canonical state sync via SQLite

## Offline Contract

- the app remains usable offline after the first successful online load
- local state is stored in IndexedDB and remains authoritative while offline
- pending sync operations persist until acknowledged by the backend
- cloud backup is optional but available from v1 via recovery code

## Commands

- `./START.sh`
- `./STOP.sh`
- `./RESTART.sh`
- `./TEST.sh`

## Verification Notes

- frontend build: `pnpm --filter @pwa-platform/megafactory-mobile-frontend build`
- backend tests: `pnpm --filter @pwa-platform/megafactory-mobile-backend test`
- backend health: `GET /api/megafactory-mobile/health/`
- sync endpoint: `POST /api/megafactory-mobile/sync/`
- canonical state endpoint: `GET /api/megafactory-mobile/state/?recoveryCode=<code>`
- backup bootstrap: `POST /api/megafactory-mobile/backup/enable/`
