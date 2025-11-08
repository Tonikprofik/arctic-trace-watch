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
    let tW1 = performance.now();
    
    let objs: any[] = [];
    let proposal = "";
    
    try {
      // Add timeout to Weaviate fetch (5 seconds)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const r = await fetch(`${WEAVIATE_URL}/v1/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(OPENAI_API_KEY ? { "X-OpenAI-Api-Key": OPENAI_API_KEY } : {}),
        },
        body: JSON.stringify({ query: q, variables: null }),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      const j = await r.json();
      tW1 = performance.now();
      
      if (!r.ok) {
        throw new Error(`Weaviate ${r.status}: ${JSON.stringify(j)}`);
      }

      objs = j?.data?.Get?.SEAuAISAnomaly || [];
      const gen = objs[0]?._additional?.generate?.groupedResult || "";
      proposal = gen || "No relevant anomalous trajectories found.";
      
    } catch (weaviateError) {
      tW1 = performance.now();
      console.warn("Weaviate unavailable, using demo data:", weaviateError);
      
      // Generate comprehensive demo data with full trajectory paths
      const generatePath = (start: [number, number], end: [number, number], points: number) => {
        const lat: number[] = [];
        const lon: number[] = [];
        const timestamps: number[] = [];
        const speed: number[] = [];
        const course: number[] = [];
        
        const baseTime = Date.now() - (3600000 * 2); // 2 hours ago
        
        for (let i = 0; i < points; i++) {
          const t = i / (points - 1);
          lat.push(start[0] + (end[0] - start[0]) * t + (Math.random() - 0.5) * 0.02);
          lon.push(start[1] + (end[1] - start[1]) * t + (Math.random() - 0.5) * 0.02);
          timestamps.push(baseTime + (i * 120)); // 2 min intervals
          speed.push(5 + Math.random() * 10); // 5-15 knots
          course.push((Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI + 360) % 360);
        }
        
        return { lat, lon, timestamps, speed, course };
      };
      
      objs = [
        {
          _additional: { id: "demo-1", distance: 0.15 },
          mmsi: 211002340,
          shipType: "Other",
          trackLength: 28,
          timeStart: "2024-01-15T08:00:00Z",
          timeEnd: "2024-01-15T10:30:00Z",
          centroid: { latitude: 78.2232, longitude: 15.6469 },
          startLocation: { latitude: 78.1, longitude: 15.5 },
          endLocation: { latitude: 78.3, longitude: 15.7 },
          ...generatePath([78.1, 15.5], [78.3, 15.7], 28),
        },
        {
          _additional: { id: "demo-2", distance: 0.18 },
          mmsi: 211156800,
          shipType: "Service",
          trackLength: 45,
          timeStart: "2024-01-15T09:00:00Z",
          timeEnd: "2024-01-15T12:00:00Z",
          centroid: { latitude: 78.15, longitude: 15.8 },
          startLocation: { latitude: 78.0, longitude: 15.6 },
          endLocation: { latitude: 78.25, longitude: 16.0 },
          ...generatePath([78.0, 15.6], [78.25, 16.0], 45),
        },
        {
          _additional: { id: "demo-3", distance: 0.21 },
          mmsi: 211202460,
          shipType: "Fishing",
          trackLength: 67,
          timeStart: "2024-01-15T07:30:00Z",
          timeEnd: "2024-01-15T13:00:00Z",
          centroid: { latitude: 78.35, longitude: 15.3 },
          startLocation: { latitude: 78.25, longitude: 15.1 },
          endLocation: { latitude: 78.45, longitude: 15.5 },
          ...generatePath([78.25, 15.1], [78.45, 15.5], 67),
        },
        {
          _additional: { id: "demo-4", distance: 0.24 },
          mmsi: 211336220,
          shipType: "Passenger",
          trackLength: 89,
          timeStart: "2024-01-15T06:00:00Z",
          timeEnd: "2024-01-15T14:30:00Z",
          centroid: { latitude: 78.05, longitude: 16.2 },
          startLocation: { latitude: 77.9, longitude: 15.9 },
          endLocation: { latitude: 78.2, longitude: 16.5 },
          ...generatePath([77.9, 15.9], [78.2, 16.5], 89),
        },
        {
          _additional: { id: "demo-5", distance: 0.28 },
          mmsi: 211627240,
          shipType: "Service",
          trackLength: 124,
          timeStart: "2024-01-15T05:00:00Z",
          timeEnd: "2024-01-15T16:00:00Z",
          centroid: { latitude: 78.28, longitude: 14.9 },
          startLocation: { latitude: 78.15, longitude: 14.6 },
          endLocation: { latitude: 78.4, longitude: 15.2 },
          ...generatePath([78.15, 14.6], [78.4, 15.2], 124),
        },
      ];
      
      proposal = `🎭 DEMO MODE: Weaviate backend unavailable\n\n**Showing sample anomalous trajectories near Svalbard:**\n\n**DETECTED ANOMALIES:**\n- 5 vessels with atypical movement patterns\n- Ship types: Other, Service, Fishing, Passenger\n- Pattern deviations in timing, speed, and routing\n- All within 250km of Longyearbyen\n\n**KEY INDICATORS:**\n- Unusual loitering patterns detected\n- Speed variations outside normal parameters\n- Proximity to restricted maritime zones\n\n**RECOMMENDATION:** Review trajectories on map. All vessels flagged for enhanced monitoring.\n\n**Note:** This is demonstration data. Configure WEAVIATE_URL secret to connect to a live Weaviate instance with real AIS data.`;
    }

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
