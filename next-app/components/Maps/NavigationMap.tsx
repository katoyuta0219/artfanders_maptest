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

// =============================
// NavigationMap（3D + 影 + 徒歩ナビ 完全版）
// =============================
export default function NavigationMap({ destination }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // -----------------------------
        // Map 初期化（3D前提スタイル）
        // -----------------------------
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12', // ← 重要
            center: [destination.lng, destination.lat],
            zoom: 16,
            pitch: 60,
            bearing: -20,
            antialias: true,
        });

        mapRef.current = map;

        // -----------------------------
        // マップロード完了
        // -----------------------------
        map.on('load', () => {
            // 🌤 光源（影）
            map.setLight({
                anchor: 'map',
                position: [1.5, 90, 80],
                intensity: 0.6,
            });

            // 🏷 ラベルレイヤー取得（確実に addLayer するため）
            const layers = map.getStyle().layers;
            const labelLayerId = layers?.find(
                (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
            )?.id;

            // 🏙 3D建物
            map.addLayer(
                {
                    id: '3d-buildings',
                    source: 'composite',
                    'source-layer': 'building',
                    filter: ['==', 'extrude', 'true'],
                    type: 'fill-extrusion',
                    minzoom: 15,
                    paint: {
                        'fill-extrusion-color': '#e5e7eb',
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'min_height'],
                        'fill-extrusion-opacity': 0.95,
                        'fill-extrusion-ambient-occlusion-intensity': 0.6,
                        'fill-extrusion-ambient-occlusion-radius': 3,
                    },
                },
                labelLayerId
            );
        });

        // -----------------------------
        // 目的地マーカー
        // -----------------------------
        new mapboxgl.Marker({ color: 'red' })
            .setLngLat([destination.lng, destination.lat])
            .setPopup(new mapboxgl.Popup().setText(destination.name))
            .addTo(map);

        let watchId: number;

        // -----------------------------
        // 現在地トラッキング
        // -----------------------------
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;

                    // =============================
                    // 進行方向（bearing）
                    // =============================
                    let bearing = pos.coords.heading ?? 0;
                    if (bearing === 0 && lastPositionRef.current) {
                        const dx = lng - lastPositionRef.current.lng;
                        const dy = lat - lastPositionRef.current.lat;
                        bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
                    }
                    lastPositionRef.current = { lat, lng };

                    // =============================
                    // 現在地マーカー（矢印）
                    // =============================
                    if (!userMarkerRef.current) {
                        const el = document.createElement('div');
                        el.style.width = '26px';
                        el.style.height = '26px';
                        el.style.background = '#2563eb';
                        el.style.clipPath =
                            'polygon(50% 0%, 100% 100%, 50% 80%, 0% 100%)';
                        el.style.transform = `rotate(${bearing}deg)`;

                        userMarkerRef.current = new mapboxgl.Marker(el)
                            .setLngLat([lng, lat])
                            .addTo(map);
                    } else {
                        const el = userMarkerRef.current.getElement();
                        el.style.transform = `rotate(${bearing}deg)`;
                        userMarkerRef.current.setLngLat([lng, lat]);
                    }

                    // =============================
                    // カメラ追従
                    // =============================
                    map.easeTo({
                        center: [lng, lat],
                        bearing,
                        zoom: 17,
                        pitch: 65,
                        duration: 500,
                    });

                    // =============================
                    // 徒歩ルート（最短・道路沿い）
                    // =============================
                    if (!map.getSource('route')) {
                        const res = await fetch(
                            `https://api.mapbox.com/directions/v5/mapbox/walking/${lng},${lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
                        );

                        const data = await res.json();

                        const routeGeoJson: GeoJSON.Feature<GeoJSON.LineString> = {
                            type: 'Feature',
                            geometry: data.routes[0].geometry,
                            properties: {},
                        };

                        map.addSource('route', {
                            type: 'geojson',
                            data: routeGeoJson,
                        });

                        map.addLayer({
                            id: 'route-layer',
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
                    }
                },
                (err) => console.error('位置情報エラー', err),
                {
                    enableHighAccuracy: true,
                    maximumAge: 1000,
                }
            );
        }

        return () => {
            if (watchId && navigator.geolocation) {
                navigator.geolocation.clearWatch(watchId);
            }
            map.remove();
        };
    }, [destination]);

    return <div ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />;
}
