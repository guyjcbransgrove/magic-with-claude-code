import { useState, useEffect, useRef, useCallback } from "react";
import type { GameState } from "../types/gameState";

const INITIAL_STATE: GameState = {
  meta: {
    game_id: "",
    turn: 0,
    phase: "pregame",
    active_player: "",
    priority: "",
    starting_player: "",
    status: "not_started",
  },
  stack: [],
  claude: {
    life: 20,
    poison_counters: 0,
    battlefield: [],
    graveyard: [],
    exile: [],
    hand_count: 0,
    library_count: 0,
    mana_pool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
  },
  human: {
    life: 20,
    poison_counters: 0,
    battlefield: [],
    graveyard: [],
    exile: [],
    hand_count: 0,
    library_count: 0,
    mana_pool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
  },
  log: "",
};

export function useGameState(): {
  state: GameState;
  connected: boolean;
} {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log("Connected to game server");
    };

    ws.onmessage = (event) => {
      try {
        const newState = JSON.parse(event.data) as GameState;
        setState(newState);
      } catch (e) {
        console.error("Failed to parse game state:", e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Reconnect after 2 seconds
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { state, connected };
}
