#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/lock.sh"
source "$(dirname "$0")/lib/log.sh"
source "$(dirname "$0")/lib/preflight.sh"

acquire_platform_lock
require_command openssl
require_runtime_tooling
print_operation_banner "SETUP_LOCAL_TLS"
print_active_flag_summary

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT_DIR/ops/caddy/certs"
CERT_PATH="$CERT_DIR/pwa-platform-local.crt"
KEY_PATH="$CERT_DIR/pwa-platform-local.key"
PRIMARY_HOST="${1:-}"

if [ -z "$PRIMARY_HOST" ]; then
  PRIMARY_HOST="$(ipconfig getifaddr en0 2>/dev/null || true)"
fi

if [ -z "$PRIMARY_HOST" ]; then
  PRIMARY_HOST="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi

if [ -z "$PRIMARY_HOST" ]; then
  printf 'Could not detect a LAN IP automatically. Pass one explicitly, e.g. bash scripts/SETUP_LOCAL_TLS.sh 192.168.50.145\n' >&2
  exit 1
fi

mkdir -p "$CERT_DIR"

TMP_CONFIG="$(mktemp)"
trap 'rm -f "$TMP_CONFIG"' EXIT

cat > "$TMP_CONFIG" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
CN = $PRIMARY_HOST

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = $PRIMARY_HOST
EOF

printf 'Generating local HTTPS certificate for %s...\n' "$PRIMARY_HOST"
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout "$KEY_PATH" -out "$CERT_PATH" -config "$TMP_CONFIG" >/dev/null 2>&1

printf 'Restarting platform runtime with HTTPS enabled...\n'
bash "$ROOT_DIR/scripts/START_ALL.sh"

printf 'HTTPS is available at:\n'
printf -- '- https://%s/\n' "$PRIMARY_HOST"
printf -- '- https://127.0.0.1/\n'
printf 'Certificate to install/trust on iPhone if needed:\n'
printf -- '- %s\n' "$CERT_PATH"
