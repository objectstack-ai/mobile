import React from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { MapPin, Navigation } from "lucide-react-native";
import { Card, CardContent } from "~/components/ui/Card";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface MapMarker {
  /** Unique ID */
  id: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Marker title */
  title: string;
  /** Marker description */
  description?: string;
  /** Full record reference */
  record?: Record<string, unknown>;
}

export interface MapViewRendererProps {
  /** Markers to display */
  markers: MapMarker[];
  /** Loading */
  isLoading?: boolean;
  /** Called when a marker / list item is pressed */
  onMarkerPress?: (marker: MapMarker) => void;
  /** Field used for latitude (default: "latitude") */
  latitudeField?: string;
  /** Field used for longitude (default: "longitude") */
  longitudeField?: string;
  /** Title field (default: "name") */
  titleField?: string;
}

/* ------------------------------------------------------------------ */
/*  Helper: extract markers from records                               */
/* ------------------------------------------------------------------ */

/**
 * Build MapMarker[] from raw records using field-name hints.
 *
 * Useful when the caller passes raw data records instead of
 * pre-formatted MapMarker objects.
 */
export function recordsToMarkers(
  records: Record<string, unknown>[],
  opts?: {
    latitudeField?: string;
    longitudeField?: string;
    titleField?: string;
  },
): MapMarker[] {
  const latField = opts?.latitudeField ?? "latitude";
  const lngField = opts?.longitudeField ?? "longitude";
  const titleField = opts?.titleField ?? "name";

  return records
    .map((rec) => {
      const lat = Number(rec[latField] ?? rec.lat);
      const lng = Number(rec[lngField] ?? rec.lng ?? rec.lon);
      if (isNaN(lat) || isNaN(lng)) return null;

      return {
        id: String(rec.id ?? rec._id ?? Math.random()),
        latitude: lat,
        longitude: lng,
        title: String(rec[titleField] ?? rec.label ?? rec.title ?? "Location"),
        description: rec.description ? String(rec.description) : undefined,
        record: rec,
      } satisfies MapMarker;
    })
    .filter(Boolean) as MapMarker[];
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Map view renderer.
 *
 * Displays a list of geo-located records with coordinates.  Since the
 * app does not currently depend on a native map library, this renderer
 * shows a card-based location list with coordinate details.  It can be
 * upgraded to use `react-native-maps` or `expo-maps` when available.
 */
export function MapViewRenderer({
  markers,
  isLoading = false,
  onMarkerPress,
}: MapViewRendererProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (markers.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <MapPin size={48} color="#94a3b8" />
        <Text className="mt-4 text-lg font-semibold text-foreground">No Locations</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          No records with location data were found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      {/* Summary header */}
      <View className="flex-row items-center gap-2 mb-2">
        <Navigation size={16} color="#1e40af" />
        <Text className="text-sm font-medium text-muted-foreground">
          {markers.length} location{markers.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Location cards */}
      {markers.map((marker) => (
        <Pressable
          key={marker.id}
          onPress={onMarkerPress ? () => onMarkerPress(marker) : undefined}
        >
          <Card className="active:bg-muted/50">
            <CardContent className="flex-row items-center gap-3 py-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MapPin size={18} color="#1e40af" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-card-foreground" numberOfLines={1}>
                  {marker.title}
                </Text>
                {marker.description && (
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    {marker.description}
                  </Text>
                )}
                <Text className="mt-0.5 text-[10px] text-muted-foreground">
                  {marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)}
                </Text>
              </View>
            </CardContent>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
