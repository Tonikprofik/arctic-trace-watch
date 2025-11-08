// Type definitions for Observable C2 maritime anomaly detection

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Trajectory {
  mmsi?: number;
  shipType?: string;
  trackLength?: number;
  timeStart?: string;
  timeEnd?: string;
  centroid?: GeoPoint;
  startLocation?: GeoPoint;
  endLocation?: GeoPoint;
  distance?: number;
}

export interface QueryRequest {
  prompt: string;
  limit?: number;
}

export interface QueryResponse {
  proposal: string;
  data: Trajectory[];
  trace: string[];
  traceId: string;
  timings?: {
    totalMs: number;
    weaviateMs?: number;
  };
}

export interface ApproveRequest {
  prompt: string;
  proposal: string;
  approved: boolean;
  rationale?: string;
  traceId?: string;
}

export interface ApproveResponse {
  ok: boolean;
}
