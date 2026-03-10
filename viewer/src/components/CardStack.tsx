import { useState } from "react";
import type { GraveyardCard } from "../types/gameState";

interface Props {
  cards: GraveyardCard[];
  label: string;
}

export default function CardStack({ cards, label }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-stack-zone">
      <button
        className="card-stack-button"
        onClick={() => cards.length > 0 && setExpanded(!expanded)}
        disabled={cards.length === 0}
      >
        {label}: {cards.length}
      </button>
      {expanded && cards.length > 0 && (
        <div className="card-stack-list">
          {cards.map((card, i) => (
            <div key={card.id || i} className="card-stack-entry">
              <span className="card-stack-name">{card.name}</span>
              <span className="card-stack-type">
                {card.card_data?.type_line}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
