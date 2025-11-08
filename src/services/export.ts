import type { Trajectory, QueryResponse } from "@/types";

/**
 * Export service for downloading query results in various formats
 */

export const exportToCSV = (trajectories: Trajectory[], filename: string = "trajectories.csv") => {
  if (trajectories.length === 0) {
    throw new Error("No trajectories to export");
  }

  // Define CSV headers
  const headers = [
    "MMSI",
    "Ship Type",
    "Track Length",
    "Time Start",
    "Time End",
    "Centroid Lat",
    "Centroid Lon",
    "Start Lat",
    "Start Lon",
    "End Lat",
    "End Lon",
    "Distance",
  ];

  // Convert trajectories to CSV rows
  const rows = trajectories.map(t => [
    t.mmsi || "",
    t.shipType || "",
    t.trackLength || "",
    t.timeStart || "",
    t.timeEnd || "",
    t.centroid?.latitude || "",
    t.centroid?.longitude || "",
    t.startLocation?.latitude || "",
    t.startLocation?.longitude || "",
    t.endLocation?.latitude || "",
    t.endLocation?.longitude || "",
    t.distance || "",
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => {
      // Escape cells containing commas or quotes
      const cellStr = String(cell);
      if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(","))
  ].join("\n");

  // Create and download file
  downloadFile(csvContent, filename, "text/csv");
};

export const exportToJSON = (data: QueryResponse, filename: string = "query-results.json") => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, "application/json");
};

export const exportTrajectoriesJSON = (trajectories: Trajectory[], filename: string = "trajectories.json") => {
  const jsonContent = JSON.stringify(trajectories, null, 2);
  downloadFile(jsonContent, filename, "application/json");
};

export const exportProposalText = (proposal: string, prompt: string, filename: string = "proposal.txt") => {
  const content = `Query: ${prompt}\n\n---\n\nProposal:\n\n${proposal}`;
  downloadFile(content, filename, "text/plain");
};

export const exportAnalysisMarkdown = (
  prompt: string,
  proposal: string,
  aiAnalysis: string | null,
  trajectories: Trajectory[],
  trace: string[],
  filename: string = "analysis-report.md"
) => {
  const content = `# Maritime Intelligence Report

## Query
${prompt}

## AI Proposal
${proposal}

${aiAnalysis ? `## Deep Threat Analysis\n${aiAnalysis}\n` : ""}

## XAI Reasoning Trace
${trace.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Trajectory Summary
- Total anomalies detected: ${trajectories.length}
- Ship types: ${[...new Set(trajectories.map(t => t.shipType).filter(Boolean))].join(", ")}
- Time range: ${trajectories[0]?.timeStart || "N/A"} to ${trajectories[trajectories.length - 1]?.timeEnd || "N/A"}

## Detailed Trajectories

${trajectories.map((t, i) => `
### ${i + 1}. MMSI ${t.mmsi || "Unknown"}
- **Type**: ${t.shipType || "Unknown"}
- **Track Length**: ${t.trackLength || "N/A"}
- **Period**: ${t.timeStart || "N/A"} → ${t.timeEnd || "N/A"}
- **Centroid**: ${t.centroid ? `${t.centroid.latitude.toFixed(4)}°N, ${t.centroid.longitude.toFixed(4)}°E` : "N/A"}
- **Distance**: ${t.distance?.toFixed(3) || "N/A"}
`).join("\n")}

---
*Report generated on ${new Date().toISOString()}*
`;

  downloadFile(content, filename, "text/markdown");
};

/**
 * Helper function to trigger file download
 */
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
