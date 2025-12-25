"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

type Props = {
    lat: number;
    lng: number;
};

export default function NavigationMap({ lat, lng }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // 二重初期化防止
        if (mapRef.current) {
            mapRef.current.setCenter([lng, lat]);
            return;
        }

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/dark-v11", // 3D対応スタイル
            center: [lng, lat],
            zoom: 16,
            pitch: 65,
            bearing: -20,
            antialias: true,
        });

        mapRef.current = map;

        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.on("load", () => {
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
                        "fill-extrusion-height": ["get", "height"],
                        "fill-extrusion-base": ["get", "min_height"],
                        "fill-extrusion-opacity": 0.9,
                    },
                },
                labelLayerId
            );
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
