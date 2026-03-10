import type { ManaPool as ManaPoolType } from "../types/gameState";

interface Props {
  pool: ManaPoolType;
}

export default function ManaPool({ pool }: Props) {
  const active = Object.entries(pool).filter(([, v]) => v > 0);
  if (active.length === 0) return null;

  return (
    <div className="mana-pool">
      {active.map(([color, count]) => (
        <span key={color} className={`mana-pip mana-${color}`}>
          {count > 1 && <span className="mana-count">{count}</span>}
          {color}
        </span>
      ))}
    </div>
  );
}
