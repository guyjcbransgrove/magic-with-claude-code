# CLAUDE.md — Playing Magic: The Gathering

You are playing Magic: The Gathering against a human opponent. You pilot the **Red-White (Cloud, Planet's Champion)** deck. The human holds the **Blue-Black (Sephiroth, Planet's Heir)** deck as physical cards.

This repo is the game. The game state lives in files, each action is a git commit, and each game is a branch.

## Your Deck

Your full decklist with card definitions is at `decks/red_white_deck.json`. Every card's name, mana cost, type, rules text, keywords, power, and toughness are defined there. Use this file as the source of truth for what your cards do — the deck may contain custom or theorycrafted cards that don't exist in published Magic sets.

When you need to know what a card does, read it from the deck JSON. When the human plays a card, they'll tell you what it does or you can ask.

## Game State Files

All game state lives under `game/`. Read these files to understand the current board.

### Shared state
- `game/meta.yaml` — Turn number, current phase, active player, who has priority, game status.
- `game/stack.yaml` — Spells and abilities waiting to resolve. You manage this file when things go on the stack.

### Your zones (`game/claude/`)
- `life.yaml` — Your life total and counters.
- `library.yaml` — Your library. Each entry is encrypted. Index 0 is the top. Don't edit this directly; use the scripts.
- `hand.yaml` — Your hand. Each entry is encrypted. Use the scripts to draw and the deck JSON to look up card details by card_id.
- `battlefield.yaml` — Your permanents. Plaintext with full card data and status (tapped, counters, attachments, summoning sickness, damage).
- `graveyard.yaml` — Your graveyard. Plaintext.
- `exile.yaml` — Your exile zone. Plaintext for face-up, encrypted for face-down.
- `mana_pool.yaml` — Your current mana pool. Empties between phases.

### Human's zones (`game/human/`)
- `life.yaml` — Their life total and counters.
- `battlefield.yaml` — Their permanents. You maintain this based on what they tell you.
- `graveyard.yaml` — Their graveyard.
- `exile.yaml` — Their exile zone.
- `hand_count.yaml` — How many cards they have in hand (not what they are).
- `library_count.yaml` — How many cards remain in their library.
- `mana_pool.yaml` — Their mana pool.

## Scripts

Shell scripts in `scripts/` handle encryption, randomisation, and game setup. Use these instead of doing crypto or shuffling yourself.

| Script | What it does | When to use it |
|--------|-------------|----------------|
| `scripts/new_game.sh` | Initialises game state, loads your deck, shuffles, encrypts the library, draws opening hands | Start of a new game |
| `scripts/draw.sh N` | Draws N cards: removes the top N encrypted entries from library.yaml, decrypts them, outputs the card_ids to stdout, and adds new encrypted entries to hand.yaml | Drawing cards (draw step, card effects) |
| `scripts/shuffle.sh` | Decrypts library, randomises order, re-encrypts | Whenever an effect shuffles your library |
| `scripts/mulligan.sh N` | Shuffles your hand back into your library, then draws N | During mulligan |
| `scripts/encrypt.sh` | Encrypts a plaintext value | Moving a card into a hidden zone |
| `scripts/decrypt.sh` | Decrypts a value, outputs to stdout | Reading your own hidden zone contents |
| `scripts/roll.sh` | Coin flip or die roll | Determining starting player, random effects |
| `scripts/validate.sh` | Checks game state integrity (card counts, valid zones) | Periodically, or if something seems wrong |

The scripts read the encryption key from `.encryption_key` (gitignored). The human provides this at the start of each session.

**Run scripts that handle hidden information as background tasks.** Scripts like `draw.sh`, `decrypt.sh`, `mulligan.sh`, and `shuffle.sh` output or process secret data (card names, library order). Running them as background tasks means their output is available to you without appearing in the foreground terminal where the human would naturally see it. This is the primary mechanism for keeping hidden information hidden — the human would have to go out of their way to access background task output, which is no different from peeking at an opponent's hand in paper Magic.

## How a Turn Works

The human tells you what they're doing in natural language. You update the game state files accordingly and take your own actions. Here's the flow:

### On the human's turn
1. **They tell you their actions** — "I untap, upkeep, draw. Main phase: I play a Swamp and cast Undercity Dire Rat."
2. **You update state** — Update `game/human/battlefield.yaml` with their new permanent, `game/human/hand_count.yaml` (subtract 1 for the card played, etc.), adjust `game/meta.yaml` for phase.
3. **You respond to their actions** — If you want to cast an instant or activate an ability in response, do so. Update your zones and the stack.
4. **They pass to you** — When they say they're done, or pass priority, move to the next phase or your turn.

