'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// =============================
// 型定義
// =============================
type Props = {
    destination: {
        lat: number;
        lng: number;
        name: string;
    };
};

export default function NavigationMap({ destination }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // -----------------------------
        // Map 初期化（3D前提）
        // -----------------------------
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [destination.lng, destination.lat],
            zoom: 15.5,
            pitch: 60,
            bearing: -20,
            antialias: true, // ★ 3D必須
        });

        mapRef.current = map;

        map.on('load', async () => {
            // =============================
            // 🌤 光源（影を出す）
            // =============================
            map.setLight({
                anchor: 'map',
                position: [1.5, 180, 80],
                color: '#ffffff',
                intensity: 0.7,
            });

            // =============================
            // 🌌 空（影を自然に）
            // =============================
            map.addLayer({
                id: 'sky',
                type: 'sky',
                paint: {
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 0.0],
                    'sky-atmosphere-sun-intensity': 15,
                },
            });

            // =============================
            // 🏙 3D 建物レイヤー
            // ※ label の直前に入れるのが超重要
            // =============================
            const layers = map.getStyle().layers!;
            const labelLayerId = layers.find(
                (l) => l.type === 'symbol' && l.layout?.['text-field']
            )?.id;

            map.addLayer(
                {
                    id: '3d-buildings',
                    source: 'composite',
                    'source-layer': 'building',
                    filter: ['==', 'extrude', 'true'],
                    type: 'fill-extrusion',
                    minzoom: 14,
                    paint: {
                        'fill-extrusion-color': '#d1d5db',
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'min_height'],
                        'fill-extrusion-opacity': 0.95,
                    },
                },
                labelLayerId
            );

            // =============================
            // 📍 目的地マーカー
            // =============================
            new mapboxgl.Marker({ color: 'red' })
                .setLngLat([destination.lng, destination.lat])
                .setPopup(new mapboxgl.Popup().setText(destination.name))
                .addTo(map);

            // =============================
            // 📡 現在地取得
            // =============================
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const curLat = pos.coords.latitude;
                const curLng = pos.coords.longitude;

                // 現在地マーカー
                userMarkerRef.current = new mapboxgl.Marker({ color: 'blue' })
                    .setLngLat([curLng, curLat])
                    .addTo(map);

                // =============================
                // 🧭 徒歩ルート（建物を突っ切らない）
                // =============================
                const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/${curLng},${curLat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
                );
                const data = await res.json();

                const route = data.routes?.[0]?.geometry;
                if (!route) return;

                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: route,
                        properties: {},
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

                // カメラをルート方向へ
                map.easeTo({
                    center: [curLng, curLat],
                    zoom: 16,
                    pitch: 65,
                    bearing: -20,
                    duration: 1000,
                });
            });
        });

        return () => {
            map.remove();
        };
    }, [destination]);

    return (
        <div
            ref={mapContainerRef}
            style={{ width: '100%', height: '100vh' }}
        />
    );
}

