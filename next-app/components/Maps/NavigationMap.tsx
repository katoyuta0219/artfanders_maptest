'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// =============================
// 型定義
// =============================
type LatLng = {
    lat: number;
    lng: number;
};

type Props = {
    destination: {
        lat: number;
        lng: number;
        name: string;
    };
};

// =============================
// NavigationMap
// =============================
export default function NavigationMap({ destination }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markerRef = useRef<mapboxgl.Marker | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // -----------------------------
        // Map 初期化
        // -----------------------------
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [destination.lng, destination.lat],
            zoom: 15,
        });

        mapRef.current = map;

        // -----------------------------
        // 目的地マーカー
        // -----------------------------
        new mapboxgl.Marker({ color: 'red' })
            .setLngLat([destination.lng, destination.lat])
            .setPopup(new mapboxgl.Popup().setText(destination.name))
            .addTo(map);

        // -----------------------------
        // 現在地追跡
        // -----------------------------
        let watchId: number;

        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                async (pos) => {
                    const origin: LatLng = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    };

                    // 現在地マーカー（青）
                    if (!markerRef.current) {
                        markerRef.current = new mapboxgl.Marker({ color: 'blue' })
                            .setLngLat([origin.lng, origin.lat])
                            .addTo(map);
                    } else {
                        markerRef.current.setLngLat([origin.lng, origin.lat]);
                    }

                    // カメラ追従（GoogleMap風）
                    map.easeTo({
                        center: [origin.lng, origin.lat],
                        zoom: 16,
                        bearing: pos.coords.heading ?? 0,
                        pitch: 60,
                        duration: 500,
                    });

                    // -----------------------------
                    // ルート取得（Directions API）
                    // -----------------------------
                    const res = await fetch(
                        `https://api.mapbox.com/directions/v5/mapbox/walking/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
                    );

                    const data = await res.json();
                    const geometry = data.routes[0].geometry;

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
                                'line-width': 6,
                                'line-opacity': 0.8,
                            },
                        });
                    }
                },
                (err) => {
                    console.error('位置情報エラー', err);
                },
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
