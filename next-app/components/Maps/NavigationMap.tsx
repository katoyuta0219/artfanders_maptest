"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

export default function NavigationMap() {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (!mapboxgl.accessToken) {
            console.error("Mapbox Access Token が未設定です");
            return;
        }

        // 🔹 Map 初期化
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/dark-v11", // ← 3Dと相性◎
            center: [135.5023, 34.6937], // 大阪（好みで変更OK）
            zoom: 15,
            pitch: 60, // ← 重要（立体角度）
            bearing: -17.6,
            antialias: true, // ← 3Dで必須
        });

        mapRef.current = map;

        // 🔹 コントロール
        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.on("load", () => {
            // 🔹 建物データ（3D）
            const layers = map.getStyle().layers;
            const labelLayerId = layers?.find(
                (layer) =>
                    layer.type === "symbol" &&
                    layer.layout &&
                    layer.layout["text-field"]
            )?.id;

            map.addLayer(
                {
                    id: "3d-buildings",
                    source: "composite",
                    "source-layer": "building",
                    filter: ["==", "extrude", "true"],
                    type: "fill-extrusion",
                    minzoom: 14,
                    paint: {
                        "fill-extrusion-color": "#aaa",
                        "fill-extrusion-height": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            14,
                            0,
                            15,
                            ["get", "height"],
                        ],
                        "fill-extrusion-base": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            14,
                            0,
                            15,
                            ["get", "min_height"],
                        ],
                        "fill-extrusion-opacity": 0.9,
                    },
                },
                labelLayerId
            );
        });

        return () => {
            map.remove();
        };
    }, []);

    return (
        <div
            ref={mapContainerRef}
            style={{
                width: "100%",
                height: "100vh",
            }}
        />
    );
}
