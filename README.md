# pwa_platform

A self-hosted modular PWA platform that serves a shell homescreen at `/` and isolated installable apps at their own routes.

## Locked V1 Stack

- `pnpm` workspaces
- Node 22 LTS
- React + TypeScript + Vite
- `vite-plugin-pwa`
- Dexie for IndexedDB
- Fastify for app backends
- SQLite per app
- Caddy + Docker Compose for serving and routing

## Current Build Focus

The repository is being implemented in this order:

1. docs and contracts
2. schemas
3. workspace and tooling
4. repository skeleton
5. shell bootstrap

See `docs/ARCHITECTURE.md` for the canonical platform design.

## Device Notes

- iPhone PWA install/offline testing is documented in `docs/IPHONE_PWA_NOTES.md`
- a known-good reference app for future app creation sessions will live under `templates/working-pwa-reference/`
