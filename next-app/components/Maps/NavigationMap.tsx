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
// NavigationMap（道沿いルート + 矢印ナビ）
// =============================
export default function NavigationMap({ destination }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // -----------------------------
        // Map 初期化
        // -----------------------------
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/navigation-day-v1', // ナビ向けスタイル
            center: [destination.lng, destination.lat],
            zoom: 15,
            pitch: 60,
        });

        mapRef.current = map;

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
                    const originLngLat: [number, number] = [
                        pos.coords.longitude,
                        pos.coords.latitude,
                    ];

                    // =============================
                    // 現在地「矢印」マーカー
                    // =============================
                    if (!userMarkerRef.current) {
                        const el = document.createElement('div');
                        el.style.width = '24px';
                        el.style.height = '24px';
                        el.style.background = '#2563eb';
                        el.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
                        el.style.transform = 'rotate(0deg)';

                        userMarkerRef.current = new mapboxgl.Marker({
                            element: el,
                            rotationAlignment: 'map',
                        })
                            .setLngLat(originLngLat)
                            .addTo(map);
                    } else {
                        userMarkerRef.current.setLngLat(originLngLat);
                    }

                    // 進行方向に回転
                    if (pos.coords.heading != null && userMarkerRef.current) {
                        userMarkerRef.current.getElement().style.transform = `rotate(${pos.coords.heading}deg)`;
                    }

                    // =============================
                    // カメラ追従（GoogleMap風）
                    // =============================
                    map.easeTo({
                        center: originLngLat,
                        bearing: pos.coords.heading ?? map.getBearing(),
                        zoom: 16,
                        pitch: 60,
                        duration: 500,
                    });

                    // =============================
                    // Directions API（道沿いルート）
                    // =============================
                    const res = await fetch(
                        `https://api.mapbox.com/directions/v5/mapbox/walking/${originLngLat[0]},${originLngLat[1]};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
                    );

                    const json = await res.json();
                    const geometry = json.routes[0].geometry;

                    const routeGeoJson: GeoJSON.Feature<GeoJSON.LineString> = {
                        type: 'Feature',
                        geometry,
                        properties: {},
                    };

                    if (map.getSource('route')) {
                        (map.getSource('route') as mapboxgl.GeoJSONSource).setData(routeGeoJson);
                    } else {
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
                                'line-opacity': 0.9,
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