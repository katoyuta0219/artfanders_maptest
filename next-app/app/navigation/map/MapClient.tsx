'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ✅ env 名を完全一致させる
mapboxgl.accessToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

type Props = {
    destLat: number;
    destLng: number;
};

export default function MapClient({ destLat, destLng }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        if (!navigator.geolocation) {
            alert('このブラウザは位置情報に対応していません');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const currentLat = pos.coords.latitude;
                const currentLng = pos.coords.longitude;

                const map = new mapboxgl.Map({
                    container: mapContainerRef.current!,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: [currentLng, currentLat],
                    zoom: 14,
                });

                mapRef.current = map;

                // 現在地マーカー
                new mapboxgl.Marker({ color: 'blue' })
                    .setLngLat([currentLng, currentLat])
                    .addTo(map);

                // 目的地マーカー
                new mapboxgl.Marker({ color: 'red' })
                    .setLngLat([destLng, destLat])
                    .addTo(map);
            },
            (err) => {
                console.error('位置情報取得エラー', err);
                alert('位置情報を取得できませんでした');
            }
        );

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [destLat, destLng]);

    return (
        <div
            ref={mapContainerRef}
            style={{ width: '100%', height: '100vh' }}
        />
    );
}
