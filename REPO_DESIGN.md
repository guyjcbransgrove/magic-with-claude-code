# MTG Game Repo — Structure & State Schema Design

## Overview

A git-backed Magic: The Gathering game where Claude Code pilots the Red-White (Cloud) deck digitally against a human player holding the Blue-Black (Sephiroth) deck physically. Each game action is a git commit. The repo is the single source of truth.

## Key Asymmetry

- **Claude Code's side**: Full digital state — deck order, hand contents, all zones. Hidden zones (hand, library) are encrypted at rest.
- **Human's side**: Only public information is tracked — life total, battlefield, graveyard, exile. The human manages their own hand and library physically.

---

## Directory Structure

```
mtg-game/
├── CLAUDE.md                    # Instructions for Claude Code (how to play)
├── README.md                    # Project overview
│
├── decks/
│   └── red_white_deck.json      # Claude Code's full decklist (card definitions)
│
├── scripts/
│   ├── shuffle.sh               # Shuffle a deck/zone (outputs encrypted order)
│   ├── draw.sh                  # Draw N cards (decrypt from library, encrypt into hand)
│   ├── encrypt.sh               # Encrypt a plaintext card/zone
│   ├── decrypt.sh               # Decrypt a card/zone (output to stdout only)
│   ├── mulligan.sh              # Handle mulligan (shuffle hand back, draw N)
│   ├── new_game.sh              # Initialize a fresh game state
│   ├── roll.sh                  # Roll dice / coin flip for starting player
│   └── validate.sh              # Validate game state integrity
│
├── game/
│   ├── meta.yaml                # Game metadata (turn, phase, active player, priority)
│   ├── stack.yaml               # The stack (spells/abilities waiting to resolve)
│   │
│   ├── claude/
│   │   ├── life.yaml            # Life total, counters (poison, energy, etc.)
│   │   ├── library.yaml         # Encrypted card list (ordered)
│   │   ├── hand.yaml            # Encrypted card list
│   │   ├── battlefield.yaml     # Permanents in play (public — plaintext)
│   │   ├── graveyard.yaml       # Public zone — plaintext
│   │   ├── exile.yaml           # Public zone — plaintext (face-down exile is encrypted)
│   │   └── mana_pool.yaml       # Current mana pool
│   │
│   └── human/
│       ├── life.yaml            # Life total, counters
│       ├── battlefield.yaml     # Permanents in play (public)
│       ├── graveyard.yaml       # Public zone
│       ├── exile.yaml           # Public zone
│       ├── hand_count.yaml      # Number of cards in hand (not contents)
│       ├── library_count.yaml   # Number of cards in library (not contents)
│       └── mana_pool.yaml       # Current mana pool
│
├── log/
│   └── game.md                  # Human-readable game narrative log
│
└── .encryption_key              # gitignored — shared at game start via session
```

---

## State Schemas

### game/meta.yaml

```yaml
game_id: "2026-03-10-001"
turn: 1
phase: "precombat_main"     # untap, upkeep, draw, precombat_main, 
                             # begin_combat, declare_attackers, declare_blockers,
                             # combat_damage, end_combat, postcombat_main,
                             # end_step, cleanup
active_player: "human"       # whose turn it is
priority: "human"            # who currently has priority
starting_player: "human"     # determined at game start
status: "in_progress"        # in_progress, human_wins, claude_wins, draw
```

### game/stack.yaml

```yaml
stack:
  - id: "stack_001"
    controller: "claude"
    source: "Lightning, Security Sergeant"    # what produced this
    type: "triggered_ability"                  # spell, activated_ability, triggered_ability
    description: "When Lightning enters, it deals 2 damage to target creature"
    targets:
      - zone: "battlefield"
        player: "human"
        card_id: "bf_h_003"
    pending_resolution: true
```

### game/claude/life.yaml

```yaml
life: 20
poison_counters: 0
# add other counter types as needed
```

### game/claude/battlefield.yaml

```yaml
permanents:
  - id: "bf_c_001"
    name: "Cloud, Planet's Champion"
    card_data:                          # inline card definition for reference
      mana_cost: "{3}{R}{W}"
      type_line: "Legendary Creature — Human Soldier"
      oracle_text: "..."
      power: "4"
      toughness: "4"
    status:
      tapped: false
      summoning_sick: true
      counters:
        "+1/+1": 0
      attached:                         # equipment, auras
        - id: "bf_c_002"
          name: "Warrior's Sword"
      damage_marked: 0
      is_token: false
```

