import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  objectName?: string;
  recordId?: string;
  clusterId?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface UseMapViewResult {
  markers: MapMarker[];
  setMarkers: (markers: MapMarker[]) => void;
  selectedMarker: MapMarker | null;
  selectMarker: (id: string | null) => void;
  region: MapRegion;
  setRegion: (region: MapRegion) => void;
  clusterMarkers: (zoomLevel: number) => MapMarker[];
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for map view with marker management.
 *
 * ```ts
 * const { markers, setMarkers, selectMarker, clusterMarkers } = useMapView();
 * setMarkers([{ id: "m1", latitude: 37.78, longitude: -122.41, title: "SF" }]);
 * const clusters = clusterMarkers(10);
 * ```
 */
export function useMapView(): UseMapViewResult {
  const [markers, setMarkersState] = useState<MapMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [region, setRegion] = useState<MapRegion>({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [isLoading] = useState(false);

  const setMarkers = useCallback((newMarkers: MapMarker[]) => {
    setMarkersState(newMarkers);
  }, []);

  const selectMarker = useCallback(
    (id: string | null) => {
      if (id === null) {
        setSelectedMarker(null);
        return;
      }
      const found = markers.find((m) => m.id === id) ?? null;
      setSelectedMarker(found);
    },
    [markers],
  );

  const clusterMarkers = useCallback(
    (zoomLevel: number): MapMarker[] => {
      if (zoomLevel >= 15) return markers;

      const threshold = 1 / Math.pow(2, zoomLevel) * 50;
      const clustered: MapMarker[] = [];
      const visited = new Set<string>();

      for (const marker of markers) {
        if (visited.has(marker.id)) continue;
        visited.add(marker.id);

        const nearby = markers.filter((m) => {
          if (visited.has(m.id)) return false;
          const dist = Math.sqrt(
            Math.pow(marker.latitude - m.latitude, 2) +
              Math.pow(marker.longitude - m.longitude, 2),
          );
          return dist < threshold;
        });

        if (nearby.length > 0) {
          const all = [marker, ...nearby];
          const avgLat =
            all.reduce((sum, m) => sum + m.latitude, 0) / all.length;
          const avgLng =
            all.reduce((sum, m) => sum + m.longitude, 0) / all.length;

          for (const n of nearby) visited.add(n.id);

          clustered.push({
            id: `cluster-${marker.id}`,
            latitude: avgLat,
            longitude: avgLng,
            title: `${all.length} markers`,
            clusterId: `cluster-${marker.id}`,
          });
        } else {
          clustered.push(marker);
        }
      }

      return clustered;
    },
    [markers],
  );

  return {
    markers,
    setMarkers,
    selectedMarker,
    selectMarker,
    region,
    setRegion,
    clusterMarkers,
    isLoading,
  };
}
