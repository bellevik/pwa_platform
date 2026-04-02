# Robot Tower Defense

## Purpose

Portrait-first robot-themed tower defense campaign with fixed build pads, manual wave launches, and offline PWA installability.

## Route Contract

- frontend route: `/robot-tower-defense/`
- API base: `/api/robot-tower-defense/`
- backend enabled: `false`
- database enabled: `false`

## Structure

- `frontend/` contains the game UI, simulation, stage data, and PWA setup
- `backend/` is present as a placeholder for future services if needed
- `data/` is reserved for future exports or local fixtures
- `icons/` stores app-owned icon assets

## Current Implementation

- portrait-first single-screen battlefield built for mobile first and scaled up for desktop
- fixed-timestep simulation with manual wave starts and stage-by-stage progression
- five towers, five standard enemy types, and a Forge Titan boss roster foundation
- Factory Frontier world with ten authored stages and three-star completion ratings
- route-scoped standalone PWA packaging for offline replay after the first successful load

## Controls

- tap a build pad to place a tower
- tap a placed tower to inspect, upgrade, or sell it
- use the launch button to manually start each wave
- use pause and speed controls from the top battle bar

## Offline Contract

- the app must remain usable offline after first successful online load
- campaign progression persists locally on-device
- no backend sync is required for the V1 frontend-only release

## Commands

- `./START.sh`
- `./STOP.sh`
- `./RESTART.sh`
- `./TEST.sh`
