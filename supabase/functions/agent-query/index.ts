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
    const { prompt, limit = 5 } = await req.json();
    const startTime = Date.now();

    console.log("Query received:", { prompt, limit });

    // Simulate XAI reasoning trace
    const trace = [
      "RAG: Querying Weaviate...",
      "GEN: OpenAI summary generated.",
      "HITL: Formulating proposal for human."
    ];

    // Mock anomalous trajectory data near Svalbard
    const mockTrajectories = [
      {
        mmsi: 211002340,
        shipType: "Fishing",
        trackLength: 142,
        timeStart: "2024-01-15T08:23:00Z",
        timeEnd: "2024-01-15T14:45:00Z",
        centroid: { latitude: 78.2232, longitude: 15.6267 },
        startLocation: { latitude: 78.1523, longitude: 15.4112 },
        endLocation: { latitude: 78.2941, longitude: 15.8422 },
        distance: 0.234
      },
      {
        mmsi: 257891200,
        shipType: "Commercial",
        trackLength: 89,
        timeStart: "2024-01-15T10:12:00Z",
        timeEnd: "2024-01-15T16:28:00Z",
        centroid: { latitude: 78.4156, longitude: 16.1234 },
        startLocation: { latitude: 78.3845, longitude: 15.9876 },
        endLocation: { latitude: 78.4467, longitude: 16.2592 },
        distance: 0.156
      },
      {
        mmsi: 219456780,
        shipType: "Service",
        trackLength: 67,
        timeStart: "2024-01-15T09:45:00Z",
        timeEnd: "2024-01-15T13:22:00Z",
        centroid: { latitude: 78.1089, longitude: 15.3421 },
        startLocation: { latitude: 78.0756, longitude: 15.2134 },
        endLocation: { latitude: 78.1422, longitude: 15.4708 },
        distance: 0.289
      },
      {
        mmsi: 244123890,
        shipType: "Fishing",
        trackLength: 203,
        timeStart: "2024-01-15T07:30:00Z",
        timeEnd: "2024-01-15T18:15:00Z",
        centroid: { latitude: 78.5234, longitude: 16.7891 },
        startLocation: { latitude: 78.4912, longitude: 16.6543 },
        endLocation: { latitude: 78.5556, longitude: 16.9239 },
        distance: 0.412
      },
      {
        mmsi: 273445120,
        shipType: "Other",
        trackLength: 124,
        timeStart: "2024-01-15T11:20:00Z",
        timeEnd: "2024-01-15T17:50:00Z",
        centroid: { latitude: 78.0123, longitude: 14.8765 },
        startLocation: { latitude: 77.9834, longitude: 14.7321 },
        endLocation: { latitude: 78.0412, longitude: 15.0209 },
        distance: 0.178
      }
    ];

    // Filter based on limit
    const resultData = mockTrajectories.slice(0, limit);

    // Generate contextual proposal based on prompt
    const proposal = generateProposal(prompt, resultData);

    const traceId = crypto.randomUUID();
    const totalMs = Date.now() - startTime;

    const response = {
      proposal,
      data: resultData,
      trace,
      traceId,
      timings: {
        totalMs,
        weaviateMs: Math.floor(totalMs * 0.6)
      }
    };

    console.log("Query response:", { traceId, dataCount: resultData.length });

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in agent-query function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateProposal(prompt: string, trajectories: any[]): string {
  const lowerPrompt = prompt.toLowerCase();
  
  const vesselCount = trajectories.length;
  const shipTypes = [...new Set(trajectories.map(t => t.shipType))].join(", ");
  
  let proposal = `Based on analysis of ${vesselCount} anomalous trajectories near Svalbard:\n\n`;
  
  if (lowerPrompt.includes("threat") || lowerPrompt.includes("danger")) {
    proposal += `**THREAT ASSESSMENT**: ${vesselCount} vessels exhibiting abnormal patterns detected in restricted Arctic waters.\n\n`;
    proposal += `**KEY INDICATORS**:\n`;
    proposal += `- Ship types involved: ${shipTypes}\n`;
    proposal += `- Pattern deviations detected in movement and timing\n`;
    proposal += `- Proximity to sensitive maritime zones\n\n`;
    proposal += `**RECOMMENDATION**: Initiate enhanced monitoring protocol. Cross-reference vessel registrations with maritime authority databases. Consider deploying patrol assets for visual confirmation if patterns persist.`;
  } else if (lowerPrompt.includes("fishing") || lowerPrompt.includes("fish")) {
    const fishingVessels = trajectories.filter(t => t.shipType === "Fishing");
    proposal += `**FISHING ACTIVITY ANALYSIS**: ${fishingVessels.length} fishing vessels with anomalous behavior patterns.\n\n`;
    proposal += `**OBSERVATIONS**:\n`;
    proposal += `- Unusual track patterns may indicate IUU (Illegal, Unreported, Unregulated) fishing activity\n`;
    proposal += `- Trajectories deviate from normal fishing ground patterns\n\n`;
    proposal += `**RECOMMENDATION**: Verify fishing permits and quotas. Monitor for repeated patterns indicating organized activity. Coordinate with fisheries enforcement.`;
  } else {
    proposal += `**ANOMALY SUMMARY**: Multiple vessels showing atypical movement patterns in Svalbard maritime zone.\n\n`;
    proposal += `**VESSEL BREAKDOWN**:\n`;
    trajectories.forEach((t, i) => {
      proposal += `- Vessel ${i + 1} (MMSI: ${t.mmsi}): ${t.shipType}, ${t.trackLength} track points\n`;
    });
    proposal += `\n**RECOMMENDATION**: Continue observation. Document patterns for baseline comparison. Flag for follow-up if behaviors escalate or persist beyond 48 hours.`;
  }
  
  return proposal;
}
