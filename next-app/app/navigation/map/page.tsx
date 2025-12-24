'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function NavigationMapPage() {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    const params = useSearchParams();
    const destLat = Number(params.get('lat'));
    const destLng = Number(params.get('lng'));

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [destLng, destLat],
            zoom: 14,
        });

        mapRef.current = map;

        map.addControl(new mapboxgl.NavigationControl());

        // 現在地取得
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const start = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };

                // 現在地マーカー
                new mapboxgl.Marker({ color: 'blue' })
                    .setLngLat([start.lng, start.lat])
                    .addTo(map);

                // 目的地マーカー
                new mapboxgl.Marker({ color: 'red' })
                    .setLngLat([destLng, destLat])
                    .addTo(map);

                // Directions API（徒歩）
                const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/` +
                    `${start.lng},${start.lat};${destLng},${destLat}` +
                    `?geometries=geojson&access_token=${mapboxgl.accessToken}`
                );

                const data = await res.json();
                const routeCoords = data.routes[0].geometry.coordinates;

                map.on('load', () => {
                    map.addSource('route', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'LineString',
                                coordinates: routeCoords,
                            },
                        },
                    });

                    map.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: 'route',
                        paint: {
                            'line-color': '#1d4ed8',
                            'line-width': 6,
                        },
                    });

                    // ルート全体が見えるように
                    const bounds = routeCoords.reduce(
                        (b: mapboxgl.LngLatBounds, coord: number[]) =>
                            b.extend(coord as [number, number]),
                        new mapboxgl.LngLatBounds(
                            routeCoords[0] as [number, number],
                            routeCoords[0] as [number, number]
                        )
                    );

                    map.fitBounds(bounds, { padding: 60 });
                });
            },
            (err) => {
                alert('位置情報を取得できません');
                console.error(err);
            },
            { enableHighAccuracy: true }
        );

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
