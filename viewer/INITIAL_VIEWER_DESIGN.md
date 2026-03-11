# Game Viewer — Design

A React app that watches the game state files in real time and renders a visual MTG board, similar in layout to Arena or MTGO.

## Architecture

```
viewer/
├── package.json
├── tsconfig.json
├── server/
│   └── index.ts              # Express + chokidar + WebSocket server
└── src/
    ├── App.tsx                # Main layout — board composition
    ├── index.tsx              # Entry point
    ├── types/
    │   └── gameState.ts       # Shared type definitions for game state
    ├── hooks/
    │   └── useGameState.ts    # WebSocket hook — receives parsed state
    ├── components/
    │   ├── Board.tsx           # Full board layout (opponent top, you bottom)
    │   ├── PlayerZone.tsx      # One player's full zone (battlefield, hand, etc.)
    │   ├── Battlefield.tsx     # Spatial permanent layout (lands back, creatures front)
    │   ├── Card.tsx            # Single card rendering
    │   ├── CardStack.tsx       # Graveyard/exile pile (click to expand)
    │   ├── HandZone.tsx        # Hand display (count for hidden, fanned for public)
    │   ├── LibraryZone.tsx     # Library (face-down pile with count)
    │   ├── LifeTotal.tsx       # Life display with change animation
    │   ├── ManaPool.tsx        # Current mana pool (WUBRG pips)
    │   ├── StackDisplay.tsx    # The MTG stack (sidebar or overlay)
    │   ├── PhaseTracker.tsx    # Current turn/phase indicator
    │   └── GameLog.tsx         # Scrolling narrative log
    └── styles/
        └── board.css           # Board layout and card styling
```

## Backend (server/index.ts)

Responsibilities:
- Watch `game/` directory recursively with chokidar
- On any `.yaml` file change, parse all state files into a single game state object
- Push the full state to connected WebSocket clients
- Serve the React frontend in production, or proxy in dev

```
File change detected → Parse all YAML → Build state object → WebSocket broadcast
```

The state object sent to the frontend looks like:

```json
{
  "meta": { "turn": 3, "phase": "precombat_main", "active_player": "claude", "priority": "claude", "status": "in_progress" },
  "stack": [],
  "claude": {
    "life": 18,
    "poison_counters": 0,
    "battlefield": [ /* permanents with full status */ ],
    "graveyard": [ /* cards */ ],
    "exile": [ /* cards */ ],
    "hand_count": 4,
    "library_count": 49,
    "mana_pool": { "W": 0, "R": 0 }
  },
  "human": {
    "life": 20,
    "poison_counters": 0,
    "battlefield": [ /* permanents with full status */ ],
    "graveyard": [ /* cards */ ],
    "exile": [ /* cards */ ],
    "hand_count": 5,
    "library_count": 47,
    "mana_pool": { "U": 0, "B": 0 }
  },
  "log": "**Turn 3 — Claude's turn**\nDrew for turn..."
}
```

Key detail: The backend only reads plaintext files and encrypted card counts. It never decrypts anything. The viewer only shows public information — exactly what both players would see across a physical table.

## Frontend Layout

The board is oriented with Claude (opponent) at the top and the human at the bottom, mirroring a typical Arena/MTGO perspective.

```
┌─────────────────────────────────────────────────────────────┐
│  Claude: 18 life          Turn 3 / Precombat Main    [log]  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────┐  Claude's Battlefield                             │
│  │ 49   │  ┌─────────────────────────────────────────┐      │
│  │cards │  │  Lands (back row): Plains x3, Mountain x2│     │
│  │      │  │  Creatures (front): Cloud 4/4, Guard 2/3 │     │
│  │library│  └─────────────────────────────────────────┘     │
│  └──────┘  [graveyard: 2] [exile: 0]         hand: 4 cards │
├─────────────────────────────────────────────────────────────┤
│                        ┌── Stack ──┐                        │
│                        │ (empty)   │                        │
│                        └───────────┘                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────┐  Human's Battlefield                              │
│  │ 47   │  ┌─────────────────────────────────────────┐      │
│  │cards │  │  Lands (back row): Swamp x4, Island x3  │      │
│  │      │  │  Creatures (front): Sephiroth 5/5        │     │
│  │library│  └─────────────────────────────────────────┘     │
│  └──────┘  [graveyard: 1] [exile: 0]         hand: 5 cards │
├─────────────────────────────────────────────────────────────┤
│  Human: 20 life                                 [mana pool] │
└─────────────────────────────────────────────────────────────┘
```

### Battlefield Rendering

Permanents are laid out spatially:
- **Lands** in a back row, grouped and stacked by name (e.g., "Plains x3" as a slightly fanned pile)
- **Creatures** in a front row, each shown individually with power/toughness, counters, and status
- **Other permanents** (artifacts, enchantments, equipment) rendered contextually — equipment shown attached to their creature, standalone artifacts/enchantments in their own row
- **Tapped permanents** rotated 90 degrees
- **Summoning sick** creatures shown slightly dimmed or with a visual indicator
- **Counters** shown as badges on the card (e.g., "+1/+1 x2")

### Card Rendering

Each card shows:
- Name
- Mana cost (coloured pips)
- Type line
- Power/toughness (for creatures) — adjusted for counters and effects
- Tapped/untapped state
- Attached equipment/auras (shown as smaller cards tucked underneath)

Cards in the graveyard and exile are shown as clickable piles that expand to show the full ordered list.

### Hidden Information Display

- **Claude's hand**: Shows as N face-down card backs
- **Claude's library**: Face-down pile with card count
- **Human's hand**: Same — N face-down card backs
- **Human's library**: Face-down pile with card count

No decryption happens in the viewer. Ever.

### Phase Tracker

A horizontal bar showing all phases of the current turn, with the active phase highlighted. Shows whose turn it is and who has priority.

```
[Untap] [Upkeep] [Draw] [>>Main 1<<] [Combat] [Main 2] [End]
                          ^^^active
```

### Game Log

A scrollable panel (sidebar or drawer) showing the contents of `log/game.md`, rendered as markdown. Auto-scrolls to the latest entry on updates.

### Stack Display

When `stack.yaml` has items, they appear as a floating overlay or sidebar showing each item with its source, description, and targets. Items resolve top to bottom visually (matching last-in-first-out).

## File Watching Strategy

The backend watches `game/**/*.yaml` and `log/game.md`. On change:

1. Debounce by 100ms (commits often touch multiple files at once)
2. Re-read all state files
3. Parse YAML → JSON
4. Diff against last known state (optional — for animations)
5. Broadcast full state to all WebSocket clients

Debouncing is important because a single game action (e.g., combat damage) may update multiple files in quick succession as part of one commit.

## Running the Viewer

```bash
# From the repo root, during a game
cd viewer
npm install        # first time only
npm run dev        # starts backend + React dev server

# Opens at http://localhost:3000
```

The viewer reads from the `game/` directory relative to the repo root. It doesn't need to know which game branch you're on — it just reads whatever state files are in the working tree.

## What the Viewer Does NOT Do

- **No decryption** — it has no access to the encryption key
- **No game logic** — it doesn't validate moves or enforce rules
- **No input** — it's read-only, purely a display layer
- **No network play** — it's local only, watching the filesystem

The viewer is a window onto the game, not a participant in it.