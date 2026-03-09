#!/bin/bash
# Validate game state integrity — check card counts, file existence, life totals

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GAME_DIR="$REPO_ROOT/game"

python - "$GAME_DIR" << 'PYEOF'
import sys, os, re

game_dir = sys.argv[1]
errors = []
warnings = []

def read_encrypted_list(filepath):
    """Count entries in a YAML list of encrypted strings."""
    entries = []
    if not os.path.exists(filepath):
        return entries
    with open(filepath) as f:
        for line in f:
            s = line.strip()
            if s.startswith('- "') and s.endswith('"'):
                entries.append(s[3:-1])
    return entries

def count_permanents(filepath):
    """Count top-level entries in a YAML list of permanent objects."""
    count = 0
    if not os.path.exists(filepath):
        return 0
    with open(filepath) as f:
        for line in f:
            # Match top-level list items (2-space indent)
            if re.match(r'^  - id:', line) or re.match(r'^  - card_id:', line):
                count += 1
    return count

def read_yaml_value(filepath, key):
    if not os.path.exists(filepath):
        return None
    with open(filepath) as f:
        for line in f:
            s = line.strip()
            if s.startswith(f'{key}:'):
                val = s[len(key) + 1:].strip().strip('"')
                try:
                    return int(val)
                except ValueError:
                    return val
    return None

print("=== Game State Validation ===\n")

# Check required files exist
required_files = [
    'meta.yaml', 'stack.yaml',
    'claude/life.yaml', 'claude/library.yaml', 'claude/hand.yaml',
    'claude/battlefield.yaml', 'claude/graveyard.yaml', 'claude/exile.yaml',
    'claude/mana_pool.yaml',
    'human/life.yaml', 'human/battlefield.yaml', 'human/graveyard.yaml',
    'human/exile.yaml', 'human/hand_count.yaml', 'human/library_count.yaml',
    'human/mana_pool.yaml',
]

for f in required_files:
    path = os.path.join(game_dir, f)
    if not os.path.exists(path):
        errors.append(f"Missing file: game/{f}")
    else:
        print(f"  [OK] game/{f}")

# Count Claude's cards across zones
library_count = len(read_encrypted_list(os.path.join(game_dir, 'claude/library.yaml')))
hand_count = len(read_encrypted_list(os.path.join(game_dir, 'claude/hand.yaml')))
bf_count = count_permanents(os.path.join(game_dir, 'claude/battlefield.yaml'))
gy_count = count_permanents(os.path.join(game_dir, 'claude/graveyard.yaml'))
ex_count = count_permanents(os.path.join(game_dir, 'claude/exile.yaml'))

total = library_count + hand_count + bf_count + gy_count + ex_count

print(f"\n--- Claude's card zones ---")
print(f"  Library:     {library_count}")
print(f"  Hand:        {hand_count}")
print(f"  Battlefield: {bf_count}")
print(f"  Graveyard:   {gy_count}")
print(f"  Exile:       {ex_count}")
print(f"  Total:       {total}")

if total > 0 and total != 60:
    warnings.append(f"Claude's total card count is {total} (expected 60)")

# Life totals
claude_life = read_yaml_value(os.path.join(game_dir, 'claude/life.yaml'), 'life')
human_life = read_yaml_value(os.path.join(game_dir, 'human/life.yaml'), 'life')

print(f"\n--- Life totals ---")
print(f"  Claude: {claude_life}")
print(f"  Human:  {human_life}")

if isinstance(claude_life, int) and claude_life <= 0:
    warnings.append(f"Claude's life is {claude_life}")
if isinstance(human_life, int) and human_life <= 0:
    warnings.append(f"Human's life is {human_life}")

# Game meta
status = read_yaml_value(os.path.join(game_dir, 'meta.yaml'), 'status')
turn = read_yaml_value(os.path.join(game_dir, 'meta.yaml'), 'turn')
phase = read_yaml_value(os.path.join(game_dir, 'meta.yaml'), 'phase')

print(f"\n--- Game meta ---")
print(f"  Status: {status}")
print(f"  Turn:   {turn}")
print(f"  Phase:  {phase}")

# Summary
print(f"\n=== Validation complete ===")
if errors:
    print(f"\n  ERRORS ({len(errors)}):")
    for e in errors:
        print(f"    X {e}")
if warnings:
    print(f"\n  WARNINGS ({len(warnings)}):")
    for w in warnings:
        print(f"    ! {w}")
if not errors and not warnings:
    print("  All checks passed.")

sys.exit(1 if errors else 0)
PYEOF
