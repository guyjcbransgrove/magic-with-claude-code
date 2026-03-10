import type { GameState } from "../types/gameState";
import PlayerZone from "./PlayerZone";
import StackDisplay from "./StackDisplay";
import PhaseTracker from "./PhaseTracker";

interface Props {
  state: GameState;
  onToggleLog: () => void;
}

export default function Board({ state, onToggleLog }: Props) {
  return (
    <div className="board">
      <div className="board-header">
        <span className="player-label">
          Claude — {state.claude.life} life
          {state.claude.poison_counters > 0 &&
            ` / ${state.claude.poison_counters} poison`}
        </span>
        <PhaseTracker meta={state.meta} />
        <button className="log-toggle" onClick={onToggleLog}>
          Log
        </button>
      </div>

      <PlayerZone player={state.claude} side="opponent" />

      {state.stack.length > 0 && <StackDisplay stack={state.stack} />}

      <PlayerZone player={state.human} side="self" />

      <div className="board-footer">
        <span className="player-label">
          Human — {state.human.life} life
          {state.human.poison_counters > 0 &&
            ` / ${state.human.poison_counters} poison`}
        </span>
        <ManaPool pool={state.human.mana_pool} />
      </div>
    </div>
  );
}

function ManaPool({ pool }: { pool: GameState["human"]["mana_pool"] }) {
  const active = Object.entries(pool).filter(([, v]) => v > 0);
  if (active.length === 0) return null;
  return (
    <div className="mana-pool-inline">
      {active.map(([color, count]) => (
        <span key={color} className={`mana-pip mana-${color}`}>
          {count > 1 ? `${count}` : ""}{color}
        </span>
      ))}
    </div>
  );
}
