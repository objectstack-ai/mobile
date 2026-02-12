/**
 * Tests for useMapView – validates map marker management,
 * selection, region tracking, and clustering.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useMapView, MapMarker } from "~/hooks/useMapView";

describe("useMapView", () => {
  const marker1: MapMarker = {
    id: "m1",
    latitude: 37.7749,
    longitude: -122.4194,
    title: "San Francisco",
  };
  const marker2: MapMarker = {
    id: "m2",
    latitude: 37.7751,
    longitude: -122.4196,
    title: "SF Nearby",
  };
  const marker3: MapMarker = {
    id: "m3",
    latitude: 40.7128,
    longitude: -74.006,
    title: "New York",
  };

  it("starts with empty markers and default region", () => {
    const { result } = renderHook(() => useMapView());
    expect(result.current.markers).toEqual([]);
    expect(result.current.selectedMarker).toBeNull();
    expect(result.current.region.latitude).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("setMarkers updates all markers", () => {
    const { result } = renderHook(() => useMapView());

    act(() => {
      result.current.setMarkers([marker1, marker2, marker3]);
    });

    expect(result.current.markers).toHaveLength(3);
    expect(result.current.markers[0].id).toBe("m1");
  });

  it("selectMarker finds and sets selected marker", () => {
    const { result } = renderHook(() => useMapView());

    act(() => {
      result.current.setMarkers([marker1, marker2]);
    });
    act(() => {
      result.current.selectMarker("m2");
    });

    expect(result.current.selectedMarker).toEqual(marker2);
  });

  it("selectMarker with null clears selection", () => {
    const { result } = renderHook(() => useMapView());

    act(() => {
      result.current.setMarkers([marker1]);
    });
    act(() => {
      result.current.selectMarker("m1");
    });
    act(() => {
      result.current.selectMarker(null);
    });

    expect(result.current.selectedMarker).toBeNull();
  });

  it("setRegion updates the map region", () => {
    const { result } = renderHook(() => useMapView());

    act(() => {
      result.current.setRegion({
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    });

    expect(result.current.region.latitude).toBe(37.7749);
  });

  it("clusterMarkers returns all markers at high zoom", () => {
    const { result } = renderHook(() => useMapView());

    act(() => {
      result.current.setMarkers([marker1, marker2, marker3]);
    });

    const clusters = result.current.clusterMarkers(15);
    expect(clusters).toEqual([marker1, marker2, marker3]);
  });

  it("clusterMarkers groups nearby markers at low zoom", () => {
    const { result } = renderHook(() => useMapView());

    act(() => {
      result.current.setMarkers([marker1, marker2, marker3]);
    });

    const clusters = result.current.clusterMarkers(5);
    // marker1 and marker2 are nearby, so they should be clustered
    // marker3 is far away, so it stays separate
    expect(clusters.length).toBeLessThan(3);
  });
});
