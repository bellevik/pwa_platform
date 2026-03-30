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
CA_CERT_PATH="$CERT_DIR/pwa-platform-local-ca.crt"
CA_KEY_PATH="$CERT_DIR/pwa-platform-local-ca.key"
CERT_PATH="$CERT_DIR/pwa-platform-local.crt"
KEY_PATH="$CERT_DIR/pwa-platform-local.key"
CSR_PATH="$CERT_DIR/pwa-platform-local.csr"
PRIMARY_HOST="${1:-}"
LOCAL_HOSTNAME="$(scutil --get LocalHostName 2>/dev/null || true)"

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

TMP_CA_CONFIG="$(mktemp)"
TMP_CERT_CONFIG="$(mktemp)"
trap 'rm -f "$TMP_CA_CONFIG" "$TMP_CERT_CONFIG"' EXIT

cat > "$TMP_CA_CONFIG" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_ca
distinguished_name = dn

[dn]
CN = PWA Platform Local CA

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
EOF

cat > "$TMP_CERT_CONFIG" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
CN = ${LOCAL_HOSTNAME}.local

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = ${LOCAL_HOSTNAME}.local
IP.1 = 127.0.0.1
IP.2 = $PRIMARY_HOST
EOF

if [ -f "$CA_CERT_PATH" ] && [ -f "$CA_KEY_PATH" ]; then
  printf 'Reusing existing local CA at %s\n' "$CA_CERT_PATH"
else
  printf 'Generating local CA...\n'
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout "$CA_KEY_PATH" -out "$CA_CERT_PATH" -config "$TMP_CA_CONFIG" >/dev/null 2>&1
fi

printf 'Generating local HTTPS certificate for %s...\n' "$PRIMARY_HOST"
openssl req -nodes -newkey rsa:2048 -keyout "$KEY_PATH" -out "$CSR_PATH" -config "$TMP_CERT_CONFIG" >/dev/null 2>&1
openssl x509 -req -days 825 -in "$CSR_PATH" -CA "$CA_CERT_PATH" -CAkey "$CA_KEY_PATH" -CAcreateserial -out "$CERT_PATH" -extensions v3_req -extfile "$TMP_CERT_CONFIG" >/dev/null 2>&1

printf 'Restarting platform runtime with HTTPS enabled...\n'
bash "$ROOT_DIR/scripts/START_ALL.sh"

printf 'HTTPS is available at:\n'
printf -- '- https://%s/\n' "$PRIMARY_HOST"
if [ -n "$LOCAL_HOSTNAME" ]; then
  printf -- '- https://%s.local/\n' "$LOCAL_HOSTNAME"
fi
printf -- '- https://127.0.0.1/\n'
printf 'Install and trust this CA on iPhone:\n'
printf -- '- %s\n' "$CA_CERT_PATH"
printf 'Server certificate path:\n'
printf -- '- %s\n' "$CERT_PATH"
