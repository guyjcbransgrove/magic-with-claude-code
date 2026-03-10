import type { MetaState } from "../types/gameState";
import { PHASE_ORDER, PHASE_LABELS } from "../types/gameState";

interface Props {
  meta: MetaState;
}

export default function PhaseTracker({ meta }: Props) {
  return (
    <div className="phase-tracker">
      <span className="turn-indicator">
        T{meta.turn} &mdash; {meta.active_player || "?"}'s turn
        {meta.priority && meta.priority !== meta.active_player && (
          <span className="priority-indicator"> (priority: {meta.priority})</span>
        )}
      </span>
      <div className="phase-bar">
        {PHASE_ORDER.map((phase) => (
          <span
            key={phase}
            className={`phase-pip ${meta.phase === phase ? "phase-active" : ""}`}
          >
            {PHASE_LABELS[phase]}
          </span>
        ))}
      </div>
    </div>
  );
}
