// Health check API wrapper

import { supabase } from "@/integrations/supabase/client";

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "error";
  timestamp: string;
  checks: {
    weaviate: {
      status: "up" | "down";
      responseTime: number;
      message: string;
    };
    openai: {
      status: "configured" | "missing";
      message: string;
    };
    edgeFunctions: {
      status: "up" | "down";
      responseTime: number;
    };
  };
  ready: boolean;
  version: string;
}

export async function checkSystemHealth(): Promise<HealthCheckResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("health-check");

    if (error) {
      console.warn("Health check error:", error);
      return {
        status: "error",
        timestamp: new Date().toISOString(),
        checks: {
          weaviate: { status: "down", responseTime: 0, message: "Unavailable" },
          openai: { status: "missing", message: "Unknown" },
          edgeFunctions: { status: "down", responseTime: 0 }
        },
        ready: false,
        version: "1.0.0"
      };
    }

    return data as HealthCheckResponse;
  } catch (error) {
    console.warn("Error in checkSystemHealth:", error);
    return {
      status: "error",
      timestamp: new Date().toISOString(),
      checks: {
        weaviate: { status: "down", responseTime: 0, message: "Unavailable" },
        openai: { status: "missing", message: "Unknown" },
        edgeFunctions: { status: "down", responseTime: 0 }
      },
      ready: false,
      version: "1.0.0"
    };
  }
}
