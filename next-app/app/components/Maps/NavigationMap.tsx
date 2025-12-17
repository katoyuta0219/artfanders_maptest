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
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const routeAddedRef = useRef(false); // ★ ルート多重追加防止

    useEffect(() => {
        if (!mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            zoom: 16,
            pitch: 60,
        });

        // 目的地マーカー
        new mapboxgl.Marker({ color: 'red' })
            .setLngLat([destination.lng, destination.lat])
            .addTo(map);

        // 現在地追従
        const watchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const heading = pos.coords.heading;

                // 現在地マーカー
                if (!userMarkerRef.current) {
                    userMarkerRef.current = new mapboxgl.Marker({ color: 'blue' })
                        .setLngLat([lng, lat])
                        .addTo(map);
                } else {
                    userMarkerRef.current.setLngLat([lng, lat]);
                }

                // ★ 初回だけルート取得
                if (!routeAddedRef.current) {
                    routeAddedRef.current = true;

                    const url =
                        `https://api.mapbox.com/directions/v5/mapbox/walking/` +
                        `${lng},${lat};${destination.lng},${destination.lat}` +
                        `?geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`;

                    const res = await fetch(url);
                    const data = await res.json();
                    const route = data.routes[0].geometry;

                    map.addSource('route', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            geometry: route,
                        },
                    });

                    map.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: 'route',
                        paint: {
                            'line-color': '#2563eb',
                            'line-width': 6,
                            'line-opacity': 0.9,
                        },
                    });
                }

                // 地図追従＋回転
                map.easeTo({
                    center: [lng, lat],
                    bearing: heading !== null ? heading : map.getBearing(),
                    zoom: 16,
                    speed: 0.8,
                    curve: 1.4,
                    essential: true,
                });
            },
            (err) => console.error(err),
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

    return <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />;
}
