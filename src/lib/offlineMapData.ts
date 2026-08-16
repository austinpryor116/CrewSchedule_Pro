/**
 * Embedded Lightweight Offline Vector Map Geometry for CrewSchedule Pro
 * Contains simplified GeoJSON boundaries for North American landmass, US states, and major borders.
 * Guarantees zero-blank map rendering even in total Airplane Mode with 0 raster tiles.
 */

export interface SimpleGeoFeature {
  type: "Feature";
  properties: {
    name: string;
    code?: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface SimpleGeoFeatureCollection {
  type: "FeatureCollection";
  features: SimpleGeoFeature[];
}

/**
 * Simplified US Continental Landmass & Major Coastline Polygons
 * Compressed coordinates for instant offline Leaflet vector rendering
 */
export const OFFLINE_BASE_LANDMASS_GEOJSON: SimpleGeoFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "North America Landmass" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-124.7, 48.4], [-124.5, 46.2], [-124.4, 42.0], [-123.0, 38.0],
            [-122.5, 37.8], [-120.5, 34.5], [-117.2, 32.5], [-114.7, 32.7],
            [-111.0, 31.3], [-108.2, 31.7], [-106.5, 31.8], [-103.0, 29.0],
            [-100.5, 28.0], [-97.5, 26.0], [-97.1, 27.8], [-95.0, 29.0],
            [-93.8, 29.7], [-90.0, 29.2], [-89.0, 30.2], [-87.5, 30.3],
            [-85.0, 29.7], [-83.0, 29.0], [-82.5, 27.5], [-81.0, 25.1],
            [-80.1, 26.0], [-80.5, 28.5], [-81.4, 30.7], [-79.8, 32.8],
            [-77.9, 34.0], [-75.5, 35.2], [-76.0, 37.0], [-75.0, 38.8],
            [-74.0, 40.5], [-71.0, 41.5], [-70.0, 42.0], [-67.0, 44.5],
            [-67.0, 47.0], [-69.0, 47.4], [-71.5, 45.0], [-74.0, 45.0],
            [-76.5, 44.0], [-79.0, 43.0], [-82.5, 42.0], [-83.0, 46.0],
            [-84.5, 46.5], [-88.0, 48.0], [-95.1, 49.0], [-104.0, 49.0],
            [-111.0, 49.0], [-117.0, 49.0], [-123.0, 49.0], [-124.7, 48.4]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "Canada & Northern Airspace" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-141.0, 60.0], [-141.0, 69.5], [-130.0, 70.0], [-100.0, 70.0],
            [-80.0, 65.0], [-60.0, 60.0], [-55.0, 52.0], [-67.0, 47.0],
            [-79.0, 43.0], [-95.0, 49.0], [-123.0, 49.0], [-130.0, 55.0],
            [-136.0, 59.0], [-141.0, 60.0]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "Mexico & Caribbean Basin" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-117.2, 32.5], [-114.7, 32.7], [-106.5, 31.8], [-97.5, 26.0],
            [-97.0, 22.0], [-96.0, 19.0], [-92.0, 18.0], [-90.0, 21.0],
            [-87.0, 21.5], [-87.0, 18.5], [-92.0, 15.0], [-96.0, 16.0],
            [-105.0, 20.0], [-109.0, 23.0], [-112.0, 26.0], [-116.0, 31.0],
            [-117.2, 32.5]
          ]
        ]
      }
    }
  ]
};

/**
 * Simplified US State Grid & Corridor Lines
 */
export const US_STATE_OUTLINES: Array<{ name: string; path: [number, number][] }> = [
  // West Coast
  { name: "WA-OR", path: [[46.2, -124.0], [46.2, -117.0]] },
  { name: "OR-CA", path: [[42.0, -124.2], [42.0, -120.0]] },
  { name: "CA-NV", path: [[42.0, -120.0], [39.0, -120.0], [35.0, -114.6]] },
  { name: "NV-UT", path: [[42.0, -114.0], [37.0, -114.0]] },
  { name: "AZ-NM", path: [[37.0, -109.0], [31.3, -109.0]] },
  { name: "UT-CO", path: [[41.0, -109.0], [37.0, -109.0]] },
  { name: "WY-CO", path: [[41.0, -111.0], [41.0, -104.0]] },
  { name: "CO-NM", path: [[37.0, -109.0], [37.0, -103.0]] },
  { name: "MT-WY", path: [[45.0, -111.0], [45.0, -104.0]] },
  { name: "ND-SD", path: [[45.9, -104.0], [45.9, -96.5]] },
  { name: "SD-NE", path: [[43.0, -104.0], [43.0, -96.5]] },
  { name: "NE-KS", path: [[40.0, -102.0], [40.0, -95.3]] },
  { name: "KS-OK", path: [[37.0, -102.0], [37.0, -94.6]] },
  { name: "OK-TX", path: [[36.5, -103.0], [36.5, -100.0], [34.0, -100.0], [34.0, -94.5]] },
  { name: "TX-LA", path: [[33.0, -94.0], [30.0, -94.0], [29.7, -93.8]] },
  { name: "MN-IA", path: [[43.5, -96.5], [43.5, -91.2]] },
  { name: "IA-MO", path: [[40.6, -95.8], [40.6, -91.7]] },
  { name: "MO-AR", path: [[36.5, -94.6], [36.5, -89.6]] },
  { name: "AR-LA", path: [[33.0, -94.0], [33.0, -91.1]] },
  { name: "WI-IL", path: [[42.5, -90.6], [42.5, -87.8]] },
  { name: "IL-IN", path: [[41.7, -87.5], [38.0, -87.5]] },
  { name: "IN-OH", path: [[41.7, -84.8], [39.1, -84.8]] },
  { name: "KY-TN", path: [[36.6, -89.2], [36.6, -81.7]] },
  { name: "TN-AL-GA", path: [[35.0, -88.2], [35.0, -83.1]] },
  { name: "MS-AL", path: [[35.0, -88.1], [30.3, -88.4]] },
  { name: "AL-GA", path: [[35.0, -85.6], [32.3, -85.0], [30.7, -85.0]] },
  { name: "GA-FL", path: [[30.7, -85.0], [30.3, -81.4]] },
  { name: "NC-SC", path: [[35.2, -82.6], [33.8, -78.5]] },
  { name: "VA-NC", path: [[36.5, -83.7], [36.5, -75.9]] },
  { name: "PA-NY", path: [[42.0, -79.8], [42.0, -74.7]] },
];
