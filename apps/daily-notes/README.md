# Daily Notes

## Purpose

Quick capture notes app used to prove the generated static app workflow

## Route Contract

- frontend route: `/daily-notes/`
- API base: `/api/daily-notes/`
- backend enabled: `false`
- database enabled: `false`

## Structure

- `frontend/` contains the app UI
- `backend/` contains the Fastify service when enabled
- `data/` stores app-local persistent files
- `icons/` stores app-owned icon assets

## Offline Contract

- the app must remain usable offline after first successful online load
- local state must persist in IndexedDB
- pending sync operations must persist locally until acknowledged

## Commands

- `./START.sh`
- `./STOP.sh`
- `./RESTART.sh`
- `./TEST.sh`
