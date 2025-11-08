import { useEffect, useState } from "react";
import { toast } from "sonner";
import { realtimeManager, type LiveTick, type LiveVessel } from "@/services/realtime";

export const useRealtimeTelemetry = (enabled: boolean = true) => {
  const [liveVessels, setLiveVessels] = useState<LiveVessel[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    setIsConnected(true);
    toast.success("Live stream connected", {
      description: "Receiving real-time telemetry",
    });
    
    const unsubscribe = realtimeManager.subscribeTelemetry(
      (tick: LiveTick) => {
        console.log("📡 Received tick:", tick.vessels.length, "vessels");
        setLiveVessels(tick.vessels);
        setCurrentTraceId(tick.traceId);
        
        if (tick.done) {
          console.log("✅ Stream complete");
          setIsDone(true);
          toast.success("Stream finished", {
            description: "Live telemetry replay complete",
          });
        }
      },
      (error) => {
        console.error("❌ Telemetry error:", error);
        setIsConnected(false);
        toast.error("Stream disconnected", {
          description: error.message,
        });
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
