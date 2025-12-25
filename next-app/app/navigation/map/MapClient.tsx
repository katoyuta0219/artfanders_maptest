'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

export default function MapClient() {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const [dest, setDest] = useState<{ lat: number; lng: number } | null>(null);

    // ✅ URL クエリ取得（確実に動く）
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const lat = params.get('lat');
        const lng = params.get('lng');

        if (!lat || !lng) return;

        const destLat = Number(lat);
        const destLng = Number(lng);

        if (Number.isNaN(destLat) || Number.isNaN(destLng)) return;

        setDest({ lat: destLat, lng: destLng });
    }, []);

    useEffect(() => {
        if (!mapContainer.current || mapRef.current || !dest) return;

        navigator.geolocation.getCurrentPosition((pos) => {
            const currentLat = pos.coords.latitude;
            const currentLng = pos.coords.longitude;

            const map = new mapboxgl.Map({
                container: mapContainer.current!,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [currentLng, currentLat],
                zoom: 14,
            });

            mapRef.current = map;

            new mapboxgl.Marker({ color: 'blue' })
                .setLngLat([currentLng, currentLat])
                .addTo(map);

            new mapboxgl.Marker({ color: 'red' })
                .setLngLat([dest.lng, dest.lat])
                .addTo(map);
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [dest]);

    if (!dest) {
        return <div style={{ padding: 20 }}>目的地を読み込んでいます...</div>;
    }

    return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
}
