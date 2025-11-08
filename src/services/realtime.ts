import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface LiveTick {
  traceId: string;
  ts: number;
  vessels: LiveVessel[];
  done?: boolean;
}

export interface LiveVessel {
  id?: string;
  mmsi: number;
  lat: number;
  lon: number;
  speed?: number;
  course?: number;
  idx?: number;
}

export interface TraceEvent {
  traceId: string;
  step: string;
  timestamp: number;
}

export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribeTelemetry(
    onTick: (tick: LiveTick) => void,
    onError?: (error: Error) => void
  ): () => void {
    const channel = supabase.channel("oc2:telemetry", {
      config: { broadcast: { ack: false } },
    });

    channel
      .on("broadcast", { event: "tick" }, ({ payload }: { payload: LiveTick }) => {
        onTick(payload);
      })
      .subscribe((status) => {
        console.log("🔴 Telemetry channel:", status);
        if (status === "CHANNEL_ERROR") {
          onError?.(new Error("Telemetry channel error"));
        }
      });

    this.channels.set("telemetry", channel);

    return () => {
      supabase.removeChannel(channel);
      this.channels.delete("telemetry");
    };
  }

  subscribeTrace(
    onTrace: (event: TraceEvent) => void,
    onError?: (error: Error) => void
  ): () => void {
    const channel = supabase.channel("oc2:trace", {
      config: { broadcast: { ack: false } },
    });

    channel
      .on("broadcast", { event: "trace" }, ({ payload }: { payload: TraceEvent }) => {
        onTrace(payload);
      })
      .subscribe((status) => {
        console.log("🔵 Trace channel:", status);
        if (status === "CHANNEL_ERROR") {
          onError?.(new Error("Trace channel error"));
        }
      });

    this.channels.set("trace", channel);

    return () => {
      supabase.removeChannel(channel);
      this.channels.delete("trace");
    };
  }

  async broadcastTick(tick: LiveTick): Promise<void> {
    const channel = this.channels.get("telemetry") || 
      supabase.channel("oc2:telemetry", {
        config: { broadcast: { ack: false } },
      });

    if (!this.channels.has("telemetry")) {
      await channel.subscribe();
      this.channels.set("telemetry", channel);
    }

    await channel.send({
      type: "broadcast",
      event: "tick",
      payload: tick,
    });
  }

  async broadcastTrace(event: TraceEvent): Promise<void> {
    const channel = this.channels.get("trace") ||
      supabase.channel("oc2:trace", {
        config: { broadcast: { ack: false } },
      });

    if (!this.channels.has("trace")) {
      await channel.subscribe();
      this.channels.set("trace", channel);
    }

    await channel.send({
      type: "broadcast",
      event: "trace",
      payload: event,
    });
  }

  cleanup(): void {
    this.channels.forEach((channel) => supabase.removeChannel(channel));
    this.channels.clear();
  }
}

export const realtimeManager = new RealtimeManager();
