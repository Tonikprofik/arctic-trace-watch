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

    // Mock anomalous trajectory data based on actual Svalbard AIS dataset
    const mockTrajectories = [
      {
        mmsi: 211002340,
        shipType: "Other",
        trackLength: 28,
        timeStart: "2021-06-06T10:26:00Z",
        timeEnd: "2021-06-06T14:00:00Z",
        centroid: { latitude: 78.5457, longitude: 12.1909 },
        startLocation: { latitude: 78.8715, longitude: 8.5102 },
        endLocation: { latitude: 78.2459, longitude: 15.5016 },
        distance: 0.156
      },
      {
        mmsi: 211156800,
        shipType: "Service",
        trackLength: 45,
        timeStart: "2021-06-07T08:15:00Z",
        timeEnd: "2021-06-07T15:30:00Z",
        centroid: { latitude: 78.6234, longitude: 13.4521 },
        startLocation: { latitude: 78.5123, longitude: 12.8934 },
        endLocation: { latitude: 78.7345, longitude: 14.0108 },
        distance: 0.289
      },
      {
        mmsi: 211202460,
        shipType: "Service",
        trackLength: 67,
        timeStart: "2021-06-08T09:45:00Z",
        timeEnd: "2021-06-08T16:22:00Z",
        centroid: { latitude: 78.9521, longitude: 11.2341 },
        startLocation: { latitude: 78.8234, longitude: 10.9876 },
        endLocation: { latitude: 79.0808, longitude: 11.4806 },
        distance: 0.412
      },
      {
        mmsi: 211336220,
        shipType: "Passenger",
        trackLength: 89,
        timeStart: "2021-06-09T11:20:00Z",
        timeEnd: "2021-06-09T18:45:00Z",
        centroid: { latitude: 78.4156, longitude: 14.7891 },
        startLocation: { latitude: 78.3421, longitude: 14.5643 },
        endLocation: { latitude: 78.4891, longitude: 15.0139 },
        distance: 0.178
      },
      {
        mmsi: 211627240,
        shipType: "Service",
        trackLength: 124,
        timeStart: "2021-06-10T07:30:00Z",
        timeEnd: "2021-06-10T14:15:00Z",
        centroid: { latitude: 79.0312, longitude: 11.0876 },
        startLocation: { latitude: 79.0300, longitude: 11.0867 },
        endLocation: { latitude: 79.0254, longitude: 10.9142 },
        distance: 0.234
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
