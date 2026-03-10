import type { Permanent } from "../types/gameState";
import Card from "./Card";

interface Props {
  permanents: Permanent[];
}

interface LandGroup {
  name: string;
  count: number;
  sample: Permanent;
}

export default function Battlefield({ permanents }: Props) {
  const lands: Permanent[] = [];
  const creatures: Permanent[] = [];
  const other: Permanent[] = [];

  for (const p of permanents) {
    const type = p.card_data?.type_line?.toLowerCase() || "";
    if (type.includes("land")) {
      lands.push(p);
    } else if (type.includes("creature")) {
      creatures.push(p);
    } else {
      other.push(p);
    }
  }

  // Group lands by name
  const landGroups: LandGroup[] = [];
  const landMap = new Map<string, LandGroup>();
  for (const land of lands) {
    const existing = landMap.get(land.name);
    if (existing) {
      existing.count++;
      // Show tapped state from most recent
      if (land.status?.tapped) existing.sample = land;
    } else {
      const group = { name: land.name, count: 1, sample: land };
      landMap.set(land.name, group);
      landGroups.push(group);
    }
  }

  return (
    <div className="battlefield">
      {other.length > 0 && (
        <div className="battlefield-row battlefield-row-other">
          {other.map((p) => (
            <Card key={p.id} permanent={p} />
          ))}
        </div>
      )}
      <div className="battlefield-row battlefield-row-lands">
        {landGroups.map((group) => (
          <div
            key={group.name}
            className={`land-group ${group.sample.status?.tapped ? "tapped" : ""}`}
          >
            <div className="land-card">
              <span className="land-name">{group.name}</span>
              {group.count > 1 && (
                <span className="land-count">x{group.count}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="battlefield-row battlefield-row-creatures">
        {creatures.map((p) => (
          <Card key={p.id} permanent={p} />
        ))}
      </div>
    </div>
  );
}
