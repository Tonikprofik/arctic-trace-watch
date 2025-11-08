// API wrapper functions for Observable C2

import type { QueryRequest, QueryResponse, ApproveRequest, ApproveResponse } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function queryAgent(request: QueryRequest): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/agent/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Query failed: ${error}`);
  }

  return response.json();
}

export async function approveHitl(request: ApproveRequest): Promise<ApproveResponse> {
  const response = await fetch(`${API_BASE_URL}/agent/hitl/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Approval failed: ${error}`);
  }

  return response.json();
}
