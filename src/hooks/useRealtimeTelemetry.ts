import { useEffect, useState } from "react";
import { realtimeManager, type LiveTick, type LiveVessel } from "@/services/realtime";

export const useRealtimeTelemetry = (enabled: boolean = true) => {
  const [liveVessels, setLiveVessels] = useState<LiveVessel[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    setIsConnected(true);
    
    const unsubscribe = realtimeManager.subscribeTelemetry(
      (tick: LiveTick) => {
        console.log("📡 Received tick:", tick.vessels.length, "vessels");
        setLiveVessels(tick.vessels);
        setCurrentTraceId(tick.traceId);
        
        if (tick.done) {
          console.log("✅ Stream complete");
          setIsDone(true);
        }
      },
      (error) => {
        console.error("❌ Telemetry error:", error);
        setIsConnected(false);
      }
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
      setLiveVessels([]);
      setIsDone(false);
    };
  }, [enabled]);

  return {
    liveVessels,
    isConnected,
    isDone,
    currentTraceId,
  };
};
