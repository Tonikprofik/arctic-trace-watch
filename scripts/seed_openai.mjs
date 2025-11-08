// Minimal OpenAI seed for Weaviate (ESM, no client libs)
const WEAVIATE_URL = process.env.WEAVIATE_URL || 'http://localhost:8080';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function http(path, opts = {}) {
    const url = WEAVIATE_URL.replace(/\/$/, '') + path;
    const res = await fetch(url, {
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}: ${text}`);
    }
    return json;
}

async function classExists(name) {
    try { await http(`/v1/schema/${name}`); return true; } catch { return false; }
}

async function ensureClass() {
    const name = 'SEAuAISAnomaly';
    if (await classExists(name)) {
        console.log(`Class ${name} exists`);
        return;
    }
    const body = {
        class: name,
        description: 'Anomalous AIS trajectories near Svalbard (trajectory-level)',
        vectorizer: 'text2vec-openai',
        moduleConfig: { 'text2vec-openai': {}, 'generative-openai': {} },
        properties: [
            { name: 'mmsi', dataType: ['int'] },
            { name: 'shipType', dataType: ['text'] },
            { name: 'trackLength', dataType: ['int'] },
            { name: 'anomalyLabel', dataType: ['boolean'] },
            { name: 'timeStart', dataType: ['date'] },
            { name: 'timeEnd', dataType: ['date'] },
            { name: 'timestamps', dataType: ['number[]'] },
            { name: 'lat', dataType: ['number[]'] },
            { name: 'lon', dataType: ['number[]'] },
            { name: 'speed', dataType: ['number[]'] },
            { name: 'course', dataType: ['number[]'] },
            { name: 'centroid', dataType: ['geoCoordinates'] },
            { name: 'startLocation', dataType: ['geoCoordinates'] },
            { name: 'endLocation', dataType: ['geoCoordinates'] },
            { name: 'text', dataType: ['text'] },
        ],
    };
    await http('/v1/schema', { method: 'POST', body });
    console.log(`Created class ${name}`);
}

function samples() {
    return [
        {
            mmsi: 273123456,
            shipType: 'Commercial',
            trackLength: 12,
            anomalyLabel: true,
            timeStart: '2022-01-07T10:00:00Z',
            timeEnd: '2022-01-07T12:00:00Z',
            timestamps: [1641559200, 1641562800],
            lat: [78.22, 78.26],
            lon: [15.63, 15.7],
            speed: [6.2, 7.1],
            course: [45, 60],
            centroid: { latitude: 78.24, longitude: 15.665 },
            startLocation: { latitude: 78.22, longitude: 15.63 },
            endLocation: { latitude: 78.26, longitude: 15.7 },
            text: 'Anomalous vessel trajectory near Svalbard. MMSI 273123456, type Commercial, 12 points 2022-01-07T10:00Z..12:00Z, near Longyearbyen.',
        },
        {
            mmsi: 273654321,
            shipType: 'Service',
            trackLength: 9,
            anomalyLabel: true,
            timeStart: '2022-01-07T11:10:00Z',
            timeEnd: '2022-01-07T12:40:00Z',
            timestamps: [1641563400, 1641568800],
            lat: [78.25, 78.28],
            lon: [15.65, 15.72],
            speed: [5.8, 7.4],
            course: [90, 120],
            centroid: { latitude: 78.265, longitude: 15.685 },
            startLocation: { latitude: 78.25, longitude: 15.65 },
            endLocation: { latitude: 78.28, longitude: 15.72 },
            text: 'Anomalous vessel trajectory near Svalbard. MMSI 273654321, type Service, 9 points 2022-01-07T11:10Z..12:40Z, near Longyearbyen.',
        },
        {
            mmsi: 257987654,
            shipType: 'Fishing',
            trackLength: 15,
            anomalyLabel: true,
            timeStart: '2022-01-08T06:30:00Z',
            timeEnd: '2022-01-08T09:10:00Z',
            timestamps: [1641623400, 1641633000],
            lat: [78.18, 78.23],
            lon: [15.5, 15.62],
            speed: [3.4, 6.0],
            course: [10, 55],
            centroid: { latitude: 78.205, longitude: 15.56 },
            startLocation: { latitude: 78.18, longitude: 15.5 },
            endLocation: { latitude: 78.23, longitude: 15.62 },
            text: 'Anomalous fishing vessel trajectory near Svalbard. MMSI 257987654, 15 points 2022-01-08T06:30Z..09:10Z, unusual speed/course changes.',
        },
    ];
}

async function insertSamples() {
    const objs = samples();
    for (const p of objs) {
        await http('/v1/objects', { method: 'POST', body: { class: 'SEAuAISAnomaly', properties: p } });
    }
    console.log(`Inserted ${objs.length} anomalies`);
}

async function verifyList() {
    const q = `
    {
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
          _additional { id }
        }
      }
    }
  `;
    const out = await fetch(WEAVIATE_URL.replace(/\/$/, '') + '/v1/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
    });
    const json = await out.json();
    if (!out.ok) throw new Error(`GraphQL error: ${JSON.stringify(json)}`);
    const items = json?.data?.Get?.SEAuAISAnomaly || [];
    console.log(`Listed ${items.length} anomalies`);
    console.log(JSON.stringify(items, null, 2));
}

async function tryGenerate() {
    if (!OPENAI_API_KEY) {
        console.log('Skipping generate: OPENAI_API_KEY not set');
        return;
    }
    const q = `
  {
    Get {
      SEAuAISAnomaly(
        where: { path: ["anomalyLabel"], operator: Equal, valueBoolean: true }
        nearText: { concepts: ["threats near Svalbard"] }
        limit: 3
      ) {
        mmsi
        shipType
        trackLength
        timeStart
        timeEnd
        centroid { latitude longitude }
        _additional {
          id
          generate(groupedResult: { task: "Summarize anomalous trajectories and recommend an action. Do not invent MMSI or coordinates." }) {
            groupedResult
          }
        }
      }
    }
  }`;
    const out = await fetch(WEAVIATE_URL.replace(/\/$/, '') + '/v1/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-OpenAI-Api-Key': OPENAI_API_KEY },
        body: JSON.stringify({ query: q }),
    });
    const json = await out.json();
    if (!out.ok) throw new Error(`GraphQL generate error: ${JSON.stringify(json)}`);
    const arr = json?.data?.Get?.SEAuAISAnomaly || [];
    const grouped = arr[0]?._additional?.generate?.groupedResult;
    console.log('Grouped summary:', grouped || '(none)');
}

async function main() {
    await ensureClass();
    await insertSamples();
    await verifyList();
    await tryGenerate();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});