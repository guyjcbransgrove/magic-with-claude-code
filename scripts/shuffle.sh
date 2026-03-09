#!/bin/bash
# Shuffle the library: decrypt all entries, randomize order, re-encrypt
# Run as a background task to keep library order hidden from the human.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEY_FILE="$REPO_ROOT/.encryption_key"
LIBRARY_FILE="$REPO_ROOT/game/claude/library.yaml"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: .encryption_key not found." >&2
  exit 1
fi

KEY=$(tr -d '\n\r' < "$KEY_FILE")

python - "$KEY" "$LIBRARY_FILE" << 'PYEOF'
import sys, subprocess, random

key = sys.argv[1]
library_file = sys.argv[2]

# Read encrypted entries
entries = []
with open(library_file) as f:
    for line in f:
        s = line.strip()
        if s.startswith('- "') and s.endswith('"'):
            entries.append(s[3:-1])

if not entries:
    print("Library is empty, nothing to shuffle.")
    sys.exit(0)

print(f"Shuffling {len(entries)} cards...")

# Decrypt all
plaintexts = []
for enc in entries:
    result = subprocess.run(
        ['openssl', 'enc', '-aes-256-cbc', '-a', '-A', '-d', '-salt', '-pbkdf2',
         '-pass', f'pass:{key}'],
        input=enc.encode(), capture_output=True
    )
    if result.returncode != 0:
        print(f"Decryption error: {result.stderr.decode()}", file=sys.stderr)
        sys.exit(1)
    plaintexts.append(result.stdout.decode())

# Shuffle
random.shuffle(plaintexts)

# Re-encrypt with new salts
new_entries = []
for i, pt in enumerate(plaintexts):
    result = subprocess.run(
        ['openssl', 'enc', '-aes-256-cbc', '-a', '-A', '-salt', '-pbkdf2',
         '-pass', f'pass:{key}'],
        input=pt.encode(), capture_output=True
    )
    if result.returncode != 0:
        print(f"Encryption error: {result.stderr.decode()}", file=sys.stderr)
        sys.exit(1)
    new_entries.append(result.stdout.decode().strip())
    if (i + 1) % 10 == 0:
        print(f"  {i + 1}/{len(plaintexts)}...")

# Write back
with open(library_file, 'w', newline='\n') as f:
    f.write("library:\n")
    for e in new_entries:
        f.write(f'  - "{e}"\n')

print(f"Library shuffled: {len(new_entries)} cards")
PYEOF
