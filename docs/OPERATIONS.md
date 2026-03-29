# Operations

## Goal

All platform and app management must be deterministic, non-interactive, and safe to run remotely.

## Runtime Overview

- Docker Compose orchestrates the platform runtime
- Caddy serves shell and app frontends and proxies app APIs
- frontend-only apps remain static assets only
- backend-enabled apps may have one Fastify service each

## Root Script Contract

The repository must provide these root scripts under `scripts/`:

- `CREATE_APP.sh <slug>`
- `REGISTER_APPS.sh`
- `BUILD_ALL.sh`
- `START_ALL.sh`
- `STOP_ALL.sh`
- `RESTART_ALL.sh`
- `REBUILD_APP.sh <slug>`
- `RESTART_APP.sh <slug>`
- `TEST_ALL.sh`
- `TEST_APP.sh <slug>`
- `VERIFY_PLATFORM.sh`
- `VERIFY_APP.sh <slug>`

## Per-App Script Contract

Each app must provide:

- `START.sh`
- `STOP.sh`
- `RESTART.sh`
- `TEST.sh`

## Script Rules

All scripts must:

- be non-interactive
- work from remote execution
- produce plain text logs
- return non-zero exit codes on failure
- validate required arguments before doing work
- avoid hidden side effects

## Expected Root Script Responsibilities

### `CREATE_APP.sh <slug>`

- validate slug
- copy from the app template
- replace placeholders
- create a valid initial app folder

### `REGISTER_APPS.sh`

- validate all app configs
- generate `generated/app-registry.json`
- fail clearly on invalid app metadata

### `BUILD_ALL.sh`

- install dependencies if needed
- build shell
- build all app frontends
- build backend services where needed

### `REBUILD_APP.sh <slug>`

- validate slug
- rebuild the selected app only
- avoid unnecessary full-platform rebuilds

### `VERIFY_PLATFORM.sh`

Must verify at minimum:

- shell route responds
- registry exists and is valid JSON
- shell manifest exists
- shell service worker exists
- each registered route is reachable

### `VERIFY_APP.sh <slug>`

Must verify at minimum:

- app config is valid
- app route responds
- app manifest exists
- app service worker exists
- app frontend builds
- app backend responds if present
- app data path exists when required

## Restart Policy

- controlled restart is acceptable in V1
- app registration may trigger service reload or restart
- adding a static-only app should not require shell rebuild when registry generation is enough
- per-app restart should be preferred over full-platform restart where possible

## Logging Expectations

- identify the command being run
- identify which app is affected when relevant
- explain failure causes clearly
- make verification failures actionable

## Optimization Flags

The operations scripts support a small set of environment flags for repeated local or remote runs:

- `PWA_PLATFORM_SKIP_INSTALL=1`: skip `pnpm install` in build flows when dependencies are already current
- `PWA_PLATFORM_SKIP_BUILD=1`: skip rebuild work in runtime restart/start flows when assets are already current
- `PWA_PLATFORM_SKIP_APP_VERIFY=1`: skip per-app verification in `TEST_APP.sh`; `TEST_ALL.sh` uses this internally before its final platform verification
- `PWA_PLATFORM_LOCK_TIMEOUT=<seconds>`: control how long root ops scripts wait on the platform lock before failing
- `PWA_PLATFORM_DRY_RUN=1`: print high-impact commands instead of executing them in build/start/stop/restart/test/verify flows

## Concurrency Safety

- root operations scripts take a shared platform lock under `.opencode-locks/`
- this prevents concurrent agents from rebuilding, restarting, testing, or verifying the platform at the same time
- nested script calls are lock-aware and reuse the current lock instead of deadlocking
- stale locks are recovered automatically when the recorded lock PID is no longer alive
- timeout failures print the last known lock metadata so an operator can see which script likely held the lock
- if automatic recovery cannot resolve the issue, remove the specific lock directory under `.opencode-locks/` and rerun the command

## Preflight Checks

- root operations scripts fail fast when required external tools like `node`, `pnpm`, `python3`, `docker`, or `curl` are missing
- build and verification flows require the base toolchain
- runtime flows additionally require Docker and HTTP tooling

## Operator Diagnostics

- root operations scripts print a clear operation banner when they start
- root operations scripts print the active optimization and safety flags at the beginning of the run

## Future Hardening Targets

- health checks in Compose
- rollback-aware restart flow where practical
- automated real-device validation checklist for iPhone PWA behavior
