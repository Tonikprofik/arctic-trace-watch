import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Trajectory } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Maximize2, Minimize2, Layers, Play, Pause, RotateCcw, ZoomIn, Flame, Radio } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeTelemetry } from "@/hooks/useRealtimeTelemetry";

interface TrajectoryMapProps {
  trajectories: Trajectory[];
  onTrajectorySelect?: (trajectory: Trajectory) => void;
  liveMode?: boolean;
}

const TrajectoryMap = ({ trajectories, onTrajectorySelect, liveMode = false }: TrajectoryMapProps) => {
  const { liveVessels, isConnected } = useRealtimeTelemetry(liveMode);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const liveMarkersRef = useRef<Map<number, L.CircleMarker>>(new Map());
  const animationRef = useRef<number | null>(null);
  
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPaths, setShowPaths] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showReplayControls, setShowReplayControls] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Svalbard
    mapInstanceRef.current = L.map(mapRef.current, {
      center: [78.2232, 15.6267], // Longyearbyen, Svalbard
      zoom: 6,
      zoomControl: true,
    });

    // Add dark maritime tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(mapInstanceRef.current);

    // Initialize layer groups
    layerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    heatLayerRef.current = L.layerGroup();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      liveMarkersRef.current.clear();
    };
  }, []);

  // Handle live vessel updates with smooth interpolation
  useEffect(() => {
    if (!liveMode || !mapInstanceRef.current || liveVessels.length === 0) return;

    requestAnimationFrame(() => {
      liveVessels.forEach((vessel) => {
        let marker = liveMarkersRef.current.get(vessel.mmsi);
        
        if (!marker) {
          marker = L.circleMarker([vessel.lat, vessel.lon], {
            radius: 8,
            fillColor: '#ef4444',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(mapInstanceRef.current!);
          
          marker.bindPopup(`
            <div class="text-sm">
              <strong class="text-primary">LIVE: MMSI ${vessel.mmsi}</strong><br/>
              Speed: ${vessel.speed?.toFixed(1) || 'N/A'} kts<br/>
              Course: ${vessel.course?.toFixed(0) || 'N/A'}°<br/>
              Position: ${vessel.lat.toFixed(4)}, ${vessel.lon.toFixed(4)}
            </div>
          `);
          
          liveMarkersRef.current.set(vessel.mmsi, marker);
        } else {
          // Smooth interpolation between positions
          const currentPos = marker.getLatLng();
          const targetPos = L.latLng(vessel.lat, vessel.lon);
          
          const steps = 10;
          let step = 0;
          
          const interpolate = () => {
            if (step < steps) {
              const lat = currentPos.lat + (targetPos.lat - currentPos.lat) * (step / steps);
              const lng = currentPos.lng + (targetPos.lng - currentPos.lng) * (step / steps);
              marker?.setLatLng([lat, lng]);
              step++;
              requestAnimationFrame(interpolate);
            }
          };
          
          interpolate();
          
          marker.setPopupContent(`
            <div class="text-sm">
              <strong class="text-primary">LIVE: MMSI ${vessel.mmsi}</strong><br/>
              Speed: ${vessel.speed?.toFixed(1) || 'N/A'} kts<br/>
              Course: ${vessel.course?.toFixed(0) || 'N/A'}°<br/>
              Position: ${vessel.lat.toFixed(4)}, ${vessel.lon.toFixed(4)}
            </div>
          `);
        }
      });
    });
  }, [liveVessels, liveMode]);

  // Clear live markers when live mode is disabled
  useEffect(() => {
    if (!liveMode) {
      liveMarkersRef.current.forEach(marker => marker.remove());
      liveMarkersRef.current.clear();
      setShowReplayControls(trajectories.length > 0);
    }
  }, [liveMode, trajectories.length]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!mapRef.current) return;
    
    if (!document.fullscreenElement) {
      mapRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Zoom to fit all trajectories
  const zoomToFit = () => {
    if (!mapInstanceRef.current || trajectories.length === 0) return;
    
    const bounds: L.LatLngBoundsExpression = [];
    trajectories.forEach(traj => {
      if (traj.centroid) {
        bounds.push([traj.centroid.latitude, traj.centroid.longitude]);
      }
    });
    
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      toast.success("Zoomed to fit all trajectories");
    }
  };

  // Toggle heatmap layer
  const toggleHeatmap = () => {
    if (!mapInstanceRef.current || !heatLayerRef.current) return;
    
    if (showHeatmap) {
      heatLayerRef.current.removeFrom(mapInstanceRef.current);
      setShowHeatmap(false);
    } else {
      // Create heatmap effect using circle markers
      heatLayerRef.current.clearLayers();
      trajectories.forEach(traj => {
        if (traj.centroid) {
          const circle = L.circle(
            [traj.centroid.latitude, traj.centroid.longitude],
            {
              radius: 5000,
              fillColor: "hsl(0, 65%, 55%)",
              color: "transparent",
              fillOpacity: 0.3,
            }
          );
          circle.addTo(heatLayerRef.current!);
        }
      });
      heatLayerRef.current.addTo(mapInstanceRef.current);
      setShowHeatmap(true);
      toast.success("Heatmap layer enabled");
    }
  };

  // Animate trajectory replay with speed control
  const startAnimation = () => {
    if (isAnimating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    let progress = animationProgress;
    
    const animate = () => {
      progress += 0.5 * playbackSpeed;
      if (progress >= 100) {
        setIsAnimating(false);
        toast.success("Replay complete", {
          description: "Animation finished",
        });
        return;
      }
      
      setAnimationProgress(progress);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  const resetAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsAnimating(false);
    setAnimationProgress(0);
  };

  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    // Clear existing layers
    layerGroupRef.current.clearLayers();

    if (trajectories.length === 0) return;

    const bounds: L.LatLngBoundsExpression = [];

    trajectories.forEach((traj, index) => {
      if (!traj.centroid) return;

      const { latitude, longitude } = traj.centroid;
      const latLng: L.LatLngExpression = [latitude, longitude];

      // Add centroid marker
      const isSelected = selectedIndex === index;
      const markerIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full ${isSelected ? 'bg-success border-success scale-110' : 'bg-primary/80 border-primary'} border-2 shadow-lg backdrop-blur-sm transition-all duration-200 cursor-pointer hover:scale-110">
            <span class="text-xs font-mono font-semibold text-primary-foreground">${index + 1}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(latLng, { icon: markerIcon });
      
      // Add click handler
      marker.on('click', () => {
        setSelectedIndex(index);
        if (onTrajectorySelect) {
          onTrajectorySelect(traj);
        }
      });

      // Create enhanced popup content
      const popupContent = `
        <div class="p-3 min-w-[240px]">
          <div class="flex items-center justify-between mb-2">
            <div class="font-mono text-sm font-semibold text-primary">
              MMSI: ${traj.mmsi || "N/A"}
            </div>
            <div class="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
              #${index + 1}
            </div>
          </div>
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Type:</span> 
              <span class="font-medium">${traj.shipType || "Unknown"}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Points:</span> 
              <span class="font-medium">${traj.trackLength || "N/A"}</span>
            </div>
            <div class="border-t border-border/50 pt-1.5 mt-1.5">
              <div class="text-muted-foreground mb-0.5">Location:</div>
              <div class="font-mono text-[10px] text-primary/90">${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E</div>
            </div>
            ${traj.distance !== undefined ? `
              <div class="border-t border-border/50 pt-1.5 mt-1.5">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Distance:</span>
                  <span class="font-mono text-primary">${traj.distance.toFixed(3)}</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(layerGroupRef.current!);

      bounds.push(latLng);

      // Draw trajectory path if start and end locations exist
      if (showPaths && traj.startLocation && traj.endLocation) {
        const pathCoords: L.LatLngExpression[] = [
          [traj.startLocation.latitude, traj.startLocation.longitude],
          [traj.centroid.latitude, traj.centroid.longitude],
          [traj.endLocation.latitude, traj.endLocation.longitude],
        ];

        // Main path
        const polyline = L.polyline(pathCoords, {
          color: isSelected ? "hsl(142, 76%, 45%)" : "hsl(210, 90%, 58%)",
          weight: isSelected ? 3 : 2,
          opacity: isSelected ? 0.9 : 0.6,
          dashArray: "5, 10",
        });

        polyline.addTo(layerGroupRef.current!);

        // Animated progress indicator
        if (isAnimating && animationProgress > 0) {
          const progressPoint = animationProgress / 100;
          let animatedCoord: L.LatLngExpression;
          
          if (progressPoint < 0.5) {
            const t = progressPoint * 2;
            animatedCoord = [
              traj.startLocation.latitude + (traj.centroid.latitude - traj.startLocation.latitude) * t,
              traj.startLocation.longitude + (traj.centroid.longitude - traj.startLocation.longitude) * t,
            ];
          } else {
            const t = (progressPoint - 0.5) * 2;
            animatedCoord = [
              traj.centroid.latitude + (traj.endLocation.latitude - traj.centroid.latitude) * t,
              traj.centroid.longitude + (traj.endLocation.longitude - traj.centroid.longitude) * t,
            ];
          }

          const animMarker = L.circleMarker(animatedCoord, {
            radius: 5,
            fillColor: "hsl(210, 90%, 58%)",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1,
          });
          animMarker.addTo(layerGroupRef.current!);
        }

        // Add start marker with pulse effect
        const startMarker = L.circleMarker(
          [traj.startLocation.latitude, traj.startLocation.longitude],
          {
            radius: 5,
            fillColor: "hsl(142, 76%, 45%)",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }
        );
        startMarker.bindPopup(`
          <div class="text-xs p-2">
            <div class="font-semibold text-success mb-1">Start Position</div>
            <div class="font-mono text-[10px] text-muted-foreground">
              ${traj.startLocation.latitude.toFixed(4)}°N, ${traj.startLocation.longitude.toFixed(4)}°E
            </div>
          </div>
        `);
        startMarker.addTo(layerGroupRef.current!);

        // Add end marker
        const endMarker = L.circleMarker(
          [traj.endLocation.latitude, traj.endLocation.longitude],
          {
            radius: 5,
            fillColor: "hsl(0, 65%, 55%)",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }
        );
        endMarker.bindPopup(`
          <div class="text-xs p-2">
            <div class="font-semibold text-destructive mb-1">End Position</div>
            <div class="font-mono text-[10px] text-muted-foreground">
              ${traj.endLocation.latitude.toFixed(4)}°N, ${traj.endLocation.longitude.toFixed(4)}°E
            </div>
          </div>
        `);
        endMarker.addTo(layerGroupRef.current!);
      }
    });

    // Fit map to show all trajectories
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [trajectories, selectedIndex, showPaths, isAnimating, animationProgress]);

  return (
    <div className="relative w-full h-full group">
      <div ref={mapRef} className="absolute inset-0 rounded-lg border border-border/50 transition-all duration-300" />
      
      {/* Legend */}
      <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 shadow-lg z-[1000] animate-fade-in">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success shadow-sm"></div>
            <span className="text-muted-foreground">Start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary shadow-sm"></div>
            <span className="text-muted-foreground">Centroid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive shadow-sm"></div>
            <span className="text-muted-foreground">End</span>
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000] animate-fade-in">
        {liveMode && (
          <Badge 
            variant={isConnected ? "destructive" : "secondary"}
            className={`shadow-lg backdrop-blur-sm ${isConnected ? 'animate-pulse' : ''}`}
          >
            <Radio className="w-3 h-3 mr-1" />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Badge>
        )}
        
        <Button
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0 shadow-lg bg-card/95 backdrop-blur-sm hover:bg-card hover:scale-110 transition-all"
          onClick={zoomToFit}
          title="Zoom to fit"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          className={`h-8 w-8 p-0 shadow-lg bg-card/95 backdrop-blur-sm hover:scale-110 transition-all ${showPaths ? 'bg-primary/20 border-primary' : 'hover:bg-card'}`}
          onClick={() => setShowPaths(!showPaths)}
          title="Toggle paths"
        >
          <Layers className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          className={`h-8 w-8 p-0 shadow-lg bg-card/95 backdrop-blur-sm hover:scale-110 transition-all ${showHeatmap ? 'bg-destructive/20 border-destructive' : 'hover:bg-card'}`}
          onClick={toggleHeatmap}
          title="Toggle heatmap"
        >
          <Flame className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0 shadow-lg bg-card/95 backdrop-blur-sm hover:bg-card hover:scale-110 transition-all"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Animation Controls with Speed */}
      {showReplayControls && !liveMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-lg z-[1000]"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-3 shadow-sm"
                onClick={startAnimation}
              >
                {isAnimating ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    <span className="text-xs">Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    <span className="text-xs">Play</span>
                  </>
                )}
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={resetAnimation}
                disabled={!isAnimating && animationProgress === 0}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </motion.div>

            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-32 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${animationProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground min-w-[3ch]">
                {Math.round(animationProgress)}%
              </span>
            </div>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground mr-1">Speed:</span>
            {[0.5, 1, 2, 4].map((speed) => (
              <motion.div key={speed} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="sm"
                  variant={playbackSpeed === speed ? "default" : "ghost"}
                  onClick={() => setPlaybackSpeed(speed)}
                  className="h-6 px-2 text-xs"
                >
                  {speed}x
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Trajectory count badge */}
      <div className="absolute bottom-3 right-3 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-1.5 shadow-lg z-[1000] animate-fade-in">
        <div className="text-xs font-mono">
          <span className="text-muted-foreground">Trajectories:</span>{" "}
          <span className="text-primary font-semibold">{trajectories.length}</span>
        </div>
      </div>
    </div>
  );
};

export default TrajectoryMap;
