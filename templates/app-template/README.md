# __APP_NAME__

## Purpose

__APP_DESCRIPTION__

## Route Contract

- frontend route: `/__APP_SLUG__/`
- API base: `/api/__APP_SLUG__/`
- backend enabled: `__HAS_BACKEND__`
- database enabled: `__HAS_DATABASE__`

## Structure

- `frontend/` contains the app UI
- `backend/` contains the Fastify service when enabled
- `data/` stores app-local persistent files
- `icons/` stores app-owned icon assets

## Offline Contract

- the app must remain usable offline after first successful online load
- local state must persist in IndexedDB
- pending sync operations must persist locally until acknowledged

## Scaffold Profile

- layout preset: `__LAYOUT_TEMPLATE__`
- `scrolling` is for content-first screens with regular document flow
- `single-screen` is for fixed-viewport tools that should not scroll

## Commands

- `./START.sh`
- `./STOP.sh`
- `./RESTART.sh`
- `./TEST.sh`
