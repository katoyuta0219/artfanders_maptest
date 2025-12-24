'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type Props = {
  destLat: number;
  destLng: number;
};

export default function MapClient({ destLat, destLng }: Props) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

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

      new mapboxgl.Marker({ color: 'blue' })
        .setLngLat([currentLng, currentLat])
        .addTo(map);

      new mapboxgl.Marker({ color: 'red' })
        .setLngLat([destLng, destLat])
        .addTo(map);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [destLat, destLng]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
}
