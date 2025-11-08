import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, AlertTriangle, Ship } from "lucide-react";
import type { Trajectory } from "@/types";
import type { LiveVessel } from "@/services/realtime";

interface StatisticsOverlayProps {
  trajectories: Trajectory[];
  liveVessels?: LiveVessel[];
  liveMode?: boolean;
}

const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="tabular-nums">
      {displayValue}
      {suffix}
    </span>
  );
};

export const StatisticsOverlay = ({ trajectories, liveVessels = [], liveMode = false }: StatisticsOverlayProps) => {
  const activeVessels = liveMode ? liveVessels.length : trajectories.length;
  
  const totalDistance = trajectories.reduce((sum, t) => {
    if (!t.distance) return sum;
    return sum + t.distance;
  }, 0);

  const avgSpeed = liveVessels.length > 0 
    ? liveVessels.reduce((sum, v) => sum + (v.speed || 0), 0) / liveVessels.length
    : 0;

  const threatLevel = trajectories.length > 10 ? "HIGH" : trajectories.length > 5 ? "MEDIUM" : "LOW";
  const threatColor = threatLevel === "HIGH" ? "destructive" : threatLevel === "MEDIUM" ? "warning" : "success";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute top-4 right-4 z-[1000] pointer-events-none"
    >
      <Card className="glass-strong border-border/50 shadow-2xl p-4 space-y-3 w-64 pointer-events-auto">
        {/* Active Vessels */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Active Vessels</span>
          </div>
          <motion.div
            key={activeVessels}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-primary"
          >
            <AnimatedNumber value={activeVessels} />
          </motion.div>
        </motion.div>

        {/* Total Distance */}
        {totalDistance > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Total Distance</span>
            </div>
            <div className="text-lg font-semibold text-accent">
              <AnimatedNumber value={Math.round(totalDistance)} suffix=" km" />
            </div>
          </motion.div>
        )}

        {/* Avg Speed */}
        {liveMode && avgSpeed > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Avg Speed</span>
            </div>
            <div className="text-lg font-semibold text-success">
              {avgSpeed.toFixed(1)} kts
            </div>
          </motion.div>
        )}

        {/* Threat Level */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between pt-2 border-t border-border/50"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Threat Level</span>
          </div>
          <Badge 
            variant={threatColor as any}
            className="font-mono text-xs animate-pulse"
          >
            {threatLevel}
          </Badge>
        </motion.div>

        {/* Mini Sparkline */}
        {liveMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-2"
          >
            <div className="h-8 flex items-end gap-0.5">
              {[...Array(12)].map((_, i) => {
                const height = Math.random() * 100;
                return (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex-1 bg-primary/30 rounded-sm origin-bottom"
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1 font-mono">
              Activity Timeline
            </p>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};
