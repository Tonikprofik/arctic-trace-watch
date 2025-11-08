const WEAVIATE = process.env.WEAVIATE_URL || "http://localhost:8080";

const q = `{
  Get {
    SEAuAISAnomaly(
      where: { path: ["anomalyLabel"], operator: Equal, valueBoolean: true }
      limit: 10
    ) {
      mmsi
      shipType
      trackLength
      timeStart
      timeEnd
      centroid { latitude longitude }
      _additional { id distance }
    }
  }
}`;

async function main() {
  const r = await fetch(`${WEAVIATE}/v1/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, variables: null }),
  });
  
  const j = await r.json();
  console.log(JSON.stringify(j?.data?.Get?.SEAuAISAnomaly || [], null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
