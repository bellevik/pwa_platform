# Contributing For Agents

## Purpose

This repository is designed for remote software agents. The rules below exist to prevent accidental cross-app damage and to keep changes predictable.

## Hard Boundaries

### `shell/`

Only shell platform code belongs here:

- homescreen UI
- shell registry loading
- shell PWA behavior
- shell-only styles and components

Do not put app business logic in `shell/`.

### `apps/<slug>/`

App-specific code belongs only inside the app folder:

- frontend logic
- backend logic
- app data structures
- app-specific tests
- app icons and manifest files
- app lifecycle scripts

Do not modify another app unless the task explicitly requires it.

### `shared/`

Only reusable, deliberate abstractions belong here:

- contracts
- low-level utilities
- offline helpers
- sync helpers

Do not move app-specific behavior into `shared/` just because two files look similar.

### `generated/`

Generated outputs belong here.

- do not hand-edit generated artifacts unless the task explicitly concerns generation output format
- treat `generated/app-registry.json` as rebuildable output, not source-of-truth content

### Runtime Artifacts

Runtime-owned artifacts must not be committed or hand-maintained as source files.

- `.opencode-locks/` is for transient platform operation locks only
- `apps/<slug>/data/*.sqlite*` are runtime data files, not source files
- if these artifacts are stale or broken, regenerate or clear them intentionally instead of editing them by hand

### `templates/`

Template files belong here.

- template improvements should make future app generation better
- do not turn templates into one-off app implementations
- `templates/working-pwa-reference/` is a non-registered reference copy of a known-good app; use it for patterns, not as runtime app content

## Required Workflow For App Work

1. Read the target app README and `app.config.json` first.
2. Stay inside the target app folder unless the task explicitly requires shared or platform changes.
3. Run the app or platform verification script after making changes.
4. Do not refactor unrelated routes or apps while working on one app.

## Required Workflow For Platform Work

1. Keep shell, shared, scripts, ops, and templates responsibilities separate.
2. Update docs and schemas when changing contracts.
3. Prefer runtime app discovery over manual route bookkeeping.
4. Keep scripts deterministic and non-interactive.
5. Treat generated and runtime-owned artifacts as disposable outputs unless the task is explicitly about them.

## Decision Rules

- prefer the locked architecture over improvising a new one
- prefer simple contracts over clever abstractions
- prefer per-app isolation over convenience shortcuts
- prefer app-local ownership unless reuse is clearly justified

## Verification Rule

If you claim a feature works, there should be a script, test, or reproducible verification path for it.

## Unsafe Changes

Avoid these unless explicitly requested:

- changing route conventions
- collapsing app boundaries
- adding global shared state across apps
- making the shell depend on hardcoded app metadata
- introducing runtime requirements that force every app to run a backend service
