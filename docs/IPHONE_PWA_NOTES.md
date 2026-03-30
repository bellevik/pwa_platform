# iPhone PWA Notes

## What Works Reliably

For this platform, iPhone install/offline behavior works reliably when all of these are true:

- the app is opened over `HTTPS`
- the server certificate is trusted by iPhone
- the app is opened via the hostname route, not the raw LAN IP

## Stable Local Testing Flow

Use the local HTTPS setup script:

```bash
bash scripts/SETUP_LOCAL_TLS.sh 192.168.50.145
```

This configures Caddy for local TLS and prints the available URLs.

The preferred iPhone install URL is:

- `https://Sebastians-Mac-mini.local/`

Do not use the raw IP for the install flow if the goal is reliable iPhone PWA behavior.

## Certificate Trust

Install and trust:

- `ops/caddy/certs/pwa-platform-local-ca.crt`

On iPhone:

1. Open the certificate file and install the profile.
2. Go to `Settings -> General -> VPN & Device Management` if needed.
3. Go to `Settings -> General -> About -> Certificate Trust Settings`.
4. Enable full trust for `PWA Platform Local CA`.

## Recommended Reinstall Flow

When retesting install behavior:

1. Delete the old home screen icon.
2. Close Safari.
3. Reopen the hostname URL.
4. Add to Home Screen again.

This avoids stale iPhone web clip state.

## Current Observation

- desktop browsing works over LAN HTTP and HTTPS
- iPhone browsing can work over LAN URLs
- iPhone install/offline behavior is best tested over the trusted hostname-based HTTPS route
