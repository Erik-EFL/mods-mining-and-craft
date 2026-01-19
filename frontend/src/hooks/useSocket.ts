import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface UpdateProgress {
  current: number;
  total: number;
  percentage: number;
  currentMod: string;
  estimatedTimeRemaining?: number;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:3001", {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Conectado ao servidor");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Desconectado do servidor");
      setConnected(false);
    });

    socket.on("update-progress", (data: UpdateProgress) => {
      setProgress(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const stopUpdate = () => {
    if (socketRef.current) {
      socketRef.current.emit("stop-update");
    }
  };

  const resetProgress = () => {
    setProgress(null);
  };

  return {
    connected,
    progress,
    stopUpdate,
    resetProgress,
  };
}
