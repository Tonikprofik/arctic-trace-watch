import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Radio } from "lucide-react";
import { realtimeManager } from "@/services/realtime";
import { toast } from "sonner";
import type { Trajectory } from "@/types";

interface LiveProducerProps {
  trajectories: Trajectory[];
  traceId?: string;
}

export const LiveProducer = ({ trajectories, traceId }: LiveProducerProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [tickRate, setTickRate] = useState(2);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const iteratorsRef = useRef<any[]>([]);

  const startStream = async () => {
    if (trajectories.length === 0) {
      toast.error("No trajectories to stream");
      return;
    }

    setIsStreaming(true);
    setProgress(0);
    
    // Simulate trajectory arrays by creating fake point sequences
    // In real impl, you'd fetch full arrays from Weaviate
    iteratorsRef.current = trajectories.map((traj) => {
      // Generate 20 interpolated points between start and end
      const points = [];
      const steps = 20;
      
      if (traj.startLocation && traj.endLocation) {
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          points.push({
            lat: traj.startLocation.latitude + 
              (traj.endLocation.latitude - traj.startLocation.latitude) * ratio,
            lon: traj.startLocation.longitude + 
              (traj.endLocation.longitude - traj.startLocation.longitude) * ratio,
            mmsi: traj.mmsi || 0,
            speed: 10 + Math.random() * 15,
            course: 45 + Math.random() * 90,
          });
        }
      }
      
      return { points, index: 0 };
    });

    const maxPoints = Math.max(...iteratorsRef.current.map(it => it.points.length));
    let tickCount = 0;

    toast.success("🔴 Live stream started", {
      description: `Streaming ${trajectories.length} vessels at ${tickRate}Hz`,
    });

    intervalRef.current = window.setInterval(async () => {
      const vessels = [];
      let allDone = true;

      for (const iterator of iteratorsRef.current) {
        if (iterator.index < iterator.points.length) {
          vessels.push({
            ...iterator.points[iterator.index],
            idx: iterator.index,
          });
          iterator.index++;
          allDone = false;
        }
      }

      if (allDone) {
        stopStream(true);
        return;
      }

      await realtimeManager.broadcastTick({
        traceId: traceId || crypto.randomUUID(),
        ts: Date.now(),
        vessels,
      });

      tickCount++;
      setProgress((tickCount / maxPoints) * 100);
    }, 1000 / tickRate);
  };

  const stopStream = async (complete = false) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (complete) {
      await realtimeManager.broadcastTick({
        traceId: traceId || crypto.randomUUID(),
        ts: Date.now(),
        vessels: [],
        done: true,
      });
      
      toast.success("✅ Stream complete");
    } else {
      toast.info("Stream stopped");
    }

    setIsStreaming(false);
    setProgress(0);
  };

  return (
    <Card className="border-primary/20 bg-background/40 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            <CardTitle>Live Stream Producer</CardTitle>
          </div>
          {isStreaming && (
            <Badge variant="destructive" className="animate-pulse">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2" />
              LIVE
            </Badge>
          )}
        </div>
        <CardDescription>
          Broadcast trajectories in real-time to all connected clients
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tick-rate">Tick Rate (Hz)</Label>
          <Input
            id="tick-rate"
            type="number"
            min={1}
            max={10}
            value={tickRate}
            onChange={(e) => setTickRate(Number(e.target.value))}
            disabled={isStreaming}
          />
        </div>

        {isStreaming && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isStreaming ? (
            <Button
              onClick={startStream}
              disabled={trajectories.length === 0}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Stream
            </Button>
          ) : (
            <Button
              onClick={() => stopStream(false)}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Stream
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• {trajectories.length} trajectories loaded</p>
          <p>• Broadcasting to channel: oc2:telemetry</p>
          <p>• Open another browser tab to see synchronized playback</p>
        </div>
      </CardContent>
    </Card>
  );
};
