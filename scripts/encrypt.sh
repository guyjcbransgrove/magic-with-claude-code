#!/bin/bash
# Encrypt a plaintext value using AES-256-CBC
# Usage: scripts/encrypt.sh "plaintext"
#    or: echo "plaintext" | scripts/encrypt.sh

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="$SCRIPT_DIR/../.encryption_key"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: .encryption_key not found. Ask the human for the session key." >&2
  exit 1
fi

KEY=$(tr -d '\n\r' < "$KEY_FILE")

if [[ $# -gt 0 ]]; then
  echo -n "$1" | openssl enc -aes-256-cbc -a -A -salt -pbkdf2 -pass "pass:$KEY"
else
  openssl enc -aes-256-cbc -a -A -salt -pbkdf2 -pass "pass:$KEY"
fi
