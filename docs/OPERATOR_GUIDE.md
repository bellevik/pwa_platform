# Operator Guide

## Purpose

This guide is the practical day-to-day runbook for operating the platform locally.

## Core Commands

### Start everything

```bash
bash scripts/START_ALL.sh
```

### Stop everything

```bash
bash scripts/STOP_ALL.sh
```

### Restart everything

```bash
bash scripts/RESTART_ALL.sh
```

### Rebuild one app

```bash
bash scripts/REBUILD_APP.sh <slug>
```

### Restart one app

```bash
bash scripts/RESTART_APP.sh <slug>
```

### Verify platform

```bash
bash scripts/VERIFY_PLATFORM.sh
```

### Verify one app

```bash
bash scripts/VERIFY_APP.sh <slug>
```

### Test one app

```bash
bash scripts/TEST_APP.sh <slug>
```

### Test all apps

```bash
bash scripts/TEST_ALL.sh
```

## Local URLs

- shell: `http://127.0.0.1/`
- shopping list: `http://127.0.0.1/shopping-list/`
- daily notes: `http://127.0.0.1/daily-notes/`
- calculator: `http://127.0.0.1/calculator/`
- shopping list health: `http://127.0.0.1/api/shopping-list/health/`
- shopping list state: `http://127.0.0.1/api/shopping-list/state/`

## iPhone / HTTPS

### Set up local HTTPS

```bash
bash scripts/SETUP_LOCAL_TLS.sh 192.168.50.145
```

### Preferred install hostname

- `https://Sebastians-Mac-mini.local/`

### Certificate trust

Install and trust:

- `ops/caddy/certs/pwa-platform-local-ca.crt`

On iPhone:

1. install the profile
2. trust it in `Settings -> General -> About -> Certificate Trust Settings`

### Important

- install PWAs from the hostname-based HTTPS URL
- do not use the raw IP for iPhone install testing if you want consistent behavior

## Generated App Workflow

### Create a new app

```bash
bash scripts/CREATE_APP.sh <slug> --name "App Name" --description "App description"
```

### Full generated app proof

```bash
bash scripts/VERIFY_GENERATED_APP_FLOW.sh
```

## Working Reference

Use:

- `templates/working-pwa-reference/`

This is a non-registered, known-good reference app for future sessions.

Use the prompt in:

- `templates/working-pwa-reference/SESSION_PROMPT.md`

## Current Real Apps

- `shopping-list`: offline-first synced app with Fastify + SQLite
- `daily-notes`: generated static app proving registration/routing
- `calculator`: futuristic neumorphic static calculator with local history
