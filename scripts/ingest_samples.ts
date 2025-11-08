const WEAVIATE = process.env.WEAVIATE_URL || "http://localhost:8080";

const samples = [
  {
    class: "SEAuAISAnomaly",
    properties: {
      mmsi: 273123456,
      shipType: "Commercial",
      trackLength: 12,
      anomalyLabel: true,
      timeStart: "2022-01-07T10:00:00Z",
      timeEnd: "2022-01-07T12:00:00Z",
      timestamps: [1641559200, 1641562800],
      lat: [78.22, 78.26],
      lon: [15.63, 15.7],
      speed: [6.2, 7.1],
      course: [45, 60],
      centroid: { latitude: 78.24, longitude: 15.665 },
      startLocation: { latitude: 78.22, longitude: 15.63 },
      endLocation: { latitude: 78.26, longitude: 15.7 },
      text: "Anomalous vessel trajectory near Svalbard. MMSI 273123456, Commercial.",
    },
  },
  {
    class: "SEAuAISAnomaly",
    properties: {
      mmsi: 273654321,
      shipType: "Service",
      trackLength: 9,
      anomalyLabel: true,
      timeStart: "2022-01-07T11:10:00Z",
      timeEnd: "2022-01-07T12:40:00Z",
      timestamps: [1641563400, 1641568800],
      lat: [78.25, 78.28],
      lon: [15.65, 15.72],
      speed: [5.8, 7.4],
      course: [90, 120],
      centroid: { latitude: 78.265, longitude: 15.685 },
      startLocation: { latitude: 78.25, longitude: 15.65 },
      endLocation: { latitude: 78.28, longitude: 15.72 },
      text: "Anomalous vessel trajectory near Svalbard. MMSI 273654321, Service.",
    },
  },
  {
    class: "SEAuAISAnomaly",
    properties: {
      mmsi: 257987654,
      shipType: "Fishing",
      trackLength: 15,
      anomalyLabel: true,
      timeStart: "2022-01-08T06:30:00Z",
      timeEnd: "2022-01-08T09:10:00Z",
      timestamps: [1641623400, 1641633000],
      lat: [78.18, 78.23],
      lon: [15.5, 15.62],
      speed: [3.4, 6.0],
      course: [10, 55],
      centroid: { latitude: 78.205, longitude: 15.56 },
      startLocation: { latitude: 78.18, longitude: 15.5 },
      endLocation: { latitude: 78.23, longitude: 15.62 },
      text: "Anomalous fishing vessel trajectory near Svalbard. MMSI 257987654, unusual speed/course.",
    },
  },
];

async function main() {
  for (const s of samples) {
    const r = await fetch(`${WEAVIATE}/v1/objects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    
    if (!r.ok) {
      throw new Error(`Insert failed: ${r.status} ${await r.text()}`);
    }
  }
  
  console.log("Inserted 3 sample anomalies");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
