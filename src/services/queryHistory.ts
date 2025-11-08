import { supabase } from "@/integrations/supabase/client";

export interface QueryHistoryEntry {
  id: string;
  prompt: string;
  proposal: string;
  trace_id: string;
  approved: boolean | null;
  rationale: string | null;
  created_at: string;
}

export const saveQuery = async (
  prompt: string,
  proposal: string,
  traceId: string
): Promise<QueryHistoryEntry | null> => {
  const { data, error } = await supabase
    .from("query_history")
    .insert({
      prompt,
      proposal,
      trace_id: traceId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving query:", error);
    return null;
  }

  return data;
};

export const updateQueryApproval = async (
  traceId: string,
  approved: boolean,
  rationale?: string
): Promise<void> => {
  const { error } = await supabase
    .from("query_history")
    .update({
      approved,
      rationale,
    })
    .eq("trace_id", traceId);

  if (error) {
    console.error("Error updating approval:", error);
  }
};

export const getQueryHistory = async (): Promise<QueryHistoryEntry[]> => {
  const { data, error } = await supabase
    .from("query_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching query history:", error);
    return [];
  }

  return data || [];
};

export const subscribeToQueryHistory = (
  callback: (entry: QueryHistoryEntry) => void
) => {
  const channel = supabase
    .channel("query_history_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "query_history",
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          callback(payload.new as QueryHistoryEntry);
        }
      }
    )
    .subscribe();

  return channel;
};
