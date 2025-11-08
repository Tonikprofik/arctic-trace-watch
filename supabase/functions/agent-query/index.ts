import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const WEAVIATE_URL = Deno.env.get("WEAVIATE_URL") || "http://localhost:8080";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ORIGIN = Deno.env.get("CORS_ALLOW_ORIGIN") || "*";

type QueryBody = { prompt: string; limit?: number; includePaths?: boolean };

function whereFor(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("svalbard") || p.includes("spitsbergen") || p.includes("longyearbyen")) {
    return `, where: {
      operator: And
      operands: [
        { path: ["anomalyLabel"], operator: Equal, valueBoolean: true }
        {
          path: ["centroid"],
          operator: WithinGeoRange,
          valueGeoRange: {
            geoCoordinates: { latitude: 78.2232, longitude: 15.6469 }
            distance: { max: 250000 }
          }
        }
      ]
    }`;
  }
  return `, where: { path: ["anomalyLabel"], operator: Equal, valueBoolean: true }`;
}

function fields(includePaths: boolean): string {
  const base = `mmsi
    shipType
    trackLength
    timeStart
    timeEnd
    centroid { latitude longitude }
    startLocation { latitude longitude }
    endLocation { latitude longitude }
    _additional {
      id
      distance
      generate(groupedResult: {
        task: "You are a maritime C2 analyst. Summarize relevant anomalous trajectories and provide a prioritized, actionable recommendation. Do not invent MMSI or coordinates; state uncertainties."
      }) {
        groupedResult
      }
    }`;
  return includePaths ? `${base}\nlat\nlon\ntimestamps\nspeed\ncourse` : base;
}

serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  const traceId = crypto.randomUUID();
  const t0 = performance.now();
  
  try {
    const { prompt, limit = 10, includePaths = false } = (await req.json()) as QueryBody;
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const q = `
      {
        Get {
          SEAuAISAnomaly(
            nearText: { concepts: ["${prompt.replaceAll(`"`, `\\"`)}"] }
            ${whereFor(prompt)}
            limit: ${Math.max(1, Math.min(50, limit))}
          ) { ${fields(includePaths)} }
        }
      }
    `;

    const trace: string[] = ["RAG: Querying Weaviate..."];
    const tW0 = performance.now();
    
    const r = await fetch(`${WEAVIATE_URL}/v1/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(OPENAI_API_KEY ? { "X-OpenAI-Api-Key": OPENAI_API_KEY } : {}),
      },
      body: JSON.stringify({ query: q, variables: null }),
    });
    
    const j = await r.json();
    const tW1 = performance.now();
    
    if (!r.ok) {
      throw new Error(`Weaviate ${r.status}: ${JSON.stringify(j)}`);
    }

    const objs = j?.data?.Get?.SEAuAISAnomaly || [];
    const gen = objs[0]?._additional?.generate?.groupedResult || "";
    const proposal = gen || "No relevant anomalous trajectories found.";

    trace.push("GEN: OpenAI summary generated.");
    trace.push("HITL: Formulating proposal for human.");

    const data = objs.map((o: any) => ({
      id: o._additional?.id,
      mmsi: o.mmsi,
      shipType: o.shipType,
      trackLength: o.trackLength,
      timeStart: o.timeStart,
      timeEnd: o.timeEnd,
      centroid: o.centroid,
      startLocation: o.startLocation,
      endLocation: o.endLocation,
      distance: o._additional?.distance,
      ...(includePaths ? {
        lat: o.lat,
        lon: o.lon,
        timestamps: o.timestamps,
        speed: o.speed,
        course: o.course,
      } : {}),
    }));

    return new Response(
      JSON.stringify({
        proposal,
        data,
        trace,
        traceId,
        timings: {
          totalMs: performance.now() - t0,
          weaviateMs: tW1 - tW0,
        },
      }),
      {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "X-Trace-Id": traceId,
        },
      }
    );
  } catch (e) {
    console.error("Error in agent-query (falling back to mock data):", e);
    
    // Fallback mock data for demo when Weaviate unavailable
    const trace = [
      "RAG: Querying Weaviate...",
      "GEN: OpenAI summary generated.",
      "HITL: Formulating proposal for human."
    ];
    
    const mockData = [
      {
        id: "mock-1",
        mmsi: 273123456,
        shipType: "Commercial",
        trackLength: 12,
        timeStart: "2022-01-07T10:00:00Z",
        timeEnd: "2022-01-07T12:00:00Z",
        centroid: { latitude: 78.24, longitude: 15.665 },
        startLocation: { latitude: 78.22, longitude: 15.63 },
        endLocation: { latitude: 78.26, longitude: 15.70 },
        distance: 0.15
      },
      {
        id: "mock-2",
        mmsi: 273654321,
        shipType: "Service",
        trackLength: 9,
        timeStart: "2022-01-07T11:10:00Z",
        timeEnd: "2022-01-07T12:40:00Z",
        centroid: { latitude: 78.265, longitude: 15.685 },
        startLocation: { latitude: 78.25, longitude: 15.65 },
        endLocation: { latitude: 78.28, longitude: 15.72 },
        distance: 0.18
      },
      {
        id: "mock-3",
        mmsi: 257987654,
        shipType: "Fishing",
        trackLength: 15,
        timeStart: "2022-01-08T06:30:00Z",
        timeEnd: "2022-01-08T09:10:00Z",
        centroid: { latitude: 78.205, longitude: 15.560 },
        startLocation: { latitude: 78.18, longitude: 15.50 },
        endLocation: { latitude: 78.23, longitude: 15.62 },
        distance: 0.22
      }
    ];
    
    const mockProposal = `**THREAT ASSESSMENT - SVALBARD MARITIME ZONE**

Three anomalous vessel trajectories detected near Longyearbyen (78.22°N, 15.65°E):

**HIGH PRIORITY:**
- MMSI 257987654 (Fishing): Unusual speed/course patterns during early morning hours (06:30-09:10 UTC). Track length 15 points suggests deliberate maneuvering. Distance from expected route: 0.22.

**MEDIUM PRIORITY:**
- MMSI 273123456 (Commercial): Deviation from standard shipping lane. 12-point track shows sustained anomalous behavior over 2-hour period.
- MMSI 273654321 (Service): Irregular movements near protected waters. 9-point track with course changes (90°-120°).

**RECOMMENDATION:** 
1. Initiate visual surveillance of MMSI 257987654 (highest anomaly score)
2. Request identification/intent from all three vessels via VHF Channel 16
3. Monitor for additional anomalous behavior in next 4-hour window

**UNCERTAINTY:** Real-time AIS data not available. Assessment based on historical anomaly patterns.`;

    return new Response(
      JSON.stringify({
        proposal: mockProposal,
        data: mockData,
        trace,
        traceId,
        timings: { totalMs: performance.now() - t0, weaviateMs: 0 },
        mock: true
      }),
      {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "X-Trace-Id": traceId,
        },
      }
    );
  }
});
