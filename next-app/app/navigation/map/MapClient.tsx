'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

type Dest = {
    lat: number;
    lng: number;
};

export default function MapClient() {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const [dest, setDest] = useState<Dest | null>(null);

    // =========================
    // URLクエリから目的地取得
    // =========================
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const lat = params.get('lat');
        const lng = params.get('lng');

        if (!lat || !lng) return;

        const destLat = Number(lat);
        const destLng = Number(lng);

        if (Number.isNaN(destLat) || Number.isNaN(destLng)) return;

        setDest({ lat: destLat, lng: destLng });
    }, []);

    // =========================
    // Map 初期化 + ルート描画
    // =========================
    useEffect(() => {
        if (!mapContainer.current || mapRef.current || !dest) return;

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const currentLat = pos.coords.latitude;
            const currentLng = pos.coords.longitude;

            const map = new mapboxgl.Map({
                container: mapContainer.current!,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [currentLng, currentLat],
                zoom: 14,
            });

            mapRef.current = map;

            // 現在地
            new mapboxgl.Marker({ color: 'blue' })
                .setLngLat([currentLng, currentLat])
                .addTo(map);

            // 目的地
            new mapboxgl.Marker({ color: 'red' })
                .setLngLat([dest.lng, dest.lat])
                .addTo(map);

            // =========================
            // ルート取得 & 描画
            // =========================
            map.on('load', async () => {
                const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/${currentLng},${currentLat};${dest.lng},${dest.lat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
                );

                const data = await res.json();
                const route = data.routes?.[0]?.geometry;

                if (!route) return;

                // ルート追加
                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: route,
                    },
                });

                map.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                    },
                    paint: {
                        'line-color': '#2563eb',
                        'line-width': 6,
                    },
                });

                // =========================
                // ルート全体が収まるようにズーム
                // =========================
                const bounds = new mapboxgl.LngLatBounds();
                route.coordinates.forEach((coord: number[]) => {
                    bounds.extend([coord[0], coord[1]]);
                });

                map.fitBounds(bounds, { padding: 60 });
            });
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [dest]);

    if (!dest) {
        return <div style={{ padding: 20 }}>目的地を読み込んでいます...</div>;
    }

    return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
}

