"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

type Props = {
  lat: number; // 目的地
  lng: number;
};

export default function NavigationMap({ lat, lng }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const originLat = pos.coords.latitude;
      const originLng = pos.coords.longitude;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [originLng, originLat],
        zoom: 15,
        pitch: 65,
        bearing: -20,
        antialias: true,
      });

      mapRef.current = map;

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", async () => {
        /* ====================================================
           ① Terrain
        ==================================================== */
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.terrain-rgb",
          tileSize: 512,
          maxzoom: 14,
        });

        map.setTerrain({
          source: "mapbox-dem",
          exaggeration: 1.3,
        });

        /* ====================================================
           ② Sky
        ==================================================== */
        map.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0, 90],
            "sky-atmosphere-sun-intensity": 15,
          },
        });

        /* ====================================================
           ③ Light
        ==================================================== */
        map.setLight({
          anchor: "map",
          position: [1.5, 180, 80],
          intensity: 0.9,
          color: "#ffffff",
        });

        /* ====================================================
           ④ 3D Buildings
        ==================================================== */
        const layers = map.getStyle().layers ?? [];
        const labelLayerId = layers.find(
          (l) =>
            l.type === "symbol" &&
            l.layout &&
            "text-field" in l.layout
        )?.id;

        map.addLayer(
          {
            id: "3d-buildings",
            type: "fill-extrusion",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#9aa0a6",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                16,
                ["get", "height"],
              ],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.9,
              "fill-extrusion-ambient-occlusion-intensity": 0.35,
            },
          },
          labelLayerId
        );

        /* ====================================================
           ⑤ Directions API（徒歩）
        ==================================================== */
        const directionsUrl =
          `https://api.mapbox.com/directions/v5/mapbox/walking/` +
          `${originLng},${originLat};${lng},${lat}` +
          `?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

        const routeRes = await fetch(directionsUrl);
        const routeJson = await routeRes.json();
        const routeGeometry = routeJson.routes[0].geometry;

        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: routeGeometry,
          },
        });

        // ★ 重要：3D建物より「上」に描画する
        map.addLayer(
          {
            id: "route-line",
            type: "line",
            source: "route",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#00e0ff",
              "line-width": 6,
              "line-opacity": 0.95,
            },
          },
          "3d-buildings"
        );

        /* ====================================================
           ⑥ マーカー
        ==================================================== */
        new mapboxgl.Marker({ color: "#ff3b30" })
          .setLngLat([originLng, originLat])
          .addTo(map);

        new mapboxgl.Marker({ color: "#00ff5e" })
          .setLngLat([lng, lat])
          .addTo(map);

        /* ====================================================
           ⑦ ルート全体が収まるように調整
        ==================================================== */
        const bounds = routeGeometry.coordinates.reduce(
          (b: mapboxgl.LngLatBounds, c: number[]) =>
            b.extend(c as [number, number]),
          new mapboxgl.LngLatBounds(
            routeGeometry.coordinates[0] as [number, number],
            routeGeometry.coordinates[0] as [number, number]
          )
        );

        map.fitBounds(bounds, {
          padding: 100,
          pitch: 65,
        });
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "100vh" }}
    />
  );
}
