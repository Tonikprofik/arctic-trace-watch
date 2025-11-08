import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Activity, Map as MapIcon } from "lucide-react";
import { queryAgent, approveHitl } from "@/api/api";
import type { QueryResponse, Trajectory } from "@/types";
import { toast } from "sonner";
import ActivityFeed from "@/components/ActivityFeed";
import TrajectoryMap from "@/components/TrajectoryMap";
import { saveQuery, updateQueryApproval } from "@/services/queryHistory";

const Dashboard = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

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
      
      // Save to database
      await saveQuery(prompt.trim(), result.proposal, result.traceId);
      
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
      
      // Update database with approval decision
      await updateQueryApproval(response.traceId, approved);
      
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
    <div className="min-h-screen bg-background flex">
      {/* Activity Feed Sidebar */}
      <aside className="w-80 border-r border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 h-screen overflow-hidden">
        <ActivityFeed />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Observable C<sub className="text-sm">2</sub>
                  </h1>
                  <p className="text-xs text-muted-foreground font-mono">
                    Copenhagen Defense • Maritime Command & Control
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Svalbard AIS
              </Badge>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">

        {/* Query Input */}
        <Card className="shadow-md border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Query Agent</CardTitle>
            <CardDescription className="text-xs">
              Natural language query for anomalous maritime trajectories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder='e.g., "threats near Svalbard" or "unusual fishing vessel behavior"'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[90px] resize-none font-sans text-sm"
              disabled={loading}
            />
            <Button
              onClick={handleQuery}
              disabled={loading || !prompt.trim()}
              className="w-full font-medium"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Execute Query"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-destructive text-sm">
                <XCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* XAI Reasoning Trace */}
        {response && response.trace.length > 0 && (
          <Card className="bg-trace-bg border-trace-border/50 shadow-lg animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-primary">XAI Reasoning Trace</CardTitle>
                <Badge variant="outline" className="font-mono text-xs">Live</Badge>
              </div>
              <CardDescription className="text-xs">Explainable AI decision pathway</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {response.trace.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-sm text-foreground/90 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-trace-step/20 border border-trace-step/30 text-xs font-mono font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
              {response.timings && (
                <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground font-mono flex items-center justify-between">
                  <span>
                    {response.timings.totalMs}ms
                    {response.timings.weaviateMs && ` • DB: ${response.timings.weaviateMs}ms`}
                  </span>
                  <code className="text-primary/80 text-[10px]">{response.traceId}</code>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Proposal */}
        {response && response.proposal && (
          <Card className="border-primary/50 shadow-lg animate-scale-in">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Agent Proposal</CardTitle>
                <Badge className="font-mono text-xs">HITL</Badge>
              </div>
              <CardDescription className="text-xs">Actionable recommendation from RAG analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded border border-border/50 bg-secondary/50 p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {response.proposal}
              </div>
              
              {/* HITL Actions */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  onClick={() => handleApprove(true)}
                  variant="default"
                  size="sm"
                  className="font-medium"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleApprove(false)}
                  variant="destructive"
                  size="sm"
                  className="font-medium"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Visualization */}
        {response && response.data.length > 0 && (
          <Card className="bg-card/50 border-border/50 shadow-lg animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapIcon className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-medium">Maritime Visualization</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMap(!showMap)}
                  className="text-xs"
                >
                  {showMap ? "Hide Map" : "Show Map"}
                </Button>
              </div>
              <CardDescription className="text-xs">
                Interactive trajectory paths near Svalbard
              </CardDescription>
            </CardHeader>
            {showMap && (
              <CardContent>
                <div className="h-[500px] rounded-lg overflow-hidden">
                  <TrajectoryMap trajectories={response.data} />
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Retrieved Trajectories */}
        {response && response.data.length > 0 && (
          <Card className="bg-data-bg border-data-border/50 shadow-md animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Retrieved Trajectories</CardTitle>
                <Badge variant="secondary" className="font-mono text-xs">
                  {response.data.length} anomal{response.data.length !== 1 ? "ies" : "y"}
                </Badge>
              </div>
              <CardDescription className="text-xs">Indexed anomalous maritime trajectories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {response.data.map((traj: Trajectory, index: number) => (
                  <div
                    key={index}
                    className="rounded border border-border/50 bg-card/50 p-3.5 space-y-2 hover:border-border transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {traj.mmsi || "N/A"}
                        </span>
                        {traj.shipType && (
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            {traj.shipType}
                          </Badge>
                        )}
                      </div>
                      {traj.distance !== undefined && (
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                          d:{traj.distance.toFixed(3)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                      <div className="font-mono">
                        <span className="text-foreground/70">Time:</span>{" "}
                        {formatTimestamp(traj.timeStart)} → {formatTimestamp(traj.timeEnd)}
                      </div>
                      <div className="font-mono">
                        <span className="text-foreground/70">Points:</span>{" "}
                        {traj.trackLength || "N/A"}
                      </div>
                    </div>
                    
                    <div className="text-xs font-mono">
                      <span className="text-foreground/70">Centroid:</span>{" "}
                      <span className="text-primary/90">
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
      </div>
    </div>
  );
};

export default Dashboard;
