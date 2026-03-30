# Calculator

## Purpose

Futuristic neumorphic calculator with a tactile sci-fi interface, persistent local history, and route-local PWA packaging.

## Route Contract

- frontend route: `/calculator/`
- API base: `/api/calculator/`
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

## Current Implementation

- tactile neumorphic calculator UI with deliberate sci-fi styling
- local expression solving and result history
- history persists locally in browser storage
- static-only PWA with root-level install icon assets

## Commands

- `./START.sh`
- `./STOP.sh`
- `./RESTART.sh`
- `./TEST.sh`
