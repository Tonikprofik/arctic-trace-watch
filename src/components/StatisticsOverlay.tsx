import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, TrendingUp, Ship, MapPin, Clock, AlertTriangle, BarChart3 } from "lucide-react";
import type { Trajectory } from "@/types";

interface StatisticsOverlayProps {
  trajectories: Trajectory[];
  onClose: () => void;
}

export const StatisticsOverlay = ({ trajectories, onClose }: StatisticsOverlayProps) => {
  const stats = useMemo(() => {
    if (trajectories.length === 0) {
      return {
        total: 0,
        shipTypes: {},
        avgTrackLength: 0,
        avgDistance: 0,
        timeRange: { earliest: null, latest: null },
        geoBounds: { north: 0, south: 0, east: 0, west: 0 },
        threatLevel: "NONE" as const,
      };
    }

    const shipTypes: Record<string, number> = {};
    let totalLength = 0;
    let totalDistance = 0;
    let earliest: string | null = null;
    let latest: string | null = null;
    let north = -90, south = 90, east = -180, west = 180;

    trajectories.forEach(t => {
      // Ship types
      const type = t.shipType || "Unknown";
      shipTypes[type] = (shipTypes[type] || 0) + 1;

      // Track lengths
      totalLength += t.trackLength || 0;

      // Distance
      totalDistance += t.distance || 0;

      // Time range
      if (t.timeStart) {
        if (!earliest || t.timeStart < earliest) earliest = t.timeStart;
        if (!latest || t.timeStart > latest) latest = t.timeStart;
      }
      if (t.timeEnd) {
        if (!latest || t.timeEnd > latest) latest = t.timeEnd;
      }

      // Geographic bounds
      if (t.centroid) {
        north = Math.max(north, t.centroid.latitude);
        south = Math.min(south, t.centroid.latitude);
        east = Math.max(east, t.centroid.longitude);
        west = Math.min(west, t.centroid.longitude);
      }
    });

    // Calculate threat level based on concentration and ship types
    const concentration = trajectories.length / Math.max(1, (east - west) * (north - south));
    const hasMilitary = Object.keys(shipTypes).some(t => 
      t.toLowerCase().includes("military") || t.toLowerCase().includes("service")
    );
    
    let threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (hasMilitary || concentration > 0.5) threatLevel = "MEDIUM";
    if (concentration > 1) threatLevel = "HIGH";
    if (trajectories.length > 10 && concentration > 1) threatLevel = "CRITICAL";

    return {
      total: trajectories.length,
      shipTypes,
      avgTrackLength: totalLength / trajectories.length,
      avgDistance: totalDistance / trajectories.length,
      timeRange: { earliest, latest },
      geoBounds: { north, south, east, west },
      threatLevel,
    };
  }, [trajectories]);

  const threatColor = {
    LOW: "text-green-500",
    MEDIUM: "text-yellow-500",
    HIGH: "text-orange-500",
    CRITICAL: "text-red-500",
  }[stats.threatLevel];

  const threatBg = {
    LOW: "bg-green-500/10 border-green-500/30",
    MEDIUM: "bg-yellow-500/10 border-yellow-500/30",
    HIGH: "bg-orange-500/10 border-orange-500/30",
    CRITICAL: "bg-red-500/10 border-red-500/30",
  }[stats.threatLevel];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-4 z-50 pointer-events-none flex items-center justify-center"
      >
        <Card className="pointer-events-auto glass-strong border-primary/30 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Intelligence Statistics</CardTitle>
                  <CardDescription>Anomaly trajectory analysis summary</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-lg bg-card/50 border border-border/50"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Anomalies</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="p-4 rounded-lg bg-card/50 border border-border/50"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Avg Track Length</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{Math.round(stats.avgTrackLength)}</p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-lg bg-card/50 border border-border/50"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-medium">Avg Distance</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.avgDistance.toFixed(3)}</p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className={`p-4 rounded-lg border ${threatBg}`}
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-medium">Threat Level</span>
                </div>
                <p className={`text-2xl font-bold ${threatColor}`}>{stats.threatLevel}</p>
              </motion.div>
            </div>

            {/* Ship Type Distribution */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Ship className="h-4 w-4 text-primary" />
                Ship Type Distribution
              </h3>
              <div className="space-y-2">
                {Object.entries(stats.shipTypes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count], idx) => {
                    const percentage = (count / stats.total) * 100;
                    return (
                      <motion.div
                        key={type}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + idx * 0.05 }}
                        className="space-y-1"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{type}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {count}
                            </Badge>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: 0.5 + idx * 0.05, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-primary to-primary/60"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>

            {/* Temporal Analysis */}
            {stats.timeRange.earliest && stats.timeRange.latest && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Temporal Range
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-card/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Earliest Event</p>
                    <p className="text-sm font-mono text-foreground">
                      {new Date(stats.timeRange.earliest).toISOString().slice(0, 19).replace("T", " ")}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-card/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Latest Event</p>
                    <p className="text-sm font-mono text-foreground">
                      {new Date(stats.timeRange.latest).toISOString().slice(0, 19).replace("T", " ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Geographic Bounds */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Geographic Coverage
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-card/30 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Latitude Range</p>
                  <p className="text-sm font-mono text-foreground">
                    {stats.geoBounds.south.toFixed(4)}° to {stats.geoBounds.north.toFixed(4)}°
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-card/30 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Longitude Range</p>
                  <p className="text-sm font-mono text-foreground">
                    {stats.geoBounds.west.toFixed(4)}° to {stats.geoBounds.east.toFixed(4)}°
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
