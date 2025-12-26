'use client';

import { useEffect, useState } from 'react';
import NavigationMap from '@/components/Maps/NavigationMap';

export default function Page() {
    const [dest, setDest] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        // URL クエリを直接読む（useSearchParams 不使用）
        const params = new URLSearchParams(window.location.search);
        const lat = params.get('lat');
        const lng = params.get('lng');

        if (!lat || !lng) return;

        const parsedLat = Number(lat);
        const parsedLng = Number(lng);

        if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return;

        setDest({ lat: parsedLat, lng: parsedLng });
    }, []);

    if (!dest) {
        return <div style={{ padding: 20 }}>目的地を読み込んでいます...</div>;
    }

    return <NavigationMap lat={dest.lat} lng={dest.lng} />;
}
