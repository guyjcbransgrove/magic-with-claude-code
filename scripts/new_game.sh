#!/bin/bash
# Initialize a new game: load deck, shuffle, encrypt library, reset state, draw opening hand
# Run as a background task — outputs card IDs for the opening hand.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEY_FILE="$REPO_ROOT/.encryption_key"
DECK_FILE="$REPO_ROOT/decks/red_white_deck.json"
GAME_DIR="$REPO_ROOT/game"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: .encryption_key not found. Ask the human for the session key." >&2
  exit 1
fi

if [[ ! -f "$DECK_FILE" ]]; then
  echo "Error: Deck file not found at $DECK_FILE" >&2
  exit 1
fi

KEY=$(tr -d '\n\r' < "$KEY_FILE")

# Derive game_id from branch name or fall back to date
GAME_ID=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null | sed 's|^game/||' || true)
if [[ -z "$GAME_ID" || "$GAME_ID" == "game-template" ]]; then
  GAME_ID=$(date +%Y-%m-%d-001)
fi

echo "=== Initializing new game: $GAME_ID ==="

# Step 1: Build library — parse deck JSON, expand quantities, shuffle, encrypt
python - "$KEY" "$DECK_FILE" "$GAME_DIR/claude/library.yaml" << 'PYEOF'
import json, random, subprocess, sys

key = sys.argv[1]
deck_file = sys.argv[2]
library_file = sys.argv[3]

# Load deck
with open(deck_file) as f:
    deck = json.load(f)

# Expand quantities into individual card entries with unique IDs
cards = []
card_id = 1
for card in deck['cards']:
    qty = card.get('quantity', 1)
    for _ in range(qty):
        cards.append(json.dumps({"card_id": f"rw_{card_id:03d}", "name": card['name']}))
        card_id += 1

print(f"Deck loaded: {len(cards)} cards")

# Shuffle
random.shuffle(cards)
print("Shuffled.")

# Encrypt each card
print("Encrypting library...")
encrypted = []
for i, plaintext in enumerate(cards):
    result = subprocess.run(
        ['openssl', 'enc', '-aes-256-cbc', '-a', '-A', '-salt', '-pbkdf2',
         '-pass', f'pass:{key}'],
        input=plaintext.encode(), capture_output=True
    )
    if result.returncode != 0:
        print(f"Encryption error on card {i+1}: {result.stderr.decode()}", file=sys.stderr)
        sys.exit(1)
    encrypted.append(result.stdout.decode().strip())
    if (i + 1) % 10 == 0:
        print(f"  {i + 1}/{len(cards)}...")

# Write library.yaml
with open(library_file, 'w', newline='\n') as f:
    f.write("library:\n")
    for e in encrypted:
        f.write(f'  - "{e}"\n')

print(f"Library encrypted: {len(encrypted)} cards")
PYEOF

# Step 2: Reset all game state files
echo "Resetting game state..."

# Claude's zones
cat > "$GAME_DIR/claude/life.yaml" << 'EOF'
life: 20
poison_counters: 0
EOF

cat > "$GAME_DIR/claude/hand.yaml" << 'EOF'
hand: []
EOF

cat > "$GAME_DIR/claude/battlefield.yaml" << 'EOF'
permanents: []
EOF

cat > "$GAME_DIR/claude/graveyard.yaml" << 'EOF'
graveyard: []
EOF

cat > "$GAME_DIR/claude/exile.yaml" << 'EOF'
exile: []
EOF

cat > "$GAME_DIR/claude/mana_pool.yaml" << 'EOF'
pool:
  W: 0
  U: 0
  B: 0
  R: 0
  G: 0
  C: 0
EOF

# Human's zones
cat > "$GAME_DIR/human/life.yaml" << 'EOF'
life: 20
poison_counters: 0
EOF

cat > "$GAME_DIR/human/battlefield.yaml" << 'EOF'
permanents: []
EOF

cat > "$GAME_DIR/human/graveyard.yaml" << 'EOF'
graveyard: []
EOF

cat > "$GAME_DIR/human/exile.yaml" << 'EOF'
exile: []
EOF

cat > "$GAME_DIR/human/hand_count.yaml" << 'EOF'
hand_count: 7
EOF

cat > "$GAME_DIR/human/library_count.yaml" << 'EOF'
library_count: 53
EOF

cat > "$GAME_DIR/human/mana_pool.yaml" << 'EOF'
pool:
  W: 0
  U: 0
  B: 0
  R: 0
  G: 0
  C: 0
EOF

# Shared state
cat > "$GAME_DIR/meta.yaml" << EOF
game_id: "$GAME_ID"
turn: 0
phase: "pregame"
active_player: ""
priority: ""
starting_player: ""
status: "in_progress"
EOF

cat > "$GAME_DIR/stack.yaml" << 'EOF'
stack: []
EOF

# Reset game log
> "$REPO_ROOT/log/game.md"

echo "Game state reset."

# Step 3: Draw opening hand
echo ""
echo "Drawing opening hand (7 cards)..."
"$SCRIPT_DIR/draw.sh" 7

echo ""
echo "=== Game initialized ==="
echo "Next steps:"
echo "  1. Run 'scripts/roll.sh' to determine who goes first"
echo "  2. Handle mulligans if needed ('scripts/mulligan.sh N')"
echo "  3. Start playing!"
