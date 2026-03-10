import type { PlayerState } from "../types/gameState";
import Battlefield from "./Battlefield";
import HandZone from "./HandZone";
import LibraryZone from "./LibraryZone";
import CardStack from "./CardStack";
import ManaPool from "./ManaPool";

interface Props {
  player: PlayerState;
  side: "self" | "opponent";
}

export default function PlayerZone({ player, side }: Props) {
  return (
    <div className={`player-zone player-zone-${side}`}>
      <div className="zone-sidebar">
        <LibraryZone count={player.library_count} />
        <div className="zone-piles">
          <CardStack cards={player.graveyard} label="Graveyard" />
          <CardStack cards={player.exile} label="Exile" />
        </div>
        <ManaPool pool={player.mana_pool} />
      </div>
      <div className="zone-main">
        <Battlefield permanents={player.battlefield} />
      </div>
      <div className="zone-hand-area">
        <HandZone count={player.hand_count} />
      </div>
    </div>
  );
}
