import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Activity } from "lucide-react";
import { queryAgent, approveHitl } from "@/api/api";
import type { QueryResponse, Trajectory } from "@/types";
import { toast } from "sonner";

const Dashboard = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a query");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await queryAgent({ prompt: prompt.trim() });
      setResponse(result);
      toast.success("Query completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!response) return;

    try {
      await approveHitl({
        prompt,
        proposal: response.proposal,
        approved,
        traceId: response.traceId,
      });
      toast.success(approved ? "Proposal approved" : "Proposal dismissed");
      
      // Reset for next query
      setPrompt("");
      setResponse(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error(message);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "N/A";
    try {
      return new Date(timestamp).toISOString().replace("T", " ").slice(0, 19);
    } catch {
      return timestamp;
    }
  };

  const formatCoordinates = (point?: { latitude: number; longitude: number }) => {
    if (!point) return "N/A";
    return `${point.latitude.toFixed(4)}°N, ${point.longitude.toFixed(4)}°E`;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Observable C<sub>2</sub>
          </h1>
          <p className="text-muted-foreground mt-1">
            Human-in-the-Loop Maritime Anomaly Detection • Svalbard AIS Dataset
          </p>
        </div>

        {/* Query Input */}
        <Card>
          <CardHeader>
            <CardTitle>Query Agent</CardTitle>
            <CardDescription>
              Enter a natural language query to analyze anomalous maritime trajectories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder='e.g., "threats near Svalbard" or "unusual fishing vessel behavior"'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={loading}
            />
            <Button
              onClick={handleQuery}
              disabled={loading || !prompt.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Query...
                </>
              ) : (
                "Execute Query"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* XAI Reasoning Trace */}
        {response && response.trace.length > 0 && (
          <Card className="bg-trace-bg border-trace-border">
            <CardHeader>
              <CardTitle className="text-primary">XAI Reasoning Trace</CardTitle>
              <CardDescription>Explainable AI decision pathway</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {response.trace.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-foreground"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-trace-step text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ul>
              {response.timings && (
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                  Total: {response.timings.totalMs}ms
                  {response.timings.weaviateMs && ` • Weaviate: ${response.timings.weaviateMs}ms`}
                  {" • Trace ID: "}
                  <code className="text-primary">{response.traceId}</code>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Proposal */}
        {response && response.proposal && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Agent Proposal</CardTitle>
              <CardDescription>Actionable recommendation from RAG analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-secondary p-4 text-foreground whitespace-pre-wrap">
                {response.proposal}
              </div>
              
              {/* HITL Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => handleApprove(true)}
                  variant="default"
                  className="flex-1"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleApprove(false)}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Retrieved Trajectories */}
        {response && response.data.length > 0 && (
          <Card className="bg-data-bg border-data-border">
            <CardHeader>
              <CardTitle>Retrieved Trajectories</CardTitle>
              <CardDescription>
                {response.data.length} anomalous trajectory{response.data.length !== 1 ? "s" : ""} retrieved
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {response.data.map((traj: Trajectory, index: number) => (
                  <div
                    key={index}
                    className="rounded-lg border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-primary">
                          MMSI: {traj.mmsi || "N/A"}
                        </span>
                        {traj.shipType && (
                          <Badge variant="secondary">{traj.shipType}</Badge>
                        )}
                      </div>
                      {traj.distance !== undefined && (
                        <Badge variant="outline" className="font-mono">
                          Distance: {traj.distance.toFixed(3)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Time Range:</span>{" "}
                        {formatTimestamp(traj.timeStart)} → {formatTimestamp(traj.timeEnd)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Track Length:</span>{" "}
                        {traj.trackLength || "N/A"} points
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium text-foreground">Centroid:</span>{" "}
                      <span className="font-mono text-primary">
                        {formatCoordinates(traj.centroid)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
