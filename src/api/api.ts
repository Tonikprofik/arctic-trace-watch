// API wrapper functions for Observable C2

import { supabase } from "@/integrations/supabase/client";
import type { QueryRequest, QueryResponse, ApproveRequest, ApproveResponse } from "@/types";

export async function queryAgent(request: QueryRequest): Promise<QueryResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("agent-query", {
      body: request,
    });

    if (error) {
      console.error("Error calling agent-query:", error);
      throw new Error(`Query failed: ${error.message}`);
    }

    return data as QueryResponse;
  } catch (error) {
    console.error("Error in queryAgent:", error);
    throw error;
  }
}

export async function approveHitl(request: ApproveRequest): Promise<ApproveResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("agent-approve", {
      body: request,
    });

    if (error) {
      console.error("Error calling agent-approve:", error);
      throw new Error(`Approval failed: ${error.message}`);
    }

    return data as ApproveResponse;
  } catch (error) {
    console.error("Error in approveHitl:", error);
    throw error;
  }
}
