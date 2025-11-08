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
    console.error("Error in agent-query:", e);
    return new Response(
      JSON.stringify({ error: String(e), traceId }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