### game/claude/hand.yaml (per-card encryption)

```yaml
# Each entry is individually encrypted via AES-256-CBC.
# Decrypting an entry yields a JSON object like:
#   {"card_id": "rw_017", "name": "Slash of Light"}
# The card_id references the full card definition in decks/red_white_deck.json.
#
# Per-card encryption means:
#   - Drawing only requires decrypting one library entry + encrypting one hand entry
#   - Git diffs show individual cards added/removed, not whole-file blob changes
#   - Card count per zone is visible (public info in MTG rules)

hand:
  - "U2FsdGVkX1+abc123..."
  - "U2FsdGVkX1+def456..."
```

### game/claude/library.yaml (per-card encryption)

```yaml
# Each entry is individually encrypted. Order matters — index 0 is top of library.
# Decrypting an entry yields: {"card_id": "rw_042", "name": "Dwarven Castle Guard"}
# Scripts like draw.sh decrypt only the top N entries without exposing the rest.

library:
  - "U2FsdGVkX1+ghi789..."   # top
  - "U2FsdGVkX1+jkl012..."
  - "U2FsdGVkX1+mno345..."
  # ... (53 entries at game start)
```

### game/claude/graveyard.yaml

```yaml
graveyard:
  - card_id: "rw_009"
    name: "Item Shopkeep"
    card_data:
      mana_cost: "{1}{R}"
      type_line: "Creature — Goblin Merchant"
      oracle_text: "..."
      power: "1"
      toughness: "1"
    turn_entered: 3
```

### game/human/battlefield.yaml

```yaml
# Claude Code tracks what the human tells it is in play
permanents:
  - id: "bf_h_001"
    name: "Sephiroth, Planet's Heir"
    card_data:
      mana_cost: "{4}{U}{B}"
      type_line: "Legendary Creature — Human Avatar Soldier"
      oracle_text: "Vigilance\nWhen Sephiroth enters, creatures your opponents control get -2/-2 until end of turn.\nWhenever a creature an opponent controls dies, put a +1/+1 counter on Sephiroth."
      power: "4"
      toughness: "4"
    status:
      tapped: false
      summoning_sick: false
      counters:
        "+1/+1": 2
      attached: []
      damage_marked: 0
      is_token: false
```

### game/human/hand_count.yaml

```yaml
hand_count: 5
```

### game/human/library_count.yaml

```yaml
library_count: 47
```

### game/claude/mana_pool.yaml

```yaml
pool:
  W: 0
  U: 0
  B: 0
  R: 0
  G: 0
  C: 0    # colorless
```

---

## Git Commit Convention

Each commit represents a discrete game action:

```
[turn X / phase] player: action description

Examples:
[T1 / draw] human: draws for turn
[T1 / precombat_main] claude: casts Dwarven Castle Guard for {2}{W}
[T1 / precombat_main] claude: passes priority
[T2 / declare_attackers] human: attacks with Sephiroth, Planet's Heir
[T2 / declare_blockers] claude: blocks with Dwarven Castle Guard
[T2 / combat_damage] game: combat damage resolved
[T3 / precombat_main] claude: equips Warrior's Sword to Cloud ({1})
```

Phase transitions and triggered abilities also get their own commits:

```
[T2 / upkeep] game: phase transition to upkeep
[T2 / upkeep] game: triggered — Ultimecia's upkeep trigger resolves
```

---

## Encryption Approach

- Algorithm: AES-256-CBC via openssl (available everywhere)
- Granularity: **Per-card** — each card in a hidden zone is individually encrypted
- Key exchange: Human provides key at session start, stored in `.encryption_key` (gitignored)
- Encrypted zones: Individual entries in `claude/hand.yaml`, `claude/library.yaml`, face-down exile
- Public zones are always plaintext: battlefield, graveyard, face-up exile
- Each encrypted string decrypts to a small JSON object: `{"card_id": "rw_017", "name": "Slash of Light"}`
- The `card_id` references the full card definition in the deck JSON file
- Scripts handle all encrypt/decrypt transitions — Claude Code never sees raw openssl commands

**Why per-card, not whole-file:**
1. Git diffs stay meaningful — a draw shows one line removed from library, one added to hand
2. Zone transitions only touch the cards that move — no decrypt-modify-reencrypt of entire files
3. Card count per zone is visible, which is public information under MTG rules
4. Selective decryption for scry/surveil without exposing the full library