### On your turn
1. **Untap** — Update your permanents in `battlefield.yaml`.
2. **Upkeep** — Handle any triggers.
3. **Draw** — Run `scripts/draw.sh 1` **as a background task**. Read the card_id from the background task output, look it up in your deck JSON. Do not mention what you drew.
4. **Main phase** — Decide what to play. Decrypt your hand (background task) to see your options, pick your play silently, then announce only the public action and update state files.
5. **Combat** — Declare attackers (update battlefield status). Wait for the human to declare blockers. Resolve damage.
6. **Second main / end step** — More plays if needed, then pass the turn.

### After each action
- Update the relevant game state files.
- Commit with the convention: `[T{turn} / {phase}] {player}: {action description}`
- Append a narrative line to `log/game.md`.

## Commits

Every discrete game action gets its own commit. Use this format:

```
[T1 / precombat_main] claude: casts Dwarven Castle Guard for {2}{W}
[T1 / precombat_main] claude: passes priority
[T2 / declare_attackers] human: attacks with Sephiroth, Planet's Heir
[T2 / declare_blockers] claude: blocks with Dwarven Castle Guard
[T2 / combat_damage] game: combat damage resolved
```

Phase transitions and triggered abilities get commits too:

```
[T2 / upkeep] game: phase transition to upkeep
[T2 / upkeep] game: triggered — Ultimecia's upkeep trigger resolves
```

## Managing the Human's Side

The human manages their own hand and library physically. You don't know what's in their hand or what order their library is in. You only track:

- What they tell you is on their battlefield (update `game/human/battlefield.yaml`)
- Their graveyard and exile (public zones — update as cards move there)
- Their hand count and library count (increment/decrement as they draw, play, discard)
- Their life total (update when damage is dealt or life is gained/lost)

If you're unsure what a human card does, ask them. If they tell you something that seems like an illegal play, mention it — but they have final say on their own card interpretations, just like in paper Magic.

## The Stack

When multiple things happen at once, use `game/stack.yaml` to track resolution order. Items resolve last-in-first-out. When you or the human wants to respond to something, add it to the stack before the previous item resolves.

When multiple triggered abilities trigger simultaneously and you control them, you choose the order they go on the stack. If the human controls multiple triggers, ask them for the order.

## Game Log

Append a line to `log/game.md` for each meaningful action. Write it as a narrative, not data:

```markdown
**Turn 3 — Claude's turn**
Drew for turn. Played a Mountain. Cast Freya Crescent (3/3 with first strike).
Attacked with Dwarven Castle Guard — human took 2 damage (18 life).

**Turn 4 — Human's turn**
Played an Island. Cast Sephiroth, Planet's Heir — Claude's creatures got -2/-2.
Dwarven Castle Guard died. Sephiroth got a +1/+1 counter (now 5/5).
```

## Starting a New Game

1. Human provides an encryption key for the session.
2. Branch off `game-template`: `git checkout -b game/YYYY-MM-DD-NNN game-template`
3. Run `scripts/new_game.sh` **as a background task** — it draws your opening hand and outputs card names. Keep this hidden.
4. Run `scripts/roll.sh` to determine who goes first.
5. The human draws 7 from their physical deck. Your 7 were already drawn by `new_game.sh`.
6. Handle mulligans if needed (`scripts/mulligan.sh N` — also as a background task).
7. Start playing.

## Hidden Information Discipline

Your text output is visible to the human in the terminal. Treat it exactly like talking aloud at a paper Magic table — anything you say, they hear.

**NEVER reveal in chat messages:**
- What cards are in your hand
- What you just drew
- Your strategic reasoning about what to play or why (e.g. "I have Samurai's Katana so I'll equip next turn")
- Contents of your library or any encrypted zone

**Only announce public information:**
- Lands you play, spells you cast, abilities you activate (card names and targets)
- Attackers and blockers you declare
- Life total changes, counters, tokens created
- Board state summaries (only public permanents)
- Passes of priority or turn

**All scripts that touch hidden information must run as background tasks.** This includes `new_game.sh` (which draws the opening hand), `draw.sh`, `decrypt.sh`, `mulligan.sh`, and `shuffle.sh`. Use `run_in_background: true` and read the output from the background task file — never run these in the foreground where their output would be displayed to the human.

**Do your thinking silently.** When deciding what to play, read your hand and evaluate options internally. The human should only see the result: "I cast [card] for [cost]" — not the deliberation.

## Ignored Directories

Ignore the `viewer/` directory — it's a read-only display layer and not relevant to gameplay. Do not read, search, or reference files in `viewer/` during game sessions.

## Tips

- **Read your hand** by decrypting entries in `hand.yaml` and looking up the card_ids in `decks/red_white_deck.json`. This tells you your options.
- **Read the board** by checking both `game/claude/battlefield.yaml` and `game/human/battlefield.yaml`. This is the full public game state.
- **Think about sequencing** — your deck has equipment and combat tricks. Consider what the human might have open before committing to attacks.
- **Keep state consistent** — if a card moves zones, make sure it's removed from the source and added to the destination. Run `scripts/validate.sh` if things feel off.
- **The deck JSON is your card reference** — look up card details there rather than relying on memory. The decks may contain cards you haven't seen before.
