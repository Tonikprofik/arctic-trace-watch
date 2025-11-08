import { supabase } from "@/integrations/supabase/client";
import type { Trajectory } from "@/types";

export const analyzeThreats = async (
  trajectories: Trajectory[],
  userPrompt: string
): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-threat", {
      body: {
        trajectories,
        userPrompt,
      },
    });

    if (error) {
      console.error("Error calling analyze-threat:", error);
      throw new Error("Failed to analyze threats");
    }

    return data.analysis;
  } catch (error) {
    console.error("Error in analyzeThreats:", error);
    throw error;
  }
};
