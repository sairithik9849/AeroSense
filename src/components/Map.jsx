import { useEffect, useState, useMemo } from "react";
import Map, { Source, Layer } from "react-map-gl";

// 1. Cluster Layer Style (The Circles)
const clusterLayer = {
  id: 'clusters',
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#3b82f6', // Blue for small clusters
      100,
      '#f59e0b', // Amber for medium
      750,
      '#ef4444'  // Red for large
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20, // Radius 20px
      100,
      30, // Radius 30px
      750,
      40  // Radius 40px
    ],
    'circle-opacity': 0.8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#000'
  }
};

// 2. Cluster Count Text Style
const clusterCountLayer = {
  id: 'cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
  },
  paint: {
    'text-color': '#ffffff'
  }
};

// 3. Unclustered Point Style (Single Stations)
const unclusteredPointLayer = {
  id: 'unclustered-point',
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#3b82f6',
    'circle-radius': 6,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#fff'
  }
};

const FLIGHT_ICON_ID = 'flight-icon-v2';

export default function AeroMap({ mapRef, stations, onStationSelect, searchQuery, flights = [], onFlightSelect, onZoomChange }) {
  const [iconLoaded, setIconLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  
  // Report zoom changes to parent
  useEffect(() => {
    if (!mapInstance) return;
    
    const handleZoom = () => {
      const zoom = mapInstance.getZoom();
      if (onZoomChange) {
        onZoomChange(zoom);
      }
    };
    
    mapInstance.on('zoom', handleZoom);
    // Initial zoom
    handleZoom();
    
    return () => {
      mapInstance.off('zoom', handleZoom);
    };
  }, [mapInstance, onZoomChange]);
  
  // Clean airplane icon matching the flight info panel style - filled yellow
  const createFlightIcon = () => {
    const size = 48;
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#fbbf24" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        <path fill="#0a0a0a" opacity="0.3" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };
  
  const flightsGeoJson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: flights
        .map((flight, index) => {
          // Validate and parse coordinates
          let lat = flight.lat;
          let lng = flight.lng;
          
          if (typeof lat === 'string') lat = parseFloat(lat);
          if (typeof lng === 'string') lng = parseFloat(lng);
          
          // Validate coordinates
          if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
            return null;
          }
          
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return null;
          }
          
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
            },
            properties: {
              id: `flight-${index}`,
              callsign: flight.callsign || 'UNK',
              altitude: flight.altitude,
              velocity: flight.velocity,
              track: flight.track !== null && flight.track !== undefined ? flight.track : 0,
              index: index,
            },
          };
        })
        .filter(f => f !== null), // Remove null entries
    };
  }, [flights]);

  // Convert stations to GeoJSON
  const geoJson = useMemo(() => {
    // Filter first if there is a search query
    // (Actually, user wants search to be a dropdown list, but keeping map filter is nice too.
    //  However, if we filter the map, clustering might look weird if only 1 point is left.
    //  Let's keep the map showing ALL points (or filtered ones) but clustered.)

    const data = searchQuery
      ? stations.filter(s =>
        (s.station_name && s.station_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.station_id && s.station_id.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      : stations;

    return {
      type: "FeatureCollection",
      features: data.map((station) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [station.longitude, station.latitude],
        },
        properties: {
          id: station.station_id,
          name: station.station_name,
          lat: station.latitude,
          lng: station.longitude,
        },
      })),
    };
  }, [stations, searchQuery]);

  // Load flight icon when the map style is ready (including re-style events)
  useEffect(() => {
    const map = mapInstance || mapRef.current?.getMap?.();
    if (!map) return;

    const addIcon = () => {
      try {
        // Clear any cached icons (old or current) to ensure the latest SVG is used
        if (map.hasImage?.(FLIGHT_ICON_ID)) map.removeImage(FLIGHT_ICON_ID);
        if (map.hasImage?.('flight-icon')) map.removeImage('flight-icon');
      } catch {
        // hasImage may be unavailable until style is ready; fall through to add
      }

      const img = new Image();
      img.onload = () => {
        try {
          map.addImage(FLIGHT_ICON_ID, img);
          setIconLoaded(true);
        } catch (loadErr) {
          console.error('addImage failed:', loadErr);
        }
      };
      img.onerror = (e) => {
        console.error('flight icon load error:', e);
      };
      img.src = createFlightIcon();
    };

    if (map.isStyleLoaded()) {
      addIcon();
    }

    map.on('style.load', addIcon);

    return () => {
      map.off('style.load', addIcon);
    };
  }, [mapInstance, mapRef]);

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -95,
          latitude: 40,
          zoom: 3,
        }}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        projection="globe"
        onLoad={(event) => setMapInstance(event.target)}
        interactiveLayerIds={[clusterLayer.id, unclusteredPointLayer.id, 'flight-points']}
        onClick={(e) => {
          const feature = e.features?.[0];
          if (!feature) {
            onStationSelect(null);
            return;
          }

          // Check if it's a flight (has callsign property)
          if (feature.properties && feature.properties.callsign) {
            // Find the flight in the flights array
            const flightIndex = feature.properties.index;
            if (flights[flightIndex] && onFlightSelect) {
              // Pass flight with click position
              onFlightSelect(flights[flightIndex], e.point);
            }
            return;
          }

          // Otherwise, it's a station
          const clusterId = feature.properties.cluster_id;

          // If clicked a cluster, zoom in
          if (clusterId) {
            const mapboxSource = mapRef.current.getSource('stations-source');
            mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;
              mapRef.current.easeTo({
                center: feature.geometry.coordinates,
                zoom,
                duration: 500
              });
            });
          } else {
            // Clicked a single point
            onStationSelect(feature.properties);
          }
        }}
      >
        <Source
          id="stations-source"
          type="geojson"
          data={geoJson}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
        </Source>

        {/* Flight Markers - Rotating aircraft icons */}
        {flightsGeoJson.features.length > 0 && iconLoaded && (
          <Source
            id="flights-source"
            type="geojson"
            data={flightsGeoJson}
          >
            {/* Flight icons - rotated based on heading */}
            <Layer
              id="flight-points"
              type="symbol"
              layout={{
                'icon-image': FLIGHT_ICON_ID,
                'icon-size': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  3, 0.5,   // Smaller at zoom 3
                  10, 0.8,  // Medium at zoom 10
                  15, 1.2   // Larger at zoom 15
                ],
                'icon-rotate': ['get', 'track'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-anchor': 'center',
              }}
              paint={{
                'icon-opacity': 0.95,
              }}
            />
            {/* Flight labels - show callsign */}
            <Layer
              id="flight-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'callsign'],
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 10,
                'text-offset': [0, 1.8],
                'text-anchor': 'top',
              }}
              paint={{
                'text-color': '#f59e0b',
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
