import type { Permanent } from "../types/gameState";

interface Props {
  permanent: Permanent;
}

function parseManaCost(cost: string): string[] {
  const pips: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(cost)) !== null) {
    pips.push(match[1]);
  }
  return pips;
}

function effectivePT(permanent: Permanent): { power: string; toughness: string } | null {
  const cd = permanent.card_data;
  if (!cd?.power || !cd?.toughness) return null;

  let power = parseInt(cd.power, 10);
  let toughness = parseInt(cd.toughness, 10);
  if (isNaN(power) || isNaN(toughness)) {
    return { power: cd.power, toughness: cd.toughness };
  }

  const counters = permanent.status?.counters || {};
  const plus = counters["+1/+1"] || 0;
  const minus = counters["-1/-1"] || 0;
  power += plus - minus;
  toughness += plus - minus;

  const modified = power !== parseInt(cd.power) || toughness !== parseInt(cd.toughness);
  return {
    power: `${power}`,
    toughness: `${toughness}`,
    ...(modified ? { modified: true } : {}),
  } as { power: string; toughness: string };
}

export default function Card({ permanent }: Props) {
  const { name, card_data, status } = permanent;
  const tapped = status?.tapped || false;
  const sick = status?.summoning_sick || false;
  const counters = status?.counters || {};
  const attached = status?.attached || [];
  const damage = status?.damage_marked || 0;
  const pt = effectivePT(permanent);
  const pips = parseManaCost(card_data?.mana_cost || "");

  const counterEntries = Object.entries(counters).filter(([, v]) => v > 0);

  return (
    <div
      className={`card ${tapped ? "card-tapped" : ""} ${sick ? "card-sick" : ""}`}
    >
      <div className="card-header">
        <span className="card-name">{name}</span>
        <span className="card-cost">
          {pips.map((pip, i) => (
            <span key={i} className={`mana-pip mana-${pip}`}>
              {pip}
            </span>
          ))}
        </span>
      </div>
      <div className="card-type">{card_data?.type_line}</div>
      {counterEntries.length > 0 && (
        <div className="card-counters">
          {counterEntries.map(([type, count]) => (
            <span key={type} className="counter-badge">
              {type} x{count}
            </span>
          ))}
        </div>
      )}
      {damage > 0 && <div className="card-damage">{damage} dmg</div>}
      {pt && (
        <div className="card-pt">
          {pt.power}/{pt.toughness}
        </div>
      )}
      {attached.length > 0 && (
        <div className="card-attached">
          {attached.map((a) => (
            <span key={a.id} className="attached-label">
              {a.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
