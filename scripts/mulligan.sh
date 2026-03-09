#!/bin/bash
# Mulligan: shuffle hand back into library, then draw N cards
# Usage: scripts/mulligan.sh N
# Run as a background task to keep hand contents hidden from the human.

set -eo pipefail

N=${1:?"Usage: mulligan.sh N"}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEY_FILE="$REPO_ROOT/.encryption_key"
LIBRARY_FILE="$REPO_ROOT/game/claude/library.yaml"
HAND_FILE="$REPO_ROOT/game/claude/hand.yaml"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: .encryption_key not found." >&2
  exit 1
fi

KEY=$(tr -d '\n\r' < "$KEY_FILE")

echo "=== Mulligan: drawing $N ==="

# Step 1: Move hand entries back to library (re-encrypted)
python - "$KEY" "$LIBRARY_FILE" "$HAND_FILE" << 'PYEOF'
import sys, subprocess

key = sys.argv[1]
library_file = sys.argv[2]
hand_file = sys.argv[3]

def read_yaml_list(filepath):
    entries = []
    with open(filepath) as f:
        for line in f:
            s = line.strip()
            if s.startswith('- "') and s.endswith('"'):
                entries.append(s[3:-1])
    return entries

hand = read_yaml_list(hand_file)
library = read_yaml_list(library_file)

if not hand:
    print("Hand is empty, nothing to return.")
    sys.exit(0)

print(f"Returning {len(hand)} cards from hand to library...")

for enc in hand:
    # Decrypt
    result = subprocess.run(
        ['openssl', 'enc', '-aes-256-cbc', '-a', '-A', '-d', '-salt', '-pbkdf2',
         '-pass', f'pass:{key}'],
        input=enc.encode(), capture_output=True
    )
    plaintext = result.stdout.decode()

    # Re-encrypt with new salt
    result = subprocess.run(
        ['openssl', 'enc', '-aes-256-cbc', '-a', '-A', '-salt', '-pbkdf2',
         '-pass', f'pass:{key}'],
        input=plaintext.encode(), capture_output=True
    )
    library.append(result.stdout.decode().strip())

# Clear hand
with open(hand_file, 'w', newline='\n') as f:
    f.write("hand: []\n")

# Write library with returned cards
with open(library_file, 'w', newline='\n') as f:
    f.write("library:\n")
    for e in library:
        f.write(f'  - "{e}"\n')

print(f"Library now has {len(library)} cards")
PYEOF

# Step 2: Shuffle the library
"$SCRIPT_DIR/shuffle.sh"

# Step 3: Draw N cards
"$SCRIPT_DIR/draw.sh" "$N"

echo "=== Mulligan complete ==="
