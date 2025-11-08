import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Activity, Map as MapIcon, Brain, Search, Filter, Radio } from "lucide-react";
import { queryAgent, approveHitl } from "@/api/api";
import type { QueryResponse, Trajectory } from "@/types";
import { toast } from "sonner";
import ActivityFeed from "@/components/ActivityFeed";
import TrajectoryMap from "@/components/TrajectoryMap";
import { LiveProducer } from "@/components/LiveProducer";
import { saveQuery, updateQueryApproval } from "@/services/queryHistory";
import { analyzeThreats } from "@/services/aiAnalysis";

const Dashboard = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [selectedTrajectory, setSelectedTrajectory] = useState<Trajectory | null>(null);
  
  // Filter and sort state
  const [trajectorySearch, setTrajectorySearch] = useState("");
  const [trajectorySort, setTrajectorySort] = useState<string>("mmsi");
  const [shipTypeFilter, setShipTypeFilter] = useState<string>("all");
  const [traceSearch, setTraceSearch] = useState("");
  const [liveMode, setLiveMode] = useState(false);

  const handleQuery = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a query");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setAiAnalysis(null);
    setSelectedTrajectory(null);
    setTrajectorySearch("");
    setTrajectorySort("mmsi");
    setShipTypeFilter("all");
    setTraceSearch("");

    try {
      const result = await queryAgent({ prompt: prompt.trim() });
      setResponse(result);
      
      // Save to database
      await saveQuery(prompt.trim(), result.proposal, result.traceId);
      
      toast.success("Query completed", {
        description: "AI analysis ready for review",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!response || response.data.length === 0) {
      toast.error("No trajectory data to analyze");
      return;
    }

    setAnalyzingAI(true);
    try {
      const analysis = await analyzeThreats(response.data, prompt);
      setAiAnalysis(analysis);
      toast.success("AI threat analysis complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      toast.error(message);
    } finally {
      setAnalyzingAI(false);
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
      
      toast.success(approved ? "Proposal approved" : "Proposal dismissed", {
        description: approved ? "Action logged to feed" : "Recommendation dismissed",
      });
      
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

  // Filter and sort trajectories
  const filteredAndSortedTrajectories = useMemo(() => {
    if (!response) return [];
    
    let filtered = [...response.data];
    
    // Apply ship type filter
    if (shipTypeFilter !== "all") {
      filtered = filtered.filter(t => t.shipType?.toLowerCase() === shipTypeFilter.toLowerCase());
    }
    
    // Apply search filter
    if (trajectorySearch.trim()) {
      const search = trajectorySearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.mmsi?.toString().includes(search) ||
        t.shipType?.toLowerCase().includes(search) ||
        formatCoordinates(t.centroid).toLowerCase().includes(search)
      );
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      switch (trajectorySort) {
        case "mmsi":
          return (a.mmsi || 0) - (b.mmsi || 0);
        case "shipType":
          return (a.shipType || "").localeCompare(b.shipType || "");
        case "trackLength":
          return (b.trackLength || 0) - (a.trackLength || 0);
        case "distance":
          return (a.distance || 0) - (b.distance || 0);
        case "timeStart":
          return (a.timeStart || "").localeCompare(b.timeStart || "");
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [response, shipTypeFilter, trajectorySearch, trajectorySort]);

  // Get unique ship types for filter
  const shipTypes = useMemo(() => {
    if (!response) return [];
    const types = new Set(response.data.map(t => t.shipType).filter(Boolean));
    return Array.from(types);
  }, [response]);

  // Filter trace
  const filteredTrace = useMemo(() => {
    if (!response || !traceSearch.trim()) return response?.trace || [];
    const search = traceSearch.toLowerCase();
    return response.trace.filter(step => step.toLowerCase().includes(search));
  }, [response, traceSearch]);

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Activity Feed Sidebar */}
      <aside className="w-80 border-r border-border/50 glass-strong sticky top-0 h-screen overflow-hidden relative z-10">
        <ActivityFeed />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="border-b border-border glass-strong sticky top-0 z-20 shadow-lg">
          <div className="px-8 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 glow-sm">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight gradient-text">
                    Observable C<sub className="text-lg font-bold align-baseline -mb-1">2</sub>
                  </h1>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Copenhagen Defense • Maritime Intelligence Platform
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-card/50 border-primary/30">
                Svalbard AIS
              </Badge>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-8 py-10 space-y-8">

        {/* Query Input */}
        <Card className="glass-strong shadow-xl border-border/50 hover:shadow-2xl hover:glow-sm transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
              <Search className="h-5 w-5" />
              Query Agent
            </CardTitle>
            <CardDescription className="text-sm">
              Natural language query for anomalous maritime trajectories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder='e.g., "threats near Svalbard" or "unusual fishing vessel behavior"'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none font-sans text-sm bg-input/30 border-border/50 focus:border-primary/50 transition-colors"
              disabled={loading}
            />
            <Button
              onClick={handleQuery}
              disabled={loading || !prompt.trim()}
              className="w-full font-semibold h-11 shadow-md hover:shadow-xl hover:glow-sm transition-all duration-300"
              size="default"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Intelligence...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Execute Query
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10 glass shadow-lg animate-fade-in">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3 text-destructive">
                <XCircle className="h-5 w-5 shrink-0" />
                <span className="font-medium text-base">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* XAI Reasoning Trace */}
        <AnimatePresence mode="wait">
          {response && response.trace.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="glass border-primary/30 shadow-xl glow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        XAI Reasoning Trace
                      </CardTitle>
                      {liveMode && (
                        <Badge variant="destructive" className="animate-pulse">
                          <Radio className="w-3 h-3 mr-1" />
                          LIVE
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="font-mono text-xs px-2 py-1 bg-primary/10 border-primary/30 text-primary">
                      Explainable AI
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">Explainable AI decision pathway</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Trace Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter trace steps..."
                      value={traceSearch}
                      onChange={(e) => setTraceSearch(e.target.value)}
                      className="pl-10 h-10 text-sm bg-input/30 border-border/50"
                    />
                  </div>
                  
                  <ul className="space-y-3 bg-trace-bg/30 border border-trace-border/30 rounded-lg p-5 backdrop-blur-sm">
                    <AnimatePresence mode="popLayout">
                      {filteredTrace.map((step, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.15, duration: 0.4 }}
                          className="flex items-start gap-4 text-sm text-foreground/90"
                        >
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.15 + 0.2, type: "spring", stiffness: 300 }}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-trace-step/20 border border-trace-step/40 text-xs font-mono font-bold text-primary shadow-sm"
                          >
                            {index + 1}
                          </motion.span>
                          <span className="pt-0.5 leading-relaxed">{step}</span>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  {response.timings && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: filteredTrace.length * 0.15 + 0.3 }}
                      className="pt-4 border-t border-border/30 text-xs text-muted-foreground font-mono flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-primary font-semibold">{response.timings.totalMs}ms</span>
                        {response.timings.weaviateMs && (
                          <span className="text-muted-foreground">• DB: {response.timings.weaviateMs}ms</span>
                        )}
                      </span>
                      <code className="text-primary/70 text-[10px] bg-primary/5 px-2 py-1 rounded">{response.traceId}</code>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Proposal */}
        <AnimatePresence mode="wait">
          {response && response.proposal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ delay: 0.6, duration: 0.5, type: "spring", stiffness: 200 }}
            >
              <Card className="glass-strong border-accent/50 shadow-xl glow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-accent flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Agent Proposal
                    </CardTitle>
                    <Badge className="font-mono text-xs px-2 py-1 bg-accent/20 text-accent border-accent/30">
                      HITL
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">Actionable recommendation from RAG analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="rounded-lg border border-border/50 bg-muted/30 p-6 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed backdrop-blur-sm shadow-inner"
                  >
                    {response.proposal}
                  </motion.div>
                  
                  {/* HITL Actions */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                    className="grid grid-cols-2 gap-4 pt-2"
                  >
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => handleApprove(true)}
                        variant="default"
                        size="default"
                        className="w-full font-semibold h-11 bg-success hover:bg-success/90 shadow-md hover:shadow-lg transition-all"
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Approve
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => handleApprove(false)}
                        variant="outline"
                        size="default"
                        className="w-full font-semibold h-11 border-destructive/50 text-destructive hover:bg-destructive/10 shadow-md hover:shadow-lg transition-all"
                      >
                        <XCircle className="mr-2 h-5 w-5" />
                        Dismiss
                      </Button>
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Visualization */}
        {response && response.data.length > 0 && (
          <Card className="bg-card/50 border-border/50 shadow-lg animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapIcon className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-medium">Maritime Visualization</CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {response.data.length} vessel{response.data.length !== 1 ? "s" : ""}
                  </Badge>
                  {liveMode && (
                    <Badge variant="destructive" className="animate-pulse">
                      <Radio className="w-3 h-3 mr-1" />
                      LIVE
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={liveMode ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setLiveMode(!liveMode)}
                    className="text-xs"
                  >
                    <Radio className="mr-1 h-3 w-3" />
                    {liveMode ? "Stop Live" : "Go Live"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIAnalysis}
                    disabled={analyzingAI}
                    className="text-xs"
                  >
                    {analyzingAI ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-1 h-3 w-3" />
                        AI Analysis
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMap(!showMap)}
                    className="text-xs"
                  >
                    {showMap ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs">
                Interactive trajectory paths • Click markers for details
              </CardDescription>
            </CardHeader>
            {showMap && (
              <CardContent className="space-y-3">
                <div className="h-[500px] rounded-lg overflow-hidden border border-border/30 bg-card/30 relative group">
                  <TrajectoryMap 
                    trajectories={response.data}
                    onTrajectorySelect={setSelectedTrajectory}
                    liveMode={liveMode}
                  />
                </div>
                {selectedTrajectory && (
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 animate-scale-in">
                    <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      Selected: MMSI {selectedTrajectory.mmsi || "N/A"}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Type:</span>{" "}
                        <span className="font-medium text-foreground">{selectedTrajectory.shipType || "Unknown"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Points:</span>{" "}
                        <span className="font-medium text-foreground">{selectedTrajectory.trackLength || "N/A"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Time Range:</span>{" "}
                        <div className="font-mono text-[10px] text-foreground mt-0.5">
                          {formatTimestamp(selectedTrajectory.timeStart)} → {formatTimestamp(selectedTrajectory.timeEnd)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* AI Threat Analysis */}
        {aiAnalysis && (
          <Card className="glass border-warning/30 shadow-xl glow-sm animate-scale-in">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-warning" />
                <CardTitle className="text-lg font-semibold text-warning">AI Threat Analysis</CardTitle>
                <Badge className="font-mono text-xs px-2 py-1 bg-warning/20 text-warning border-warning/30">
                  OpenAI GPT-5
                </Badge>
              </div>
              <CardDescription className="text-sm">
                Comprehensive maritime threat assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-6 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed backdrop-blur-sm shadow-inner">
                {aiAnalysis}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Retrieved Trajectories */}
        {response && response.data.length > 0 && (
          <Card className="glass-strong border-border/50 shadow-xl animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Retrieved Trajectories
                </CardTitle>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-1 bg-secondary/80 border-border/50">
                  {filteredAndSortedTrajectories.length} / {response.data.length}
                </Badge>
              </div>
              <CardDescription className="text-sm">Indexed anomalous maritime trajectories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters and Sort */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search MMSI, type..."
                    value={trajectorySearch}
                    onChange={(e) => setTrajectorySearch(e.target.value)}
                    className="pl-10 h-10 text-sm bg-input/30 border-border/50"
                  />
                </div>
                
                <Select value={shipTypeFilter} onValueChange={setShipTypeFilter}>
                  <SelectTrigger className="h-10 text-sm bg-input/30 border-border/50">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {shipTypes.map(type => (
                      <SelectItem key={type} value={type || ""}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={trajectorySort} onValueChange={setTrajectorySort}>
                  <SelectTrigger className="h-10 text-sm bg-input/30 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mmsi">Sort: MMSI</SelectItem>
                    <SelectItem value="shipType">Sort: Ship Type</SelectItem>
                    <SelectItem value="trackLength">Sort: Track Length</SelectItem>
                    <SelectItem value="distance">Sort: Distance</SelectItem>
                    <SelectItem value="timeStart">Sort: Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                {filteredAndSortedTrajectories.map((traj: Trajectory, index: number) => (
                  <div
                    key={index}
                    onClick={() => setSelectedTrajectory(traj)}
                    className={`rounded-lg border p-5 space-y-3 transition-all duration-300 cursor-pointer backdrop-blur-sm ${
                      selectedTrajectory?.mmsi === traj.mmsi 
                        ? 'border-primary/60 bg-primary/10 shadow-xl glow-sm scale-[1.01]' 
                        : 'border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/50 hover:shadow-lg hover:scale-[1.005]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-primary">
                          {traj.mmsi || "N/A"}
                        </span>
                        {traj.shipType && (
                          <Badge variant="secondary" className="text-xs px-2.5 py-0.5 bg-secondary/80">
                            {traj.shipType}
                          </Badge>
                        )}
                      </div>
                      {traj.distance !== undefined && (
                        <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 border-primary/30">
                          dist: {traj.distance.toFixed(3)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
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

          {/* Live Producer Panel */}
          {liveMode && response && (
            <div className="mx-auto max-w-6xl px-8 pb-10">
              <LiveProducer 
                trajectories={filteredAndSortedTrajectories}
                traceId={response.traceId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
