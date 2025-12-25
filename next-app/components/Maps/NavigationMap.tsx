"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

// ----------------------------------------------
// 神戸 表示境界（見た目用）
// ----------------------------------------------
const KOBE_SOFT_BOUNDS: [[number, number], [number, number]] = [
    [134.95, 34.55],
    [135.55, 34.85],
];

type Props = {
    lat: number;
    lng: number;
};

export default function NavigationMap({ lat, lng }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // 二重生成防止
        if (mapRef.current) {
            mapRef.current.setCenter([lng, lat]);
            return;
        }

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/dark-v11",
            bounds: KOBE_SOFT_BOUNDS,
            fitBoundsOptions: { padding: 80 },
            maxBounds: KOBE_SOFT_BOUNDS,
            zoom: 15,
            pitch: 65,
            bearing: -20,
            antialias: true,
        });

        mapRef.current = map;

        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.on("load", async () => {
            /* ====================================================
               ① Terrain（起伏）
               ==================================================== */
            map.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.terrain-rgb",
                tileSize: 512,
                maxzoom: 14,
            });

            map.setTerrain({
                source: "mapbox-dem",
                exaggeration: 1.4,
            });

            /* ====================================================
               ② Sky（ダークな空）
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
               ③ Light（立体感）
               ==================================================== */
            map.setLight({
                anchor: "map",
                position: [1.5, 180, 80],
                intensity: 0.9,
                color: "#ffffff",
            });

            /* ====================================================
               ④ 3D 建物
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
               ⑤ 目的地マーカー
               ==================================================== */
            new mapboxgl.Marker({ color: "#00e0ff" })
                .setLngLat([lng, lat])
                .addTo(map);
        });

        return () => {
            map.remove();
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
