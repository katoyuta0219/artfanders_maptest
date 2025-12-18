"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

type LatLng = {
    lat: number;
    lng: number;
};

type Props = {
    destination: LatLng;
};

export default function NavigationMap({ destination }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const arrowMarkerRef = useRef<mapboxgl.Marker | null>(null);

    const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
    const [heading, setHeading] = useState<number>(0);

    // ===============================
    // ① 現在地 & 向きをリアルタイム取得
    // ===============================
    useEffect(() => {
        if (!navigator.geolocation) {
            alert("このブラウザは位置情報に対応していません");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setCurrentLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });

                if (pos.coords.heading !== null) {
                    setHeading(pos.coords.heading);
                }
            },
            (err) => console.error(err),
            {
                enableHighAccuracy: true,
                maximumAge: 500,
                timeout: 10000,
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // ===============================
    // ② Map 初期化
    // ===============================
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current || !currentLocation) return;

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/navigation-day-v1",
            center: [currentLocation.lng, currentLocation.lat],
            zoom: 17,
            pitch: 60,
            bearing: heading,
        });

        // 🧭 矢印DOM
        const arrow = document.createElement("div");
        arrow.style.width = "30px";
        arrow.style.height = "30px";
        arrow.style.background = "#1E90FF";
        arrow.style.clipPath = "polygon(50% 0%, 100% 100%, 50% 80%, 0 100%)";
        arrow.style.transform = "rotate(0deg)";

        arrowMarkerRef.current = new mapboxgl.Marker({
            element: arrow,
            rotationAlignment: "map",
        })
            .setLngLat([currentLocation.lng, currentLocation.lat])
            .addTo(mapRef.current);

        // 🎯 目的地
        new mapboxgl.Marker({ color: "red" })
            .setLngLat([destination.lng, destination.lat])
            .addTo(mapRef.current);
    }, [currentLocation, destination, heading]);

    // ===============================
    // ③ 現在地 & 向き更新
    // ===============================
    useEffect(() => {
        if (!mapRef.current || !arrowMarkerRef.current || !currentLocation) return;

        arrowMarkerRef.current
            .setLngLat([currentLocation.lng, currentLocation.lat])
            .setRotation(heading);

        mapRef.current.easeTo({
            center: [currentLocation.lng, currentLocation.lat],
            bearing: heading,
            duration: 500,
        });
    }, [currentLocation, heading]);

    return (
        <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "100vh" }}
        />
    );
}
