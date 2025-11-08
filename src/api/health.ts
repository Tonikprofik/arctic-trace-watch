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
      console.error("Health check failed:", error);
      throw new Error(`Health check failed: ${error.message}`);
    }

    return data as HealthCheckResponse;
  } catch (error) {
    console.error("Error in checkSystemHealth:", error);
    throw error;
  }
}
