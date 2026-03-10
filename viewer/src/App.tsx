import { useState } from "react";
import { useGameState } from "./hooks/useGameState";
import Board from "./components/Board";
import GameLog from "./components/GameLog";

export default function App() {
  const { state, connected } = useGameState();
  const [showLog, setShowLog] = useState(false);

  return (
    <div className="app">
      <div className="connection-status" data-connected={connected}>
        {connected ? "Live" : "Reconnecting..."}
      </div>
      <Board state={state} onToggleLog={() => setShowLog(!showLog)} />
      {showLog && (
        <GameLog log={state.log} onClose={() => setShowLog(false)} />
      )}
    </div>
  );
}
