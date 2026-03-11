import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { watch } from "chokidar";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";

const GAME_DIR = path.resolve(__dirname, "../../game");
const LOG_FILE = path.resolve(__dirname, "../../log/game.md");
const PORT = 3001;

interface RawYaml {
  [key: string]: unknown;
}

function readYaml(filePath: string): RawYaml {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return (yaml.load(content) as RawYaml) || {};
  } catch {
    return {};
  }
}

function readLog(): string {
  try {
    return fs.readFileSync(LOG_FILE, "utf8");
  } catch {
    return "";
  }
}

function countEncryptedEntries(list: unknown): number {
  if (Array.isArray(list)) return list.length;
  return 0;
}

function parseManaPool(raw: RawYaml): Record<string, number> {
  const pool = (raw.pool as Record<string, number>) || {};
  return {
    W: pool.W || 0,
    U: pool.U || 0,
    B: pool.B || 0,
    R: pool.R || 0,
    G: pool.G || 0,
    C: pool.C || 0,
  };
}

function parsePermanents(raw: RawYaml): unknown[] {
  const permanents = raw.permanents;
  if (!Array.isArray(permanents)) return [];

  // First pass: transform flat YAML into nested structure
  const transformed = permanents.map((p: Record<string, unknown>) => ({
    id: (p.card_id as string) || "",
    name: (p.name as string) || "",
    card_data: {
      mana_cost: (p.mana_cost as string) || "",
      type_line: (p.type_line as string) || "",
      oracle_text: (p.oracle_text as string) || "",
      colors: (p.colors as string[]) || [],
      keywords: (p.keywords as string[]) || [],
      power: p.power != null ? String(p.power) : undefined,
      toughness: p.toughness != null ? String(p.toughness) : undefined,
    },
    status: {
      tapped: Boolean(p.tapped),
      summoning_sick: Boolean(p.summoning_sickness),
      counters: (p.counters as Record<string, number>) || {},
      attached: [] as unknown[],
      damage_marked: (p.damage_marked as number) || 0,
      is_token: Boolean(p.is_token) || String(p.card_id || "").includes("token"),
    },
    _attached_to: (p.attached_to as string) || null,
  }));

  // Second pass: resolve equipment attachments
  const byId = new Map(transformed.map((t) => [t.id, t]));
  for (const t of transformed) {
    if (t._attached_to) {
      const host = byId.get(t._attached_to);
      if (host) {
        host.status.attached.push({
          id: t.id,
          name: t.name,
          card_data: t.card_data,
          status: t.status,
        });
      }
    }
  }

  // Filter out attached equipment from top-level list
  return transformed
    .filter((t) => !t._attached_to)
    .map(({ _attached_to, ...rest }) => rest);
}

function parseCards(raw: RawYaml, key: string): unknown[] {
  const cards = raw[key];
  if (!Array.isArray(cards)) return [];
  return cards.map((c: Record<string, unknown>) => ({
    id: (c.card_id as string) || "",
    name: (c.name as string) || "",
    card_data: {
      mana_cost: (c.mana_cost as string) || "",
      type_line: (c.type_line as string) || "",
      oracle_text: (c.oracle_text as string) || "",
      power: c.power != null ? String(c.power) : undefined,
      toughness: c.toughness != null ? String(c.toughness) : undefined,
    },
  }));
}

function buildGameState() {
  const meta = readYaml(path.join(GAME_DIR, "meta.yaml"));
  const stackRaw = readYaml(path.join(GAME_DIR, "stack.yaml"));

  // Claude's state
  const claudeLife = readYaml(path.join(GAME_DIR, "claude/life.yaml"));
  const claudeLibrary = readYaml(path.join(GAME_DIR, "claude/library.yaml"));
  const claudeHand = readYaml(path.join(GAME_DIR, "claude/hand.yaml"));
  const claudeBattlefield = readYaml(
    path.join(GAME_DIR, "claude/battlefield.yaml")
  );
  const claudeGraveyard = readYaml(
    path.join(GAME_DIR, "claude/graveyard.yaml")
  );
  const claudeExile = readYaml(path.join(GAME_DIR, "claude/exile.yaml"));
  const claudeMana = readYaml(path.join(GAME_DIR, "claude/mana_pool.yaml"));

  // Human's state
  const humanLife = readYaml(path.join(GAME_DIR, "human/life.yaml"));
  const humanBattlefield = readYaml(
    path.join(GAME_DIR, "human/battlefield.yaml")
  );
  const humanGraveyard = readYaml(path.join(GAME_DIR, "human/graveyard.yaml"));
  const humanExile = readYaml(path.join(GAME_DIR, "human/exile.yaml"));
  const humanHandCount = readYaml(
    path.join(GAME_DIR, "human/hand_count.yaml")
  );
  const humanLibraryCount = readYaml(
    path.join(GAME_DIR, "human/library_count.yaml")
  );
  const humanMana = readYaml(path.join(GAME_DIR, "human/mana_pool.yaml"));

  const log = readLog();

  return {
    meta: {
      game_id: meta.game_id || "",
      turn: meta.turn || 0,
      phase: meta.phase || "pregame",
      active_player: meta.active_player || "",
      priority: meta.priority || "",
      starting_player: meta.starting_player || "",
      status: meta.status || "not_started",
    },
    stack: Array.isArray(stackRaw.stack) ? stackRaw.stack : [],
    claude: {
      life: claudeLife.life ?? 20,
      poison_counters: claudeLife.poison_counters ?? 0,
      battlefield: parsePermanents(claudeBattlefield),
      graveyard: parseCards(claudeGraveyard, "graveyard"),
      exile: parseCards(claudeExile, "exile"),
      hand_count: countEncryptedEntries(claudeHand.hand),
      library_count: countEncryptedEntries(claudeLibrary.library),
      mana_pool: parseManaPool(claudeMana),
    },
    human: {
      life: humanLife.life ?? 20,
      poison_counters: humanLife.poison_counters ?? 0,
      battlefield: parsePermanents(humanBattlefield),
      graveyard: parseCards(humanGraveyard, "graveyard"),
      exile: parseCards(humanExile, "exile"),
      hand_count: humanHandCount.hand_count ?? 0,
      library_count: humanLibraryCount.library_count ?? 0,
      mana_pool: parseManaPool(humanMana),
    },
    log,
  };
}

// Express + WebSocket setup
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// Serve built frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

// Broadcast state to all connected clients
function broadcast() {
  const state = buildGameState();
  const payload = JSON.stringify(state);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Send initial state on connection
wss.on("connection", (ws) => {
  console.log("Client connected");
  const state = buildGameState();
  ws.send(JSON.stringify(state));

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Watch game files with debounce
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const watcher = watch([`${GAME_DIR}/**/*.yaml`, LOG_FILE], {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 },
});

watcher.on("all", (_event, filePath) => {
  console.log(`File changed: ${filePath}`);
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(broadcast, 100);
});

server.listen(PORT, () => {
  console.log(`Game viewer server running on http://localhost:${PORT}`);
  console.log(`Watching: ${GAME_DIR}`);
});
