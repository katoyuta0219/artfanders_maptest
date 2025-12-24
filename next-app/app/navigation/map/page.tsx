'use client';

/**
 * 🔴 これが超重要（build failure の原因）
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function MapPage() {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const params = useSearchParams();
    const destLat = Number(params.get('lat'));
    const destLng = Number(params.get('lng'));

    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return;
        if (Number.isNaN(destLat) || Number.isNaN(destLng)) return;

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
                .setLngLat([destLng, destLat])
                .addTo(map);

            map.on('load', async () => {
                const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/${currentLng},${currentLat};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
                );

                const data = await res.json();
                const route = data.routes[0]?.geometry;
                if (!route) return;

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
            });
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [destLat, destLng]);

    return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
}
