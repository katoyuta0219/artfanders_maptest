'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function NavigationMapPage() {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const params = useSearchParams();
    const destLat = Number(params.get('lat'));
    const destLng = Number(params.get('lng'));

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            zoom: 14,
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl());

        map.once('load', () => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const start: [number, number] = [
                        pos.coords.longitude,
                        pos.coords.latitude,
                    ];
                    const goal: [number, number] = [destLng, destLat];

                    // 現在地マーカー
                    new mapboxgl.Marker({ color: 'blue' })
                        .setLngLat(start)
                        .addTo(map);

                    // 目的地マーカー
                    new mapboxgl.Marker({ color: 'red' })
                        .setLngLat(goal)
                        .addTo(map);

                    // ✅ Directions API（徒歩・道路厳守）
                    const res = await fetch(
                        `https://api.mapbox.com/directions/v5/mapbox/walking/` +
                        `${start[0]},${start[1]};${goal[0]},${goal[1]}` +
                        `?geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`
                    );

                    const json = await res.json();
                    const routeGeometry = json.routes[0].geometry;

                    // ルート描画
                    map.addSource('route', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            properties: {},
                            geometry: routeGeometry,
                        },
                    });

                    map.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: 'route',

                        // ✅ TypeScript的に正しい位置
                        layout: {
                            'line-cap': 'round',
                            'line-join': 'round',
                        },

                        paint: {
                            'line-color': '#2563eb',
                            'line-width': 6,
                        },
                    });

                    // ルート全体が見えるように
                    const bounds = routeGeometry.coordinates.reduce(
                        (b: mapboxgl.LngLatBounds, coord: number[]) =>
                            b.extend(coord as [number, number]),
                        new mapboxgl.LngLatBounds(
                            routeGeometry.coordinates[0],
                            routeGeometry.coordinates[0]
                        )
                    );

                    map.fitBounds(bounds, { padding: 80 });
                },
                (err) => {
                    console.error(err);
                    alert('位置情報を取得できません');
                },
                { enableHighAccuracy: true }
            );
        });

        return () => {
            map.remove();
        };
    }, [destLat, destLng]);

    return (
        <div
            ref={mapContainerRef}
            style={{ width: '100vw', height: '100vh' }}
        />
    );
}
