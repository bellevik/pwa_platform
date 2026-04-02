# Flappy Bird Clone

## Purpose

Arcade-style Flappy Bird clone with touch controls, local best score tracking, and offline PWA installability

## Route Contract

- frontend route: `/flappy-bird/`
- API base: `/api/flappy-bird/`
- backend enabled: `false`
- database enabled: `false`

## Structure

- `frontend/` contains the app UI
- `backend/` contains the Fastify service when enabled
- `data/` stores app-local persistent files
- `icons/` stores app-owned icon assets

## Current Implementation

- fixed-viewport arcade layout built from the `single-screen` preset
- tap, click, and keyboard flap controls with a requestAnimationFrame game loop
- moving pipe obstacles, collision detection, scoring, and quick restart flow
- local best score persistence through `localStorage`
- route-local installable PWA packaging for offline replay after the first successful load

## Controls

- tap or click the playfield to flap
- `Space`, `W`, or `ArrowUp` also flap
- use the restart button or overlay CTA to begin a new run

## Offline Contract

- the app must remain usable offline after first successful online load
- local state must persist in IndexedDB
- pending sync operations must persist locally until acknowledged

## Commands

- `./START.sh`
- `./STOP.sh`
- `./RESTART.sh`
- `./TEST.sh`