**Background tasks for hidden information:**

Scripts that handle secret data (`draw.sh`, `decrypt.sh`, `mulligan.sh`, `shuffle.sh`) should be run by Claude Code as background tasks. This means their output — decrypted card names, library order, etc. — is delivered to Claude Code's process without appearing in the foreground terminal where the human would naturally see it. This is the primary mechanism for keeping hidden information hidden. The human would have to deliberately access background task output to see it, which is no different from peeking at an opponent's hand in paper Magic. The encryption at rest protects the data in the committed files; the background task approach protects it during runtime.

---

## Zone Transitions & Script Usage

| Transition                        | Script          | Notes                                      |
|-----------------------------------|-----------------|--------------------------------------------|
| Game start → shuffle library      | `new_game.sh`   | Loads deck JSON, shuffles, encrypts library |
| Library → hand (draw)             | `draw.sh N`     | Decrypts top N, adds to hand, re-encrypts  |
| Hand → battlefield (cast)         | Claude Code     | Decrypts hand, removes card, updates both   |
| Hand → graveyard (discard)        | Claude Code     | Decrypts hand, moves card, updates both     |
| Battlefield → graveyard (dies)    | Claude Code     | Moves plaintext between public zones        |
| Mulligan                          | `mulligan.sh N` | Shuffles hand into library, draws N         |
| Shuffle library                   | `shuffle.sh`    | Decrypts, randomises, re-encrypts           |
| Coin flip / die roll              | `roll.sh`       | Outputs result to stdout                    |

---

## Branching Strategy

Each game runs in its own branch, forked from a common template branch that holds the default state.

```
main                          # Project docs, README, CLAUDE.md
│
├── game-template             # Clean starting state — branch games off this
│   ├── decks/                #   Deck JSON files
│   ├── scripts/              #   All shell scripts
│   ├── game/                 #   Empty/default state files (life at 20, zones empty, etc.)
│   └── log/                  #   Empty game.md
│
├── game/2026-03-10-001       # First game
│   └── ... commits are game actions
│
├── game/2026-03-11-001       # Second game
│   └── ...
│
└── game/2026-03-11-002       # Third game (two games in one day)
    └── ...
```

**How it works:**

- `game-template` contains the repo structure, scripts, deck files, and initialised-but-empty game state (life totals at 20, empty zones, meta.yaml with defaults). This branch is the "box on the shelf."
- To start a new game: `git checkout -b game/YYYY-MM-DD-NNN game-template`, then run `new_game.sh` to shuffle and set up.
- Each game is fully isolated. You can abandon a game, review old games, or even diff two games against each other.
- `main` holds project-level docs and CLAUDE.md. Changes to scripts or rules update `game-template`, which future games inherit.
- Completed games can be tagged (e.g., `game/2026-03-10-001/complete`) for easy reference.

---

## Design Decisions & Rationale

1. **YAML over JSON for game state**: More readable in diffs, easier for Claude Code to reason about, comments allowed.

2. **Card data inlined in battlefield/graveyard**: So Claude Code can read the board state without cross-referencing the deck file. Slightly redundant but keeps each file self-contained.

3. **Human side tracks only public info**: The human manages their own hidden zones physically. Claude Code only knows hand count and library count.

4. **Each permanent gets a unique ID**: Enables unambiguous targeting for spells and abilities (important when there are multiple copies of a card).

5. **Stack is a first-class file**: MTG's stack is complex. Having it as its own file makes priority passing and resolution explicit in commits.

6. **Game log is narrative**: `log/game.md` is a human-readable story of the game, not a data file. Nice for reviewing games after the fact.

7. **Mana pool is transient**: Empties between phases. Tracked so Claude Code can validate its own casting decisions.

8. **Branch-per-game**: Each game is an isolated branch off `game-template`. Clean separation, easy resets, and the full git history of a game lives in one place. Updating scripts or rules on `game-template` flows into future games without touching past ones.

9. **Card-agnostic by design**: The system is not restricted to real, published, or currently known Magic cards. Every card is fully defined in the deck JSON files — name, mana cost, type, rules text, keywords, power/toughness — so Claude Code derives its understanding of each card entirely from that data. This means decks can include real cards, brand-new cards from unreleased sets, or entirely theorycrafted custom cards, and gameplay works the same. Claude Code should ideally use the deck JSON as the source of truth for what a card does.
