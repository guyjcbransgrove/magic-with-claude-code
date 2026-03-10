export interface CardData {
  mana_cost: string;
  type_line: string;
  oracle_text: string;
  colors?: string[];
  keywords?: string[];
  power?: string;
  toughness?: string;
  rarity?: string;
}

export interface PermanentStatus {
  tapped: boolean;
  summoning_sick: boolean;
  counters: Record<string, number>;
  attached: Permanent[];
  damage_marked: number;
  is_token: boolean;
}

export interface Permanent {
  id: string;
  name: string;
  card_data: CardData;
  status: PermanentStatus;
}

export interface StackItem {
  id: string;
  controller: string;
  source: string;
  type: "spell" | "activated_ability" | "triggered_ability";
  description: string;
  targets: string[];
  pending_resolution: boolean;
}

export interface ManaPool {
  W: number;
  U: number;
  B: number;
  R: number;
  G: number;
  C: number;
}

export interface GraveyardCard {
  id: string;
  name: string;
  card_data: CardData;
}

export interface PlayerState {
  life: number;
  poison_counters: number;
  battlefield: Permanent[];
  graveyard: GraveyardCard[];
  exile: GraveyardCard[];
  hand_count: number;
  library_count: number;
  mana_pool: ManaPool;
}

export interface MetaState {
  game_id: string;
  turn: number;
  phase: string;
  active_player: string;
  priority: string;
  starting_player: string;
  status: string;
}

export interface GameState {
  meta: MetaState;
  stack: StackItem[];
  claude: PlayerState;
  human: PlayerState;
  log: string;
}

export const PHASE_ORDER = [
  "untap",
  "upkeep",
  "draw",
  "precombat_main",
  "begin_combat",
  "declare_attackers",
  "declare_blockers",
  "combat_damage",
  "end_combat",
  "postcombat_main",
  "end_step",
  "cleanup",
] as const;

export const PHASE_LABELS: Record<string, string> = {
  untap: "Untap",
  upkeep: "Upkeep",
  draw: "Draw",
  precombat_main: "Main 1",
  begin_combat: "Begin Combat",
  declare_attackers: "Attackers",
  declare_blockers: "Blockers",
  combat_damage: "Damage",
  end_combat: "End Combat",
  postcombat_main: "Main 2",
  end_step: "End",
  cleanup: "Cleanup",
};

export const MANA_COLORS: Record<string, string> = {
  W: "#f9faf4",
  U: "#0e68ab",
  B: "#150b00",
  R: "#d3202a",
  G: "#00733e",
  C: "#ccc2c0",
};
