import type { StackItem } from "../types/gameState";

interface Props {
  stack: StackItem[];
}

export default function StackDisplay({ stack }: Props) {
  return (
    <div className="stack-display">
      <div className="stack-label">Stack</div>
      <div className="stack-items">
        {stack.map((item, i) => (
          <div key={item.id || i} className="stack-item">
            <div className="stack-item-header">
              <span className="stack-item-source">{item.source}</span>
              <span className="stack-item-controller">({item.controller})</span>
            </div>
            <div className="stack-item-description">{item.description}</div>
            {item.targets && item.targets.length > 0 && (
              <div className="stack-item-targets">
                Target: {item.targets.join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
