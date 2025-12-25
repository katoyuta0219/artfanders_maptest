'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

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

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // =============================
        // Map 初期化（ダーク × 3D前提）
        // =============================
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [destination.lng, destination.lat],
            zoom: 16,
            pitch: 70,
            bearing: -30,
            antialias: true,
        });

        mapRef.current = map;

        map.on('load', () => {
            // =============================
            // 🌫 フォグ（遠景を暗く）
            // =============================
            map.setFog({
                range: [0.8, 8],
                color: '#0b0f19',
                'horizon-blend': 0.2,
                'high-color': '#1f2937',
                'space-color': '#020617',
                'star-intensity': 0.15,
            });

            // =============================
            // ☀️ 光源（影）
            // =============================
            map.setLight({
                anchor: 'map',
                position: [1.2, 90, 80],
                intensity: 0.5,
                color: '#ffffff',
            });

            // =============================
            // 🌌 空（Sky layer）
            // =============================
            map.addLayer({
                id: 'sky',
                type: 'sky',
                paint: {
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 0.0],
                    'sky-atmosphere-sun-intensity': 5,
                },
            });

            // =============================
            // ラベルレイヤー取得
            // =============================
            const layers = map.getStyle().layers;
            const labelLayerId = layers?.find(
                (l) => l.type === 'symbol' && l.layout?.['text-field']
            )?.id;

            // =============================
            // 🏙 3D 建物（影・奥行き強化）
            // =============================
            map.addLayer(
                {
                    id: '3d-buildings',
                    source: 'composite',
                    'source-layer': 'building',
                    filter: ['==', 'extrude', 'true'],
                    type: 'fill-extrusion',
                    minzoom: 15,
                    paint: {
                        'fill-extrusion-color': '#374151',
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'min_height'],
                        'fill-extrusion-opacity': 0.95,
                        'fill-extrusion-ambient-occlusion-intensity': 0.7,
                        'fill-extrusion-ambient-occlusion-radius': 4,
                    },
                },
                labelLayerId
            );
        });

        // =============================
        // 目的地マーカー
        // =============================
        new mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat([destination.lng, destination.lat])
            .addTo(map);

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
