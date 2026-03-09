#!/bin/bash
# Draw N cards from library to hand
# Usage: scripts/draw.sh [N]  (default: 1)
# Outputs card IDs and names to stdout
# Run as a background task to keep output hidden from the human.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEY_FILE="$REPO_ROOT/.encryption_key"
LIBRARY_FILE="$REPO_ROOT/game/claude/library.yaml"
HAND_FILE="$REPO_ROOT/game/claude/hand.yaml"

N=${1:-1}

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: .encryption_key not found." >&2
  exit 1
fi

KEY=$(tr -d '\n\r' < "$KEY_FILE")

python - "$KEY" "$N" "$LIBRARY_FILE" "$HAND_FILE" << 'PYEOF'
import sys, json, subprocess

key = sys.argv[1]
n = int(sys.argv[2])
library_file = sys.argv[3]
hand_file = sys.argv[4]

def read_yaml_list(filepath):
    entries = []
    with open(filepath) as f:
        for line in f:
            s = line.strip()
            if s.startswith('- "') and s.endswith('"'):
                entries.append(s[3:-1])
    return entries

def write_yaml_list(filepath, key_name, entries):
    with open(filepath, 'w', newline='\n') as f:
        if not entries:
            f.write(f"{key_name}: []\n")
        else:
            f.write(f"{key_name}:\n")
            for e in entries:
                f.write(f'  - "{e}"\n')

def decrypt(ciphertext):
    result = subprocess.run(
        ['openssl', 'enc', '-aes-256-cbc', '-a', '-A', '-d', '-salt', '-pbkdf2',
         '-pass', f'pass:{key}'],
        input=ciphertext.encode(), capture_output=True
    )
    if result.returncode != 0:
        print(f"Decryption error: {result.stderr.decode()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.decode()

def encrypt(plaintext):
    result = subprocess.run(
        ['openssl', 'enc', '-aes-256-cbc', '-a', '-A', '-salt', '-pbkdf2',
         '-pass', f'pass:{key}'],
        input=plaintext.encode(), capture_output=True
    )
    if result.returncode != 0:
        print(f"Encryption error: {result.stderr.decode()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.decode().strip()

# Read current state
library = read_yaml_list(library_file)
hand = read_yaml_list(hand_file)

if n > len(library):
    print(f"Error: Cannot draw {n}, only {len(library)} cards in library.", file=sys.stderr)
    sys.exit(1)

# Draw top N cards
drawn = []
for i in range(n):
    plaintext = decrypt(library[i])
    card = json.loads(plaintext)
    drawn.append(card)
    # Re-encrypt with new salt so ciphertext differs from library entry
    hand.append(encrypt(plaintext))

# Remove drawn cards from library
library = library[n:]

# Write updated files
write_yaml_list(library_file, "library", library)
write_yaml_list(hand_file, "hand", hand)

# Output
print(f"Drew {n} card(s):")
for card in drawn:
    print(f"  {card['card_id']} -- {card['name']}")
print(f"Library: {len(library)} cards remaining")
print(f"Hand: {len(hand)} cards")
PYEOF
