import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, proposal, approved, rationale, traceId } = await req.json();

    console.log("HITL Decision:", {
      traceId,
      approved,
      hasRationale: !!rationale,
      promptLength: prompt?.length || 0,
      proposalLength: proposal?.length || 0
    });

    // Log the human-in-the-loop decision
    const logEntry = {
      timestamp: new Date().toISOString(),
      traceId,
      approved,
      prompt: prompt?.substring(0, 100), // First 100 chars for brevity
      rationale: rationale || "No rationale provided"
    };

    console.log("Decision logged:", logEntry);

    return new Response(
      JSON.stringify({ ok: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in agent-approve function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
