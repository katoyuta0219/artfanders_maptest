'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

type Props = {
    destination: {
        lat: number;
        lng: number;
        name: string;
    };
};

export default function NavigationMap({ destination }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/navigation-day-v1',
            center: [destination.lng, destination.lat],
            zoom: 15,
            pitch: 60,
            bearing: 0,
            antialias: true, // ★3D必須
        });

        mapRef.current = map;

        // =============================
        // 3D 建物
        // =============================
        map.on('load', () => {
            map.addLayer({
                id: '3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 15,
                paint: {
                    'fill-extrusion-color': '#d1d5db',
                    'fill-extrusion-height': ['get', 'height'],
                    'fill-extrusion-base': ['get', 'min_height'],
                    'fill-extrusion-opacity': 0.6,
                },
            });
        });

        // 目的地マーカー
        new mapboxgl.Marker({ color: 'red' })
            .setLngLat([destination.lng, destination.lat])
            .setPopup(new mapboxgl.Popup().setText(destination.name))
            .addTo(map);

        let watchId: number;

        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;

                    let bearing = pos.coords.heading ?? 0;
                    if (bearing === 0 && lastPositionRef.current) {
                        const dx = lng - lastPositionRef.current.lng;
                        const dy = lat - lastPositionRef.current.lat;
                        bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
                    }
                    lastPositionRef.current = { lat, lng };

                    // 矢印マーカー
                    if (!userMarkerRef.current) {
                        const el = document.createElement('div');
                        el.style.width = '24px';
                        el.style.height = '24px';
                        el.style.background = '#2563eb';
                        el.style.clipPath = 'polygon(50% 0%, 100% 100%, 50% 80%, 0% 100%)';
                        el.style.transform = `rotate(${bearing}deg)`;

                        userMarkerRef.current = new mapboxgl.Marker(el)
                            .setLngLat([lng, lat])
                            .addTo(map);
                    } else {
                        userMarkerRef.current.getElement().style.transform = `rotate(${bearing}deg)`;
                        userMarkerRef.current.setLngLat([lng, lat]);
                    }

                    // カメラ追従
                    map.easeTo({
                        center: [lng, lat],
                        bearing,
                        zoom: 16,
                        pitch: 60,
                        duration: 500,
                    });

                    // ルート（初回のみ）
                    if (!map.getSource('route')) {
                        const res = await fetch(
                            `https://api.mapbox.com/directions/v5/mapbox/walking/${lng},${lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
                        );
                        const data = await res.json();

                        map.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                geometry: data.routes[0].geometry,
                                properties: {},
                            },
                        });

                        map.addLayer({
                            id: 'route-layer',
                            type: 'line',
                            source: 'route',
                            paint: {
                                'line-color': '#2563eb',
                                'line-width': 6,
                            },
                        });
                    }
                },
                console.error,
                { enableHighAccuracy: true }
            );
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            map.remove();
        };
    }, [destination]);

    return <div ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />;
}
