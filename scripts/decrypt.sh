#!/bin/bash
# Decrypt an AES-256-CBC encrypted value
# Usage: scripts/decrypt.sh "ciphertext"
#    or: echo "ciphertext" | scripts/decrypt.sh

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="$SCRIPT_DIR/../.encryption_key"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: .encryption_key not found. Ask the human for the session key." >&2
  exit 1
fi

KEY=$(tr -d '\n\r' < "$KEY_FILE")

if [[ $# -gt 0 ]]; then
  echo -n "$1" | openssl enc -aes-256-cbc -a -A -d -salt -pbkdf2 -pass "pass:$KEY"
else
  openssl enc -aes-256-cbc -a -A -d -salt -pbkdf2 -pass "pass:$KEY"
fi
