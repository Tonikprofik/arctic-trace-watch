const WEAVIATE = process.env.WEAVIATE_URL || "http://localhost:8080";

const schema = {
  class: "SEAuAISAnomaly",
  description: "Anomalous AIS trajectories near Svalbard",
  vectorizer: "text2vec-openai",
  moduleConfig: {
    "text2vec-openai": { vectorizeClassName: false },
    "generative-openai": {},
  },
  properties: [
    { name: "mmsi", dataType: ["int"] },
    { name: "shipType", dataType: ["text"] },
    { name: "trackLength", dataType: ["int"] },
    { name: "anomalyLabel", dataType: ["boolean"] },
    { name: "timeStart", dataType: ["date"] },
    { name: "timeEnd", dataType: ["date"] },
    { name: "timestamps", dataType: ["number[]"] },
    { name: "lat", dataType: ["number[]"] },
    { name: "lon", dataType: ["number[]"] },
    { name: "speed", dataType: ["number[]"] },
    { name: "course", dataType: ["number[]"] },
    { name: "centroid", dataType: ["geoCoordinates"] },
    { name: "startLocation", dataType: ["geoCoordinates"] },
    { name: "endLocation", dataType: ["geoCoordinates"] },
    { name: "text", dataType: ["text"] },
  ],
};

async function main() {
  const r = await fetch(`${WEAVIATE}/v1/schema`, { method: "GET" });
  const j: any = await r.json();
  const exists = (j.classes || []).some((c: any) => c.class === "SEAuAISAnomaly");
  
  if (exists) {
    console.log("Class SEAuAISAnomaly already exists");
    return;
  }

  const cr = await fetch(`${WEAVIATE}/v1/schema`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(schema),
  });
  
  if (!cr.ok) {
    throw new Error(`Create class failed: ${cr.status} ${await cr.text()}`);
  }
  
  console.log("Created SEAuAISAnomaly class");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
