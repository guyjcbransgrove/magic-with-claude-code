import type { Permanent } from "../types/gameState";
import Card from "./Card";

interface Props {
  permanents: Permanent[];
  side: "self" | "opponent";
}

interface LandGroup {
  name: string;
  tappedCount: number;
  untappedCount: number;
  sample: Permanent;
}

function getLandColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("plains")) return "land-W";
  if (lower.includes("island")) return "land-U";
  if (lower.includes("swamp")) return "land-B";
  if (lower.includes("mountain")) return "land-R";
  if (lower.includes("forest")) return "land-G";
  return "land-C";
}

export default function Battlefield({ permanents, side }: Props) {
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
      if (land.status?.tapped) {
        existing.tappedCount++;
      } else {
        existing.untappedCount++;
      }
    } else {
      const group: LandGroup = {
        name: land.name,
        tappedCount: land.status?.tapped ? 1 : 0,
        untappedCount: land.status?.tapped ? 0 : 1,
        sample: land,
      };
      landMap.set(land.name, group);
      landGroups.push(group);
    }
  }

  const totalCount = (g: LandGroup) => g.tappedCount + g.untappedCount;

  // For opponent: lands top (back), creatures bottom (front toward center)
  // For self: creatures top (front toward center), lands bottom (back)
  const landsRow = (
    <div className="battlefield-row battlefield-row-lands" key="lands">
      {landGroups.map((group) => (
        <div
          key={group.name}
          className={`land-group ${getLandColor(group.name)} ${group.untappedCount === 0 ? "land-all-tapped" : ""}`}
        >
          <div className="land-card-pile">
            {totalCount(group) > 1 &&
              Array.from({ length: Math.min(totalCount(group) - 1, 2) }).map((_, i) => (
                <div key={i} className="land-card-shadow" style={{ top: `${(i + 1) * 2}px`, left: `${(i + 1) * 2}px` }} />
              ))}
            <div className={`land-card ${group.untappedCount === 0 ? "tapped" : ""}`}>
              <span className="land-name">{group.name}</span>
              {totalCount(group) > 1 && (
                <span className="land-count">x{totalCount(group)}</span>
              )}
              {group.tappedCount > 0 && group.untappedCount > 0 && (
                <span className="land-tap-info">{group.untappedCount} up</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const otherRow = other.length > 0 ? (
    <div className="battlefield-row battlefield-row-other" key="other">
      {other.map((p) => (
        <Card key={p.id} permanent={p} />
      ))}
    </div>
  ) : null;

  const creaturesRow = (
    <div className="battlefield-row battlefield-row-creatures" key="creatures">
      {creatures.map((p) => (
        <Card key={p.id} permanent={p} />
      ))}
    </div>
  );

  // Opponent: lands (back) → other → creatures (front, near center)
  // Self: creatures (front, near center) → other → lands (back)
  const rows = side === "opponent"
    ? [landsRow, otherRow, creaturesRow]
    : [creaturesRow, otherRow, landsRow];

  return (
    <div className={`battlefield battlefield-${side}`}>
      {rows}
    </div>
  );
}
