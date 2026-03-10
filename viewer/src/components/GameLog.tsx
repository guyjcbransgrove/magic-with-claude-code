import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  log: string;
  onClose: () => void;
}

export default function GameLog({ log, onClose }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  return (
    <div className="game-log-overlay">
      <div className="game-log-panel">
        <div className="game-log-header">
          <span>Game Log</span>
          <button className="game-log-close" onClick={onClose}>
            X
          </button>
        </div>
        <div className="game-log-content">
          {log ? (
            <ReactMarkdown>{log}</ReactMarkdown>
          ) : (
            <p className="game-log-empty">No log entries yet.</p>
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
