'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type Props = {
    destination: {
        lat: number;
        lng: number;
        name: string;
    };
};

export default function NavigationMap({ destination }: Props) {
    mapboxgl.accessToken =
        process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapRefInstance = useRef<mapboxgl.Map | null>(null);
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        // =========================
        // Map 初期化
        // =========================
        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/navigation-day-v1',
            zoom: 16,
            pitch: 60,
            bearing: 0,
            antialias: true,
        });

        mapRefInstance.current = map;

        // 目的地マーカー
        new mapboxgl.Marker({ color: 'red' })
            .setLngLat([destination.lng, destination.lat])
            .setPopup(
                new mapboxgl.Popup().setText(destination.name)
            )
            .addTo(map);

        // =========================
        // 現在地追従 Lv2（回転）
        // =========================
        const watchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const heading = pos.coords.heading; // 進行方向

                // 現在地マーカー
                if (!userMarkerRef.current) {
                    userMarkerRef.current = new mapboxgl.Marker({
                        color: 'blue',
                    })
                        .setLngLat([lng, lat])
                        .addTo(map);
                } else {
                    userMarkerRef.current.setLngLat([lng, lat]);
                }

                // 地図追従 + 回転
                map.easeTo({
                    center: [lng, lat],
                    bearing:
                        heading !== null ? heading : map.getBearing(),
                    zoom: 16,
                    speed: 0.8,
                    curve: 1.4,
                    essential: true,
                });

                // =========================
                // ルート取得（Directions API）
                // =========================
                const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/${lng},${lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
                );

                const data = await res.json();
                if (!data.routes || !data.routes[0]) return;

                const coordinates =
                    data.routes[0].geometry.coordinates;

                const routeGeoJson: GeoJSON.Feature<GeoJSON.LineString> =
                {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates,
                    },
                    properties: {}, // ← TypeScript対策
                };

                // 既存ルート更新 or 初回追加
                if (map.getSource('route')) {
                    (
                        map.getSource('route') as mapboxgl.GeoJSONSource
                    ).setData(routeGeoJson);
                } else {
                    map.addSource('route', {
                        type: 'geojson',
                        data: routeGeoJson,
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
                            'line-color': '#1DB7DD',
                            'line-width': 6,
                        },
                    });
                }
            },
            (err) => {
                console.error('GPS error:', err);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 10000,
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
            map.remove();
        };
    }, [destination]);

    return (
        <div
            ref={mapRef}
            style={{ width: '100%', height: '100vh' }}
        />
    );
}
