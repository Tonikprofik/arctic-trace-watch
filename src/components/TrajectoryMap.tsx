import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Trajectory } from "@/types";

interface TrajectoryMapProps {
  trajectories: Trajectory[];
}

const TrajectoryMap = ({ trajectories }: TrajectoryMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

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

    // Initialize layer group for trajectories
    layerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

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
      const markerIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/80 border-2 border-primary shadow-lg backdrop-blur-sm">
            <span class="text-xs font-mono font-semibold text-primary-foreground">${index + 1}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(latLng, { icon: markerIcon });

      // Create popup content
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <div class="font-mono text-xs font-semibold text-primary mb-2">
            MMSI: ${traj.mmsi || "N/A"}
          </div>
          <div class="space-y-1 text-xs">
            <div><span class="text-muted-foreground">Type:</span> ${traj.shipType || "Unknown"}</div>
            <div><span class="text-muted-foreground">Points:</span> ${traj.trackLength || "N/A"}</div>
            <div><span class="text-muted-foreground">Coords:</span> ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(layerGroupRef.current!);

      bounds.push(latLng);

      // Draw trajectory path if start and end locations exist
      if (traj.startLocation && traj.endLocation) {
        const pathCoords: L.LatLngExpression[] = [
          [traj.startLocation.latitude, traj.startLocation.longitude],
          [traj.centroid.latitude, traj.centroid.longitude],
          [traj.endLocation.latitude, traj.endLocation.longitude],
        ];

        const polyline = L.polyline(pathCoords, {
          color: "hsl(210, 90%, 58%)",
          weight: 2,
          opacity: 0.6,
          dashArray: "5, 10",
        });

        polyline.addTo(layerGroupRef.current!);

        // Add start marker
        const startMarker = L.circleMarker(
          [traj.startLocation.latitude, traj.startLocation.longitude],
          {
            radius: 4,
            fillColor: "hsl(142, 76%, 45%)",
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
          }
        );
        startMarker.bindPopup(`<div class="text-xs p-1">Start Position</div>`);
        startMarker.addTo(layerGroupRef.current!);

        // Add end marker
        const endMarker = L.circleMarker(
          [traj.endLocation.latitude, traj.endLocation.longitude],
          {
            radius: 4,
            fillColor: "hsl(0, 65%, 55%)",
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
          }
        );
        endMarker.bindPopup(`<div class="text-xs p-1">End Position</div>`);
        endMarker.addTo(layerGroupRef.current!);
      }
    });

    // Fit map to show all trajectories
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [trajectories]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0 rounded-lg border border-border/50" />
      <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm border border-border/50 rounded px-3 py-2 shadow-md z-[1000]">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-muted-foreground">Start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-muted-foreground">Centroid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive"></div>
            <span className="text-muted-foreground">End</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrajectoryMap;
